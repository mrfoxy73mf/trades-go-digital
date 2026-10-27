import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMapDraft,
  mapPixelsPerMetre,
  panMap,
  validMap,
} from "../src/lib/traffic-management/map.mjs";
import {
  handleMapRequest,
  locationSearch,
  mapImage,
} from "../src/lib/traffic-management/map-service.mjs";
import {
  primitives,
  withSignFaces,
  signFaceForLabel,
  validDrawing,
  layoutSymbolCallouts,
} from "../src/lib/traffic-management/drawing.mjs";
const view = { lat: 51.57, lng: 0.45, zoom: 17 };
const input = {
  roadType: "single",
  speed: 30,
  laneCount: 2,
  roadWidth: 6.5,
  workWidth: 2,
  worksLength: 30,
  worksStart: 0,
  worksSide: "near",
  scopeConfirmed: true,
};
test("map projection/pan are finite and reject invalid views", () => {
  assert.ok(validMap(view));
  assert.ok(!validMap({ ...view, zoom: NaN }));
  assert.ok(!validMap({ ...view, zoom: 21 }));
  assert.ok(!validMap({ ...view, lat: 90 }));
  assert.ok(!validMap({ ...view, zoom: 17.5 }));
  const same = panMap(panMap(view, 100, 80), -100, -80);
  assert.ok(Math.abs(same.lat - view.lat) < 1e-9);
  assert.ok(Math.abs(same.lng - view.lng) < 1e-9);
});
test("map drafting follows a diagonal working alignment using measured geometry, not compressed schematic positions", () => {
  const ppm = mapPixelsPerMetre(view),
    start = [450, 300],
    end = [450 + (30 * ppm) / Math.sqrt(2), 300 - (30 * ppm) / Math.sqrt(2)];
  const result = buildMapDraft(input, [start, end], view);
  assert.ok(validDrawing(result.items));
  assert.equal(
    result.items.filter((i) => i.type === "cone").length,
    result.design.coneCount,
  );
  assert.equal(result.items.find((i) => i.type === "works").points.length, 4);
  assert.equal(
    result.items.find((i) => i.text === "K1").signFace,
    "keep-right",
  );
  assert.throws(
    () =>
      buildMapDraft(
        input,
        [
          [450, 300],
          [460, 300],
        ],
        view,
      ),
    /approximately/,
  );
  assert.throws(
    () =>
      buildMapDraft(
        { ...input, worksLength: 200 },
        [
          [100, 100],
          [100 + 200 * ppm, 100],
        ],
        view,
      ),
    /beyond/,
  );
});
test("legacy schedules resolve actual sign meanings without guessing from IDs", () => {
  const sign = {
    type: "sign",
    x: 100,
    y: 100,
    x2: 100,
    y2: 100,
    text: "S2A",
    scale: 0.65,
  };
  assert.equal(
    withSignFaces(
      [sign],
      "S2A: 20 m | Nearside | 7202/7208 Lane closure — 200 yards",
    )[0].signFace,
    "lane-closure",
  );
  assert.equal(
    withSignFaces(
      [sign],
      "S2A: 20 m | Approach A | 543 Traffic signals ahead",
    )[0].signFace,
    "signals",
  );
  assert.equal(withSignFaces([sign], "")[0].signFace, "generic");
  assert.equal(
    signFaceForLabel("610 Keep left (opposing approach)"),
    "keep-left",
  );
  const shapes = primitives([{ ...sign, type: "cone", scale: 0.18 }]);
  assert.ok(shapes.some((s) => s.fill === "#ff791f"));
  assert.ok(shapes.some((s) => s.fill === "#fff"));
  assert.ok(!validDrawing([{ ...sign, signFace: "not-a-sign" }]));
});
test("search validates queries, separates postcode/what3words credentials and never returns keys", async () => {
  await assert.rejects(locationSearch("SS15 6TY", {}), /site owner/);
  await assert.rejects(
    locationSearch("///filled.count.soap", {}),
    /what3words/,
  );
  const key = "PRIVATE-KEY";
  let requested;
  const mock = async (url) => {
    requested = url;
    return Response.json({
      status: "OK",
      results: [
        {
          formatted_address: "Basildon",
          geometry: {
            location: { lat: 51.57, lng: 0.45 },
            location_type: "APPROXIMATE",
          },
        },
      ],
    });
  };
  const results = await locationSearch(
    "SS15 6TY",
    { GOOGLE_MAPS_SERVER_KEY: key },
    mock,
  );
  assert.equal(requested.hostname, "maps.googleapis.com");
  assert.equal(requested.searchParams.get("components"), "country:GB");
  assert.ok(!JSON.stringify(results).includes(key));
  const words = await locationSearch(
    "///filled.count.soap",
    { WHAT3WORDS_API_KEY: key },
    async (url) => {
      assert.equal(url.hostname, "api.what3words.com");
      return Response.json({
        coordinates: { lat: 51.5, lng: 0 },
        words: "filled.count.soap",
        nearestPlace: "London",
      });
    },
  );
  assert.equal(words[0].lat, 51.5);
});
test("map endpoint restricts provider URLs, preserves full images and fails closed without rate limits", async () => {
  const bytes = await mapImage(
    view,
    { GOOGLE_MAPS_SERVER_KEY: "secret" },
    async (url) => {
      assert.equal(url.searchParams.get("size"), "640x416");
      assert.equal(url.hostname, "maps.googleapis.com");
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/png" },
      });
    },
  );
  assert.equal(bytes.byteLength, 3);
  const req = (body) =>
    new Request("https://example.com/api/traffic-map", {
      method: "POST",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await handleMapRequest(req({ action: "search", query: "Basildon" }), {}))
      .status,
    503,
  );
  const rate = {
    TRAFFIC_MAP_RATE_LIMITER: { limit: async () => ({ success: false }) },
  };
  assert.equal(
    (await handleMapRequest(req({ action: "search", query: "Basildon" }), rate))
      .status,
    429,
  );
  assert.equal(
    (
      await handleMapRequest(
        new Request("https://example.com/api/traffic-map", {
          method: "POST",
          body: "{}",
        }),
        {},
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleMapRequest(
        req({ action: "image", map: { ...view, zoom: 999 } }),
        {
          ...rate,
          TRAFFIC_MAP_RATE_LIMITER: { limit: async () => ({ success: true }) },
        },
      )
    ).status,
    400,
  );
});

test("crowded sign faces use callouts without changing actual anchors", () => {
  const items = Array.from({ length: 5 }, (_, i) => ({
    type: "sign",
    x: 400 + i * 20,
    y: 300,
    x2: 400 + i * 20,
    y2: 300,
    text: "S" + i,
    scale: 0.85,
    signFace: "roadworks",
  }));
  const display = layoutSymbolCallouts(items);
  assert.ok(display.some((p, i) => p.displayY !== items[i].y));
  assert.deepEqual(
    display.map((p) => [p.x, p.y]),
    items.map((p) => [p.x, p.y]),
  );
  const shapes = primitives(items);
  assert.ok(shapes.some((s) => s.kind === "line" && s.color === "#536174"));
});
