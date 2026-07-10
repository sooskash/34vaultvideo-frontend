// Cloudflare Pages Function — server-side Open Graph / share cards for social
// crawlers. Real users still get the normal static page (its JS fills meta, which
// is all a browser needs); crawlers (Discord / Telegram / Twitter / Facebook /
// Reddit / etc.) do NOT run JS, so until now they only ever saw the "Loading…"
// shell and shared links had no preview. This returns real per-video meta to
// them: a big thumbnail everywhere, plus og:video so Discord embeds an inline
// playable clip.
//
// Fully defensive: anything that isn't a crawler hitting a watch URL, or any
// error at all, falls through to next() (the normal static asset). It can never
// break the site for real users.

const API = "https://api.34vault.com";
const CDN = "https://cdn.34vault.com";
const SITE = "https://34vaultvideo.com";
// Social link-preview fetchers identify themselves; match the common ones.
const BOT = /(discordbot|twitterbot|telegrambot|facebookexternalhit|slackbot|whatsapp|linkedinbot|embedly|quora link preview|pinterest|redditbot|iframely|vkshare|skypeuripreview|nuzzel|bitlybot|google-inspectiontool|googlebot|bingbot|applebot|yandex|facebot|ia_archiver|preview)/i;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtDur(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
}

export async function onRequest(context) {
  const { request, next } = context;
  try {
    const url = new URL(request.url);
    const isWatch = url.pathname === "/watch" || url.pathname === "/watch.html";
    const slug = url.searchParams.get("slug");
    const ua = request.headers.get("user-agent") || "";
    if (!isWatch || !slug || !BOT.test(ua)) return next();

    const r = await fetch(`${API}/api/videos/slug/${encodeURIComponent(slug)}`, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return next();
    const d = await r.json();
    const v = (d && (d.video || d)) || null;
    if (!v || !v.slug) return next();

    const title = `${v.title || "Video"} | 34VaultVideo`;
    const tags = (Array.isArray(v.tags) ? v.tags : []).slice(0, 4).join(", ");
    const desc = `Watch ${v.title || "this video"}${v.duration ? ` · ${fmtDur(v.duration)}` : ""}${tags ? ` · ${tags}` : ""} — free in HD on 34VaultVideo.`;
    const pageUrl = `${SITE}/watch.html?slug=${encodeURIComponent(v.slug)}`;
    const thumb = v.sourceId ? `${CDN}/thumbs/${v.sourceId}.jpg` : (v.thumbUrl || "");
    const mp4 = v.r2Key ? `${CDN}/${v.r2Key}` : "";

    const tags2 = [
      `<meta property="og:type" content="video.other">`,
      `<meta property="og:site_name" content="34VaultVideo">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(desc)}">`,
      `<meta property="og:url" content="${esc(pageUrl)}">`,
      thumb ? `<meta property="og:image" content="${esc(thumb)}">` : "",
      // twitter:card=player needs an approved player domain we don't have — a big
      // thumbnail card is the reliable choice; the clip itself is posted natively.
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(title)}">`,
      `<meta name="twitter:description" content="${esc(desc)}">`,
      thumb ? `<meta name="twitter:image" content="${esc(thumb)}">` : "",
      `<meta name="rating" content="adult">`,
    ];
    if (mp4) {
      tags2.push(
        `<meta property="og:video" content="${esc(mp4)}">`,
        `<meta property="og:video:secure_url" content="${esc(mp4)}">`,
        `<meta property="og:video:type" content="video/mp4">`,
        `<meta property="og:video:width" content="1280">`,
        `<meta property="og:video:height" content="720">`
      );
    }

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(pageUrl)}">
${tags2.filter(Boolean).join("\n")}
</head><body>
<h1>${esc(v.title || "Video")}</h1>
<p>${esc(desc)}</p>
<p><a href="${esc(pageUrl)}">Watch on 34VaultVideo →</a></p>
</body></html>`;

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
    });
  } catch (e) {
    return next();
  }
}
