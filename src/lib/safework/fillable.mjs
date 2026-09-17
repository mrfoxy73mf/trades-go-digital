export function enhanceFillableMarkup(document) {
 return String(document)
  .replaceAll('Yes / No / N/A', '☐ Yes / ☐ No / ☐ N/A')
  .replace(/_{3,}/g, '<span class="fill-line" style="display:inline-block;min-width:30mm;min-height:4mm;border-bottom:1px solid #87978e;vertical-align:bottom">&nbsp;</span>')
  .replace(/☐/g, '<span class="tick-box" role="checkbox" aria-checked="false" style="display:inline-grid;place-items:center;width:4mm;height:4mm;vertical-align:middle">☐</span>');
}
