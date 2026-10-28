
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END $$;
CREATE TABLE systems (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(length(trim(code))>0),
 name text NOT NULL CHECK(length(trim(name))>0), purpose text NOT NULL DEFAULT '', owner text,
 department text NOT NULL DEFAULT 'Unassigned', vendor text NOT NULL DEFAULT 'Unspecified',
 risk_tier text NOT NULL DEFAULT 'unassessed' CHECK(risk_tier IN ('unassessed','low','medium','high')),
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','pilot','operating','paused','retired')),
 next_review date, source text, external_id text, raw_source jsonb, source_hash text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source,external_id), CHECK ((source IS NULL)=(external_id IS NULL))
);
CREATE TABLE versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), system_id uuid NOT NULL REFERENCES systems(id),
 code text NOT NULL CHECK(length(trim(code))>0), model_ref text NOT NULL CHECK(length(trim(model_ref))>0),
 current boolean NOT NULL DEFAULT false, notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(system_id,code), UNIQUE(id,system_id)
);
CREATE UNIQUE INDEX one_current_version ON versions(system_id) WHERE current;
CREATE TABLE assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), system_id uuid NOT NULL REFERENCES systems(id),
 version_id uuid NOT NULL, impact integer NOT NULL CHECK(impact BETWEEN 1 AND 5),
 likelihood integer NOT NULL CHECK(likelihood BETWEEN 1 AND 5),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','approved','rejected')),
 reviewer text, decided_on date, valid_until date, rationale text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(version_id,system_id) REFERENCES versions(id,system_id),
 CHECK(state='draft' OR (reviewer IS NOT NULL AND length(trim(reviewer))>0 AND decided_on IS NOT NULL AND length(trim(rationale))>0)),
 CHECK(state!='approved' OR valid_until IS NOT NULL), CHECK(valid_until IS NULL OR valid_until>=decided_on)
);
CREATE TABLE evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES assessments(id),
 kind text NOT NULL CHECK(kind IN ('validation','privacy','oversight')),
 reference text NOT NULL CHECK(length(trim(reference))>0), summary text NOT NULL CHECK(length(trim(summary))>0),
 checked_on date NOT NULL, valid_until date NOT NULL CHECK(valid_until>=checked_on),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(assessment_id,kind,reference)
);
CREATE TABLE actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), system_id uuid NOT NULL REFERENCES systems(id),
 title text NOT NULL CHECK(length(trim(title))>0), owner text NOT NULL CHECK(length(trim(owner))>0),
 severity text NOT NULL CHECK(severity IN ('low','medium','high')), due_on date NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 resolution text, closed_on date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status='open' OR (resolution IS NOT NULL AND length(trim(resolution))>0 AND closed_on IS NOT NULL))
);
CREATE TABLE events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), system_id uuid NOT NULL REFERENCES systems(id),
 actor text NOT NULL CHECK(length(trim(actor))>0), event text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, file_sha256 text NOT NULL,
 actor text NOT NULL, inserted integer NOT NULL, skipped integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessments_system ON assessments(system_id,created_at DESC);
CREATE INDEX actions_due ON actions(due_on) WHERE status='open';
CREATE INDEX evidence_assessment ON evidence(assessment_id);
CREATE INDEX events_system ON events(system_id,created_at);
CREATE TRIGGER touch_systems BEFORE UPDATE ON systems FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_versions BEFORE UPDATE ON versions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_assessments BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_evidence BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_actions BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_import_runs BEFORE UPDATE ON import_runs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE VIEW v_register AS
 SELECT s.id,s.code,s.name,s.owner,s.department,s.vendor,s.risk_tier,s.status,s.next_review,
 v.code AS version,v.model_ref,
 (SELECT count(*)::int FROM actions a WHERE a.system_id=s.id AND a.status='open') AS open_actions,
 (SELECT count(*)::int FROM actions a WHERE a.system_id=s.id AND a.status='open' AND a.due_on<current_date) AS overdue_actions
 FROM systems s LEFT JOIN versions v ON v.system_id=s.id AND v.current;
CREATE VIEW v_review_queue AS
 SELECT id,code,name,owner,risk_tier,status,next_review,
 CASE WHEN owner IS NULL OR trim(owner)='' THEN 'Owner missing'
 WHEN next_review IS NULL THEN 'Review date missing' WHEN next_review<current_date THEN 'Review overdue'
 ELSE 'Review within 30 days' END AS reason
 FROM systems WHERE status!='retired' AND (owner IS NULL OR trim(owner)='' OR next_review IS NULL OR next_review<=current_date+30);
CREATE VIEW v_evidence_due AS
 SELECT e.id,s.code,s.name,a.id AS assessment_id,a.state,e.kind,e.reference,e.valid_until,
 e.valid_until-current_date AS days_left
 FROM evidence e JOIN assessments a ON a.id=e.assessment_id JOIN systems s ON s.id=a.system_id
 JOIN versions v ON v.id=a.version_id
 WHERE s.status!='retired' AND v.current AND e.valid_until<=current_date+30;
CREATE VIEW v_actions_due AS
 SELECT a.id,s.code,a.title,a.owner,a.severity,a.due_on,current_date-a.due_on AS days_late
 FROM actions a JOIN systems s ON s.id=a.system_id WHERE a.status='open' AND a.due_on<=current_date+14;
CREATE VIEW v_readiness AS
 SELECT s.id,s.code,s.name,s.status,
 (s.owner IS NOT NULL AND length(trim(s.owner))>0) AS has_owner,
 length(trim(s.purpose))>0 AS has_purpose,
 coalesce(s.next_review>=current_date,false) AS review_current,
 s.risk_tier!='unassessed' AS risk_assessed,
 v.id IS NOT NULL AS has_version,
 EXISTS(SELECT 1 FROM assessments a WHERE a.version_id=v.id AND a.state='approved' AND a.id=(SELECT latest.id FROM assessments latest WHERE latest.version_id=v.id AND latest.state!='draft' ORDER BY latest.updated_at DESC,latest.id DESC LIMIT 1) AND a.valid_until>=current_date AND s.next_review<=a.valid_until AND lower(trim(a.reviewer))<>lower(trim(s.owner))
 AND NOT EXISTS (SELECT 1 FROM unnest(ARRAY['validation','privacy','oversight']) k
 WHERE NOT EXISTS(SELECT 1 FROM evidence e WHERE e.assessment_id=a.id AND e.kind=k AND e.checked_on<=current_date AND e.valid_until>=current_date))) AS approval_current,
 NOT EXISTS(SELECT 1 FROM actions a WHERE a.system_id=s.id AND a.status='open' AND a.severity='high') AS no_high_actions
 FROM systems s LEFT JOIN versions v ON v.system_id=s.id AND v.current;
CREATE VIEW v_attention AS
 SELECT code,name,'review' AS area,reason AS issue FROM v_review_queue
 UNION ALL SELECT code,title,'action',CASE WHEN days_late>0 THEN 'Overdue: ' ELSE 'Due soon: ' END||severity FROM v_actions_due
 UNION ALL SELECT code,name,'evidence',kind||CASE WHEN days_left<0 THEN ' expired' ELSE ' expires soon' END FROM v_evidence_due
 UNION ALL SELECT code,name,'operating record','Current approval or readiness missing' FROM v_readiness
 WHERE status='operating' AND NOT(has_owner AND has_purpose AND review_current AND risk_assessed AND has_version AND approval_current AND no_high_actions);
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
