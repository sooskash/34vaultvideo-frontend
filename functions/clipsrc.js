// Same-origin video proxy for the browser clip/Reel renderer. Drawing a video
// onto a canvas taints it if the video is cross-origin (cdn.34vault.com), which
// blocks canvas export — so the renderer loads the source through THIS route
// (same origin as the page) instead. Only proxies public video objects
// (videos/… or uploads/…) so it can't be used as an open bucket reader. Passes
// the Range header through so the <video> can seek.
export async function onRequest({ request }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!/^(videos|uploads)\/[\w.-]+\.(mp4|webm)$/.test(key)) {
    return new Response("bad key", { status: 400 });
  }
  const range = request.headers.get("Range");
  const upstream = await fetch(`https://cdn.34vault.com/${key}`, { headers: range ? { Range: range } : {} });
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
  h.set("access-control-allow-origin", "*");
  h.set("cache-control", "public, max-age=3600");
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: h });
}
