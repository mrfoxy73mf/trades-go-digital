# Traffic layout knowledge research - 27 October 2026

The existing `temporary-traffic-management-street-works` topic in `src/lib/safework/runtime-knowledge.json` now contains `layout_design_knowledge`. It includes nine contextual cases, paragraph/plan references, printed and PDF page numbers, separately labelled application inferences, and four official PDF sources. Both the work-pack generator (full runtime knowledge) and deployed drawing analyser (traffic topics) already include this topic, so no prompt/endpoint changes are needed to supply the addition.

## Sources checked

- [GOV.UK Traffic Signs Manual publication](https://www.gov.uk/government/publications/traffic-signs-manual): Parts 1 and 2 (2009), Part 3 update (2020).
- [Part 1: Design](https://assets.publishing.service.gov.uk/media/5a74adeaed915d7ab83b5ab2/traffic-signs-manual-chapter-08-part-01.pdf): D3.3 lane width, D3.6 taper siting, D3.21 works access, D3.26.14 layby survey case, D5.14 junctions, D5.16 roundabouts/SC13, D6.15-19 dual-carriageway zones, D6.21/SRC1-2 slip closures, and D6.22/DWA1-3 access and exit.
- [Part 2: Operations](https://assets.publishing.service.gov.uk/media/5a7cc632e5274a38e5756aa3/traffic-signs-manual-chapter-08-part-02.pdf): taper positions, setting out, inspections, maintenance, removal, permanent-sign conflicts and signal control at side roads.
- [Part 3: Update](https://assets.publishing.service.gov.uk/media/5e7a3a1a86650c37182f78d3/Traffic_Signs_Manual_-_chapter_8.3.pdf): U2.15 fixed taper positions and U7.2 slip-road closure diversion signing.
- [Red Book publication](https://www.gov.uk/government/publications/safety-at-street-works-and-road-works) and [official PDF](https://assets.publishing.service.gov.uk/media/5a7d8038e5274a676d532707/safety-at-streetworks.pdf): scope, dual carriageways, junctions (printed pp.43-46), roundabouts (pp.47-49) and setting out.
- [National Highways Chapter 8 status](https://nationalhighways.co.uk/work-with-us/suppliers/design-standards-and-specifications/traffic-signs-manual-chapter-8/): announces unified republication expected November 2026. It is not treated as already replacing the GOV.UK editions checked today.

The official PDFs were read locally; SRC1, SC13 and the works-access text were visually checked. The file retains source context instead of copying diagram artwork or treating extracted dimensions as universal defaults. Source pages are linked for rechecking; the model is not given a browsing tool merely by receiving a URL.

## Important distinctions preserved

An open slip alongside works is different from a slip closure. DZD6/DZD7 address segregated contraflow-by-destination, not every ordinary merge. Roundabout entrances, circulation, full obstruction and exits have different SC13 cases. The layby survey guide-island example is not a universal layby layout. The app's 3.6-4 m lane range remains a particular implemented-profile restriction, not a universal rule for all Chapter 8 designs.

DWA1-3 works-access examples contain position distances in metres while illustrated sign-face plates use yards. These are stored as separate values with their conditions. The distinct partial-contraflow exit wording is not silently converted into the same default.

## Application boundary

This change adds knowledge for the AI to reason from. It does **not** implement missing branch, merge, diversion or roundabout drawing geometry, and does not change any existing generator blocks. A proposed draft can identify pending authority decisions without claiming they are approved. Live drawing support must be implemented and tested separately before the application claims those cases can be completed automatically.

Only the runtime knowledge, this research note and knowledge-reference tests belong to this change. Unpublished single-marker workflow edits are excluded.
