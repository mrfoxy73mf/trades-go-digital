import type { APIRoute } from "astro";
import { handleMapRequest } from "../../../lib/traffic-management/map-service.mjs";
export const prerender = false;
export const ALL: APIRoute = ({ request, locals }) =>
  handleMapRequest(request, locals.runtime.env);
