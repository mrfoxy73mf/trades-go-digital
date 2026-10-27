import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const knowledge=JSON.parse(await readFile(new URL('../src/lib/safework/runtime-knowledge.json',import.meta.url),'utf8'));
const topic=knowledge.topics.find(t=>t.id==='temporary-traffic-management-street-works');
const library=topic.layout_design_knowledge;
test('layout cases are inside the existing traffic topic supplied to both AI consumers',()=>{
 assert(library);assert.equal(library.checked_on,'2026-10-27');
 const aiTopics=knowledge.topics.filter(t=>/traffic/i.test(t.id+' '+t.title));
 assert(aiTopics.some(t=>t.layout_design_knowledge===library));
 for(const id of ['dual-carriageway-open-slip-or-junction','closed-exit-slip-road','closed-entry-slip-road','at-grade-junction','roundabout-entry-exit-circulatory','works-access-and-exit','layby-and-roadside-access','installation-inspection-and-removal'])assert(library.cases.some(c=>c.id===id),id);
});
test('every layout citation resolves to an official source and valid page reference',()=>{
 const lengths={'dft-ch8-part1-design-2009':335,'dft-ch8-part2-operations-2009':231,'dft-ch8-part3-update-2020':177,'dft-red-book-2013-pdf':108};
 const catalogue=new Map(library.sources.map(s=>[s.id,s]));
 const globalIds=new Set(knowledge.official_sources.sources.map(s=>s.id));
 for(const c of library.cases){assert(c.references.length>0);for(const r of c.references){assert(catalogue.has(r.source_id));assert(globalIds.has(r.source_id));const s=catalogue.get(r.source_id);assert.equal(new URL(s.url).hostname,'assets.publishing.service.gov.uk');assert(r.sections.length);assert.equal(r.printed_pages.length,r.pdf_pages.length);r.pdf_pages.forEach((p,i)=>{assert(Number.isInteger(p)&&p>0&&p<=lengths[s.id]);assert.equal(p-r.printed_pages[i],s.printed_to_pdf_offset);});}}
});
test('distinct slip-road and roundabout cases retain their plan context',()=>{
 const find=id=>library.cases.find(c=>c.id===id);
 assert(find('closed-entry-slip-road').references.some(r=>r.plans.includes('SRC2')));
 assert(find('closed-exit-slip-road').references.some(r=>r.plans.includes('SRC1')));
 assert.match(find('dual-carriageway-open-slip-or-junction').guidance.join(' '),/not generic/);
 assert.deepEqual(Object.keys(find('roundabout-entry-exit-circulatory').case_selection),['A','B','C','D']);
 assert.match(find('layby-and-roadside-access').guidance.join(' '),/survey/);
});
test('works-access values keep metres, face units and applicability separate',()=>{
 const d=library.cases.find(c=>c.id==='works-access-and-exit').source_specific_distances;
 assert.match(d.applies_only_to,/DWA1/);
 assert.equal(d.access_advance_sign.position_m_before_access,100);
 assert.equal(d.access_advance_sign.illustrated_face_distance_yards,100);
 assert(d.qualifications.some(q=>/different 100-yard/.test(q)));
});
