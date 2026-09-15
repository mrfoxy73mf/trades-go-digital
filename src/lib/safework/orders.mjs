export const PRODUCT = 'tgd_safework_pack';
export const INCLUDED_TRIAL_HOLE_SHEETS = 5;
export const EXTRA_TRIAL_HOLE_SHEET_PENCE = 100;
export function config(env) {
 const mode = env.SAFEWORK_MODE === 'live' ? 'live' : 'test';
 const key = mode === 'live' ? env.STRIPE_SECRET_KEY : env.STRIPE_TEST_SECRET_KEY;
 const amount = mode === 'live' ? Number(env.SAFEWORK_PRICE_PENCE) : 1499;
 const enabled = env.SAFEWORK_SALES_ENABLED === 'true' && Boolean(key && env.OPENAI_API_KEY) && Number.isSafeInteger(amount) && amount >= 50 && amount <= 100000 && key.startsWith(mode === 'live' ? 'sk_live_' : 'sk_test_');
 return { mode, key, amount, enabled };
}
export const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
export async function digest(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), x => x.toString(16).padStart(2,'0')).join(''); }
export function token() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2,'0')).join(''); }
export function validateInput(body) {
 if (!body || typeof body !== 'object') throw new Error('Enter your job details.');
 const text = (name, min, max) => { const value = typeof body[name] === 'string' ? body[name].trim() : ''; if(value.length < min || value.length > max) throw new Error(`Check ${name}: enter ${min}–${max} characters.`); return value; };
 if (body.reviewAccepted !== true || body.processingAccepted !== true) throw new Error('Confirm document review and data processing before continuing.');
 const workerCount=Number(body.workerCount); if(!Number.isSafeInteger(workerCount) || workerCount < 1 || workerCount > 50) throw new Error('Enter the number of workers, from 1 to 50.');
 const trialHoleSheets=body.trialHoleSheets===undefined?1:Number(body.trialHoleSheets); if(!Number.isSafeInteger(trialHoleSheets) || trialHoleSheets < 1 || trialHoleSheets > 20) throw new Error('Choose between 1 and 20 trial-hole sheets.');
 return { description: text('description', 8, 20000), address: text('address', 5, 500), company: text('company', 1, 200), companyAddress: text('companyAddress', 0, 500), contact: text('contact', 0, 200), emergency: text('emergency', 0, 1500), workerCount, trialHoleSheets };
}
export function matchesPayment(order, session) {
 return session.id === order.session_id && session.payment_status === 'paid' && session.metadata?.product === PRODUCT && session.metadata?.order_id === order.id && session.amount_total === order.amount && session.currency === 'gbp' && session.livemode === (order.mode === 'live');
}
export async function stripe(key, path, params, idempotency) {
 const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: params ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, ...(params ? {'Content-Type':'application/x-www-form-urlencoded'} : {}), ...(idempotency ? {'Idempotency-Key':idempotency} : {}) }, body: params, signal: AbortSignal.timeout(20000) });
 if (!response.ok) throw new Error('Payment service unavailable. Please retry shortly.');
 return response.json();
}
export async function authorisedOrder(request, db) {
 const id = new URL(request.url).searchParams.get('id') || '';
 const supplied = request.headers.get('Authorization')?.replace(/^Bearer /,'') || '';
 if (!/^[a-f0-9]{64}$/.test(supplied)) return null;
 return db.prepare('SELECT * FROM safework_orders WHERE id = ? AND token_hash = ?').bind(id, await digest(supplied)).first();
}
export async function markPaid(db, session) {
 const order = await db.prepare('SELECT * FROM safework_orders WHERE session_id = ?').bind(session.id).first();
 if (!order || !matchesPayment(order, session)) return false;
 await db.prepare("UPDATE safework_orders SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'unpaid'").bind(Date.now(), order.id).run();
 return true;
}
export async function rateLimit(db, ip) {
 const now = Date.now(); const bucket = Math.floor(now / 3600000);
 const key = await digest(`${ip}:${bucket}`);
 await db.prepare('DELETE FROM safework_rate_limits WHERE expires_at < ?').bind(now).run();
 const row = await db.prepare('INSERT INTO safework_rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, now+3600000).first();
 return row.count <= 8;
}
