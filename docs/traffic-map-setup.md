# Location based traffic management drafts

The drawing editor now starts with a location search (postcode/address or what3words), an owner-configured road map, and start/end markers for the working section. Adjust the map before drawing. Search results must be explicitly selected to avoid assuming an ambiguous postcode or road name is the correct site.

## Owner setup

Live location search is not activated merely by deploying this code. No provider keys or subscriptions were created or charged during development.

1. In a Google Cloud project, enable Geocoding API and Maps Static API with billing and appropriate quotas/budget alerts. Create a server API key restricted to these two APIs, and apply provider-supported application restrictions suitable for the deployment. Do not use an unrestricted browser key.
2. Add `GOOGLE_MAPS_SERVER_KEY` as a Cloudflare Worker secret. For local development put it in `.dev.vars`, which must stay untracked.
3. For what3words input, add `WHAT3WORDS_API_KEY` as a Worker secret. The provider plan must support `convert-to-coordinates`; its basic free/autosuggest-only plan does not enable this operation.
4. Deploy with the `TRAFFIC_MAP_RATE_LIMITER` binding from `wrangler.json`. Namespace 732731 is reserved here for these endpoints; use a different account-unique positive namespace if already allocated. Requests are limited per caller IP, per Cloudflare location. Configure hard provider quotas separately; rate limiting is not a billing cap.
5. Review Google Maps Platform's current terms, attribution, privacy and permitted export uses for your commercial application before enabling live use. Provide your own publicly accessible privacy notice and terms, describing that location queries go to Google or what3words. The editor links to provider policies and informs the user about location-provider processing.

The API never returns credentials to the browser or exposes an arbitrary proxy URL. Searches are explicit (not autocomplete), restricted to UK address results, use request timeouts and bounded input. Cross-origin POSTs and unconfigured rate limits fail closed. Provider errors shown to users do not include raw responses/keys. Static map imagery passes through without caching; its original attribution remains visible.

## What is implemented

- Postcode/address via Google Geocoding; what3words via its coordinate conversion endpoint.
- Full Google Maps road image as the SVG background, with zoom/re-centre controls. Editing begins after the map snapshot is chosen.
- Two points indicate the road centreline at the start/end of the works, in primary travel direction. The operator enters the surveyed works length and lane widths. Map/measurement discrepancies greater than 30% reject generation rather than stretching the plan to fit.
- Lane widths begin at 3 m, explicitly labelled assumed. Each lane can be changed, with total width calculated from the inputs and assumption/survey provenance included in the report. The existing restricted equal-lane profile is not relaxed; unequal dual/motorway lanes require manual design.
- Straight-road geometry uses the map's Web Mercator scale and marked road bearing. Signing and cones are placed by computed chainage, not using the old independently compressed schematic zones. If the full closure/signing extends outside the chosen view, generation rejects with an instruction to zoom out. It never clamps signs into view.
- Junction/access/crossing review points can be marked. Selecting complex site or adding review points blocks the simple automatic calculator. Roundabouts and multiple approaches remain manual design tasks using the map and editing tools. No automatic visual recognition or surveyed lane extraction is claimed.
- Improved orange/white cones, filled signal lamps, distinct sign faces derived from actual schedule labels, a sign-face selector and view zoom/pan controls. Crowded sign/signal faces move into callouts with leader lines and dots retaining their original marked positions. Unknown sign IDs remain generic. Old saved projects with schedule text can recover their actual sign faces.
- PDF includes the map, symbols and marked review features. DXF exports vector outlines only and explicitly states map imagery is omitted and coordinates are sketch units. Editable JSON stores map metadata/alignment/features, not map image bytes; the map is fetched again when reopening. Coordinates expire after 29 days and require a refreshed search. A failed map restore pauses PDF export rather than silently producing an incomplete plan.

## Limits

A map is road context, not a survey or approved TM drawing. Map markings/accesses can be missing or stale. No network topology lookup, automatic roundabout planning, visibility/queue modelling, signal timing, permits or site approval is added. The user must check every affected approach and actual safe sign siting. Symbol footprints are illustrative; dense generated cone runs can overlap at overview scale.

## Validation

`npm run check` runs fulfilment and traffic tests, Astro build, TypeScript and Cloudflare dry-run packaging. Map endpoint tests mock providers and check key separation, failed setup, request limits, projection, map-aligned geometry, legacy symbol interpretation and original image preservation. Provider keys are not required for these tests. Live provider connectivity and billing require owner setup and a separate live check.

Primary references: https://developers.google.com/maps/documentation/maps-static/overview ; https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding ; https://developer.what3words.com/public-api/docs ; https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

Headless Chromium smoke check passed using mocked map/search responses: location selection, map loading, two-point alignment, per-lane measurements, mapped draft generation, symbols, PDF/JSON downloads, restored map overlays, junction rejection and mobile zoom/pan. The PDF was rendered and visually inspected with its full fixture attribution retained. No live provider call was tested.
