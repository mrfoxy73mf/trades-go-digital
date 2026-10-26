import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDraft,
  designReport,
} from "../src/lib/traffic-management/generate.mjs";
import { calculateDesign } from "../src/lib/traffic-management/design.mjs";
import {
  validDrawing,
  toDxf,
  parseDxf,
} from "../src/lib/traffic-management/drawing.mjs";
const signal = {
  roadType: "single",
  speed: 30,
  laneCount: 2,
  roadWidth: 6.5,
  workWidth: 2,
  worksLength: 40,
  worksStart: 100,
  roadName: "London Road",
  worksSide: "near",
  scopeConfirmed: true,
};
const motorway = {
  ...signal,
  roadType: "motorway",
  speed: 70,
  laneCount: 2,
  roadWidth: 7.3,
  workWidth: 2.4,
  worksLength: 100,
  worksStart: 1000,
};
test("portable signals use Red Book 45 degree tapers, clearances and end-sign offsets on both approaches", () => {
  const d = calculateDesign(signal);
  assert.equal(d.leadInLength, 2.5);
  assert.equal(d.taperStart, 97);
  assert.equal(d.taperEnd, 99.5);
  assert.equal(d.returnStart, 140);
  assert.equal(d.returnEnd, 142.5);
  assert.equal(d.endOfWorksSign, 172.5);
  assert.equal(d.signs.find((s) => s.id === "END-B").chainage, 67);
  assert.equal(d.waitLength, 75.5);
  assert.equal(d.coneCount, 12);
  assert.equal(d.signs.filter((s) => s.provisional).length, 4);
  assert.equal(d.signs.find((s) => s.id === "S1A").chainage, 52);
  assert.equal(d.signs.find((s) => s.id === "S1B").chainage, 187.5);
});
test("standard full-lane taper cone counts reproduce Chapter 8 A1.3 counts, without diagonal-length off-by-one errors", () => {
  for (const [speed, length, count] of [
    [30, 100, 35],
    [40, 100, 35],
    [50, 150, 101],
    [60, 150, 101],
    [70, 200, 135],
  ]) {
    const d = calculateDesign({ ...motorway, roadType: "dual", speed });
    assert.equal(d.leadInLength, length);
    assert.equal(d.runs[0].count, count);
  }
  const d = calculateDesign(motorway);
  assert.equal(d.taperStart, 700);
  assert.equal(d.taperEnd, 900);
  assert.equal(d.returnStart, 1109);
  assert.equal(d.returnEnd, 1112.65);
  assert.equal(d.endOfWorksSign, 1202.65);
  assert.equal(d.coneCount, 164);
  assert.equal(d.runs.reduce((n, r) => n + r.count, 0) - 2, d.coneCount);
});
test("dual advance-sign plans use speed-specific stations and congestion extensions", () => {
  for (const [speed, distances] of [
    [40, [300, 200, 100]],
    [50, [800, 600, 400, 200]],
    [60, [1600, 800, 600, 400, 200]],
    [70, [3200, 1600, 800, 600, 400, 200]],
  ]) {
    const d = calculateDesign({ ...motorway, roadType: "dual", speed });
    assert.deepEqual(
      d.signs
        .filter((s) => s.id.startsWith("S") && s.side === "Nearside")
        .map((s) => Math.round(d.taperStart - s.chainage)),
      distances,
    );
  }
  assert.ok(
    calculateDesign({ ...motorway, congestion: true }).signs.some((s) =>
      s.label.includes("3 miles"),
    ),
  );
  assert.ok(
    calculateDesign({ ...motorway, speed: 50 }).signs.some((s) =>
      s.label.includes("1 mile"),
    ),
  );
});
test("supported drafts contain exactly the calculated cones and remain editable/exportable on either closed side", () => {
  for (const roadType of ["single", "dual", "motorway"])
    for (const worksSide of ["near", "off"]) {
      const input =
        roadType === "single"
          ? { ...signal, worksSide }
          : { ...motorway, roadType, worksSide };
      const { items, design } = buildDraft(input);
      assert.ok(validDrawing(items));
      assert.equal(
        items.filter((i) => i.type === "cone").length,
        design.coneCount,
      );
      assert.equal(
        items.filter((i) => i.type === "sign").length,
        design.signs.length,
      );
      assert.ok(
        items.every(
          (i) =>
            i.x >= 30 &&
            i.x <= 950 &&
            i.y >= 30 &&
            i.y <= 570 &&
            i.x2 <= 950 &&
            i.y2 <= 570,
        ),
      );
      const report = designReport(design),
        dxf = toDxf(items, report);
      assert.match(report, /SOURCE/);
      assert.match(report, /CORE CONE QUANTITY/);
      assert.match(report, /not to scale/i);
      assert.match(report, /gov.uk/);
      assert.equal(parseDxf(dxf).unsupported, 0);
    }
});
test("unsupported cases fail with actionable messages instead of fabricated designs", () => {
  for (const [input, reason] of [
    [{ ...signal, scopeConfirmed: false }, /scope/],
    [{ ...signal, worksLength: 300 }, /300 m/],
    [{ ...signal, roadWidth: 5 }, /3 m/],
    [{ ...signal, laneCount: 3 }, /two-lane/],
    [{ ...motorway, laneCount: 5 }, /2–4/],
    [{ ...motorway, hasHardShoulder: true }, /hard shoulder/],
    [{ ...motorway, workWidth: 3 }, /clearance/],
    [{ ...motorway, roadWidth: 6.5 }, /3.6–4/],
    [{ ...signal, worksLength: NaN }, /finite/],
  ])
    assert.throws(() => calculateDesign(input), reason);
});
test("each supported speed uses permanent-limit clearance and never a supplied temporary reduction", () => {
  for (const [speed, clearance] of [
    [20, 0.5],
    [30, 0.5],
    [40, 15],
    [50, 30],
    [60, 60],
  ]) {
    const d = calculateDesign({ ...signal, speed, temporarySpeed: 20 });
    assert.equal(d.worksStart - d.taperEnd, clearance);
    assert.equal(d.minimumConeHeight, speed <= 40 ? 450 : 750);
  }
});
