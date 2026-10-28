#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {page,table as htmlTable,record,writeOut} from './lib/render.mjs';

// Each command owns its option vocabulary. No SQL or shell comes from arguments.
export const specs={
 help:[0,[]],register:[0,[]],versions:[1,[]],'review-queue':[0,[]],'evidence-due':[0,[]],
 'actions-due':[0,[]],attention:[0,[]],compliance:[0,[]],insights:[0,[]],show:[1,[]],history:[1,[]],
 add:[0,['code!','name!','purpose!','owner!','department!','vendor!','next-review!','actor!']],
 'add-version':[1,['code!','model-ref!','note!','actor!']],
 'open-review':[1,['impact!','likelihood!','actor!']],
 'attach-evidence':[1,['kind!','reference!','summary!','checked-on!','valid-until!','actor!']],
 decide:[1,['decision!','valid-until','rationale!','actor!']],
 'add-action':[1,['title!','owner!','severity!','due!','actor!']],
 'close-action':[1,['resolution!','actor!']],
 'set-owner':[1,['owner!','note!','actor!']],
 'schedule-review':[1,['due!','note!','actor!']],
 'set-status':[1,['status!','note!','actor!']],
 log:[1,['note!','actor!']],
 import:[2,['source!','map','dry-run','actor!']],export:[0,['out!']],
 'weekly-review':[0,[]],'draft-review':[1,[]],'draft-action':[1,[]]
};
const mutations=new Set(['add','add-version','open-review','attach-evidence','decide','add-action','close-action','set-owner','schedule-review','set-status','log','import']);
const date=x=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(x)||new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)throw Error('Expected a real calendar date YYYY-MM-DD');return x;};
const oneOf=(v,allowed)=>{if(!allowed.includes(v))throw Error('Expected one of: '+allowed.join(', '));return v;};
const score=x=>{if(!/^[1-5]$/.test(x))throw Error('Risk score must be a whole number from 1 to 5');return Number(x);};
const digest=s=>createHash('sha256').update(s).digest('hex');
function args(argv){
 const pos=[],o={};for(const a of argv){if(a.startsWith('--')){const at=a.indexOf('=');const k=a.slice(2,at<0?undefined:at),v=at<0?true:a.slice(at+1);if(Object.hasOwn(o,k))throw Error('Duplicate option: '+k);o[k]=v;}else pos.push(a);}
 const cmd=pos.shift()||'help',spec=specs[cmd];if(!spec)throw Error('Unknown command: '+cmd);
 const allowed=['json',...spec[1].map(x=>x.replace('!',''))];for(const k of Object.keys(o))if(!allowed.includes(k))throw Error('Unknown option: '+k);
 if(pos.length!==spec[0])throw Error(`Expected ${spec[0]} positional argument(s) for ${cmd}`);
 for(const k of spec[1].filter(x=>x.endsWith('!')).map(x=>x.slice(0,-1)))if(typeof o[k]!=='string'||!o[k].trim())throw Error('Required --'+k+'=value');
 for(const [k,v] of Object.entries(o)){if(['json','dry-run'].includes(k)){if(v!==true)throw Error('--'+k+' is a boolean flag');}else if(typeof v!=='string'||!v.trim())throw Error('Expected --'+k+'=value');}
 return {cmd,pos,o};
}
async function resolve(db,kind,selector){
 const config={systems:['code','name'],assessments:[],actions:['title']};
 if(!Object.hasOwn(config,kind))throw Error('Unknown record type');
 const columns=config[kind];const exact=columns.length?' OR '+columns.map(k=>`lower(${k})=lower($1)`).join(' OR '):'';
 const rows=await db.query(`SELECT * FROM ${kind} WHERE id::text LIKE (lower($1::text)||'%')${exact} ORDER BY id`,[selector]);
 if(rows.length!==1)throw Error(rows.length?'Ambiguous selector; choose one: '+rows.map(r=>`${r.id} ${r.code||r.title||r.state}`).join('; '):'No matching '+kind+' record: '+selector);
 return rows[0];
}
async function lockedSystem(db,id){const [s]=await db.query('SELECT * FROM systems WHERE id=$1 FOR UPDATE',[id]);return s;}
const active=s=>{if(s.status==='retired')throw Error('Retired record: create a new system for new work');};
async function audit(db,id,o,event,details){await db.query('INSERT INTO events(system_id,actor,event,details) VALUES($1,$2,$3,$4)',[id,o.actor,event,JSON.stringify(details)]);}
const basicCols='code,name,owner,risk_tier,status,next_review,version,open_actions,overdue_actions';
const reads={register:`SELECT ${basicCols} FROM v_register ORDER BY code`,
 'review-queue':'SELECT code,name,owner,next_review,reason FROM v_review_queue ORDER BY next_review NULLS FIRST,code',
 'evidence-due':'SELECT code,kind,valid_until,days_left,state FROM v_evidence_due ORDER BY valid_until,code',
 'actions-due':'SELECT code,title,owner,severity,due_on,days_late FROM v_actions_due ORDER BY due_on,code',
 attention:'SELECT * FROM v_attention ORDER BY code,area,issue'};
export const questions=[
 ['Which operating models have no current approval?',"SELECT code,name FROM v_readiness WHERE status='operating' AND NOT approval_current ORDER BY code"],
 ['Which owners have both an overdue review and overdue actions?',"SELECT code,owner,next_review,overdue_actions FROM v_register WHERE status!='retired' AND next_review<current_date AND overdue_actions>0 ORDER BY code"],
 ['Which suppliers have unassessed use cases?',"SELECT vendor,count(*)::int AS unassessed FROM systems WHERE status!='retired' AND risk_tier='unassessed' GROUP BY vendor ORDER BY vendor"],
 ['Which departments have no accountable owner recorded?',"SELECT department,code,name FROM systems WHERE status!='retired' AND (owner IS NULL OR trim(owner)='') ORDER BY department,code"],
 ['Which approvals depend on evidence expiring within 30 days?',"SELECT code,kind,valid_until FROM v_evidence_due WHERE state='approved' AND days_left BETWEEN 0 AND 30 ORDER BY code,kind"],
 ['Which current versions have never had a review?',"SELECT s.code,v.code AS version FROM systems s JOIN versions v ON v.system_id=s.id AND v.current WHERE s.status!='retired' AND NOT EXISTS(SELECT 1 FROM assessments a WHERE a.version_id=v.id) ORDER BY s.code"],
 ['Which high-severity actions are overdue and who owns them?',"SELECT code,title,owner,days_late FROM v_actions_due WHERE severity='high' AND days_late>0 ORDER BY days_late DESC,code"],
 ['Which imported use cases still need assessment?',"SELECT code,name,source,external_id FROM systems WHERE source IS NOT NULL AND risk_tier='unassessed' ORDER BY code"],
 ['Which retired systems still have unresolved actions?',"SELECT s.code,a.title,a.owner,a.due_on FROM systems s JOIN actions a ON a.system_id=s.id WHERE s.status='retired' AND a.status='open' ORDER BY s.code,a.due_on"],
 ['Which planned reviews arrive before their evidence expires?',"SELECT DISTINCT s.code,s.next_review,min(e.valid_until) AS first_expiry FROM systems s JOIN versions v ON v.system_id=s.id AND v.current JOIN assessments a ON a.version_id=v.id AND a.state='approved' JOIN evidence e ON e.assessment_id=a.id WHERE s.status!='retired' AND s.next_review>=current_date GROUP BY s.code,s.next_review HAVING s.next_review<=min(e.valid_until) ORDER BY s.code"]
];
async function compliance(db){
 const rows=await db.query('SELECT * FROM v_readiness WHERE status!=\'retired\' ORDER BY code');const out=[];
 const rules=[['has_owner','GOVERN-2.1','Record an accountable owner'],['has_purpose','MAP-1.1','Describe the intended purpose'],['has_version','GOVERN-1.6','Record the current version'],['review_current','GOVERN-1.5','Set or complete the periodic review'],['risk_assessed','LOCAL-RISK','Complete a local risk assessment'],['approval_current','LOCAL-EVIDENCE','Record approval with current validation, privacy and oversight evidence'],['no_high_actions','LOCAL-ACTIONS','Resolve high-severity actions']];
 for(const r of rows)for(const [key,rule,issue] of rules)if(!r[key])out.push({code:r.code,rule,issue,source:rule.startsWith('LOCAL')?'docs/compliance.md':'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/'});
 return out;
}
function secureJson(file,obj){const dest=path.resolve(file);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.writeFileSync(dest,JSON.stringify(obj,null,2)+'\n',{mode:0o600});fs.chmodSync(dest,0o600);return dest;}
export async function run(db,argv){
 const {cmd,pos,o}=args(argv);
 if(cmd==='help')return Object.entries(specs).map(([command,[positional,options]])=>({command,positional,options:options.join(', ')}));
 await db.exec(mutations.has(cmd)?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
 let result;
 const today=(await db.query('SELECT current_date::text AS day'))[0].day;
 if(reads[cmd])result=await db.query(reads[cmd]);
 else if(cmd==='compliance')result=await compliance(db);
 else if(cmd==='insights'){result=[];for(const [question,sql]of questions)result.push({question,records:await db.query(sql)});}
 else if(cmd==='weekly-review'){
  const sections=[];for(const command of ['review-queue','actions-due','evidence-due'])sections.push({title:command,html:htmlTable(await db.query(reads[command]))});
  result={file:writeOut('drafts','weekly-review-'+today,page({title:'Weekly model governance review',subtitle:'Working draft. Owner decisions required.',sections}))};
 }else if(cmd==='export'){
  const snapshot={format:'model-governance-v1',exported_at:new Date().toISOString(),records:{}};
  for(const name of ['systems','versions','assessments','evidence','actions','events','import_runs'])snapshot.records[name]=await db.query(`SELECT * FROM ${name} ORDER BY id`);
  result={file:secureJson(o.out,snapshot),counts:Object.fromEntries(Object.entries(snapshot.records).map(([k,v])=>[k,v.length]))};
 }else if(cmd==='add'){
  const due=date(o['next-review']);if(due<today)throw Error('Next review must be today or later');
  const [s]=await db.query('INSERT INTO systems(code,name,purpose,owner,department,vendor,next_review) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[o.code,o.name,o.purpose,o.owner,o.department,o.vendor,due]);
  await audit(db,s.id,o,cmd,{code:s.code});result=s;
 }else if(cmd==='import'){
  if(pos[0]!=='ibm-watsonx-governance')throw Error('Supported import: ibm-watsonx-governance');
  const raw=fs.readFileSync(pos[1],'utf8'),rows=parseCsv(raw);if(!rows.length)throw Error('Empty import');
  const defaults={external_id:'Resource ID',code:'Name',name:'Name',purpose:'Description',owner:'Owner',department:'Business Entity',vendor:'Vendor'};
  const custom=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
  if(!custom||Array.isArray(custom)||typeof custom!=='object')throw Error('Map must be an object');
  for(const [k,v]of Object.entries(custom))if(!Object.hasOwn(defaults,k)||typeof v!=='string'||!v.trim())throw Error('Invalid mapping: '+k);
  const map={...defaults,...custom};const headers=Object.keys(rows[0]).map(x=>x.toLowerCase());
  for(const k of ['external_id','code','name',...Object.keys(custom)])if(!headers.includes(map[k].toLowerCase()))throw Error('Missing mapped column: '+map[k]);
  const seen=new Set();let inserted=0,skipped=0;const preview=[];
  for(const row of rows){
   const get=k=>pick(row,map[k]).trim(),external=get('external_id'),code=get('code'),name=get('name');
   if(!external||!code||!name)throw Error('Every row needs an external id, code and name');
   if(seen.has(external))throw Error('Duplicate external id in batch: '+external);seen.add(external);
   const hash=digest(JSON.stringify(Object.keys(row).sort().map(k=>[k,row[k]])));
   const [old]=await db.query('SELECT * FROM systems WHERE source=$1 AND external_id=$2 FOR UPDATE',[o.source,external]);
   if(old){if(old.source_hash!==hash)throw Error('Changed source record '+external+': reconcile explicitly before import');skipped++;continue;}
   const [s]=await db.query('INSERT INTO systems(code,name,purpose,owner,department,vendor,source,external_id,raw_source,source_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',[code,name,get('purpose'),get('owner')||null,get('department')||'Unassigned',get('vendor')||'Unspecified',o.source,external,JSON.stringify(row),hash]);
   await audit(db,s.id,o,'import',{source:o.source,external_id:external});inserted++;preview.push({code,name,status:'proposed',risk_tier:'unassessed'});
  }
  await db.query('INSERT INTO import_runs(source,file_sha256,actor,inserted,skipped) VALUES($1,$2,$3,$4,$5)',[o.source,digest(raw),o.actor,inserted,skipped]);
  result={inserted,skipped,dry_run:Boolean(o['dry-run']),preview};
 }else if(['attach-evidence','decide'].includes(cmd)){
  const original=await resolve(db,'assessments',pos[0]);const s=await lockedSystem(db,original.system_id);active(s);
  const [a]=await db.query('SELECT * FROM assessments WHERE id=$1 FOR UPDATE',[original.id]);
  if(a.state!=='draft')throw Error('Assessment is final; open a new review');
  if(cmd==='attach-evidence'){
   const kind=oneOf(o.kind,['validation','privacy','oversight']),checked=date(o['checked-on']),until=date(o['valid-until']);
   if(checked>today||until<checked)throw Error('Evidence dates must be ordered and checked-on cannot be future');
   if(!/^https:\/\//.test(o.reference)&&!/^evidence\/[a-zA-Z0-9_./-]+$/.test(o.reference))throw Error('Use an https reference or evidence/ relative path');
   if(o.reference.includes('..'))throw Error('Parent path references are not allowed');
   [result]=await db.query('INSERT INTO evidence(assessment_id,kind,reference,summary,checked_on,valid_until) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[a.id,kind,o.reference,o.summary,checked,until]);
  }else{
   const decision=oneOf(o.decision,['approved','rejected']);let until=null;
   if(!s.owner||!s.purpose.trim())throw Error('Owner and purpose required before a decision');
   if(s.owner.trim().toLowerCase()===o.actor.trim().toLowerCase())throw Error('Reviewer must differ from recorded owner');
   const [version]=await db.query('SELECT * FROM versions WHERE id=$1',[a.version_id]);if(!version.current)throw Error('Review is for a superseded version');
   if(decision==='approved'){
    if(!o['valid-until'])throw Error('Approval needs --valid-until');until=date(o['valid-until']);if(until<today)throw Error('Approval expiry cannot be past');
    for(const kind of ['validation','privacy','oversight']){const e=await db.query('SELECT id FROM evidence WHERE assessment_id=$1 AND kind=$2 AND checked_on<=current_date AND valid_until>=$3',[a.id,kind,until]);if(!e.length)throw Error('Missing '+kind+' evidence valid through approval expiry');}
    if((await db.query("SELECT id FROM actions WHERE system_id=$1 AND status='open' AND severity='high'",[s.id])).length)throw Error('Resolve high-severity actions first');
    if(!s.next_review||s.next_review<today||s.next_review>until)throw Error('Next review must be current and within approval validity');
   }else if(o['valid-until'])throw Error('Rejected decision cannot have a validity date');
   [result]=await db.query('UPDATE assessments SET state=$2,reviewer=$3,decided_on=current_date,valid_until=$4,rationale=$5 WHERE id=$1 RETURNING *',[a.id,decision,o.actor,until,o.rationale]);
   const risk=a.impact*a.likelihood,tier=risk>=15?'high':risk>=6?'medium':'low';
   await db.query("UPDATE systems SET risk_tier=$2,status=CASE WHEN $3='rejected' AND status='operating' THEN 'paused' ELSE status END WHERE id=$1",[s.id,tier,decision]);
  }
  await audit(db,s.id,o,cmd,result);
 }else if(['close-action','draft-action'].includes(cmd)){
  const original=await resolve(db,'actions',pos[0]);const s=mutations.has(cmd)?await lockedSystem(db,original.system_id):await resolve(db,'systems',original.system_id);
  const [a]=await db.query('SELECT * FROM actions WHERE id=$1'+(mutations.has(cmd)?' FOR UPDATE':''),[original.id]);
  if(cmd==='close-action'){
   if(a.status==='closed')throw Error('Action already closed');
   [result]=await db.query("UPDATE actions SET status='closed',resolution=$2,closed_on=current_date WHERE id=$1 RETURNING *",[a.id,o.resolution]);await audit(db,s.id,o,cmd,result);
  }else result={file:writeOut('drafts','action-'+a.id,page({title:'Remediation follow-up',subtitle:'Working draft. Nothing sent.',sections:[{title:s.code+' '+s.name,html:record(a)}]}))};
 }else{
  const original=await resolve(db,'systems',pos[0]);const s=mutations.has(cmd)?await lockedSystem(db,original.id):original;
  if(cmd==='show')result={system:s,versions:await db.query('SELECT * FROM versions WHERE system_id=$1 ORDER BY created_at,id',[s.id]),assessments:await db.query('SELECT * FROM assessments WHERE system_id=$1 ORDER BY created_at,id',[s.id]),actions:await db.query('SELECT * FROM actions WHERE system_id=$1 ORDER BY due_on,id',[s.id]),evidence:await db.query('SELECT e.* FROM evidence e JOIN assessments a ON a.id=e.assessment_id WHERE a.system_id=$1 ORDER BY e.kind,e.id',[s.id]),readiness:(await db.query('SELECT * FROM v_readiness WHERE id=$1',[s.id]))[0]};
  else if(cmd==='versions')result=await db.query('SELECT id,code,model_ref,current,notes FROM versions WHERE system_id=$1 ORDER BY created_at,id',[s.id]);
  else if(cmd==='history')result=await db.query('SELECT created_at,actor,event,details FROM events WHERE system_id=$1 ORDER BY created_at,id',[s.id]);
  else if(cmd==='draft-review'){
   result={file:writeOut('drafts','review-'+s.id,page({title:'Model review brief',subtitle:'Working draft. Assessment decisions are separate.',sections:[{title:'Use case',html:record(s,['code','name','purpose','owner','risk_tier','status','next_review'])},{title:'Readiness',html:record((await db.query('SELECT * FROM v_readiness WHERE id=$1',[s.id]))[0])},{title:'Open actions',html:htmlTable(await db.query("SELECT title,owner,severity,due_on FROM actions WHERE system_id=$1 AND status='open' ORDER BY due_on",[s.id]))}]}))};
  }else{
   if(cmd!=='log')active(s);
   if(cmd==='add-version'){
    await db.query('UPDATE versions SET current=false WHERE system_id=$1 AND current',[s.id]);
    [result]=await db.query('INSERT INTO versions(system_id,code,model_ref,current,notes) VALUES($1,$2,$3,true,$4) RETURNING *',[s.id,o.code,o['model-ref'],o.note]);
    await db.query("UPDATE systems SET risk_tier='unassessed',status=CASE WHEN status='operating' THEN 'paused' ELSE status END WHERE id=$1",[s.id]);
   }else if(cmd==='open-review'){
    const [v]=await db.query('SELECT * FROM versions WHERE system_id=$1 AND current',[s.id]);if(!v)throw Error('Add a current version first');
    [result]=await db.query('INSERT INTO assessments(system_id,version_id,impact,likelihood) VALUES($1,$2,$3,$4) RETURNING *',[s.id,v.id,score(o.impact),score(o.likelihood)]);
   }else if(cmd==='add-action'){
    [result]=await db.query('INSERT INTO actions(system_id,title,owner,severity,due_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[s.id,o.title,o.owner,oneOf(o.severity,['low','medium','high']),date(o.due)]);
   }else if(cmd==='set-owner'){
    [result]=await db.query('UPDATE systems SET owner=$2 WHERE id=$1 RETURNING *',[s.id,o.owner]);
   }else if(cmd==='schedule-review'){
    const due=date(o.due);if(due<today)throw Error('Review date cannot be past');
    [result]=await db.query('UPDATE systems SET next_review=$2 WHERE id=$1 RETURNING *',[s.id,due]);
   }else if(cmd==='set-status'){
    const status=oneOf(o.status,['proposed','pilot','operating','paused','retired']);
    if(status==='operating'){
     const [r]=await db.query('SELECT * FROM v_readiness WHERE id=$1',[s.id]);
     const bad=['has_owner','has_purpose','review_current','risk_assessed','has_version','approval_current','no_high_actions'].filter(k=>!r[k]);if(bad.length)throw Error('Readiness failed: '+bad.join(', '));
    }
    [result]=await db.query('UPDATE systems SET status=$2 WHERE id=$1 RETURNING *',[s.id,status]);
   }else if(cmd==='log')result={code:s.code,note:o.note};
   else throw Error('Unhandled command '+cmd);
   await audit(db,s.id,o,cmd,{...result,note:o.note});
  }
 }
 await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function display(value){
 if(Array.isArray(value)){
  if(value.length&&Object.hasOwn(value[0],'question'))return value.map(v=>v.question+'\n'+display(v.records)).join('\n\n');
  if(!value.length)return '  (none)';
  const rows=value.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='object'&&v!==null?JSON.stringify(v):v])));
  return table(rows,Object.keys(rows[0]).map(key=>({key,label:key.replaceAll('_',' '),width:70})));
 }
 if(value&&typeof value==='object'){
  const entries=Object.entries(value);
  if(entries.every(([,v])=>v===null||typeof v!=='object'))return table(entries.map(([field,v])=>({field,value:v})),[{key:'field',label:'field'},{key:'value',label:'value',width:100}]);
  return entries.map(([key,v])=>key.replaceAll('_',' ')+'\n'+display(v)).join('\n\n');
 }
 return String(value??'');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):display(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
