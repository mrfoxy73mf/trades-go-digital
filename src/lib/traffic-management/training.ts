const steps = [
  {
    title: "1. Find and check the location",
    copy: "Enter a postcode or road and town, press Find location, then choose the result. A postcode covers an area: zoom or move the map until you can see the exact job. Google maps provide context; they do not measure lane widths or automatically detect every junction.",
    target: ".location-editor",
  },
  {
    title: "2. Check whether automatic drawing is suitable",
    copy: "Look along the whole affected area, including the approach signs. Is there a slip road, junction, crossing or affected access? Choose the slip-road / junction layout and use manual design. A lane-one closure with an affected slip road is not a simple straight-road case. Leave the straight-road confirmation unticked; do not tick it just to continue.",
    target: "[data-map-site]",
  },
  {
    title: "3. Mark the working section",
    copy: "Press Mark working section, then tap the start and end on the road centreline in the direction of travel. These points mark the work itself, not the whole advance-signing area. Use Mark junction / access for nearby features needing review. The map controls sit directly above the map, below the measurements. Use “Go to the map and its controls” to jump there.",
    target: "[data-map-mark]",
  },
  {
    title: "4. Enter measurements and understand chainage",
    copy: "Choose the road type and permanent speed limit. Enter each lane’s measured width, the work’s width and length. The initial 3 m lane width is only an assumption. Chainage means distance along the road from a reference point: use 0 if the work starts there, or 50 if it starts 50 m beyond it. Lane one is normally the left-hand lane in the direction of travel; check the closed-side selection against the actual site.",
    target: ".generator-fields",
  },
  {
    title: "5. Generate only a supported draft",
    copy: "Read the scope confirmation before selecting it. The calculator has limited straight-road profiles and may reject your dimensions; never change real measurements to make them pass. A slip-road case needs manual design. A generated draft still needs a competent designer’s review of the whole site and the sign schedule.",
    target: "[name=scopeConfirmed]",
  },
  {
    title: "6. Practise cones, signs and moving symbols",
    copy: "Try the separate sketch below. Add a cone or sign, then choose Select / move and tap a symbol followed by its new position. This is only a controls exercise: there is no compliant spacing, taper or sign sequence in this sketch. On your job drawing, use the main tool selector to place symbols; drag selected items to move them.",
    target: "[data-tool]",
  },
  {
    title: "7. Save the right file",
    copy: "Download drawing PDF gives you a viewable drawing. Save editable data (.json) keeps a project you can reopen; seeing code when opening that file is normal. DXF exports vector outlines without the map. Your job autosaves only in this browser, so export files you need to keep. Training practice is never saved or exported. Completing this tour does not approve a design.",
    target: ".actions",
  },
];

export function bindTrafficTraining() {
  const root = document.querySelector<HTMLElement>(".drawing-workspace");
  if (!root) return;
  const q = <T = HTMLElement>(selector: string) => root.querySelector(selector) as unknown as T;
  const toggle = q<HTMLButtonElement>("[data-training-toggle]");
  if (!toggle) return;
  const panel = q<HTMLElement>("[data-training-panel]");
  const canvas = q<SVGSVGElement>("[data-training-canvas]");
  const layer = q<SVGGElement>("[data-training-symbols]");
  const tool = q<HTMLSelectElement>("[data-training-tool]");
  let step = 0;
  let highlighted: HTMLElement | null = null;
  let selected = -1;
  let symbols: { type: string; x: number; y: number }[] = [];
  const message = (text: string) => { q("[data-training-status]").textContent = text; };
  const clearHighlight = () => { highlighted?.classList.remove("training-highlight"); highlighted = null; };
  function renderSymbols() {
    layer.replaceChildren();
    symbols.forEach((symbol, index) => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("transform", `translate(${symbol.x} ${symbol.y})`);
      group.dataset.practiceIndex = String(index);
      // Only fixed artwork and internally generated numeric coordinates are inserted.
      group.innerHTML = symbol.type === "cone"
        ? '<path d="M-12 15L0-18L12 15Z" fill="#ff7518" stroke="#222" stroke-width="2"/><path d="M-7 0H7L10 8H-10Z" fill="white"/><path d="M-17 17H17" stroke="#222" stroke-width="5"/>'
        : '<path d="M-22 18L0-22L22 18Z" fill="white" stroke="#d32323" stroke-width="5"/><text x="0" y="11" text-anchor="middle" font-size="24" fill="#111">⚒</text>';
      if (selected === index) {
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("r", "30"); ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "#00e5ff"); ring.setAttribute("stroke-width", "3");
        group.appendChild(ring);
      }
      layer.appendChild(group);
    });
  }
  function reset() {
    symbols = [{ type: "cone", x: 250, y: 180 }, { type: "sign", x: 100, y: 52 }];
    selected = -1;
    renderSymbols();
    message("Practice sketch ready. Nothing here is saved or exported.");
  }
  function add(x: number, y: number) {
    if (symbols.length >= 40) { message("Practice sketch full. Reset it to try again."); return; }
    symbols.push({ type: tool.value, x, y });
    selected = -1; renderSymbols(); message(`Practice ${tool.value} added. ${symbols.length} practice symbols; job drawing unchanged.`);
  }
  function showStep(focus = true) {
    clearHighlight();
    const current = steps[step];
    q("[data-training-title]").textContent = current.title;
    q("[data-training-copy]").textContent = current.copy;
    q("[data-training-progress]").textContent = `Step ${step + 1} of ${steps.length}`;
    q<HTMLButtonElement>("[data-training-back]").disabled = step === 0;
    q<HTMLButtonElement>("[data-training-next]").textContent = step === steps.length - 1 ? "Finish training" : "Next";
    q<HTMLElement>("[data-training-practice]").hidden = step !== 5;
    if (focus) q<HTMLElement>("[data-training-content]").focus();
  }
  function close() {
    panel.hidden = true; clearHighlight();
    toggle.setAttribute("aria-expanded", "false"); toggle.textContent = "Start training mode"; toggle.focus();
  }
  toggle.addEventListener("click", () => {
    if (!panel.hidden) { close(); return; }
    panel.hidden = false; step = 0;
    toggle.setAttribute("aria-expanded", "true"); toggle.textContent = "Close training mode";
    showStep();
  });
  q("[data-training-back]").addEventListener("click", () => { step = Math.max(0, step - 1); showStep(); });
  q("[data-training-next]").addEventListener("click", () => {
    if (step === steps.length - 1) { close(); return; }
    step++; showStep();
  });
  q("[data-training-show]").addEventListener("click", () => {
    clearHighlight(); highlighted = root.querySelector<HTMLElement>(steps[step].target);
    highlighted?.classList.add("training-highlight");
    highlighted?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  q("[data-training-reset]").addEventListener("click", reset);
  tool.addEventListener("change", () => { selected = -1; renderSymbols(); });
  q("[data-training-add]").addEventListener("click", () => {
    if (tool.value === "select") { message("Choose Cone or Road works sign to add a symbol. To move one, tap it then tap its new position."); return; }
    add(80 + symbols.length * 37 % 540, 170);
  });
  canvas.addEventListener("click", (event) => {
    const matrix = canvas.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = Math.max(32, Math.min(668, point.x));
    const y = Math.max(50, Math.min(228, point.y));
    if (tool.value !== "select") { add(x, y); return; }
    if (selected >= 0) {
      symbols[selected].x = x; symbols[selected].y = y; selected = -1;
      renderSymbols(); message("Practice symbol moved. Job drawing unchanged."); return;
    }
    const target = (event.target as HTMLElement).closest<SVGGElement>("[data-practice-index]");
    if (!target) { message("Tap a practice symbol first, then tap its new position."); return; }
    selected = Number(target.dataset.practiceIndex); renderSymbols(); message("Symbol selected. Tap its new position.");
  });
  reset(); showStep(false);
}
