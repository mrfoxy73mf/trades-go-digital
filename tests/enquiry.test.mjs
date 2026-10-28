import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEnquiry } from '../src/lib/enquiry.mjs';
const origin = 'https://trades-go-digital.co.uk';
const env = { RESEND_API_KEY: 'test-key', TRAFFIC_MAP_RATE_LIMITER: { limit: async () => ({ success: true }) } };
function request(overrides = {}, headers = {}) {
 const data = new FormData();
 for (const [key, value] of Object.entries({ Name: 'Example Trader', 'Business name': '', Trade: 'Plumber', Contact: 'example@example.com', Message: 'Launch information please.', ...overrides })) data.set(key, value);
 return new Request(`${origin}/api/enquiry`, { method: 'POST', body: data, headers: { Origin: origin, Accept: 'application/json', ...headers } });
}
const neverSend = () => { throw new Error('Must not contact provider'); };
test('sends only to the business and confirms provider acceptance', async () => {
 let payload;
 const response = await handleEnquiry(request(), env, async (url, init) => {
  assert.equal(url, 'https://api.resend.com/emails');
  payload = JSON.parse(init.body);
  return Response.json({ id: 'test-delivery' });
 });
 assert.equal(response.status, 200);
 assert.deepEqual(await response.json(), { sent: true });
 assert.deepEqual(payload.to, ['hello@trades-go-digital.co.uk']);
 assert.equal(payload.reply_to, 'example@example.com');
 assert.match(payload.text, /Launch information please/);
});
test('accepts a phone contact without setting an email reply-to', async () => {
 const response = await handleEnquiry(request({ Contact: '07700 900000' }), env, async (_, init) => {
  assert.equal(JSON.parse(init.body).reply_to, undefined);
  return Response.json({ id: 'test-delivery' });
 });
 assert.equal(response.status, 200);
});
test('rejects cross-origin submissions', async () => assert.equal((await handleEnquiry(request({}, { Origin: 'https://example.com' }), env, neverSend)).status, 403));
test('rejects invalid and missing fields', async () => {
 for (const fields of [{ Name: '' }, { Contact: 'bad' }, { Message: 'x'.repeat(4001) }, { Website: 'spam' }]) assert.equal((await handleEnquiry(request(fields), env, neverSend)).status, 400);
});
test('rate limits before sending', async () => assert.equal((await handleEnquiry(request(), { ...env, TRAFFIC_MAP_RATE_LIMITER: { limit: async () => ({ success: false }) } }, neverSend)).status, 429));
test('does not claim success when email is not configured', async () => {
 const response = await handleEnquiry(request(), {}, neverSend);
 assert.equal(response.status, 503);
 assert.equal((await response.json()).sent, false);
});
test('handles rejected and unavailable email provider without leaking details', async () => {
 for (const send of [async () => Response.json({ message: 'private provider detail' }, { status: 403 }), async () => { throw new Error('private provider detail'); }, async () => Response.json({})]) {
  const response = await handleEnquiry(request(), env, send);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private provider detail/);
 }
});
test('supports HTML form success without JavaScript', async () => {
 const response = await handleEnquiry(request({}, { Accept: 'text/html' }), env, async () => Response.json({ id: 'test-delivery' }));
 assert.equal(response.status, 303);
 assert.equal(response.headers.get('Location'), '/contact/?enquiry=sent#tgd-enquiry');
});
