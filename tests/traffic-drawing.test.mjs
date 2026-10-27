import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validDrawing,
  primitives,
  toDxf,
  parseDxf,
  bounds,
  tools,
} from "../src/lib/traffic-management/drawing.mjs";
const items = tools.map((type) => ({
  type,
  x: 100,
  y: 100,
  x2: 400,
  y2: 200,
  text: "Works access",
}));
test("all seven drawing tools export geometry and a review warning that round-trips through ASCII DXF", () => {
  const shapes = primitives(items);
  assert.ok(items.every((item) => primitives([item]).length > 0));
  const source = toDxf(items),
    preview = parseDxf(source);
  assert.equal(preview.unsupported, 0);
  assert.equal(
    preview.shapes.length,
    shapes.reduce(
      (n, s) => n + (s.kind === "polygon" ? s.points.length : 1),
      0,
    ) + 1,
  );
  assert.ok(
    preview.shapes.some(
      (s) => s.kind === "text" && s.text.includes("designer review required"),
    ),
  );
  assert.ok(
    preview.shapes.some((s) => s.kind === "text" && s.text === "Works access"),
  );
  assert.ok(
    bounds(preview.shapes).split(" ").map(Number).every(Number.isFinite),
  );
});
test("project validation rejects excessive, malformed and non-finite geometry", () => {
  assert.ok(validDrawing(items));
  for (const value of [
    null,
    [{ ...items[0], x: Infinity }],
    [{ ...items[0], type: "script" }],
    [{ ...items[0], text: "x".repeat(121) }],
    Array(1001).fill(items[0]),
  ])
    assert.equal(validDrawing(value), false);
});
test("preview reports unsupported CAD entities instead of silently claiming full fidelity", () => {
  const source =
    "0\nSECTION\n2\nENTITIES\n0\nINSERT\n2\nexternal-block\n0\nARC\n10\n0\n20\n0\n0\nENDSEC\n0\nEOF\n";
  assert.deepEqual(parseDxf(source), { shapes: [], unsupported: 2 });
  assert.throws(() => parseDxf("AutoCAD Binary DXF"), /Binary DXF/);
  assert.throws(() => parseDxf("not a drawing"), /ENTITIES/);
});
test("straight LWPOLYLINE previews close correctly; bulges and invalid numbers are not rendered as straight lines", () => {
  const poly = (extra = "") =>
    "0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n70\n1\n10\n0\n20\n0\n10\n20\n20\n30\n" +
    extra +
    "0\nENDSEC\n0\nEOF\n";
  assert.equal(parseDxf(poly()).shapes.length, 2);
  assert.equal(parseDxf(poly("42\n1\n")).unsupported, 1);
  assert.equal(
    parseDxf(toDxf(items).replace("10\n100", "10\nNaN")).unsupported,
    1,
  );
});
