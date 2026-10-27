import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coneRun,
  uniqueCones,
  calculateGeometry,
} from "../src/lib/traffic-management/measurements.mjs";
// Arithmetic fixtures only: these numbers are not traffic-management rules.
const fixture = {
  leadInRatio: 3,
  leadOutRatio: 2,
  longitudinalClearance: 5,
  taperConeSpacing: 4,
  straightConeSpacing: 6,
  signOffsets: [{ label: "Fixture sign", distance: 25 }],
  endSignOffset: 8,
};
test("cone placement rounds intervals up so no segment exceeds the specified maximum", () => {
  for (const spacing of [1, 3, 6, 10]) {
    const points = coneRun([0, 0], [10, 10], spacing);
    assert.equal(points.length, Math.ceil(Math.hypot(10, 10) / spacing) + 1);
    assert.deepEqual(points.at(-1), { x: 10, y: 10 });
    for (let i = 1; i < points.length; i++)
      assert.ok(
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ) <=
          spacing + 1e-9,
      );
  }
});
test("connected cone runs count shared corner cones once", () => {
  assert.equal(
    uniqueCones([coneRun([0, 0], [10, 0], 5), coneRun([10, 0], [10, 10], 5)])
      .length,
    5,
  );
});
test("geometry uses explicit anchors for taper, works, sign and end-of-works chainages", () => {
  const result = calculateGeometry(
    { worksLength: 20, closureWidth: 4, worksStart: 100 },
    fixture,
  );
  assert.equal(result.leadInLength, 12);
  assert.equal(result.taperStart, 83);
  assert.equal(result.taperEnd, 95);
  assert.equal(result.worksEnd, 120);
  assert.equal(result.returnStart, 125);
  assert.equal(result.returnEnd, 133);
  assert.equal(result.signs[0].chainage, 58);
  assert.equal(result.endOfWorksSign, 141);
  assert.equal(result.coneCount, result.cones.length);
  assert.equal(
    new Set(result.cones.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`))
      .size,
    result.coneCount,
  );
});
test("incomplete, non-finite and excessive rule inputs fail instead of fabricating quantities", () => {
  assert.throws(() =>
    calculateGeometry({ worksLength: 20, closureWidth: 4 }, {}),
  );
  assert.throws(() =>
    calculateGeometry(
      { worksLength: 20, closureWidth: 4 },
      { ...fixture, taperConeSpacing: 0 },
    ),
  );
  assert.throws(() =>
    calculateGeometry(
      { worksLength: 20, closureWidth: 4 },
      { ...fixture, signOffsets: [] },
    ),
  );
  assert.throws(() => coneRun([0, 0], [1e8, 0], 1));
  assert.throws(() => coneRun([0, 0], [1, 0], 0));
});
