import type { APIRoute } from 'astro';
import { authorisedOrder, json } from '../../../lib/safework/orders.mjs';

export const prerender = false;

const clean = (value: unknown, max = 2000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.FULFILMENT_DB;
  const order = await authorisedOrder(request, db);
  if (!order || order.status !== 'ready') return json({ error: 'The paid work pack is not available.' }, 404);

  const feedback = await db.prepare(
    'SELECT rating, comments, contact_allowed, created_at, updated_at FROM safework_feedback WHERE order_id = ?',
  ).bind(order.id).first();

  return json({
    submitted: Boolean(feedback),
    feedback: feedback ? {
      rating: feedback.rating,
      comments: feedback.comments,
      contactAllowed: Boolean(feedback.contact_allowed),
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
    } : null,
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.FULFILMENT_DB;
  const order = await authorisedOrder(request, db);
  if (!order || order.status !== 'ready') return json({ error: 'The paid work pack is not available.' }, 404);

  const body = await request.json().catch(() => null) as any;
  const rating = Number(body?.rating);
  const comments = clean(body?.comments);
  const contactAllowed = body?.contactAllowed === true ? 1 : 0;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: 'Choose a rating from 1 to 5.' }, 400);
  }

  const now = Date.now();
  await db.prepare(
    `INSERT INTO safework_feedback(order_id,rating,comments,contact_allowed,created_at,updated_at)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(order_id) DO UPDATE SET
       rating=excluded.rating,
       comments=excluded.comments,
       contact_allowed=excluded.contact_allowed,
       updated_at=excluded.updated_at`,
  ).bind(order.id, rating, comments, contactAllowed, now, now).run();

  return json({ submitted: true });
};

