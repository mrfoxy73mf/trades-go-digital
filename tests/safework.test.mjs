import { config, priceForDescription, validateInput, matchesPayment, token, digest } from '../src/lib/safework/orders.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('sales fail closed and live price cannot silently use the test price',()=>{
 assert.equal(config({}).enabled,false);
 assert.equal(config({SAFEWORK_MODE:'live',SAFEWORK_SALES_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_x',OPENAI_API_KEY:'x'}).enabled,false);
 assert.equal(config({SAFEWORK_SALES_ENABLED:'true',STRIPE_TEST_SECRET_KEY:'sk_live_x',OPENAI_API_KEY:'x'}).enabled,false);
});
test('each work-pack type uses its configured price',()=>{
 const c=config({SAFEWORK_SALES_ENABLED:'true',STRIPE_TEST_SECRET_KEY:'sk_test_x',OPENAI_API_KEY:'x'});
 assert.deepEqual(c.prices,{standard:2999,bundle:5999,motorwayTraffic:3499,trafficLights:2599});
 assert.deepEqual(priceForDescription(c,'Replace a timber gate'),{amount:2999,kind:'standard'});
 assert.deepEqual(priceForDescription(c,'TRAFFIC-MANAGEMENT JOB TYPE: MOTORWAY OR DUAL-CARRIAGEWAY LANE CLOSURE\nInstall a lane closure'),{amount:3499,kind:'motorway-traffic'});
 assert.deepEqual(priceForDescription(c,'TRAFFIC-MANAGEMENT JOB TYPE: PORTABLE TRAFFIC-LIGHT JOB WITHIN RED BOOK ROAD SCOPE\nInstall signals'),{amount:2599,kind:'traffic-lights'});
});
test('live sales require and use every configured work-pack price',()=>{
 const env={SAFEWORK_MODE:'live',SAFEWORK_SALES_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_x',OPENAI_API_KEY:'x',SAFEWORK_STANDARD_PRICE_PENCE:'2999',SAFEWORK_BUNDLE_PRICE_PENCE:'5999',SAFEWORK_MOTORWAY_TM_PRICE_PENCE:'3499',SAFEWORK_TRAFFIC_LIGHT_PRICE_PENCE:'2599'};
 const c=config(env);
 assert.equal(c.enabled,true);
 assert.equal(c.amount,2999);
 assert.equal(config({...env,SAFEWORK_TRAFFIC_LIGHT_PRICE_PENCE:undefined}).enabled,false);
});
test('input requires consent and preserves only accepted fields',()=>{
 const b={description:'Replace timber fencing',address:'Example site address',company:'Example Ltd',workerCount:2,reviewAccepted:true,processingAccepted:true,amount:1};
 assert.equal(validateInput(b).amount,undefined);
 assert.throws(()=>validateInput({...b,reviewAccepted:false}));
 assert.throws(()=>validateInput({...b,description:'x'.repeat(20001)}));
 assert.throws(()=>validateInput({...b,address:{}}));
 assert.equal(validateInput({...b,trialHoleSheets:10}).trialHoleSheets,10);
 assert.throws(()=>validateInput({...b,trialHoleSheets:21}));
 assert.equal(validateInput({...b,logoDataUrl:'data:image/png;base64,AAAA'}).logoDataUrl,'data:image/png;base64,AAAA');
 assert.throws(()=>validateInput({...b,logoDataUrl:'data:image/svg+xml;base64,AAAA'}));
 assert.throws(()=>validateInput({...b,logoDataUrl:'data:image/png;base64,'+'A'.repeat(40000)}));
});
test('payment must match the exact order, amount, product, mode and currency',()=>{
 const order={id:'one',session_id:'cs_test_one',amount:1499,mode:'test'};
 const s={id:order.session_id,payment_status:'paid',amount_total:1499,currency:'gbp',livemode:false,metadata:{product:'tgd_safework_pack',order_id:'one'}};
 assert.equal(matchesPayment(order,s),true);
 for(const override of [{payment_status:'unpaid'},{id:'cs_other'},{amount_total:1},{currency:'usd'},{livemode:true},{metadata:{product:'tgd_pdf_download',order_id:'one'}},{metadata:{product:'tgd_safework_pack',order_id:'two'}}]) assert.equal(matchesPayment(order,{...s,...override}),false);
});
test('recovery tokens are unpredictable and only their hashes are stored',async()=>{const a=token(),b=token();assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);assert.notEqual(await digest(a),a);});
