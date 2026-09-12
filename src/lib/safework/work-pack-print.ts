// Shared by browser printing and the self-contained downloaded HTML pack.
export const workPackPrintCss = `
@media print {
  @page { size: A4; margin: 12mm; }
  html,body { background:white!important; }
  .wp-document { overflow:visible; }
  .wp-sheet,.sheet { display:block!important; width:100%!important; max-width:none; min-height:0!important; height:auto; padding:0; margin:0 0 5mm!important; overflow:visible!important; box-shadow:none; break-after:auto!important; page-break-after:auto!important; }
  .wp-sheet-head,.sheet>header { margin:0 0 3mm; padding:3mm 0 2mm; font-size:9pt; break-after:avoid; }
  .wp-sheet-body,.sheet>main { display:block!important; padding:0; }
  .wp-sheet>footer,.sheet>footer { display:none; }
  .wp-section,.section { padding:2mm 0; break-inside:auto; }
  .wp-section h2,h2 { font-size:13pt; margin:3mm 0 2mm; break-after:avoid; }
  .wp-section h3,h3 { break-after:avoid; }
  .wp-section p,.wp-section li,.sheet p,.sheet li { font-size:10pt; line-height:1.35; orphans:3; widows:3; }
  .wp-two-col,.two { display:block; }
  .risk-entry { padding:2mm 0; border-bottom:1px solid #ccc; break-inside:auto; }
  .risk-entry h3 { font-size:11pt; margin:2mm 0; break-after:avoid; }
  .risk-entry p { margin:1mm 0; }
  .risk-entry ul { margin:2mm 0; padding-left:5mm; }
  .risk-entry li { break-inside:avoid; }
  .wp-sequence,.wp-sequence ul { display:block; }
  .wp-sequence>li,.sequence>li { padding:2mm 3mm; margin:0 0 2mm; border-radius:0; background:white; border-left:1px solid #999; break-inside:auto; }
  .wp-sequence>li:before { display:none; }
  .wp-sequence strong,.sequence strong { display:block; font-size:10pt; break-after:avoid; }
  .wp-sequence ul>li,.sequence ul>li { break-inside:avoid; }
  .wp-cover-sheet .wp-cover,.cover { display:block; min-height:0; padding:4mm!important; background:white!important; color:#111!important; border:1px solid #888; }
  .wp-cover-sheet .wp-company-brand,.brand { margin:0 0 3mm!important; }
  .wp-cover h1,.cover h1 { font-size:20pt; margin:3mm 0; }
  .wp-cover dd,.cover dd,.wp-cover dt,.cover dt,.status,.wp-cover>span,.brand small,.wp-company-brand small { color:#333!important; font-size:9pt; }
  .wp-cover dl>div,.cover dl div { padding:2mm 0; }
  .wp-company-brand>img,.brand img { max-height:12mm; max-width:40mm; }
  .wp-table-wrap { overflow:visible; }
  table,.wp-risk table,.wp-fill-table { min-width:0!important; width:100%; table-layout:fixed; }
  thead { display:table-header-group; }
  tr { break-inside:avoid; }
  th,td,.wp-risk th,.wp-risk td,.wp-fill-table th,.wp-fill-table td,.wp-hospital-table th,.wp-hospital-table td { font-size:9pt; line-height:1.3; padding:2mm; overflow-wrap:anywhere; }
  th,.wp-risk th,.wp-fill-table th,.wp-hospital-table th { background:#eee!important; color:#111!important; }
  td ul { padding-left:4mm; }
  .wp-risk td li { font-size:9pt; }
  .wp-fill-table td { min-height:8mm; height:8mm; }
  .wp-warning,.warning,.wp-sheet-note,.note { margin:2mm 0; padding:2mm; font-size:9pt; background:white; color:#222; break-inside:avoid; }
  .wp-warning p,.wp-sheet-note { font-size:9pt; }
  .wp-emergency-card,.emergency { margin:2mm 0; padding:3mm; background:#eee!important; color:#111!important; }
  .wp-emergency-card h2,.emergency h2,.wp-emergency-card dt { color:#111; }
  .wp-permit-meta { margin:2mm 0; font-size:9pt; }
  .wp-check-grid,.checks { font-size:9pt; padding:2mm; gap:2mm; }
  .wp-sketch-box,.sketch { height:55mm; }
}
`;
