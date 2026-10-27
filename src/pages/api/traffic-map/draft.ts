import type { APIRoute } from 'astro';
import knowledge from '../../../lib/safework/runtime-knowledge.json';
import { handleAiDraft } from '../../../lib/traffic-management/ai-service.mjs';
export const prerender = false;
export const ALL: APIRoute = ({request,locals}) => handleAiDraft(request,locals.runtime.env,knowledge);
