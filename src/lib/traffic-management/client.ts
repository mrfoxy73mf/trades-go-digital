import { buildDraft, designReport } from "./generate.mjs";
import {
  HEIGHT,
  DRAFT,
  validDrawing,
  primitives,
  toDxf,
  parseDxf,
  bounds,
} from "./drawing.mjs";
type Item = {
  type: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  text: string;
  scale?: number;
};
const NS = "http://www.w3.org/2000/svg",
  KEY = "tgd-tm-draft-v1";
function svgShape(s: any) {
  const node = document.createElementNS(
    NS,
    s.kind === "text" ? "text" : s.kind === "circle" ? "circle" : "line",
  );
  const attrs =
    s.kind === "line"
      ? {
          x1: s.x1,
          y1: s.y1,
          x2: s.x2,
          y2: s.y2,
          stroke: s.color,
          "stroke-width": s.width,
        }
      : s.kind === "circle"
        ? {
            cx: s.cx,
            cy: s.cy,
            r: s.r,
            fill: "none",
            stroke: s.color,
            "stroke-width": 2,
          }
        : {
            x: s.x,
            y: s.y,
            fill: s.color,
            "font-size": s.size,
            "font-family": "Arial, sans-serif",
          };
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (s.kind === "text") node.textContent = s.text;
  return node;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function bindTrafficDrawing() {
  const root = document.querySelector<HTMLElement>(".drawing-workspace");
  if (!root) return;
  const q = <T = HTMLElement>(s: string) =>
    root.querySelector(s) as unknown as T;
  const canvas = q<SVGSVGElement>("[data-canvas]"),
    layer = q<SVGGElement>("[data-entities]"),
    tool = q<HTMLSelectElement>("[data-tool]"),
    label = q<HTMLInputElement>("[data-label]"),
    selection = q<HTMLSelectElement>("[data-selection]");
  const status = (s: string) => {
    q("[data-drawing-status]").textContent = s;
  };
  let calculationReport = "";
  const setReport = (text: string) => {
    calculationReport = text;
    q("[data-calculation-report]").textContent = text;
    q<HTMLElement>("[data-calculation-details]").hidden = !text;
    q<HTMLButtonElement>("[data-report]").disabled = !text;
  };
  let items: Item[] = [],
    selected = -1,
    history: Item[][] = [],
    originalUrl = "",
    previewUrl = "",
    drag: {
      start: { x: number; y: number };
      base: Item[];
      index: number;
      drawing: boolean;
    } | null = null;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (validDrawing(parsed)) {
        items = parsed;
        const record = JSON.parse(
          localStorage.getItem(KEY + "-report") || "null",
        );
        if (
          record &&
          record.snapshot === saved &&
          typeof record.report === "string" &&
          record.report.length <= 80000
        )
          setReport(record.report);
      } else
        status(
          "The saved drawing is invalid. Open a saved project to recover your work.",
        );
    }
  } catch {
    status("Browser storage is unavailable. Export your drawing to keep it.");
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      if (calculationReport)
        localStorage.setItem(
          KEY + "-report",
          JSON.stringify({
            snapshot: JSON.stringify(items),
            report: calculationReport,
          }),
        );
      else localStorage.removeItem(KEY + "-report");
      q("[data-save-status]").textContent =
        "Saved in this browser only. Export a file to keep or share it.";
    } catch {
      q("[data-save-status]").textContent =
        "Could not autosave. Save an editable project or export your drawing now.";
    }
  };
  const render = () => {
    q("[data-cone-count]").textContent =
      `Cone symbols in current sketch: ${items.filter((item) => item.type === "cone").length}. Core generated quantities exclude spare cones and extra site-specific runs.`;
    layer.replaceChildren();
    items.forEach((item, i) => {
      const g = document.createElementNS(NS, "g");
      g.dataset.index = String(i);
      // Give thin road lines and small symbols a usable pointer target.
      const linear = ["road", "barrier"].includes(item.type);
      const hit = document.createElementNS(NS, linear ? "line" : "rect");
      const hitAttributes = linear
        ? {
            x1: item.x,
            y1: item.y,
            x2: item.x2,
            y2: item.y2,
            stroke: "transparent",
            "stroke-width": item.type === "road" ? 60 : 20,
            "pointer-events": "stroke",
          }
        : {
            x: Math.min(item.x, item.x2) - 20,
            y: Math.min(item.y, item.y2) - 25,
            width: Math.max(
              40,
              Math.abs(item.x2 - item.x) + 40,
              item.type === "label" ? item.text.length * 9 : 40,
            ),
            height: Math.abs(item.y2 - item.y) + 50,
            fill: "transparent",
            "pointer-events": "all",
          };
      for (const [key, value] of Object.entries(hitAttributes))
        hit.setAttribute(key, String(value));
      g.appendChild(hit);
      for (const s of primitives([item])) g.appendChild(svgShape(s));
      if (i === selected) {
        const r = document.createElementNS(NS, "rect");
        const pad = ["road", "sign", "lights"].includes(item.type) ? 30 : 18;
        r.setAttribute("x", String(Math.min(item.x, item.x2) - pad));
        r.setAttribute("y", String(Math.min(item.y, item.y2) - pad));
        r.setAttribute("width", String(Math.abs(item.x2 - item.x) + pad * 2));
        r.setAttribute("height", String(Math.abs(item.y2 - item.y) + pad * 2));
        r.setAttribute("fill", "none");
        r.setAttribute("stroke", "#126747");
        r.setAttribute("stroke-dasharray", "5 4");
        g.appendChild(r);
      }
      layer.appendChild(g);
    });
    const warning = svgShape({
      kind: "text",
      x: 10,
      y: HEIGHT - 10,
      text: DRAFT,
      size: 12,
      color: "#8c3510",
    });
    layer.appendChild(warning);
    selection.replaceChildren(
      new Option("None", "-1"),
      ...items.map(
        (e, i) =>
          new Option(
            `${i + 1}. ${e.type}${e.text ? " — " + e.text : ""}`,
            String(i),
          ),
      ),
    );
    selection.value = String(selected);
    q<HTMLButtonElement>("[data-undo]").disabled = !history.length;
    q<HTMLButtonElement>("[data-delete]").disabled = selected < 0;
  };
  const checkpoint = () => {
    if (calculationReport) {
      setReport("");
      q("[data-generator-status]").textContent =
        "Drawing changed manually. Regenerate from verified measurements for a new calculated schedule.";
      status(
        "Sketch changed: the calculation report is now invalid. Regenerate from verified measurements for a new schedule; manual edits do not recalculate chainages.",
      );
    }
    history.push(structuredClone(items));
    if (history.length > 50) history.shift();
  };
  const generator = q<HTMLFormElement>("[data-generator]");
  const roadType = q<HTMLSelectElement>('[data-generator] [name="roadType"]');
  const syncGenerator = () => {
    const single = roadType.value === "single";
    const lanes = q<HTMLSelectElement>('[data-generator] [name="laneCount"]');
    for (const option of lanes.options)
      option.disabled = single && option.value !== "2";
    if (single) lanes.value = "2";
    const speed = q<HTMLSelectElement>('[data-generator] [name="speed"]');
    for (const option of speed.options)
      option.disabled = single
        ? option.value === "70"
        : roadType.value === "motorway"
          ? Number(option.value) < 50
          : option.value === "20";
    if (speed.selectedOptions[0]?.disabled) speed.value = single ? "30" : "70";
  };
  generator.addEventListener("input", () => {
    if (calculationReport)
      q("[data-generator-status]").textContent =
        "Inputs changed. The displayed drawing and report still describe the previous generation; calculate again to replace them.";
  });
  roadType.addEventListener("change", syncGenerator);
  syncGenerator();
  generator.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!generator.reportValidity()) return;
    try {
      const values = new FormData(generator);
      const { items: generated, design } = buildDraft({
        roadType: String(values.get("roadType")),
        speed: Number(values.get("speed")),
        worksSide: String(values.get("worksSide")),
        laneCount: Number(values.get("laneCount")),
        roadName: String(values.get("roadName") || ""),
        worksLength: Number(values.get("worksLength")),
        roadWidth: Number(values.get("roadWidth")),
        workWidth: Number(values.get("workWidth")),
        worksStart: Number(values.get("worksStart")),
        scopeConfirmed: values.has("scopeConfirmed"),
        hasHardShoulder: values.has("hasHardShoulder"),
        congestion: values.has("congestion"),
      });
      if (
        items.length &&
        !confirm(
          "Replace the current drawing with a calculated draft? Save a project first to keep your current layout. You can undo this change.",
        )
      )
        return;
      checkpoint();
      items = generated;
      selected = -1;
      tool.value = "select";
      setReport(designReport(design));
      render();
      save();
      q<HTMLDetailsElement>("[data-calculation-details]").open = true;
      q("[data-generator-status]").textContent =
        `Calculated ${design.coneCount} core boundary cones and ${design.signs.length} sign assemblies. Review the schedule below, including provisional positions and exclusions. All items remain manually editable.`;
    } catch (error) {
      q("[data-generator-status]").textContent =
        error instanceof Error ? error.message : "Could not calculate a draft.";
    }
  });
  q("[data-report]").addEventListener("click", () =>
    download(
      new Blob([calculationReport], { type: "text/plain" }),
      "traffic-management-DRAFT-calculations.txt",
    ),
  );
  const pick = (i: number) => {
    selected = i;
    if (items[i]) label.value = items[i].text;
    render();
  };
  const point = (e: PointerEvent) => {
    const p = canvas.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const m = canvas.getScreenCTM();
    const v = m ? p.matrixTransform(m.inverse()) : p;
    return {
      x: Math.max(30, Math.min(950, Math.round(v.x / 5) * 5)),
      y: Math.max(30, Math.min(570, Math.round(v.y / 5) * 5)),
    };
  };
  const add = (x: number, y: number, x2 = x, y2 = y) => {
    if (items.length >= 1000) {
      status("This drawing has reached the 1,000-item limit.");
      return false;
    }
    items.push({
      type: tool.value,
      x,
      y,
      x2,
      y2,
      text: ["label", "sign", "works"].includes(tool.value)
        ? label.value.trim()
        : "",
    });
    selected = items.length - 1;
    return true;
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const p = point(e);
    canvas.setPointerCapture(e.pointerId);
    if (tool.value === "select") {
      const hit = (e.target as Element).closest<SVGGElement>("[data-index]");
      pick(hit ? Number(hit.dataset.index) : -1);
      if (selected >= 0) {
        checkpoint();
        drag = {
          start: p,
          base: structuredClone(items),
          index: selected,
          drawing: false,
        };
      }
    } else {
      checkpoint();
      if (!add(p.x, p.y)) {
        history.pop();
        return;
      }
      drag = {
        start: p,
        base: structuredClone(items),
        index: selected,
        drawing: ["road", "barrier", "works"].includes(tool.value),
      };
      render();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = point(e),
      item = items[drag.index];
    if (drag.drawing) {
      item.x2 = p.x;
      item.y2 = p.y;
    } else if (tool.value === "select") {
      const b = drag.base[drag.index],
        dx = Math.max(
          30 - Math.min(b.x, b.x2),
          Math.min(950 - Math.max(b.x, b.x2), p.x - drag.start.x),
        ),
        dy = Math.max(
          30 - Math.min(b.y, b.y2),
          Math.min(570 - Math.max(b.y, b.y2), p.y - drag.start.y),
        );
      Object.assign(item, {
        x: b.x + dx,
        y: b.y + dy,
        x2: b.x2 + dx,
        y2: b.y2 + dy,
      });
    }
    render();
  });
  const finish = () => {
    if (!drag) return;
    const item = items[drag.index];
    if (drag.drawing && Math.hypot(item.x2 - item.x, item.y2 - item.y) < 10) {
      items = history.pop()!;
      selected = -1;
      status("Drag at least 10 sketch units to draw this item.");
    }
    drag = null;
    render();
    save();
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  tool.addEventListener("change", () => {
    selected = -1;
    render();
  });
  selection.addEventListener("change", () => pick(Number(selection.value)));
  label.addEventListener("change", () => {
    if (
      selected >= 0 &&
      ["label", "sign", "works"].includes(items[selected].type)
    ) {
      checkpoint();
      items[selected].text = label.value.trim();
      render();
      save();
    }
  });
  q("[data-add]").addEventListener("click", () => {
    if (tool.value === "select") {
      status("Choose a drawing tool first.");
      return;
    }
    const values = ["x", "y", "x2", "y2"].map((k) =>
      q<HTMLInputElement>(`[data-${k}]`),
    );
    if (!values.every((e) => e.reportValidity())) return;
    checkpoint();
    const [x, y, x2, y2] = values.map((e) => Number(e.value));
    const line = ["road", "barrier", "works"].includes(tool.value);
    if (line && Math.hypot(x2 - x, y2 - y) < 10) {
      history.pop();
      status("Choose different start and end coordinates.");
      return;
    }
    add(x, y, line ? x2 : x, line ? y2 : y);
    render();
    save();
  });
  q("[data-delete]").addEventListener("click", () => {
    if (selected < 0) return;
    checkpoint();
    items.splice(selected, 1);
    selected = -1;
    render();
    save();
  });
  q("[data-undo]").addEventListener("click", () => {
    if (!history.length) return;
    items = history.pop()!;
    selected = -1;
    render();
    save();
  });
  q("[data-clear]").addEventListener("click", () => {
    if (
      items.length &&
      !confirm(
        "Start a new drawing? Save a project or export first if you need to keep this layout.",
      )
    )
      return;
    checkpoint();
    items = [];
    selected = -1;
    render();
    save();
  });
  q("[data-dxf]").addEventListener("click", () =>
    download(
      new Blob([toDxf(items, calculationReport)], { type: "application/dxf" }),
      "traffic-management-DRAFT.dxf",
    ),
  );
  q("[data-project]").addEventListener("click", () =>
    download(
      new Blob(
        [JSON.stringify({ version: 1, items, calculationReport }, null, 2)],
        {
          type: "application/json",
        },
      ),
      "traffic-management-project.json",
    ),
  );
  q<HTMLInputElement>("[data-open-project]").addEventListener(
    "change",
    async (e) => {
      const input = e.target as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw Error("Project exceeds 2 MB.");
        const data = JSON.parse(await file.text());
        if (data.version !== 1 || !validDrawing(data.items))
          throw Error("Unsupported or invalid project.");
        if (
          items.length &&
          !confirm("Replace this drawing with the selected project?")
        )
          return;
        checkpoint();
        items = data.items;
        if (
          typeof data.calculationReport === "string" &&
          data.calculationReport.length <= 80000
        )
          setReport(
            "IMPORTED REPORT — verify against the drawing and current guidance.\n" +
              data.calculationReport,
          );
        selected = -1;
        render();
        save();
        status("Editable project opened.");
      } catch (error) {
        status(error instanceof Error ? error.message : "Cannot open project.");
      } finally {
        input.value = "";
      }
    },
  );
  q("[data-pdf]").addEventListener("click", async () => {
    const button = q<HTMLButtonElement>("[data-pdf]");
    button.disabled = true;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      pdf.setFontSize(16);
      pdf.text("Traffic management — DRAFT", 25, 28);
      pdf.setFontSize(9);
      pdf.text(
        "Competent traffic-management designer review required. Schematic, not to scale.",
        25,
        44,
      );
      const scale = 0.75,
        ox = 35,
        oy = 65;
      for (const s of primitives(items)) {
        pdf.setDrawColor(s.color);
        pdf.setTextColor(s.color);
        if (s.kind === "line") {
          pdf.setLineWidth(s.width * scale);
          pdf.line(
            ox + s.x1 * scale,
            oy + s.y1 * scale,
            ox + s.x2 * scale,
            oy + s.y2 * scale,
          );
        }
        if (s.kind === "circle") {
          pdf.setLineWidth(1);
          pdf.circle(ox + s.cx * scale, oy + s.cy * scale, s.r * scale);
        }
        if (s.kind === "text") {
          pdf.setFontSize(s.size * scale);
          pdf.text(s.text, ox + s.x * scale, oy + s.y * scale);
        }
      }
      if (calculationReport) {
        const lines: string[] = pdf.splitTextToSize(calculationReport, 760);
        for (let i = 0; i < lines.length; i += 42) {
          pdf.addPage();
          pdf.setTextColor("#102d23");
          pdf.setFontSize(9);
          pdf.text(lines.slice(i, i + 42), 30, 35);
        }
      }
      pdf.save("traffic-management-DRAFT.pdf");
      status("Draft PDF exported.");
    } catch (error) {
      console.error("Traffic-management PDF export failed", error);
      status("PDF export failed. Try again or export DXF / save a project.");
    } finally {
      button.disabled = false;
    }
  });
  let uploadVersion = 0;
  q<HTMLInputElement>("[data-upload]").addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0],
      version = ++uploadVersion,
      preview = q("[data-preview]"),
      message = q("[data-upload-status]"),
      original = q<HTMLAnchorElement>("[data-original]");
    preview.replaceChildren();
    original.hidden = true;
    original.removeAttribute("href");
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    originalUrl = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (
      ![
        "dxf",
        "dwg",
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
        "bmp",
      ].includes(ext) ||
      file.size > 20 * 1024 * 1024 ||
      file.size === 0
    ) {
      message.textContent =
        "Choose a non-empty DXF, DWG, PDF or supported image up to 20 MB.";
      return;
    }
    originalUrl = URL.createObjectURL(file);
    original.href = originalUrl;
    original.download = file.name;
    original.hidden = false;
    message.textContent = `${file.name} — original available to download. Kept in this tab only.`;
    if (ext === "dwg") {
      message.textContent +=
        " DWG preview is unavailable. Open the original with a compatible CAD viewer.";
      return;
    }
    if (ext === "dxf") {
      try {
        const text = await file.text();
        if (version !== uploadVersion) return;
        const parsed = parseDxf(text),
          svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", bounds(parsed.shapes));
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "500");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Partial DXF drawing preview");
        for (const s of parsed.shapes) svg.appendChild(svgShape(s));
        preview.appendChild(svg);
        message.textContent += ` Partial preview: ${parsed.shapes.length} supported shapes; ${parsed.unsupported} unsupported or invalid entities omitted. Check the original in CAD before relying on it.`;
      } catch (error) {
        if (version === uploadVersion)
          message.textContent += ` ${error instanceof Error ? error.message : "Preview failed."} Original remains available.`;
      }
      return;
    }
    if (ext === "pdf") {
      const frame = document.createElement("iframe");
      frame.title = "Existing drawing PDF preview";
      previewUrl = URL.createObjectURL(
        new Blob([file], { type: "application/pdf" }),
      );
      frame.src = previewUrl;
      preview.appendChild(frame);
      message.textContent +=
        " If the PDF preview is unavailable, download the original and use a PDF reader.";
    } else {
      const img = document.createElement("img");
      img.alt = "Existing traffic-management drawing";
      img.src = originalUrl;
      img.onerror = () => {
        if (version === uploadVersion)
          message.textContent +=
            " Image preview failed. Download the original to view it.";
      };
      preview.appendChild(img);
    }
  });
  render();
  if (items.length)
    q("[data-save-status]").textContent =
      "Restored the drawing saved in this browser.";
}
