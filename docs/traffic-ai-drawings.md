# AI map-assisted drawing: implementation and limits

## Audit of the existing AI

`src/lib/safework/generate.ts` calls the OpenAI Responses API, using the existing `OPENAI_API_KEY` and `SAFEWORK_MODEL` (fallback `gpt-5.4`). It embeds `runtime-knowledge.json` in its instructions. The traffic module contains Chapter 8 / Red Book guidance summaries and official source references. It does not retrieve the full publications or analyse maps at generation time. Its existing work-pack instructions explicitly require dimensions from an approved design rather than invented spacing/tapers. The work-pack pipeline and payment/order gating are unchanged.

## New drawing action

`/api/traffic-map/draft` re-fetches the exact selected Google map viewport on the server and supplies it as a base64 image to the same configured OpenAI model. It includes the traffic topics from that same runtime knowledge, user description, work start/direction, lane selection, entered dimensions and known review points. The model returns a strictly structured road trace, feature observations and essential questions. It never chooses the calculator's numerical standards.

For sufficiently clear, supported contexts, a deterministic projector places the existing calculator's geometry by chainage along the AI trace at the map's approximate Web Mercator scale. It does not compress approach distances or extrapolate outside the image. Work boundaries follow the trace in short quadrilateral strips. Symbols, signs, cones and tapers use the existing editable format and PDF/DXF/JSON workflow. A proposed works-access position is a label only: gaps, protection and swept paths remain manual. Map dimensions and AI alignment are provisional, not surveyed geometry or approval. Curves and offsets need review; source profile distances alone do not validate alignment/visibility.

Road map and aerial/hybrid views are available. A two-click measurement tool reports approximate straight-line distance and shows a temporary line. It does not auto-fill or silently declare lane widths surveyed. The measurement line is not exported.

## Current supported scope

This first integration uses existing profiles only: single-carriageway two-way portable signals and a single outside lane on 2–4 lane dual/motorway carriageways. The existing equal-lane 3.6–4 m profile constraints are retained. It does not implement interior/multiple-lane closures, slip-road/junction/roundabout layouts, shoulder-specific closures, temporary speed restrictions, automatic permit/sign-off or signal timings. AI/marked complex features, low confidence, questions, unsupported dimensions, misaligned traces and insufficient map coverage return actionable review messages without replacing the drawing. Absence of a detected feature is not evidence that none exists. No “90% accurate” claim is made.

## Operations

No new AI key is required. Google Maps Static API and existing server key remain required. Wrangler adds `TRAFFIC_AI_RATE_LIMITER` (namespace `732732`, one request per IP per 60 seconds, approximate and per Cloudflare location). This is not a billing cap. Requests require same-origin Origin, bounded input and validated points. API errors are sanitised; provider keys/URLs are not passed to the model. `store:false`; image bytes are not persisted in project JSON. The GET endpoint exposes a capability boolean only. A result is discarded if map/inputs change during its request. Existing drawing replacement asks confirmation and can be undone.

## Verification

Tests mock Google/OpenAI, assert actual image input, knowledge selection, structured output validation, editable geometry, curve projection, no extrapolation/clipping, unsupported/complex review behaviour, origin/rate limits and provider errors. Live vision quality and real site design suitability require separate evaluation; mocked tests do not establish those properties.
