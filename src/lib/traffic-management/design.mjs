import { calculateGeometry } from "./measurements.mjs";
export const SOURCES = {
  red: {
    title:
      "DfT Safety at Street Works and Road Works (2013), pp. 17, 52, 62–65 and inside back cover",
    url: "https://www.gov.uk/government/publications/safety-at-street-works-and-road-works",
  },
  chapter: {
    title:
      "Traffic Signs Manual Chapter 8 Part 1 (2009), Table 3.1, A1.1, A1.3, A1.5; plans DZA1–3, DZB1–6, DZE1; Part 3 (2020) updates reviewed",
    url: "https://www.gov.uk/government/publications/traffic-signs-manual",
  },
};
const clearances = { 20: 0.5, 30: 0.5, 40: 15, 50: 30, 60: 60, 70: 100 };
const metres = (value) => Math.round(value * 1000) / 1000;
export function calculateDesign(input) {
  const {
    roadType,
    speed,
    laneCount,
    roadWidth,
    workWidth,
    worksLength,
    worksStart = 0,
    roadName = "",
    worksSide = "near",
    scopeConfirmed = false,
    hasHardShoulder = false,
    congestion = false,
    widths,
    closedLane,
  } = input;
  const signals = roadType === "single";
  if (
    !["single", "dual", "motorway"].includes(roadType) ||
    !["near", "off"].includes(worksSide)
  )
    throw Error("Choose the road and closed side.");
  if (!scopeConfirmed)
    throw Error(
      "Confirm that the site is within the supported calculation scope.",
    );
  if (
    ![20, 30, 40, 50, 60, 70].includes(speed) ||
    (signals && speed === 70) ||
    (!signals && speed === 20) ||
    (roadType === "motorway" && speed < 50)
  )
    throw Error("Unsupported permanent speed for this road type.");
  if (
    !Number.isInteger(laneCount) ||
    (signals ? laneCount !== 2 : laneCount < 2 || laneCount > 4)
  )
    throw Error(
      "Portable signals require a two-lane single carriageway; lane closures support 2–4 lanes per carriageway.",
    );
  for (const value of [roadWidth, workWidth, worksLength, worksStart])
    if (!Number.isFinite(value))
      throw Error("Enter finite site measurements and chainage.");
  if (
    roadWidth < 3 ||
    roadWidth > 25 ||
    workWidth < 0.5 ||
    worksLength < 1 ||
    worksLength > 1000 ||
    Math.abs(worksStart) > 1e7 ||
    roadName.length > 80
  )
    throw Error(
      "Check dimensions: working width ≥0.5 m, road width 3–25 m and works length 1–1,000 m.",
    );
  if (!signals && hasHardShoulder && worksSide === "near")
    throw Error(
      "Nearside closures involving a hard shoulder need an additional shoulder-specific design. Automatic calculation is not supported for this case.",
    );
  const laneWidths = Array.isArray(widths) && widths.length === laneCount
      ? widths
      : Array.from({ length: laneCount }, () => roadWidth / laneCount),
    selectedLane = Number.isInteger(closedLane)
      ? laneWidths[closedLane - 1]
      : laneWidths[worksSide === "near" ? 0 : laneWidths.length - 1],
    lateral = speed >= 50 ? 1.2 : 0.5,
    laneWidth = selectedLane;
  if (laneWidths.some((width) => !Number.isFinite(width) || width < 1 || width > 6))
    throw Error("Check each lane width (1–6 m). These values may be estimates, but must be labelled for review.");
  const closureWidth = signals ? workWidth + lateral : laneWidth;
  const remainingWidth = roadWidth - closureWidth;
  if (signals && remainingWidth < 3)
    throw Error(
      "Remaining shuttle lane is below the 3 m general-traffic minimum. A site-specific design is required.",
    );
  if (!signals && workWidth + lateral > laneWidth + 1e-9)
    throw Error(
      `The proposed ${workWidth} m working width plus ${lateral} m lateral clearance does not fit inside the selected ${laneWidth} m lane. Review the work footprint or use a site-specific arrangement.`,
    );
  const firstDistance = signals
    ? speed <= 30
      ? 45
      : speed === 40
        ? 110
        : 450
    : speed <= 40
      ? 300
      : speed === 50 && !congestion && roadType !== "motorway"
        ? 800
        : speed === 70
          ? 3200
          : 1600;
  const signOffsets = [];
  const add = (label, distance, provisional = false) =>
    signOffsets.push({ label, distance, provisional });
  if (signals) {
    add(
      "7001 Road works ahead" +
        (speed >= 50 ? " + distance plate (imperial)" : ""),
      firstDistance,
    );
    add("543 Traffic signals ahead", 15 + ((firstDistance - 15) * 2) / 3, true);
    add(
      "517/518 Road narrows / single-file traffic",
      15 + (firstDistance - 15) / 3,
      true,
    );
    add("7011 When red light shows WAIT HERE", 15);
  } else {
    if (speed === 70) {
      if (congestion) add("7001 Road works ahead — 3 miles", 4800);
      add("7004/7001 Road works ahead — 2 miles", 3200);
      add("7005/7001 Road works ahead — 1 mile", 1600);
    } else if (speed <= 40) add("7001 Road works ahead — 300 yards", 300);
    else {
      if (speed === 60 && congestion)
        add("7001 Road works ahead — 2 miles", 3200);
      if (firstDistance >= 1600) add("7001 Road works ahead — 1 mile", 1600);
      add("7001 Road works ahead — 800 yards", 800);
    }
    for (const distance of speed <= 40
      ? [200, 100]
      : speed === 70
        ? [800, 600, 400, 200]
        : [600, 400, 200])
      add(`7202/7208 Lane closure — ${distance} yards`, distance);
  }
  const leadInLength = signals
    ? closureWidth
    : speed <= 40
      ? 100
      : speed <= 60
        ? 150
        : 200;
  const geometry = calculateGeometry(
    { worksLength, closureWidth, worksStart },
    {
      leadInRatio: signals ? 1 : speed <= 40 ? 25 : speed <= 60 ? 40 : 55,
      leadInLength,
      leadOutRatio: 1,
      longitudinalClearance: clearances[speed],
      exitClearance: signals ? 0 : speed <= 30 ? 0.5 : speed <= 50 ? 3 : 9,
      taperConeSpacing: signals ? 1.2 : speed <= 40 ? 3 : 1.5,
      projectedTaper: !signals,
      exitConeSpacing: 1.2,
      straightConeSpacing: 9,
      signOffsets,
      endSignOffset: signals ? (speed <= 30 ? 30 : 45) : speed <= 40 ? 45 : 90,
    },
  );
  const waitLength = geometry.returnEnd - geometry.taperStart + 30;
  if (signals && waitLength > 300 + 1e-9)
    throw Error(
      `Calculated WAIT HERE separation is ${metres(waitLength)} m, exceeding the 300 m two-way-signal limit. Use a site-specific design.`,
    );
  const signs = [];
  for (const [i, s] of signOffsets.entries()) {
    signs.push({
      id: `S${i + 1}A`,
      label: s.label,
      chainage: metres(geometry.taperStart - s.distance),
      side: signals ? "Approach A" : "Nearside",
      provisional: s.provisional,
    });
    signs.push({
      id: `S${i + 1}B`,
      label: s.label,
      chainage: metres(
        signals
          ? geometry.returnEnd + s.distance
          : geometry.taperStart - s.distance,
      ),
      side: signals ? "Approach B" : "Offside",
      provisional: s.provisional,
    });
  }
  signs.push({
    id: "END-A",
    label: "7001/645 End of road works",
    chainage: metres(geometry.endOfWorksSign),
    side: signals ? "Approach A exit" : "Nearside",
    provisional: false,
  });
  signs.push({
    id: "END-B",
    label: "7001/645 End of road works",
    chainage: metres(
      signals
        ? geometry.taperStart - (speed <= 30 ? 30 : 45)
        : geometry.endOfWorksSign,
    ),
    side: signals ? "Approach B exit" : "Offside",
    provisional: false,
  });
  const barriers = signals
    ? [
        { x: worksStart, label: "7105 Works boundary" },
        { x: geometry.worksEnd, label: "7105 Works boundary" },
      ]
    : Array.from({ length: Math.round(leadInLength / 50) }, (_, i) => ({
        x: geometry.taperStart + (i + 1) * 50,
        label: "7105 Lane closed barrier / high-intensity lamp",
      }));
  signs.push({
    id: "K1",
    label: `610 Keep ${worksSide === "near" ? "right" : "left"} (confirm orientation)`,
    chainage: metres(geometry.taperStart),
    side: "Entry taper",
    provisional: false,
  });
  signs.push({
    id: "K2",
    label: `610 Keep ${worksSide === "near" ? "right" : "left"} (confirm orientation)`,
    chainage: metres(geometry.taperEnd),
    side: "End of entry taper",
    provisional: false,
  });
  if (signals)
    signs.push({
      id: "K3",
      label: `610 Keep ${worksSide === "near" ? "left" : "right"} (opposing approach)`,
      chainage: metres(geometry.returnStart),
      side: "Opposing approach",
      provisional: false,
    });
  else if (speed === 70)
    signs.push({
      id: "KM",
      label: `610 Keep ${worksSide === "near" ? "right" : "left"} (mid-taper barrier)`,
      chainage: metres(geometry.taperStart + 100),
      side: "Mid-entry taper",
      provisional: false,
    });
  const warnings = [
    "DRAFT design assistance, not a site approval. Confirm survey, visibility, junctions, queues, access, permits, sign sizes, bilingual requirements and authority instructions with a competent traffic-management designer.",
    "Core carriageway cone count only: entry taper + straight traffic-facing boundary + exit taper, shared endpoints counted once. No spares, extra pedestrian routes, shoulder treatment, additional accesses, extra sign-protection cones, lamps or repeaters included.",
    "Sketch zones are compressed independently; use the chainage schedule for distances. Drawing is not to scale. Symbols are illustrative, not prescribed sign artwork.",
    "Temporary speed-limit signing, mobile closures, contraflow, multiple closed lanes, stepped tapers, junction control and guide islands require a separate design. No signal timings are calculated.",
  ];
  if (!signals && (laneWidth < 3.6 || laneWidth > 4))
    warnings.push(
      `Selected lane width is ${laneWidth} m, outside the old equal-lane 3.6–4 m calculator profile. The draft uses the entered width without treating that profile limitation as a site conflict; verify the measurement and applicable arrangement.`,
    );
  if (signals) {
    warnings.push(
      "Traffic-signals-ahead and road-narrows sign positions are provisional subdivisions of the advance zone. The guidance specifies sequence, not fixed intermediate spacings; confirm and adjust these positions on site.",
    );
    warnings.push(
      "WAIT HERE positions use the 15 m baseline; increase for vehicle swept paths if needed, then recheck the ≤300 m limit. Signal heads are indicative positions; check visibility from approach and waiting positions.",
    );
    if (remainingWidth < 3.25 || remainingWidth > 3.5)
      warnings.push(
        "Remaining shuttle lane is outside the desirable 3.25–3.50 m range. Review cyclist/HGV passing risks; do not treat width alone as approval.",
      );
  }
  return {
    input: { ...input },
    ...geometry,
    signs,
    barriers,
    closureWidth,
    lateral,
    remainingWidth,
    waitLength: signals ? waitLength : null,
    taperSpacing: signals ? 1.2 : speed <= 40 ? 3 : 1.5,
    exitSpacing: 1.2,
    straightSpacing: 9,
    minimumConeHeight: speed <= 40 ? 450 : speed === 70 ? 1000 : 750,
    firstSignVisibility: signals
      ? speed <= 40
        ? 60
        : 75
      : speed <= 40
        ? 60
        : speed === 50
          ? 75
          : speed === 60
            ? 90
            : 120,
    source: signals ? SOURCES.red : SOURCES.chapter,
    warnings,
  };
}
