import type { APIRoute } from "astro";
import { createSupportTicket } from "../../../lib/support.mjs";
export const prerender = false;
export const POST: APIRoute = ({ request, locals }) => createSupportTicket(request, locals.runtime.env);
