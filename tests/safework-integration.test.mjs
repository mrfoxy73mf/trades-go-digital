import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';
mkdirSync('tmp/safework-tests',{recursive:true});
await build({entryPoints:['src/pages/api/safework/checkout.ts','src/pages/api/safework/order.ts','src/pages/api/safework/generate.ts','src/pages/api/safework/download.ts','src/lib/safework/generate.ts'],outbase:'src',outdir:'tmp/safework-tests',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const checkout=await import('../tmp/safework-tests/pages/api/safework/checkout.mjs');
const order=await import('../tmp/safework-tests/pages/api/safework/order.mjs');
const generate=await import('../tmp/safework-tests/pages/api/safework/generate.mjs');
const download=await import('../tmp/safework-tests/pages/api/safework/download.mjs');
const {workPackSchema}=await import('../tmp/safework-tests/lib/safework/generate.mjs');
function sample(s){if(s.type==='string')return 'Example <script>alert(1)</script>';if(s.type==='boolean')return false;if(s.type==='integer')return 1;if(s.type==='array')return [sample(s.items)];return Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,sample(v)]));}
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('migrations/0003_safework.sql','utf8'));return {sql,prepare(q){let args=[];return {bind(...a){args=a;return this},async first(){return sql.prepare(q).get(...args)||null},async run(){return {meta:{changes:Number(sql.prepare(q).run(...args).changes)}}}}}};}
test('purchase → unpaid rejection → paid → failed generation → retry → private repeat download',async()=>{
 const db=database();const env={FULFILMENT_DB:db,SAFEWORK_SALES_ENABLED:'true',STRIPE_TEST_SECRET_KEY:'sk_test_fixture',OPENAI_API_KEY:'fixture'};
 let session, paid=false, fail=true, calls=0;
 const original=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{
  if(String(url).includes('api.stripe.com') && opts.method==='POST'){const p=opts.body;session={id:'cs_test_fixture',url:'https://checkout.stripe.com/test',payment_status:'unpaid',currency:'gbp',amount_total:1499,livemode:false,metadata:{product:p.get('metadata[product]'),order_id:p.get('metadata[order_id]')}};return Response.json(session);}
  if(String(url).includes('api.stripe.com'))return Response.json({...session,payment_status:paid?'paid':'unpaid'});
  calls++;if(fail)return Response.json({error:{message:'Simulated outage'}},{status:503});return Response.json({output_text:JSON.stringify(sample(workPackSchema))});
 };
 const context=(request)=>({request,locals:{runtime:{env}}});
 try {
 const input={description:'Replace timber fencing with two workers',address:'Example site address',company:'Test Company',companyAddress:'',contact:'',emergency:'',workerCount:2,reviewAccepted:true,processingAccepted:true};
 const r=await checkout.POST(context(new Request('https://example.test/api/safework/checkout',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(input)})));
 assert.equal(r.status,200);const created=await r.json();const u=new URL(created.returnUrl);const id=u.searchParams.get('id');const headers={Authorization:`Bearer ${u.hash.slice(1)}`};
 const req=(route,method='GET',auth=headers)=>new Request(`https://example.test/api/safework/${route}?id=${id}`,{method,headers:auth});
 assert.equal((await generate.POST(context(req('generate','POST')))).status,402);
 assert.equal((await download.GET(context(req('download')))).status,404);
 assert.equal((await order.GET(context(req('order','GET',{})))).status,404);
 paid=true;assert.equal((await (await order.GET(context(req('order')))).json()).status,'paid');
 assert.equal((await generate.POST(context(req('generate','POST')))).status,502);
 fail=false;assert.equal((await generate.POST(context(req('generate','POST')))).status,200);
 assert.equal((await generate.POST(context(req('generate','POST')))).status,200);assert.equal(calls,2);
 const doc=await download.GET(context(req('download')));assert.equal(doc.status,200);const html=await doc.text();assert.ok(html.includes('Test Company'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('RAMS briefing'));
 assert.equal((await download.GET(context(req('download','GET',{Authorization:'Bearer '+ 'a'.repeat(64)})))).status,404);
 assert.equal((await download.GET(context(req('download')))).status,200);
 assert.equal(db.sql.prepare('SELECT attempts FROM safework_orders').get().attempts,2);
 } finally {globalThis.fetch=original;db.sql.close();}
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
