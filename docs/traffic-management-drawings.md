# Traffic-management drawings

The two drawing options are on `/traffic-management`, above the existing work-pack checkout. Drawings do not change checkout prices, order payloads or paid-pack generation, and are not attached to orders.

## Create

Select a tool, then drag roads, barriers and works areas or click to place cones, signs, traffic lights and labels. Select/move allows repositioning. The coordinate controls and item selector provide a keyboard alternative. Text can be edited for a selected sign, works area or label. Delete, undo and new-drawing controls are available.

Layouts autosave to the current origin's browser localStorage (`tgd-tm-draft-v1`). Storage can be unavailable, shared with other users of the same browser profile, cleared or overwritten by another tab. The UI reports save failures. No drawing data is sent to the application server. Save an editable JSON project for later editing or transferring between devices; DXF and PDF are exports, not editable-project backups. Opening a project replaces the current browser draft after confirmation.

PDF is a landscape A4 vector export. ASCII DXF contains LINE, CIRCLE and TEXT entities on the TM_DRAFT layer. Both include a draft/review warning. Symbols and sketch units are illustrative, not approved signs or surveyed dimensions. Layouts must be reviewed by a competent traffic-management designer before use; the editor does not determine spacing, signal timings, permits or compliance.

## Existing files

Accepts non-empty DXF, DWG, PDF, PNG, JPEG, WebP, GIF and BMP files up to 20 MB. Originals remain byte-for-byte unchanged and available through Download original. Files stay in tab memory only; reloading loses the selection. No server upload, account storage, conversion or checkout attachment occurs.

ASCII DXF previews support LINE, CIRCLE, TEXT and straight LWPOLYLINE entities. Unsupported entities are counted; blocks, arcs, dimensions, bulges, external references and CAD styling are not rendered. The preview is explicitly partial. Binary or malformed DXF falls back to the original download. DWG has no browser preview: use a compatible CAD viewer or export a supported interchange file in CAD. PDF uses the browser's native viewer with a fixed PDF MIME type; a reader download fallback is provided. Images use browser decoding. File names and DXF text are inserted as text, not HTML.

## Validation

- `node --test tests/*.test.mjs`: existing fulfilment/payment/SafeWork tests plus DXF round-trip, unsupported geometry and project validation.
- `npm run check`: fulfilment tests, production build, TypeScript and Wrangler deployment dry run (does not deploy).
- Browser checks during implementation: all tools, local autosave restore, text edits, delete/undo, all exports, DXF preview and unchanged-original download, PDF/image previews, DWG and invalid-DXF messages, existing job choice/pricing and mobile overflow.

Keep network credentials out of drawing files. Live checkout and AI generation are outside the drawing editor workflow.
