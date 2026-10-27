import { validMap, MAP_WIDTH, MAP_HEIGHT } from "./map.mjs";
export class MapError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export async function locationSearch(query, env, fetcher = fetch) {
  if (
    typeof query !== "string" ||
    query.trim().length < 3 ||
    query.length > 200
  )
    throw new MapError(
      "Enter a postcode, road and town, or what3words address.",
    );
  const clean = query.trim().replace(/^\/{3}/, "");
  const isWords = /^[\p{L}-]+\.[\p{L}-]+\.[\p{L}-]+$/u.test(clean);
  let url;
  if (isWords) {
    if (!env.WHAT3WORDS_API_KEY)
      throw new MapError(
        "what3words search needs the site owner to configure its API key and a plan supporting coordinate conversion. Postcode/address search may still be available.",
        503,
      );
    url = new URL("https://api.what3words.com/v3/convert-to-coordinates");
    url.searchParams.set("words", clean);
    url.searchParams.set("key", env.WHAT3WORDS_API_KEY);
  } else {
    if (!env.GOOGLE_MAPS_SERVER_KEY)
      throw new MapError(
        "Location search is ready for setup. The site owner must configure Google Maps Geocoding and Maps Static API access before live search can run.",
        503,
      );
    url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", clean);
    url.searchParams.set("components", "country:GB");
    url.searchParams.set("region", "gb");
    url.searchParams.set("key", env.GOOGLE_MAPS_SERVER_KEY);
  }
  let response, data;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(10000) });
    data = await response.json();
  } catch {
    throw new MapError(
      "Location provider could not be reached. Try again.",
      502,
    );
  }
  if (isWords) {
    if (!response.ok || data.error)
      throw new MapError(
        "what3words could not resolve this address. Check the three words, account plan and provider quota.",
        response.status === 402 ? 503 : 400,
      );
    if (!data.coordinates) throw new MapError("No location returned.", 404);
    return [
      {
        lat: data.coordinates.lat,
        lng: data.coordinates.lng,
        label: `///${data.words} — ${data.nearestPlace || ""}`,
      },
    ];
  }
  if (!response.ok || !["OK", "ZERO_RESULTS"].includes(data.status))
    throw new MapError(
      "Map search is unavailable. The site owner should check provider credentials, enabled APIs and quota.",
      503,
    );
  return (data.results || [])
    .slice(0, 5)
    .map((r) => ({
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      label: r.formatted_address,
      approximate: r.partial_match || r.geometry.location_type !== "ROOFTOP",
    }));
}
export async function mapImage(map, env, fetcher = fetch) {
  if (!validMap(map))
    throw new MapError("Choose valid coordinates and zoom (12–20).");
  if (!env.GOOGLE_MAPS_SERVER_KEY)
    throw new MapError(
      "Map images need Google Maps Static API access configured by the site owner.",
      503,
    );
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  for (const [k, v] of Object.entries({
    center: `${map.lat},${map.lng}`,
    zoom: map.zoom,
    size: `${MAP_WIDTH}x${MAP_HEIGHT}`,
    scale: 2,
    maptype: map.mapType === "hybrid" ? "hybrid" : "roadmap",
    format: "png",
    key: env.GOOGLE_MAPS_SERVER_KEY,
  }))
    url.searchParams.set(k, String(v));
  let response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
  } catch {
    throw new MapError("Map image provider could not be reached.", 502);
  }
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw new MapError(
      "Map image unavailable. Check Maps Static API access and quota.",
      503,
    );
  const image = await response.arrayBuffer();
  if (image.byteLength > 6 * 1024 * 1024)
    throw new MapError("Map image too large.", 502);
  return image;
}
export async function handleMapRequest(request, env, fetcher = fetch) {
  const json = (data, status = 200) =>
    Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (request.method === "GET")
    return json({
      maps: !!env.GOOGLE_MAPS_SERVER_KEY,
      what3words: !!env.WHAT3WORDS_API_KEY,
    });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin)
    return json({ error: "Use the location search on this website." }, 403);
  if (!env.TRAFFIC_MAP_RATE_LIMITER)
    return json(
      {
        error: "Map request limits are not configured. Contact the site owner.",
      },
      503,
    );
  const key = request.headers.get("CF-Connecting-IP") || "local";
  if (!(await env.TRAFFIC_MAP_RATE_LIMITER.limit({ key })).success)
    return json({ error: "Too many map requests. Please wait a minute." }, 429);
  try {
    if (Number(request.headers.get("Content-Length")) > 4096)
      throw new MapError("Request too large.", 413);
    const raw = await request.text();
    if (raw.length > 4096) throw new MapError("Request too large.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new MapError("Invalid request.");
    }
    if (body.action === "search")
      return json({ results: await locationSearch(body.query, env, fetcher) });
    if (body.action === "image") {
      const bytes = await mapImage(body.map, env, fetcher);
      return new Response(bytes, {
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
      });
    }
    throw new MapError("Unknown map action.");
  } catch (error) {
    return json(
      {
        error:
          error instanceof MapError
            ? error.message
            : "Map service unavailable.",
      },
      error instanceof MapError ? error.status : 502,
    );
  }
}
