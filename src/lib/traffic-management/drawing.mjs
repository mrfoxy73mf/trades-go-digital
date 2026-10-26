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
        typeof e.text === "string" &&
        e.text.length <= 120,
    )
  );
}
// Common geometry is used for the editor and both exports.
export function primitives(entities) {
  const out = [];
  const line = (x1, y1, x2, y2, color = "#243b53", width = 2) =>
    out.push({ kind: "line", x1, y1, x2, y2, color, width });
  const circle = (cx, cy, r, color) =>
    out.push({ kind: "circle", cx, cy, r, color });
  const text = (x, y, value, size = 14) =>
    out.push({ kind: "text", x, y, text: value, size, color: "#102d23" });
  for (const e of entities) {
    const { x, y, x2, y2 } = e;
    if (e.type === "road") {
      const length = Math.hypot(x2 - x, y2 - y) || 1,
        dx = (-(y2 - y) / length) * 25,
        dy = ((x2 - x) / length) * 25;
      line(x + dx, y + dy, x2 + dx, y2 + dy);
      line(x - dx, y - dy, x2 - dx, y2 - dy);
      line(x, y, x2, y2, "#738496", 1);
    } else if (e.type === "barrier") {
      line(x, y, x2, y2, "#c53524", 7);
    } else if (e.type === "works") {
      line(x, y, x2, y, "#d66a00", 3);
      line(x2, y, x2, y2, "#d66a00", 3);
      line(x2, y2, x, y2, "#d66a00", 3);
      line(x, y2, x, y, "#d66a00", 3);
      text(Math.min(x, x2) + 5, Math.min(y, y2) + 18, e.text || "WORKS");
    } else if (e.type === "cone") {
      line(x, y - 12, x - 9, y + 9, "#d66a00", 3);
      line(x - 9, y + 9, x + 9, y + 9, "#d66a00", 3);
      line(x + 9, y + 9, x, y - 12, "#d66a00", 3);
      line(x - 4, y, x + 4, y, "#d66a00", 3);
    } else if (e.type === "sign") {
      circle(x, y, 16, "#c53524");
      text(x - 12, y + 5, "!");
      if (e.text) text(x + 21, y + 5, e.text);
    } else if (e.type === "lights") {
      circle(x, y - 12, 5, "#c53524");
      circle(x, y, 5, "#ba7900");
      circle(x, y + 12, 5, "#126747");
      line(x - 10, y - 22, x + 10, y - 22);
      line(x + 10, y - 22, x + 10, y + 22);
      line(x + 10, y + 22, x - 10, y + 22);
      line(x - 10, y + 22, x - 10, y - 22);
    } else text(x, y, e.text || "Label");
  }
  return out;
}
export function toDxf(entities) {
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
    ...primitives(entities),
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
