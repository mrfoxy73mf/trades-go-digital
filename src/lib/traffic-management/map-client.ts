import { validMap, panMap, mapPixelsPerMetre } from "./map.mjs";
export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
  label?: string;
  created?: number;
}
interface MapResult {
  lat: number;
  lng: number;
  label: string;
  approximate?: boolean;
}
export interface MapState {
  view: MapView;
  alignment: number[][];
  features: number[][];
  site: "straight" | "complex";
}
export function bindMapControls(
  root: HTMLElement,
  hooks: {
    hasItems: () => boolean;
    clear: () => void;
    changed: (invalidate?: boolean) => void;
  },
) {
  const q = <T = HTMLElement>(s: string) =>
    root.querySelector(s) as unknown as T;
  let state: MapState | null = null,
    image = "",
    marking = 0,
    featureMode = false,
    pan = false,
    busy = false;
  const message = (s: string) => (q("[data-map-status]").textContent = s);
  const api = async (body: object) => {
    const r = await fetch("/api/traffic-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const data = (await r.json()) as { error?: string };
      throw Error(data.error || "Map request failed.");
    }
    return r;
  };
  const run = (f: () => Promise<void>) =>
    f().catch((e) =>
      message(e instanceof Error ? e.message : "Map request failed."),
    );
  const update = () => {
    q<SVGImageElement>("[data-map-image]").setAttribute("href", image);
    q("[data-map-alignment]").textContent =
      state?.alignment.length === 2
        ? `Working section marked: approximately ${(Math.hypot(state.alignment[1][0] - state.alignment[0][0], state.alignment[1][1] - state.alignment[0][1]) / mapPixelsPerMetre(state.view)).toFixed(1)} m on map. Enter the surveyed length below. ${state.features.length} junction/access points marked for review.`
        : marking
          ? "Tap the start, then end of the working section on the road centreline, in the primary direction of travel."
          : "No working section marked.";
    for (const b of root.querySelectorAll<HTMLButtonElement>(
      "[data-map-zoom-in],[data-map-zoom-out],[data-map-pan],[data-map-mark],[data-map-feature],[data-map-remove]",
    ))
      b.disabled = !state || busy;
  };
  async function load(next: MapState, replace: boolean) {
    if (
      !next ||
      !validMap(next.view) ||
      !["straight", "complex"].includes(next.site) ||
      (next.view.created !== undefined &&
        (!Number.isFinite(next.view.created) ||
          next.view.created <= 0 ||
          next.view.created > Date.now() + 60000)) ||
      !Array.isArray(next.alignment) ||
      next.alignment.length > 2 ||
      !Array.isArray(next.features) ||
      next.features.length > 50 ||
      [...next.alignment, ...next.features].some(
        (p) =>
          !Array.isArray(p) ||
          p.length !== 2 ||
          p.some((v) => !Number.isFinite(v) || v < 0 || v > 1000),
      )
    )
      throw Error("Invalid saved map metadata.");
    if (next.view.created && Date.now() - next.view.created > 29 * 86400000)
      throw Error(
        "Saved map location has expired. Search the site again to refresh its location.",
      );
    if (
      replace &&
      hooks.hasItems() &&
      !confirm(
        "Changing the map clears the existing overlay to prevent incorrect positions. Save editable data first if you need it. Continue?",
      )
    )
      return;
    busy = true;
    update();
    message("Loading the road map…");
    try {
      const r = await api({ action: "image", map: next.view }),
        blob = await r.blob();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (replace) hooks.clear();
      state = structuredClone(next);
      state.view.created = next.view.created || Date.now();
      image = data;
      marking = 0;
      featureMode = false;
      q<HTMLSelectElement>("[data-map-site]").value = state.site;
      hooks.changed();
      message(
        `${state.view.label || "Job location"} — map loaded. Check the location and mark the working section.`,
      );
    } finally {
      busy = false;
      update();
    }
  }
  q<HTMLFormElement>("[data-map-search]").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      if (busy) return;
      run(async () => {
        busy = true;
        update();
        message("Finding location…");
        q("[data-map-results]").replaceChildren();
        try {
          const r = await api({
              action: "search",
              query: q<HTMLInputElement>("[data-map-query]").value,
            }),
            data = (await r.json()) as { results: MapResult[] };
          if (!data.results?.length) {
            message(
              "No locations found. Try a postcode or road name with town.",
            );
            return;
          }
          for (const result of data.results) {
            const li = document.createElement("li"),
              b = document.createElement("button");
            b.type = "button";
            b.textContent = `Use ${result.label}${result.approximate ? " — approximate; confirm on map" : ""}`;
            b.addEventListener("click", () => {
              if (!busy)
                run(() =>
                  load(
                    {
                      view: { ...result, zoom: 17, created: Date.now() },
                      alignment: [],
                      features: [],
                      site: "straight",
                    },
                    true,
                  ),
                );
            });
            li.appendChild(b);
            q("[data-map-results]").appendChild(li);
          }
          message("Choose the correct location below.");
        } finally {
          busy = false;
          update();
        }
      });
    },
  );
  const changeView = (fn: (view: MapView) => MapView) => {
    if (!state || busy) return;
    const view = fn(state.view);
    run(() =>
      load({ view, alignment: [], features: [], site: state!.site }, true),
    );
  };
  q("[data-map-zoom-in]").addEventListener("click", () =>
    changeView((v) => ({ ...v, zoom: Math.min(20, v.zoom + 1) })),
  );
  q("[data-map-zoom-out]").addEventListener("click", () =>
    changeView((v) => ({ ...v, zoom: Math.max(12, v.zoom - 1) })),
  );
  root.querySelectorAll<HTMLButtonElement>("[data-map-pan]").forEach((b) =>
    b.addEventListener("click", () => {
      const [dx, dy] = b.dataset.mapPan!.split(",").map(Number);
      changeView((v) => panMap(v, dx, dy));
    }),
  );
  q("[data-map-mark]").addEventListener("click", () => {
    if (!state) return;
    marking = 1;
    featureMode = false;
    pan = false;
    update();
    message("Tap the start of the working section on the road centreline.");
  });
  q("[data-map-feature]").addEventListener("click", () => {
    if (!state) return;
    featureMode = true;
    marking = 0;
    message(
      "Tap a junction, access or crossing. Marking an affected feature switches this site to manual design.",
    );
  });
  q<HTMLSelectElement>("[data-map-site]").addEventListener("change", () => {
    if (state) {
      state.site = q<HTMLSelectElement>("[data-map-site]")
        .value as MapState["site"];
      hooks.changed(true);
    }
  });
  q("[data-map-remove]").addEventListener("click", () => {
    if (!confirm("Remove the map and overlay and start a fresh drawing?"))
      return;
    state = null;
    image = "";
    marking = 0;
    featureMode = false;
    hooks.clear();
    hooks.changed();
    update();
    message("Map removed.");
  });
  const canvas = q<SVGSVGElement>("[data-canvas]");
  q<HTMLSelectElement>("[data-view-zoom]").addEventListener("change", () => {
    canvas.style.width = q<HTMLSelectElement>("[data-view-zoom]").value + "%";
  });
  q("[data-view-pan]").addEventListener("click", () => {
    pan = !pan;
    canvas.style.touchAction = pan ? "pan-x pan-y" : "none";
    q("[data-view-pan]").setAttribute("aria-pressed", String(pan));
    q("[data-view-pan]").textContent = pan ? "Return to editing" : "Pan view";
  });
  fetch("/api/traffic-map")
    .then(
      async (r) => (await r.json()) as { maps: boolean; what3words: boolean },
    )
    .then((c) =>
      message(
        c.maps
          ? "Postcode and address search ready." +
              (c.what3words
                ? " what3words ready."
                : " what3words needs owner setup.")
          : "Automatic map search needs the site owner’s Google Maps API setup. You can still use the schematic editor.",
      ),
    )
    .catch(() =>
      message("Could not check map setup. Try location search again."),
    );
  update();
  return {
    get state() {
      return state;
    },
    get image() {
      return image;
    },
    get busy() {
      return busy;
    },
    get pan() {
      return pan;
    },
    restore: (next: MapState) => load(next, false),
    reset: () => {
      state = null;
      image = "";
      update();
    },
    consume(p: { x: number; y: number }) {
      if (!state) return false;
      if (marking) {
        if (marking === 1) {
          state.alignment = [[p.x, p.y]];
          marking = 2;
          message("Now tap the end of the working section.");
        } else {
          state.alignment.push([p.x, p.y]);
          marking = 0;
          message(
            "Working section marked. Enter site measurements and confirm the supported scope before generating.",
          );
        }
        hooks.changed(true);
        update();
        return true;
      }
      if (featureMode) {
        if (state.features.length >= 50) {
          message("Maximum 50 review points.");
          return true;
        }
        state.features.push([p.x, p.y]);
        state.site = "complex";
        q<HTMLSelectElement>("[data-map-site]").value = "complex";
        featureMode = false;
        hooks.changed(true);
        update();
        message(
          "Review point marked. Automatic straight-road generation is blocked for this site; design each affected approach manually.",
        );
        return true;
      }
      return false;
    },
  };
}
