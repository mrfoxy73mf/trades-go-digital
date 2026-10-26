# Traffic-management drawings and calculated drafts

The Traffic Management page offers **Create a drawing** and **Upload an existing drawing** above the existing work-pack form. Drawing data does not change checkout prices, order payloads or paid-pack generation and is not attached to orders.

## Automatic calculation followed by manual editing

Enter the road/layout, **permanent** speed limit, modelled carriageway width, working-space width/length, lanes, closed side and works-start chainage. Generate an editable core layout and a calculation report containing:

- Entry/exit taper lengths and chainages, safety clearance and works limits.
- Advance-sign and end-sign schedules, including approach/side, identifiers and provisional positions.
- Entry, straight-boundary and exit cone counts; the total counts shared endpoints once.
- Specified cone height, first-sign visibility requirement, exclusions and source references.

For **two-way portable signals**, support is limited to a simple, two-lane single carriageway (20–60 mph), without affected junctions, level crossings or guide islands. Tapers are 45° with cones at no more than 1.2 m along the line, the straight boundary uses no more than 9 m, and the WAIT HERE separation must not exceed 300 m. Remaining general-traffic shuttle width must be at least 3 m; widths outside the desirable 3.25–3.50 m range prompt review. WAIT HERE positions use the 15 m baseline, which may need increasing for swept paths. Signal-head symbols are indicative positions requiring visibility checks. No signal timing is calculated.

The road-works warning position uses the upper end of the Red Book advance-distance range (45, 110 or 450 m); this is a draft choice within the published range, not proof of suitable siting. Signals-ahead and road-narrows signs are provisionally distributed in the correct sequence between that sign and WAIT HERE. The guidance does not prescribe their exact intermediate gaps. These positions are explicitly identified as **PROVISIONAL SITING** in the report and need site review. End signs are included even where optional for a short site.

For **dual-carriageway/motorway closures**, support is limited to one closed lane, standard works, 2–4 lanes on the modelled carriageway, 3.6–4 m lane widths and working space plus safety clearance contained within that lane. Dual carriageways support permanent limits 30–70 mph, motorways 50–70 mph. Entry tapers are 100/150/200 m per closed lane for ≤40 / 50–60 / 70 mph respectively. These fixed standard-lane lengths come from plans DZB1–3; arbitrary width/ratio and relaxation profiles are not offered. Entry cone counts follow Table A1.3 note 4's longitudinal formula, yielding 35/101/135 cones for those three cases. Exit tapers are 45° with maximum 1.2 m along-line spacing; straight runs use 9 m. Minimum entry/exit clearances depend on the permanent limit. End signs are 45 or 90 m downstream of the last cone. Paired approach/lane-change signs follow DZA1–3 and DZB4–6. Congestion adds the documented longer advance stations; further queue-related extensions still need assessment.

The cone total covers **one entry taper, one traffic-facing straight boundary and one exit taper only**. It excludes spares, additional shoulder/access/pedestrian runs, separate sign-protection cones, lamps and other site-specific equipment. A nearside closure involving a hard shoulder is rejected because additional shoulder geometry is not modelled. Mobile working, multiple closed lanes, stepped tapers, contraflow, temporary speed-limit signing, junction/multi-phase control, guide islands and bespoke situations require a separate competent design. The diagram is explicitly a core design aid, not a complete approved installation plan.

Generated positions are compressed into readable drawing zones, **not a scale drawing**. Use the numerical chainage schedule for measured distances. Cone symbols match the calculated core quantity. All generated items can subsequently be selected, moved, edited, added or removed with the existing manual tools. The displayed live cone-symbol count reflects the drawing. Any manual mutation invalidates/removes the previous calculated report rather than presenting stale chainages as recalculated values. Changing form inputs prompts regeneration; it does not silently alter the current drawing. Undo restores geometry, but a cleared report must be regenerated.

The report is included as notes below DXF geometry, as additional pages in PDF, in editable project JSON, and as a downloadable text report. Imported reports are explicitly marked unverified. Symbols are illustrative; prescribed sign artwork, permitted distance plates, bilingual requirements and final siting must be checked separately.

## Sources and audit

Verified against the official DfT files linked from these government publication pages on 26 October 2026:

- [Safety at Street Works and Road Works](https://www.gov.uk/government/publications/safety-at-street-works-and-road-works), 2013 code, pp. 17, 52, 62–65 and inside back cover (setting-out table and notes 2, 3, 5). This code excludes motorways and dual carriageways ≥50 mph.
- [Traffic Signs Manual](https://www.gov.uk/government/publications/traffic-signs-manual), Chapter 8 Part 1 (2009), Table 3.1, A1.1, A1.3 notes 3–9, A1.5 Details B/C1, DZA1–3, DZB1–6, DZE1 and D6.19.3; Part 3 (2020) updates reviewed. Standard works only; no relaxation calculations.

These are bounded applications of published baseline layouts, not certification that a particular site meets the guidance or every local/network requirement. The designer must verify actual surveyed geometry, visibility, flows, queue extent, swept paths, access, lighting, permits and authority instructions. Do not infer approval from a successful calculation.

## Manual tools and storage

Select a tool, drag roads/barriers/works areas or click to place cones, signs, traffic lights and labels. Select/move repositions items; coordinate controls and the item selector provide a keyboard alternative. Delete, undo, new drawing and text editing are available.

Layouts autosave to the current origin's browser localStorage (`tgd-tm-draft-v1`); calculated reports use a companion key paired to the exact saved geometry. Storage can be unavailable, shared with other users of the browser profile, cleared or overwritten by another tab. The UI reports failures. No data goes to the application server. Save an editable project to retain/reopen it elsewhere. PDF/DXF are exports, not project backups. Opening a project replaces the current draft after confirmation.

## Existing files

Accepts non-empty DXF, DWG, PDF, PNG, JPEG, WebP, GIF and BMP up to 20 MB. Originals stay unchanged and can be downloaded. Selected files remain in tab memory; reload removes them. No server upload, account storage, conversion or checkout attachment occurs.

ASCII DXF previews support LINE, CIRCLE, TEXT and straight LWPOLYLINE. Unsupported entities are counted; blocks, arcs, dimensions, bulges, references and CAD styling are not rendered. Binary/malformed DXF retains the original download. DWG has no preview: use a CAD viewer or export an interchange file. PDF uses the browser viewer with a fixed PDF MIME type; images use browser decoding. File names, report content and DXF text are inserted as text, never HTML.

## Validation

- `node --test tests/*.test.mjs`: source-table taper counts, both sign schedules, bidirectional signal/end positions, clearance and chainage arithmetic, 300 m and width/scope rejection, unique cone counting, generated-symbol quantities, report/DXF export, and existing payment/fulfilment/SafeWork tests.
- `npm run check`: fulfilment tests, production build, TypeScript and Wrangler deployment dry run. Does not deploy.
- Browser checks exercise generation, report persistence, manual edits/invalidation, exports, unsupported inputs, upload controls, checkout selection and mobile layout.
