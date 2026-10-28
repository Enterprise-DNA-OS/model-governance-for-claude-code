
INSERT INTO systems(id,code,name,purpose,owner,department,vendor,risk_tier,status,next_review) VALUES
 ('10000000-0000-4000-8000-000000000001','SUP-01','Support reply drafts','Draft support replies for a person to review','Mara Chen','Support','Local model','medium','pilot',current_date-5),
 ('10000000-0000-4000-8000-000000000002','DOC-02','Document classifier','Sort internal manuals by topic',NULL,'Operations','Local model','unassessed','proposed',NULL),
 ('10000000-0000-4000-8000-000000000003','DEM-03','Demand forecast','Propose weekly stock forecasts for planner review','Ari Patel','Planning','Forecast service','low','operating',current_date+21),
 ('10000000-0000-4000-8000-000000000004','ARC-04','Retired search model','Internal document search','Mara Chen','Support','Legacy service','medium','retired',current_date-90)
 ON CONFLICT DO NOTHING;
INSERT INTO versions(id,system_id,code,model_ref,current,notes) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','v1','reply-model-2026-10',true,'Fictional demo version'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','v1','classifier-1',true,'Awaiting owner'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','v2','forecast-2',true,'Manual approval record only') ON CONFLICT DO NOTHING;
INSERT INTO assessments(id,system_id,version_id,impact,likelihood,state,reviewer,decided_on,valid_until,rationale) VALUES
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',3,3,'draft',NULL,NULL,NULL,'Awaiting review'),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',2,2,'approved','Taylor Reed',current_date-20,current_date+45,'Demo approval; evidence later expired') ON CONFLICT DO NOTHING;
INSERT INTO evidence(id,assessment_id,kind,reference,summary,checked_on,valid_until) VALUES
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','validation','https://example.org/reviews/replies','Synthetic reply quality check',current_date-10,current_date+10),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','validation','https://example.org/reviews/forecast','Synthetic forecast error review',current_date-30,current_date-1),
 ('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','privacy','https://example.org/reviews/data','Synthetic data handling record',current_date-30,current_date+60),
 ('40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000002','oversight','https://example.org/reviews/planner','Synthetic human review record',current_date-30,current_date+60) ON CONFLICT DO NOTHING;
INSERT INTO actions(id,system_id,title,owner,severity,due_on) VALUES
 ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Document escalation to a person','Mara Chen','high',current_date-3),
 ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','Refresh forecast validation','Ari Patel','medium',current_date-1),
 ('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Assign accountable owner','Taylor Reed','high',current_date+2) ON CONFLICT DO NOTHING;
INSERT INTO events(id,system_id,actor,event,details) SELECT s.id,s.id,'Demo steward','seed','{"fictional":true}' FROM systems s ON CONFLICT DO NOTHING;
