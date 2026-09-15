import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';
mkdirSync('tmp/safework-tests',{recursive:true});
await build({entryPoints:['src/pages/api/safework/checkout.ts','src/pages/api/safework/order.ts','src/pages/api/safework/generate.ts','src/pages/api/safework/download.ts','src/lib/safework/generate.ts','src/lib/safework/render.ts'].map((entry)=>resolve(entry)),outbase:resolve('src'),outdir:resolve('tmp/safework-tests'),bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const checkout=await import('../tmp/safework-tests/pages/api/safework/checkout.mjs');
const order=await import('../tmp/safework-tests/pages/api/safework/order.mjs');
const generate=await import('../tmp/safework-tests/pages/api/safework/generate.mjs');
const download=await import('../tmp/safework-tests/pages/api/safework/download.mjs');
const {workPackSchema}=await import('../tmp/safework-tests/lib/safework/generate.mjs');
const {packAsA4Html}=await import('../tmp/safework-tests/lib/safework/render.mjs');
function sample(s){if(s.type==='string')return 'Example <script>alert(1)</script>';if(s.type==='boolean')return false;if(s.type==='integer')return 1;if(s.type==='array')return [sample(s.items)];return Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,sample(v)]));}
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('migrations/0003_safework.sql','utf8'));return {sql,prepare(q){let args=[];return {bind(...a){args=a;return this},async first(){return sql.prepare(q).get(...args)||null},async run(){return {meta:{changes:Number(sql.prepare(q).run(...args).changes)}}}}}};}
test('purchase → unpaid rejection → paid → failed generation → retry → private repeat download',async()=>{
 const db=database();const env={FULFILMENT_DB:db,SAFEWORK_SALES_ENABLED:'true',STRIPE_TEST_SECRET_KEY:'sk_test_fixture',OPENAI_API_KEY:'fixture'};
 let session, paid=false, fail=true, calls=0;
 const original=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{
  if(String(url).includes('api.stripe.com') && opts.method==='POST'){const p=opts.body;session={id:'cs_test_fixture',url:'https://checkout.stripe.com/test',payment_status:'unpaid',currency:'gbp',amount_total:Number(p.get('line_items[0][price_data][unit_amount]')),livemode:false,metadata:{product:p.get('metadata[product]'),order_id:p.get('metadata[order_id]')}};return Response.json(session);}
  if(String(url).includes('api.stripe.com'))return Response.json({...session,payment_status:paid?'paid':'unpaid'});
  calls++;if(fail)return Response.json({error:{message:'Simulated outage'}},{status:503});const pack=sample(workPackSchema);pack.pack_requirements.excavation=true;pack.pack_requirements.hot_work=true;return Response.json({output_text:JSON.stringify(pack)});
 };
 const context=(request)=>({request,locals:{runtime:{env}}});
 try {
 const input={description:'Replace timber fencing with two workers',address:'Example site address',company:'Test Company',companyAddress:'',contact:'',emergency:'',workerCount:2,trialHoleSheets:10,reviewAccepted:true,processingAccepted:true};
 const r=await checkout.POST(context(new Request('https://example.test/api/safework/checkout',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(input)})));
 assert.equal(r.status,200);assert.equal(session.amount_total,1999);const created=await r.json();const u=new URL(created.returnUrl);const id=u.searchParams.get('id');const headers={Authorization:`Bearer ${u.hash.slice(1)}`};
 const req=(route,method='GET',auth=headers)=>new Request(`https://example.test/api/safework/${route}?id=${id}`,{method,headers:auth});
 assert.equal((await generate.POST(context(req('generate','POST')))).status,402);
 assert.equal((await download.GET(context(req('download')))).status,404);
 assert.equal((await order.GET(context(req('order','GET',{})))).status,404);
 paid=true;assert.equal((await (await order.GET(context(req('order')))).json()).status,'paid');
 assert.equal((await generate.POST(context(req('generate','POST')))).status,503);
 fail=false;assert.equal((await generate.POST(context(req('generate','POST')))).status,200);
 assert.equal((await generate.POST(context(req('generate','POST')))).status,200);assert.equal(calls,2);
 const doc=await download.GET(context(req('download')));assert.equal(doc.status,200);const html=await doc.text();assert.ok(html.includes('Test Company'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('RAMS briefing'));assert.ok(html.includes('EXCAVATION MUST NOT START UNTIL THIS PERMIT IS COMPLETED AND SIGNED'));assert.ok(html.includes('HOT WORK MUST NOT START UNTIL THIS PERMIT IS COMPLETED AND SIGNED'));assert.ok(html.includes('Team permit briefing and acknowledgement'));assert.ok(html.includes('INDIVIDUAL TRIAL-HOLE RECORD 10 OF 10'));assert.ok(html.includes('Job completion and chargehand sign-off'));assert.ok(html.includes('Chargehand / responsible supervisor'));assert.ok(html.includes('Person in charge accepting the permit'));assert.match(doc.headers.get('X-SafeWork-Filename'),/^SafeWork-Test-Company-/);
 assert.equal((await download.GET(context(req('download','GET',{Authorization:'Bearer '+ 'a'.repeat(64)})))).status,404);
 assert.equal((await download.GET(context(req('download')))).status,200);
 assert.equal(db.sql.prepare('SELECT attempts FROM safework_orders').get().attempts,1);
 } finally {globalThis.fetch=original;db.sql.close();}
});

test('conditional forms match normal, excavation/hot-work, static TM and mobile TM jobs',()=>{
 const profile={name:'Acceptance Test Ltd',address:'1 Test Road',telephone:'01234 000000'};
 const emergency={siteContact:'Test Supervisor',sitePhone:'01234 000001',firstAider:'Test First Aider',firstAiderPhone:'01234 000002',hospitals:[]};
 const makePack=(description,requirements)=>{const pack=sample(workPackSchema);pack.job_description=description;pack.scope=description;pack.permits_and_authorisations=[];pack.coshh_assessments=[];pack.pack_requirements={...Object.fromEntries(Object.keys(pack.pack_requirements).map((key)=>[key,false])),...requirements};return pack;};

 const normal=packAsA4Html(makePack('Internal timber door replacement',{ }),profile,emergency,2,1,'');
 assert.ok(!normal.includes('Hot-work permit'));
 assert.ok(!normal.includes('Excavation permit and team acknowledgement'));
 assert.ok(!normal.includes('TM-MLC'));

 const excavationHot=packAsA4Html(makePack('Excavate foundation and weld steel frame',{excavation:true,hot_work:true}),profile,emergency,4,10,'');
 assert.ok(excavationHot.includes('EXCAVATION MUST NOT START UNTIL THIS PERMIT IS COMPLETED AND SIGNED'));
 assert.ok(excavationHot.includes('HOT WORK MUST NOT START UNTIL THIS PERMIT IS COMPLETED AND SIGNED'));
 assert.ok(excavationHot.includes('INDIVIDUAL TRIAL-HOLE RECORD 10 OF 10'));

 const staticTm=packAsA4Html(makePack('Static lane closure with portable two-way traffic signals, signed diversion route and multi-phase traffic-management phase changeover',{traffic_management:true}),profile,emergency,4,1,'');
 assert.ok(staticTm.includes('Portable signals commissioned to the approved design'));
 assert.ok(staticTm.includes('Closure and signed diversion inspected before opening'));
 assert.ok(staticTm.includes('Each phase change recorded and accepted before release'));
 assert.ok(!staticTm.includes('Mobile lane closure vehicle, radio and supervisor record'));

 const mobileTm=packAsA4Html(makePack('Chapter 8 mobile lane closure (MLC)',{traffic_management:true}),profile,emergency,6,1,'');
 assert.ok(mobileTm.includes('MLC vehicle allocation, radio checks and traffic-flow decision recorded'));
 assert.ok(mobileTm.includes('Mobile lane closure vehicle, radio and supervisor record'));
 assert.ok(!mobileTm.includes('Portable signals commissioned to the approved design'));
 assert.ok(!mobileTm.includes('Closure and signed diversion inspected before opening'));
 assert.ok(!mobileTm.includes('Each phase change recorded and accepted before release'));
});

import { markPaid } from '../src/lib/safework/orders.mjs';
test('duplicate payment events preserve ready documents and a generation lease admits one worker',async()=>{
 const db=database();
 db.sql.prepare("INSERT INTO safework_orders(id,token_hash,input_json,amount,mode,session_id,status,created_at) VALUES('lease','hash','{}',1499,'test','cs_lease','unpaid',0)").run();
 const payment={id:'cs_lease',payment_status:'paid',amount_total:1499,currency:'gbp',livemode:false,metadata:{product:'tgd_safework_pack',order_id:'lease'}};
 assert.equal(await markPaid(db,payment),true);
 const claim=()=>db.sql.prepare("UPDATE safework_orders SET lease_until=100,attempts=attempts+1 WHERE id='lease' AND status='paid' AND lease_until<10 AND attempts<3").run().changes;
 assert.equal(claim(),1);assert.equal(claim(),0);
 db.sql.prepare("UPDATE safework_orders SET status='ready', document_html='saved' WHERE id='lease'").run();
 assert.equal(await markPaid(db,payment),true);
 assert.equal(db.sql.prepare("SELECT status FROM safework_orders WHERE id='lease'").get().status,'ready');
 assert.equal(await markPaid(db,{...payment,amount_total:1}),false);
 db.sql.close();
});

