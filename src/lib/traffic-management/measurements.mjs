/**
 * Geometry utilities only. Required distances and maximum spacings must come
 * from a verified design-rule profile, not from these functions.
 * Coordinates are metres, with x increasing in the direction of travel.
 */
export function coneRun(start, end, maximumSpacing, longitudinal = false) {
  if (
    ![...start, ...end, maximumSpacing].every(Number.isFinite) ||
    start.length !== 2 ||
    end.length !== 2 ||
    maximumSpacing <= 0
  ) {
    throw new Error(
      "Cone runs need finite coordinates and a positive maximum spacing.",
    );
  }
  const length = longitudinal
    ? Math.abs(end[0] - start[0])
    : Math.hypot(end[0] - start[0], end[1] - start[1]);
  const intervals = Math.ceil(length / maximumSpacing);
  if (intervals > 10000)
    throw new Error("Cone run exceeds the supported calculation size.");
  if (intervals === 0) return [{ x: start[0], y: start[1] }];
  return Array.from({ length: intervals + 1 }, (_, i) => ({
    x: start[0] + ((end[0] - start[0]) * i) / intervals,
    y: start[1] + ((end[1] - start[1]) * i) / intervals,
  }));
}
export function uniqueCones(runs) {
  const points = new Map();
  for (const run of runs)
    for (const p of run) {
      const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
      if (!points.has(key)) points.set(key, p);
    }
  return [...points.values()];
}
export function calculateGeometry(site, rule) {
  const { worksLength, closureWidth, worksStart = 0 } = site;
  const {
    leadInRatio,
    leadOutRatio,
    longitudinalClearance,
    taperConeSpacing,
    straightConeSpacing,
    signOffsets,
    endSignOffset,
  } = rule;
  for (const value of [
    worksLength,
    closureWidth,
    worksStart,
    leadInRatio,
    leadOutRatio,
    longitudinalClearance,
    taperConeSpacing,
    straightConeSpacing,
    endSignOffset,
  ]) {
    if (!Number.isFinite(value))
      throw new Error(
        "A complete verified distance profile and site measurements are required.",
      );
  }
  if (
    worksLength <= 0 ||
    closureWidth <= 0 ||
    leadInRatio <= 0 ||
    leadOutRatio <= 0 ||
    longitudinalClearance < 0 ||
    endSignOffset < 0 ||
    taperConeSpacing <= 0 ||
    straightConeSpacing <= 0
  ) {
    throw new Error("Invalid geometry or rule-profile dimensions.");
  }
  if (
    !Array.isArray(signOffsets) ||
    !signOffsets.length ||
    signOffsets.some(
      (s) =>
        typeof s.label !== "string" ||
        !s.label ||
        !Number.isFinite(s.distance) ||
        s.distance <= 0,
    )
  ) {
    throw new Error(
      "Verified advance-sign distances from the start of the lead-in taper are required.",
    );
  }
  const leadInLength = rule.leadInLength ?? closureWidth * leadInRatio;
  const leadOutLength = closureWidth * leadOutRatio;
  const taperEnd = worksStart - longitudinalClearance;
  const taperStart = taperEnd - leadInLength;
  const worksEnd = worksStart + worksLength;
  const returnStart = worksEnd + (rule.exitClearance ?? longitudinalClearance);
  const returnEnd = returnStart + leadOutLength;
  const runs = [
    coneRun(
      [taperStart, 0],
      [taperEnd, closureWidth],
      taperConeSpacing,
      rule.projectedTaper === true,
    ),
    coneRun(
      [taperEnd, closureWidth],
      [returnStart, closureWidth],
      straightConeSpacing,
    ),
    coneRun(
      [returnStart, closureWidth],
      [returnEnd, 0],
      rule.exitConeSpacing ?? taperConeSpacing,
    ),
  ];
  const cones = uniqueCones(runs);
  return {
    worksStart,
    worksEnd,
    taperStart,
    taperEnd,
    leadInLength,
    returnStart,
    returnEnd,
    leadOutLength,
    cones,
    coneCount: cones.length,
    runs: runs.map((points, i) => ({
      name: ["Entry taper", "Straight boundary", "Exit taper"][i],
      points,
      count: points.length,
    })),
    signs: signOffsets.map((s) => ({
      label: s.label,
      chainage: taperStart - s.distance,
    })),
    endOfWorksSign: returnEnd + endSignOffset,
    // Equipment allowance/spares, offside runs, accesses and separate approaches
    // must be added by the selected verified layout; never hide them in a total.
    includes:
      "One lead-in taper, one straight boundary, one lead-out taper; shared corner cones counted once.",
  };
}
