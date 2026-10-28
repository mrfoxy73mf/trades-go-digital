import type { APIRoute } from "astro";
import { handleEnquiry } from "../../lib/enquiry.mjs";

export const prerender = false;
export const POST: APIRoute = ({ request, locals }) => handleEnquiry(request, locals.runtime.env);
