import { buildMapDraft } from "./map.mjs";
import { bindMapControls, type MapState } from "./map-client";
import { buildDraft, designReport } from "./generate.mjs";
import {
  HEIGHT,
  DRAFT,
  validDrawing,
  primitives,
  toDxf,
  parseDxf,
  bounds,
  withSignFaces,
  layoutSymbolCallouts,
} from "./drawing.mjs";
type Item = {
  type: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  text: string;
  scale?: number;
  signFace?: string;
  points?: number[][];
};
const NS = "http://www.w3.org/2000/svg",
  KEY = "tgd-tm-draft-v1";
function svgShape(s: any) {
  const node = document.createElementNS(
    NS,
    s.kind === "text"
      ? "text"
      : s.kind === "circle"
        ? "circle"
        : s.kind === "polygon"
          ? "polygon"
          : "line",
  );
  const attrs =
    s.kind === "polygon"
      ? {
          points: s.points.map((p: number[]) => p.join(",")).join(" "),
          fill: s.fill,
          stroke: s.color,
          "stroke-width": s.width,
          "stroke-linejoin": "round",
        }
      : s.kind === "line"
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
              fill: s.fill || "none",
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
  let restoredMap: MapState | null = null,
    awaitingMap = false;
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
        items = withSignFaces(items, calculationReport);
        const mapRecord = JSON.parse(
          localStorage.getItem(KEY + "-map") || "null",
        );
        if (mapRecord?.snapshot === saved && mapRecord.state)
          restoredMap = mapRecord.state;
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
      if (map.state)
        localStorage.setItem(
          KEY + "-map",
          JSON.stringify({ snapshot: JSON.stringify(items), state: map.state }),
        );
      else localStorage.removeItem(KEY + "-map");
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
    const displayItems = layoutSymbolCallouts(items);
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
      for (const s of primitives([displayItems[i]], false))
        g.appendChild(svgShape(s));
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
      y: map.state ? HEIGHT - 35 : HEIGHT - 10,
      text: DRAFT,
      size: 12,
      color: "#8c3510",
    });
    if (map.state) {
      const points = map.state.alignment;
      if (points.length === 2)
        layer.appendChild(
          svgShape({
            kind: "line",
            x1: points[0][0],
            y1: points[0][1],
            x2: points[1][0],
            y2: points[1][1],
            color: "#1470b8",
            width: 2,
          }),
        );
      points.forEach((p, i) => {
        layer.appendChild(
          svgShape({
            kind: "circle",
            cx: p[0],
            cy: p[1],
            r: 5,
            color: "#1470b8",
            fill: "white",
          }),
        );
        layer.appendChild(
          svgShape({
            kind: "text",
            x: p[0] + 8,
            y: p[1] - 8,
            size: 12,
            color: "#1255b0",
            text: i === 0 ? "Works start" : "Works end",
          }),
        );
      });
      map.state.features.forEach((p, i) => {
        layer.appendChild(
          svgShape({
            kind: "circle",
            cx: p[0],
            cy: p[1],
            r: 10,
            color: "#9a3412",
            fill: "#ffe589",
          }),
        );
        layer.appendChild(
          svgShape({
            kind: "text",
            x: p[0] + 13,
            y: p[1],
            size: 12,
            color: "#9a3412",
            text: `Review ${i + 1}`,
          }),
        );
      });
    }
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
  const map = bindMapControls(root, {
    hasItems: () => items.length > 0,
    clear: () => {
      items = [];
      history = [];
      selected = -1;
      setReport("");
    },
    changed: (invalidate = false) => {
      if (invalidate) setReport("");
      awaitingMap = false;
      render();
      save();
    },
  });
  const generator = q<HTMLFormElement>("[data-generator]");
  const roadType = q<HTMLSelectElement>('[data-generator] [name="roadType"]');
  const laneCount = q<HTMLSelectElement>('[data-generator] [name="laneCount"]');
  const widthHost = q("[data-lane-widths]");
  const totalWidth = () => {
    q<HTMLInputElement>('[name="roadWidth"]').value = String(
      Array.from(widthHost.querySelectorAll<HTMLInputElement>("input")).reduce(
        (n, i) => n + Number(i.value),
        0,
      ),
    );
  };
  const syncWidths = () => {
    const old = Array.from(
      widthHost.querySelectorAll<HTMLInputElement>("input"),
    ).map((i) => i.value);
    widthHost.replaceChildren();
    for (let i = 0; i < Number(laneCount.value); i++) {
      const label = document.createElement("label"),
        input = document.createElement("input");
      label.textContent = `Lane ${i + 1} width (m)`;
      input.type = "number";
      input.min = "1";
      input.max = "6";
      input.step = "any";
      input.required = true;
      input.value = old[i] || "3";
      input.dataset.laneWidth = String(i);
      input.addEventListener("input", totalWidth);
      label.appendChild(input);
      widthHost.appendChild(label);
    }
    totalWidth();
    const aiLane = q<HTMLSelectElement>("[data-ai-lane]");
    const prior = aiLane.value;
    aiLane.replaceChildren();
    for (let i=1;i<=Number(laneCount.value);i++) {
      const option=document.createElement("option");option.value=String(i);option.textContent=`Lane ${i}`;aiLane.appendChild(option);
    }
    aiLane.value=Number(prior)<=Number(laneCount.value)?prior:"1";
  };
  laneCount.addEventListener("change", syncWidths);
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
    syncWidths();
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
      if (map.busy || awaitingMap)
        throw Error("Wait for the job map to load before generating.");
      if(map.state?.alignmentMode === "direction")throw Error("For the standard calculator, use Mark working section to mark both actual work endpoints. The start + direction marks are for AI drafting.");
      if (map.state?.site === "complex" || map.state?.features.length)
        throw Error(
          "Junction/roundabout or access review is required. Use the map and manual tools to design the affected approaches; the straight-road calculator cannot design this case.",
        );
      const widths = Array.from(
        widthHost.querySelectorAll<HTMLInputElement>("input"),
      ).map((i) => Number(i.value));
      if (
        roadType.value !== "single" &&
        widths.some((w) => Math.abs(w - widths[0]) > 0.01)
      )
        throw Error(
          "Unequal lanes require a site-specific lane-closure design. They cannot use the equal-lane automatic profile.",
        );
      const input = {
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
      };
      const { items: generated, design } = map.state
        ? buildMapDraft(input, map.state.alignment, map.state.view)
        : buildDraft(input);
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
      setReport(
        `${map.state ? "MAP-BASED DRAFT — verify image currency, alignment and all junctions/accesses.\n" : ""}Lane widths: ${widths.join(", ")} m — ${values.get("widthSource") === "surveyed" ? "entered as surveyed measurements" : values.get("widthSource") === "map" ? "map-measured — approximate, confirm" : "ASSUMED — confirm on site"}.\n${designReport(design)}`,
      );
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
  const aiButton = q<HTMLButtonElement>("[data-ai-create]");
  const aiStatus = q("[data-ai-status]");
  let aiRunning = false;
  fetch("/api/traffic-map/draft").then(r=>r.json() as Promise<{available?: boolean}>).then(data=>{
    aiButton.disabled=!data.available;
    aiStatus.textContent=data.available ? "Ready. Mark the work start and direction, describe the job and enter its measurements." : "AI drawing needs owner setup. The manual editor and standard calculator remain available.";
  }).catch(()=>{aiStatus.textContent="Could not check AI availability. Refresh to retry.";});
  aiButton.addEventListener("click", async () => {
    if(aiRunning)return;
    try {
      if(!map.state||map.busy||awaitingMap)throw Error("Load the map before creating an AI drawing.");
      if(map.state.alignment.length!==2)throw Error("Mark the work start, then a second point along the road in the direction of travel.");
      const values=new FormData(generator);
      const access=q<HTMLInputElement>("[data-ai-access]").value;
      const payload={
        description:q<HTMLTextAreaElement>("[data-ai-description]").value,
        closedLane:Number(q<HTMLSelectElement>("[data-ai-lane]").value),
        map:map.state.view,alignment:map.state.alignment,features:map.state.features,site:map.state.site,
        inputs:{roadType:String(values.get("roadType")),speed:Number(values.get("speed")),laneCount:Number(values.get("laneCount")),roadName:String(values.get("roadName")||""),
          widths:Array.from(widthHost.querySelectorAll<HTMLInputElement>("input")).map(i=>Number(i.value)),widthSource:String(values.get("widthSource")),
          worksLength:Number(values.get("worksLength")),workWidth:Number(values.get("workWidth")),hasHardShoulder:values.has("hasHardShoulder"),congestion:values.has("congestion"),accessAt:access===""?null:Number(access)}
      };
      const mapSnapshot=JSON.stringify(map.state);
      let changed=false;
      const onChange=()=>{changed=true;};
      generator.addEventListener("input",onChange);generator.addEventListener("change",onChange);
      aiRunning=true;aiButton.disabled=true;aiStatus.textContent="AI is reading this map and tracing the road. This may take up to a few minutes…";
      q<HTMLElement>("[data-ai-review]").hidden=true;
      let data: {error?:string;status?:string;analysis?:{summary:string;observations:string[];features:{label:string}[]};issues?:string[];items?:Item[];report?:string};
      try {
        const response=await fetch("/api/traffic-map/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(170000)});
        data=await response.json();
        if(!response.ok)throw Error(data.error||"Could not create an AI drawing.");
        if(changed||JSON.stringify(map.state)!==mapSnapshot)throw Error("The map or job inputs changed during generation. The result was not applied; create again using the current details.");
      } finally {generator.removeEventListener("input",onChange);generator.removeEventListener("change",onChange);}
      q<HTMLElement>("[data-ai-review]").hidden=false;
      q("[data-ai-summary]").textContent=data.analysis?.summary||"AI map review";
      const list=q("[data-ai-issues]");list.replaceChildren();
      for(const text of [...(data.issues||[]),...(data.analysis?.observations||[]),...(data.analysis?.features||[]).map(f=>"Review feature: "+f.label)]){const li=document.createElement("li");li.textContent=text;list.appendChild(li);}
      if(data.status!=="draft") {aiStatus.textContent="AI reviewed the map, but could not complete a supported equipment layout. Resolve the points below or finish the site-specific design manually. Your drawing is unchanged.";return;}
      if(!validDrawing(data.items)||typeof data.report!=="string"||data.report.length>80000)throw Error("The AI drawing response was invalid. Your drawing is unchanged.");
      if(items.length&&!confirm("Replace the current drawing with the AI-assisted draft? Save editable data first to keep the current version. You can undo this replacement.")){aiStatus.textContent="AI result was not applied. Current drawing kept.";return;}
      checkpoint();items=data.items!;selected=-1;tool.value="select";setReport(data.report);render();save();
      q<HTMLDetailsElement>("[data-calculation-details]").open=true;
      aiStatus.textContent="AI-assisted draft created from this map. Signs, cones and tapers are editable. Inspect the road alignment, schedule and all site conditions before use. This is not an approved design.";
      q<HTMLElement>("#tm-map-controls").scrollIntoView({block:"start",behavior:"smooth"});
    } catch(error){aiStatus.textContent=error instanceof Error?error.message:"AI drawing failed; current drawing kept.";}
    finally{aiRunning=false;aiButton.disabled=false;}
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
    if (items[i]?.type === "sign")
      q<HTMLSelectElement>("[data-sign-face]").value =
        items[i].signFace || "generic";
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
    if (tool.value === "sign")
      items.at(-1)!.signFace = q<HTMLSelectElement>("[data-sign-face]").value;
    selected = items.length - 1;
    return true;
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || map.busy || map.pan) return;
    const p = point(e);
    if (map.consume(p)) return;
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
      if (item.points)
        item.points = item.points.map((p, i) => [
          drag!.base[drag!.index].points![i][0] + dx,
          drag!.base[drag!.index].points![i][1] + dy,
        ]);
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
  q<HTMLSelectElement>("[data-sign-face]").addEventListener("change", () => {
    if (selected >= 0 && items[selected].type === "sign") {
      checkpoint();
      items[selected].signFace = q<HTMLSelectElement>("[data-sign-face]").value;
      render();
      save();
    }
  });
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
    history = [];
    map.reset();
    awaitingMap = false;
    render();
    save();
  });
  q("[data-dxf]").addEventListener("click", () =>
    download(
      new Blob(
        [
          toDxf(
            items,
            (map.state
              ? "Map background is omitted from DXF. Drawing coordinates are sketch units, not surveyed CAD coordinates.\n"
              : "") + calculationReport,
          ),
        ],
        { type: "application/dxf" },
      ),
      "traffic-management-DRAFT.dxf",
    ),
  );
  q("[data-project]").addEventListener("click", () =>
    download(
      new Blob(
        [
          JSON.stringify(
            { version: 1, items, calculationReport, map: map.state },
            null,
            2,
          ),
        ],
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
        items = withSignFaces(items, calculationReport);
        selected = -1;
        history = [];
        map.reset();
        awaitingMap = !!data.map;
        if (data.map) {
          try {
            await map.restore(data.map);
            awaitingMap = false;
          } catch {
            status(
              "Project opened, but its map could not load. Check map setup or start a new drawing.",
            );
            render();
            return;
          }
        }
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
      if (awaitingMap || map.busy)
        throw Error(
          "The map background has not loaded. Wait or check the map connection before exporting.",
        );
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      pdf.setFontSize(16);
      pdf.text("Traffic management - DRAFT", 25, 28);
      pdf.setFontSize(9);
      pdf.text(
        "Competent traffic-management designer review required. Schematic, not to scale.",
        25,
        44,
      );
      pdf.text(
        "Leader dots mark actual anchors; sign and signal faces may be displaced for readability.",
        25,
        56,
      );
      const scale = 0.75,
        ox = 35,
        oy = 65;
      if (map.image)
        pdf.addImage(map.image, "PNG", ox, oy, 1000 * scale, 650 * scale);
      const mapMarkers =
        map.state?.features.flatMap((p, i) => [
          {
            kind: "circle",
            cx: p[0],
            cy: p[1],
            r: 10,
            color: "#9a3412",
            fill: "#ffe589",
          },
          {
            kind: "text",
            x: p[0] + 13,
            y: p[1],
            text: `Review ${i + 1}`,
            size: 12,
            color: "#9a3412",
          },
        ]) || [];
      for (const s of [...primitives(items), ...mapMarkers] as any[]) {
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
        if (s.kind === "polygon") {
          pdf.setFillColor(s.fill === "none" ? "#fff" : s.fill);
          pdf.setLineWidth(s.width * scale);
          const [first, ...rest] = s.points;
          let prev = first;
          const vectors = rest.map((p: number[]) => {
            const v = [(p[0] - prev[0]) * scale, (p[1] - prev[1]) * scale];
            prev = p;
            return v;
          });
          pdf.lines(
            vectors,
            ox + first[0] * scale,
            oy + first[1] * scale,
            [1, 1],
            s.fill === "none" ? "S" : "FD",
            true,
          );
        }
        if (s.kind === "circle") {
          pdf.setLineWidth(1);
          if (s.fill && s.fill !== "none") pdf.setFillColor(s.fill);
          pdf.circle(
            ox + s.cx * scale,
            oy + s.cy * scale,
            s.r * scale,
            s.fill && s.fill !== "none" ? "FD" : "S",
          );
        }
        if (s.kind === "text") {
          pdf.setFontSize(s.size * scale);
          pdf.text(s.text, ox + s.x * scale, oy + s.y * scale);
        }
      }
      if (map.state) {
        pdf.setFontSize(8);
        pdf.text(
          "Map context only. Verify site measurements and all marked features. Map not to print scale.",
          25,
          575,
        );
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
  if (restoredMap) {
    awaitingMap = true;
    map
      .restore(restoredMap)
      .then(() => {
        awaitingMap = false;
        render();
      })
      .catch(() =>
        status(
          "Saved drawing restored but its map could not load. Check map setup, or start a new drawing. PDF export is paused to avoid an incomplete plan.",
        ),
      );
  }
  if (items.length)
    q("[data-save-status]").textContent =
      "Restored the drawing saved in this browser.";
}
