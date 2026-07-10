// Same-origin video proxy for the browser clip/Reel renderer. Drawing a video
// onto a canvas taints it if the video is cross-origin (cdn.34vault.com), which
// blocks canvas export — so the renderer loads the source through THIS route
// (same origin as the page) instead.
//   ?key=videos/… | uploads/…   → R2-hosted (uploaded) videos
//   ?slug=…                      → aggregated videos with no R2 key: proxy the
//                                  API stream server-side (it isn't CORS-fetchable
//                                  from the browser, but a Worker fetch has no CORS).
// Passes the Range header through so the <video> can seek.
export async function onRequest({ request }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const slug = url.searchParams.get("slug") || "";
  let upstreamUrl;
  if (key) {
    if (!/^(videos|uploads)\/[\w.-]+\.(mp4|webm)$/.test(key)) {
      return new Response("bad key", { status: 400 });
    }
    upstreamUrl = `https://cdn.34vault.com/${key}`;
  } else if (slug) {
    if (!/^[\w-]{1,200}$/.test(slug)) {
      return new Response("bad slug", { status: 400 });
    }
    upstreamUrl = `https://api.34vault.com/api/videos/slug/${slug}/stream`;
  } else {
    return new Response("missing key or slug", { status: 400 });
  }
  const range = request.headers.get("Range");
  // redirect: follow — the stream endpoint may 302 to the real source; the Worker
  // fetch follows it and streams the bytes back same-origin.
  const upstream = await fetch(upstreamUrl, { headers: range ? { Range: range } : {}, redirect: "follow" });
  // Copy ONLY the headers a media element needs — copying everything (esp.
  // content-encoding / transfer-encoding) alongside CF's own transfer handling
  // made the browser <video> stall with 0 bytes buffered even though the body
  // streamed fine to curl. No cf cache options (cacheEverything mis-serves
  // range requests).
  const h = new Headers();
  for (const k of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const val = upstream.headers.get(k);
    if (val) h.set(k, val);
  }
  if (!h.has("accept-ranges")) h.set("accept-ranges", "bytes");
  if (!h.has("content-type")) h.set("content-type", "video/mp4");
  h.set("access-control-allow-origin", "*");
  h.set("cache-control", "public, max-age=3600");
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: h });
}
