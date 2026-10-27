import { signFaceForLabel } from "./drawing.mjs";
import { calculateDesign } from "./design.mjs";
export function buildDraft(input) {
  const design = calculateDesign(input),
    items = [];
  const add = (type, x, y, x2 = x, y2 = y, text = "", scale = 1) =>
    items.push({ type, x, y, x2, y2, text, scale });
  const label = (x, y, text) => add("label", x, y, x, y, text);
  const laneWidth = input.roadWidth / input.laneCount,
    yscale = 50 / laneWidth;
  const roadTop = 420 - input.laneCount * 50;
  const y = (p) =>
    input.worksSide === "off" ? roadTop + p * yscale : 420 - p * yscale;
  const anchors = new Map();
  const before = [
    ...new Set(
      design.signs.map((s) => s.chainage).filter((v) => v < design.taperStart),
    ),
  ].sort((a, b) => a - b);
  before.forEach((v, i) =>
    anchors.set(v, 50 + (i * 200) / Math.max(1, before.length - 1)),
  );
  for (const [v, p] of [
    [design.taperStart, 290],
    [design.taperEnd, 430],
    [design.worksStart, 460],
    [design.worksEnd, 650],
    [design.returnStart, 680],
    [design.returnEnd, 730],
  ])
    anchors.set(v, p);
  const after = [
    ...new Set(
      design.signs.map((s) => s.chainage).filter((v) => v > design.returnEnd),
    ),
  ].sort((a, b) => a - b);
  after.forEach((v, i) =>
    anchors.set(v, 780 + (i * 150) / Math.max(1, after.length - 1)),
  );
  const mapping = [...anchors].sort((a, b) => a[0] - b[0]);
  const x = (value) => {
    for (let i = 1; i < mapping.length; i++) {
      const [a, pa] = mapping[i - 1],
        [b, pb] = mapping[i];
      if (value <= b) return pa + ((value - a) / (b - a)) * (pb - pa);
    }
    return mapping.at(-1)[1];
  };
  for (let lane = 0; lane < input.laneCount; lane++)
    add("road", 40, roadTop + 25 + lane * 50, 950, roadTop + 25 + lane * 50);
  label(45, roadTop + 18, input.roadType === "single" ? "B <-" : "Traffic ->");
  if (input.roadType === "single") label(45, 408, "A ->");
  for (const p of design.cones)
    add("cone", x(p.x), y(p.y), x(p.x), y(p.y), "", 0.18);
  add(
    "works",
    x(design.worksStart),
    y(0),
    x(design.worksEnd),
    y(input.workWidth),
    "WORKS",
  );
  for (const b of design.barriers) {
    const fraction = (b.x - design.taperStart) / design.leadInLength;
    const boundary =
      b.x <= design.taperEnd
        ? fraction * design.closureWidth
        : design.closureWidth;
    add(
      "barrier",
      x(b.x),
      y(0),
      x(b.x),
      y(Math.min(input.workWidth, boundary)),
    );
  }
  for (const s of design.signs) {
    const signY =
      s.side === "Nearside" ||
      s.side === "Approach A" ||
      s.side === "Approach A exit"
        ? 455
        : roadTop - 35;
    add("sign", x(s.chainage), signY, x(s.chainage), signY, s.id, 0.85);
    items.at(-1).signFace = signFaceForLabel(s.label);
  }
  if (input.roadType === "single") {
    add("lights", x(design.taperEnd), 455);
    add("lights", x(design.returnStart) + 35, roadTop - 35);
  }
  label(
    40,
    40,
    `${input.roadName || "Site"} - calculated DRAFT / NOT TO SCALE`,
  );
  label(
    40,
    70,
    `Entry taper ${design.leadInLength.toFixed(2)} m; exit taper ${design.leadOutLength.toFixed(2)} m`,
  );
  label(
    40,
    100,
    `Cones: ${design.coneCount} core boundary only; shared corners counted once`,
  );
  label(
    40,
    130,
    `Works chainage ${design.worksStart.toFixed(2)} to ${design.worksEnd.toFixed(2)} m; permanent ${input.speed} mph`,
  );
  label(
    40,
    505,
    `S IDs refer to the calculated sign schedule. Taper start: ${design.taperStart.toFixed(2)} m`,
  );
  label(
    40,
    535,
    `Last cone: ${design.returnEnd.toFixed(2)} m. End sign: ${design.endOfWorksSign.toFixed(2)} m`,
  );
  label(
    40,
    565,
    "Review required. Manual changes invalidate the calculated schedule.",
  );
  return { items, design };
}
export function generateLayout(input) {
  return buildDraft(input).items;
}
export function designReport(d) {
  const m = (v) => `${Number(v.toFixed(3))} m`;
  return [
    "TRAFFIC MANAGEMENT CALCULATION - DRAFT / COMPETENT DESIGNER REVIEW REQUIRED",
    `Site: ${d.input.roadName || "Not supplied"}; road: ${d.input.roadType}; permanent limit: ${d.input.speed} mph`,
    "Chainage increases in primary direction. Negative values are upstream of the chosen origin.",
    `Entry taper: ${m(d.leadInLength)}; chainage ${m(d.taperStart)} to ${m(d.taperEnd)}`,
    `Works: ${m(d.worksStart)} to ${m(d.worksEnd)}`,
    `Exit taper: ${m(d.leadOutLength)}; chainage ${m(d.returnStart)} to ${m(d.returnEnd)}`,
    `Traffic-facing clearance: ${m(d.lateral)}; cone boundary width: ${m(d.closureWidth)}`,
    `Entry cone spacing: max ${m(d.taperSpacing)}${d.input.roadType === "single" ? " along line" : " longitudinal (A1.3 note 4)"}; straight: 9 m; exit: 1.2 m along line`,
    ...d.runs.map(
      (r) => `${r.name}: ${r.count} cones including both endpoints`,
    ),
    `CORE CONE QUANTITY: ${d.coneCount} (two shared corner cones counted once, no spares or extra runs)`,
    `Cone height specified: ${d.minimumConeHeight} mm; minimum visibility to first sign: ${m(d.firstSignVisibility)}`,
    ...(d.waitLength !== null
      ? [`WAIT HERE separation: ${m(d.waitLength)} (maximum 300 m)`]
      : []),
    "",
    "SIGN SCHEDULE (distances in metres; sign-face distance plates use imperial units)",
    ...d.signs.map(
      (s) =>
        `${s.id}: ${m(s.chainage)} | ${s.side} | ${s.label}${s.provisional ? " | PROVISIONAL SITING" : ""}`,
    ),
    "",
    `Barrier positions (chainage): ${d.barriers.map((b) => m(b.x)).join(", ")}`,
    "",
    "SOURCE",
    d.source.title,
    d.source.url,
    "",
    ...d.warnings,
  ].join("\n");
}
