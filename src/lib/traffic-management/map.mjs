import { calculateDesign } from "./design.mjs";
import { signFaceForLabel } from "./drawing.mjs";
export const MAP_WIDTH = 640,
  MAP_HEIGHT = 416;
export function validMap(value) {
  return (
    !!value &&
    (value.mapType === undefined || ["roadmap", "hybrid"].includes(value.mapType)) &&
    [value.lat, value.lng, value.zoom].every(Number.isFinite) &&
    Math.abs(value.lat) <= 85 &&
    Math.abs(value.lng) <= 180 &&
    Number.isInteger(value.zoom) &&
    value.zoom >= 12 &&
    value.zoom <= 20
  );
}
export function mapPixelsPerMetre(map) {
  if (!validMap(map)) throw Error("Invalid map location.");
  return (
    1000 /
    MAP_WIDTH /
    ((156543.03392804097 * Math.cos((map.lat * Math.PI) / 180)) / 2 ** map.zoom)
  );
}
export function panMap(map, dx, dy) {
  if (!validMap(map)) throw Error("Invalid map location.");
  const world = 256 * 2 ** map.zoom;
  const sin = Math.sin((map.lat * Math.PI) / 180),
    x = ((map.lng + 180) / 360) * world + dx,
    y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world + dy;
  const lat =
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / world))) * 180) / Math.PI,
    lng = (x / world) * 360 - 180;
  return {
    ...map,
    lat: Math.max(-85, Math.min(85, lat)),
    lng: ((((lng + 180) % 360) + 360) % 360) - 180,
  };
}
// A surveyed straight alignment only: map images are not lane/junction surveys.
export function buildMapDraft(input, alignment, map) {
  if (!validMap(map) || !Array.isArray(alignment) || alignment.length !== 2)
    throw Error(
      "Load a map and mark both ends of the working section on its road centreline.",
    );
  if (
    !alignment.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every((v) => Number.isFinite(v) && v >= 0 && v <= 1000),
    )
  )
    throw Error("Invalid working section.");
  const [start, end] = alignment;
  if (![...start, ...end].every(Number.isFinite))
    throw Error("Invalid working section.");
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (length < 10) throw Error("Mark two distinct points along the road.");
  const ppm = mapPixelsPerMetre(map),
    drawnLength = length / ppm;
  if (Math.abs(drawnLength - input.worksLength) / input.worksLength > 0.3)
    throw Error(
      `Map section is approximately ${drawnLength.toFixed(1)} m, but the measured works length is ${input.worksLength} m. Check the two marked points and your measurement.`,
    );
  const design = calculateDesign({ ...input, worksStart: 0 });
  const ux = (end[0] - start[0]) / length,
    uy = (end[1] - start[1]) / length,
    side = input.worksSide === "near" ? 1 : -1;
  const point = (chain, lateral) => [
    start[0] + (ux * chain + uy * lateral * side) * ppm,
    start[1] + (uy * chain - ux * lateral * side) * ppm,
  ];
  const items = [],
    add = (type, p, q = p, text = "", scale = 1, extra = {}) =>
      items.push({
        type,
        x: p[0],
        y: p[1],
        x2: q[0],
        y2: q[1],
        text,
        scale,
        ...extra,
      });
  for (const cone of design.cones)
    add(
      "cone",
      point(cone.x, input.roadWidth / 2 - cone.y),
      undefined,
      "",
      0.65,
    );
  const a = point(0, input.roadWidth / 2),
    b = point(input.worksLength, input.roadWidth / 2 - input.workWidth);
  add("works", a, b, "WORKS", 1, {
    points: [
      a,
      point(input.worksLength, input.roadWidth / 2),
      b,
      point(0, input.roadWidth / 2 - input.workWidth),
    ],
  });
  for (const barrier of design.barriers)
    add(
      "barrier",
      point(barrier.x, input.roadWidth / 2),
      point(barrier.x, input.roadWidth / 2 - input.workWidth),
    );
  for (const sign of design.signs) {
    const opposing =
      sign.side === "Approach B" ||
      sign.side === "Approach B exit" ||
      sign.side === "Offside";
    // Sign faces sit beyond the carriageway in this schematic overlay. Confirm
    // verge, pedestrian clearance and actual siting; this is not an approval.
    const p = point(
      sign.chainage,
      (opposing ? -1 : 1) * (input.roadWidth / 2 + 8),
    );
    add("sign", p, undefined, sign.id, 0.85, {
      signFace: signFaceForLabel(sign.label),
    });
  }
  if (input.roadType === "single") {
    add("lights", point(design.taperEnd, input.roadWidth / 2 + 4));
    add("lights", point(design.returnStart, -input.roadWidth / 2 - 4));
  }
  const outside = items.filter(
    (p) =>
      p.x < 35 ||
      p.x > 965 ||
      p.y < 35 ||
      p.y > 565 ||
      p.x2 < 35 ||
      p.x2 > 965 ||
      p.y2 < 35 ||
      p.y2 > 565,
  );
  if (outside.length)
    throw Error(
      "The full signing/closure extends beyond this map view. Zoom out or re-centre the map, then mark the working section again. No items have been moved or clipped to make them fit.",
    );
  return { items, design, drawnLength };
}
