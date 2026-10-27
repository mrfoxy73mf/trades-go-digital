export const WIDTH = 1000,
  HEIGHT = 650;
export const DRAFT =
  "DRAFT — competent traffic-management designer review required. Schematic, not to scale.";
export const tools = [
  "road",
  "cone",
  "barrier",
  "sign",
  "lights",
  "works",
  "label",
];
export function validDrawing(value) {
  return (
    Array.isArray(value) &&
    value.length <= 1000 &&
    value.every(
      (e) =>
        e &&
        tools.includes(e.type) &&
        ["x", "y", "x2", "y2"].every(
          (k) => Number.isFinite(e[k]) && Math.abs(e[k]) <= 10000,
        ) &&
        (e.signFace === undefined || signFaces.includes(e.signFace)) &&
        (e.points === undefined ||
          (e.type === "works" &&
            Array.isArray(e.points) &&
            e.points.length === 4 &&
            e.points.every(
              (p) =>
                Array.isArray(p) &&
                p.length === 2 &&
                p.every((v) => Number.isFinite(v) && Math.abs(v) <= 10000),
            ))) &&
        typeof e.text === "string" &&
        e.text.length <= 120 &&
        (e.scale === undefined ||
          (Number.isFinite(e.scale) && e.scale >= 0.1 && e.scale <= 2)),
    )
  );
}
export const signFaces = [
  "generic",
  "roadworks",
  "signals",
  "narrows",
  "wait",
  "end",
  "keep-left",
  "keep-right",
  "lane-closure",
];
export function signFaceForLabel(label = "") {
  if (/end of road works/i.test(label)) return "end";
  if (/keep left/i.test(label)) return "keep-left";
  if (/keep right/i.test(label)) return "keep-right";
  if (/WAIT HERE/i.test(label)) return "wait";
  if (/signals ahead/i.test(label)) return "signals";
  if (/narrows|single-file/i.test(label)) return "narrows";
  if (/lane closure/i.test(label)) return "lane-closure";
  if (/road works ahead/i.test(label)) return "roadworks";
  return "generic";
}
// Legacy projects contain schedule IDs only. Recover faces from the actual
// schedule descriptions, never from S1/S2 numbering (which varies by layout).
export function withSignFaces(items, report = "") {
  const schedule = new Map();
  for (const line of report.split("\n")) {
    const parts = line.split(" | ");
    if (parts.length >= 3)
      schedule.set(parts[0].split(":")[0], signFaceForLabel(parts[2]));
  }
  return items.map((item) =>
    item.type === "sign" && !item.signFace
      ? {
          ...item,
          signFace: schedule.get(item.text) || signFaceForLabel(item.text),
        }
      : item,
  );
}
// Callout positions are presentation only. Leader dots retain actual item anchors.
export function layoutSymbolCallouts(entities) {
  const occupied = [];
  return entities.map((e) => {
    if (!["sign", "lights"].includes(e.type)) return e;
    const w = e.type === "sign" ? 54 : 30,
      h = e.type === "sign" ? 72 : 56;
    const candidates = [[0, 0]];
    for (const dy of [-80, 80, -160, 160, -240, 240])
      for (const dx of [0, -65, 65, -130, 130]) candidates.push([dx, dy]);
    for (const [dx, dy] of candidates) {
      const cx = e.x + dx,
        cy = e.y + dy,
        box = [cx - w / 2, cy - 28, cx + w / 2, cy + h - 28];
      if (box[0] < 12 || box[2] > 988 || box[1] < 12 || box[3] > 600) continue;
      if (
        occupied.some(
          (b) =>
            box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1],
        )
      )
        continue;
      occupied.push(box);
      return { ...e, displayX: cx, displayY: cy };
    }
    occupied.push([e.x - w / 2, e.y - 28, e.x + w / 2, e.y + h - 28]);
    return { ...e, displayX: e.x, displayY: e.y };
  });
}
// Shared vector artwork for SVG and PDF; DXF preserves the same outlines.
export function primitives(entities, layout = true) {
  const out = [];
  const line = (x1, y1, x2, y2, color = "#243b53", width = 2) =>
    out.push({ kind: "line", x1, y1, x2, y2, color, width });
  const circle = (cx, cy, r, color, fill = "none") =>
    out.push({ kind: "circle", cx, cy, r, color, fill });
  const polygon = (points, color, fill = color, width = 1) =>
    out.push({ kind: "polygon", points, color, fill, width });
  const text = (x, y, value, size = 14, color = "#102d23") =>
    out.push({ kind: "text", x, y, text: value, size, color });
  const box = (x, y, w, h, color, fill = color) =>
    polygon(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      color,
      fill,
    );
  for (const e of layout ? layoutSymbolCallouts(entities) : entities) {
    let { x, y, x2, y2 } = e;
    if (
      ["sign", "lights"].includes(e.type) &&
      Number.isFinite(e.displayX) &&
      Number.isFinite(e.displayY)
    ) {
      if (e.displayX !== x || e.displayY !== y) {
        line(x, y, e.displayX, e.displayY, "#536174", 1);
        circle(x, y, 2, "#172033", "#172033");
      }
      x = e.displayX;
      y = e.displayY;
    }
    if (e.type === "road") {
      const length = Math.hypot(x2 - x, y2 - y) || 1,
        dx = (-(y2 - y) / length) * 25,
        dy = ((x2 - x) / length) * 25;
      line(x + dx, y + dy, x2 + dx, y2 + dy);
      line(x - dx, y - dy, x2 - dx, y2 - dy);
      line(x, y, x2, y2, "#738496", 1);
    } else if (e.type === "barrier") {
      line(x, y, x2, y2, "#fff", 7);
      line(x, y, x2, y2, "#c53524", 3);
    } else if (e.type === "works") {
      const points = e.points || [
        [x, y],
        [x2, y],
        [x2, y2],
        [x, y2],
      ];
      polygon(points, "#c65a00", "#ffedd5", 2);
      text(
        Math.min(...points.map((p) => p[0])) + 3,
        Math.min(...points.map((p) => p[1])) + 13,
        e.text || "WORKS",
        11,
      );
    } else if (e.type === "cone") {
      const size = Math.max(0.65, e.scale ?? 1);
      polygon(
        [
          [x, y - 15 * size],
          [x - 10 * size, y + 10 * size],
          [x + 10 * size, y + 10 * size],
        ],
        "#9a3412",
        "#ff791f",
        1,
      );
      polygon(
        [
          [x - 3.6 * size, y - 6 * size],
          [x + 3.6 * size, y - 6 * size],
          [x + 6.4 * size, y + 1 * size],
          [x - 6.4 * size, y + 1 * size],
        ],
        "#fff",
        "#fff",
        0.3,
      );
      box(x - 12 * size, y + 9 * size, 24 * size, 4 * size, "#243b53");
    } else if (e.type === "sign") {
      const size = Math.max(0.85, e.scale ?? 1),
        face = e.signFace || signFaceForLabel(e.text);
      const poly = (pts, color, fill = color, width = 1) =>
        polygon(
          pts.map(([a, b]) => [x + a * size, y + b * size]),
          color,
          fill,
          width,
        );
      const ln = (a, b, c, d, color = "#172033", width = 2) =>
        line(
          x + a * size,
          y + b * size,
          x + c * size,
          y + d * size,
          color,
          width * size,
        );
      const circ = (a, b, r, color, fill = color) =>
        circle(x + a * size, y + b * size, r * size, color, fill);
      const txt = (a, b, t, font = 8, color = "#172033") =>
        text(x + a * size, y + b * size, t, font * size, color);
      if (face.startsWith("keep-")) {
        circ(0, 0, 19, "#1255b0");
        const dir = face === "keep-left" ? -1 : 1;
        poly(
          [
            [-7 * dir, -10],
            [-11 * dir, -6],
            [2 * dir, 7],
            [-3 * dir, 7],
            [10 * dir, 13],
            [10 * dir, 0],
            [6 * dir, 4],
          ],
          "#fff",
        );
      } else if (face === "wait" || face === "end" || face === "lane-closure") {
        poly(
          [
            [-23, -18],
            [23, -18],
            [23, 18],
            [-23, 18],
          ],
          "#172033",
          face === "lane-closure" ? "#ffdf35" : "#fff",
          1.5,
        );
        if (face === "wait") {
          txt(-18, -7, "WHEN RED", 6.2);
          txt(-18, 0, "LIGHT SHOWS", 6);
          txt(-18, 10, "WAIT HERE", 7.2);
        } else if (face === "end") {
          txt(-17, -3, "END OF", 8);
          txt(-21, 9, "ROAD WORKS", 6.6);
        } else {
          ln(-10, 11, -10, -10);
          ln(-14, -5, -10, -10);
          ln(-6, -5, -10, -10);
          ln(10, 11, 10, 2);
          ln(10, 2, 0, -8);
          ln(1, -2, 0, -8);
          ln(7, -8, 0, -8);
        }
      } else {
        poly(
          [
            [0, -23],
            [-23, 18],
            [23, 18],
          ],
          "#d62426",
          "#fff",
          4 * size,
        );
        if (face === "roadworks") {
          circ(-3, -5, 2.8, "#172033");
          ln(-4, -1, 1, 4);
          ln(1, 4, -4, 12);
          ln(1, 4, 8, 12);
          ln(-2, 0, 7, 2);
          ln(7, 2, 11, 12);
          poly(
            [
              [7, 12],
              [15, 12],
              [11, 8],
            ],
            "#172033",
          );
        } else if (face === "signals") {
          poly(
            [
              [-4, -12],
              [4, -12],
              [4, 13],
              [-4, 13],
            ],
            "#172033",
          );
          circ(0, -7, 2.5, "#e22");
          circ(0, 0, 2.5, "#f5a800");
          circ(0, 7, 2.5, "#1d9955");
        } else if (face === "narrows") {
          ln(-10, 11, -10, -8);
          ln(10, 11, 10, 2);
          ln(10, 2, 3, -7);
        } else txt(-3, 11, "!", 23);
      }
      if (e.text) text(x - e.text.length * 3, y + 35 * size, e.text, 10);
    } else if (e.type === "lights") {
      box(x - 10, y - 24, 20, 48, "#172033");
      circle(x, y - 14, 5, "#d62426", "#d62426");
      circle(x, y, 5, "#eda900", "#eda900");
      circle(x, y + 14, 5, "#18804a", "#18804a");
    } else text(x, y, e.text || "Label");
  }
  return out;
}
export function toDxf(entities, report = "") {
  const pairs = [];
  const p = (...a) => pairs.push(...a.map(String));
  p(
    0,
    "SECTION",
    2,
    "HEADER",
    9,
    "$ACADVER",
    1,
    "AC1009",
    0,
    "ENDSEC",
    0,
    "SECTION",
    2,
    "ENTITIES",
  );
  for (const shape of [
    ...primitives(entities).flatMap((shape) =>
      shape.kind === "polygon"
        ? shape.points.map((p, i) => ({
            kind: "line",
            x1: p[0],
            y1: p[1],
            x2: shape.points[(i + 1) % shape.points.length][0],
            y2: shape.points[(i + 1) % shape.points.length][1],
            color: shape.color,
            width: shape.width,
          }))
        : [shape],
    ),
    ...report
      .split("\n")
      .filter(Boolean)
      .map((text, i) => ({
        kind: "text",
        x: 10,
        y: HEIGHT + 30 + i * 14,
        text,
        size: 10,
      })),
    { kind: "text", x: 10, y: HEIGHT - 10, text: DRAFT, size: 10 },
  ]) {
    if (shape.kind === "line")
      p(
        0,
        "LINE",
        8,
        "TM_DRAFT",
        10,
        shape.x1,
        20,
        HEIGHT - shape.y1,
        30,
        0,
        11,
        shape.x2,
        21,
        HEIGHT - shape.y2,
        31,
        0,
      );
    if (shape.kind === "circle")
      p(
        0,
        "CIRCLE",
        8,
        "TM_DRAFT",
        10,
        shape.cx,
        20,
        HEIGHT - shape.cy,
        30,
        0,
        40,
        shape.r,
      );
    if (shape.kind === "text")
      p(
        0,
        "TEXT",
        8,
        "TM_DRAFT",
        10,
        shape.x,
        20,
        HEIGHT - shape.y,
        30,
        0,
        40,
        shape.size,
        1,
        shape.text.replace(/[^\x20-\x7E]/g, "-"),
      );
  }
  p(0, "ENDSEC", 0, "EOF");
  return pairs.join("\n") + "\n";
}
// Deliberately limited ASCII DXF preview. Never execute embedded content or claim CAD fidelity.
export function parseDxf(source) {
  if (source.startsWith("AutoCAD Binary DXF"))
    throw new Error(
      "Binary DXF cannot be previewed. Open the original in a CAD viewer.",
    );
  const rows = source.replace(/^\uFEFF/, "").split(/\r?\n/),
    pairs = [];
  for (let i = 0; i + 1 < rows.length; i += 2) {
    const code = Number(rows[i].trim());
    if (!Number.isInteger(code))
      throw new Error("Invalid ASCII DXF group code.");
    pairs.push([code, rows[i + 1].trim()]);
  }
  const shapes = [];
  let unsupported = 0,
    section = "",
    sawEntities = false;
  for (let i = 0; i < pairs.length; i++) {
    const [code, value] = pairs[i];
    if (code === 0 && value === "SECTION") {
      section = pairs[i + 1]?.[1] || "";
      if (section === "ENTITIES") sawEntities = true;
      continue;
    }
    if (code === 0 && value === "ENDSEC") {
      section = "";
      continue;
    }
    if (section !== "ENTITIES" || code !== 0) continue;
    let end = i + 1;
    while (end < pairs.length && pairs[end][0] !== 0) end++;
    const data = pairs.slice(i + 1, end),
      get = (k) => data.find((p) => p[0] === k)?.[1],
      num = (k) => (get(k) === undefined ? NaN : Number(get(k)));
    const x = num(10),
      y = -num(20);
    let s;
    if (value === "LINE")
      s = {
        kind: "line",
        x1: x,
        y1: y,
        x2: num(11),
        y2: -num(21),
        color: "#243b53",
        width: 1,
      };
    else if (value === "CIRCLE")
      s = { kind: "circle", cx: x, cy: y, r: num(40), color: "#243b53" };
    else if (value === "TEXT")
      s = {
        kind: "text",
        x,
        y,
        text: (get(1) || "").slice(0, 500),
        size: num(40),
        color: "#243b53",
      };
    else if (value === "LWPOLYLINE") {
      const points = [];
      for (let j = 0; j < data.length; j++)
        if (data[j][0] === 10 && data[j + 1]?.[0] === 20)
          points.push([Number(data[j][1]), -Number(data[j + 1][1])]);
      if (data.some((p) => p[0] === 42 && Number(p[1]) !== 0)) {
        unsupported++;
        continue;
      }
      if (
        points.length < 2 ||
        points.some((p) =>
          p.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e9),
        )
      ) {
        unsupported++;
        continue;
      }
      if (Number(get(70)) & 1) points.push(points[0]);
      for (let j = 1; j < points.length; j++)
        shapes.push({
          kind: "line",
          x1: points[j - 1][0],
          y1: points[j - 1][1],
          x2: points[j][0],
          y2: points[j][1],
          color: "#243b53",
          width: 1,
        });
    } else unsupported++;
    if (s) {
      if (
        Object.values(s).some(
          (v) =>
            typeof v === "number" && (!Number.isFinite(v) || Math.abs(v) > 1e9),
        ) ||
        (s.kind === "circle" && s.r <= 0) ||
        (s.kind === "text" && s.size <= 0)
      ) {
        unsupported++;
      } else shapes.push(s);
    }
    if (shapes.length > 20000)
      throw new Error(
        "This DXF is too complex for the browser preview. Use a CAD viewer.",
      );
  }
  if (!sawEntities)
    throw new Error(
      "No DXF ENTITIES section found. Use a CAD viewer for this file.",
    );
  return { shapes, unsupported };
}
export function bounds(shapes) {
  const xs = [],
    ys = [];
  for (const s of shapes) {
    if (s.kind === "polygon") {
      for (const p of s.points) {
        xs.push(p[0]);
        ys.push(p[1]);
      }
    }
    if (s.kind === "line") {
      xs.push(s.x1, s.x2);
      ys.push(s.y1, s.y2);
    }
    if (s.kind === "circle") {
      xs.push(s.cx - s.r, s.cx + s.r);
      ys.push(s.cy - s.r, s.cy + s.r);
    }
    if (s.kind === "text") {
      xs.push(s.x, s.x + s.text.length * s.size * 0.6);
      ys.push(s.y - s.size, s.y);
    }
  }
  if (!xs.length) return "0 0 1000 650";
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    w = Math.max(1, Math.max(...xs) - minX),
    h = Math.max(1, Math.max(...ys) - minY),
    pad = Math.max(w, h) * 0.05;
  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
}
