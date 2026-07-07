/* ════════════════════════════════════════════════════════════════════════
   34VaultVideo — MULTI-NETWORK ad engine with PERFORMANCE ROTATION.

   Each ad slot picks a network by weighted-random, where the weight is that
   network's recent eCPM (pulled server-side from every network's reporting API
   and served at /api/ads/weights). Better-earning networks win more slots; a
   10% exploration floor keeps sampling the others so weights stay fresh.

   GO LIVE:
   1. Create zones/spots on each network for the site, paste IDs into AD_CONFIG.
   2. Any network without a first-class block (Adsterra, HilltopAds, …): paste
      the "get code" snippet into raw[placement] (display/native) or popunder[]
      (popunder) or headSnippets[] (site-wide tags).
   3. Set window.ADS_ENABLED = true at the top of the page.
   4. Add the reporting API keys on the backend (EXOCLICK_API_TOKEN, …) so the
      dashboard + performance rotation get real numbers.

   A unit fires only if ADS_ENABLED && its network enabled && its id/snippet set.
   Everything empty = nothing loads. Safe to ship as-is.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  window.AD_CONFIG = window.AD_CONFIG || {
    primary: "exoclick",                        // network favored for every slot until real eCPM data exists
    exoclick: { enabled: true, class: "eas6a97888e31", zones: { outstream: "", multiformat: "", native: "", slider: "", interstitial: "" } },
    trafficstars: { enabled: true, spots: { popunder: "", video: "", native: "" }, popCount: 3, popWindow: 1800 },
    juicyads: { enabled: true, zones: { multiformat: "", native: "" } },
    // Per-placement raw tags from ANY other network. Either a snippet string, OR an
    // object { networkKey: "<snippet>" } to run several — each weighted by performance
    // when the key matches a reporting-network name (e.g. adsterra, hilltopads).
    raw: { outstream: "", multiformat: {}, native: {} },
    // Site-wide, NON-popunder tags (verification, one social bar). Fires all. No pops here.
    headSnippets: [],
    // Popunder — engine fires EXACTLY ONE (never stack). TrafficStars auto-included when
    // its spot is set; add others as { net:"juicyads", html:"<pop code>" }.
    popunder: []
  };
  var CFG = window.AD_CONFIG;
  var API = window.__API__ || "";
  var KW_DEFAULT = "hentai,rule34,video,porn,anime,adult,nsfw";
  function kw(x) { var b = window.AD_KEYWORDS || KW_DEFAULT; return x ? x + "," + b : b; }
  var onReader = /watch/.test(location.pathname);

  var NET_LABEL = { exoclick: "ExoClick", trafficstars: "TrafficStars", juicyads: "JuicyAds", adsterra: "Adsterra", hilltopads: "HilltopAds", clickadu: "Clickadu", eroadvertising: "EroAdvertising", raw: "House", house: "House" };
  // eCPM-ratio weight for a candidate, preferring its SPECIFIC zone (native vs native,
  // popunder vs popunder) over the network average. No data yet → favor the incumbent.
  function weightOf(net, zid) {
    var W = window.__adWeights, l = NET_LABEL[net] || net;
    if (W) {
      if (zid && W.zones) { var zk = l + "|" + zid; if (zk in W.zones) return Math.max(0.02, W.zones[zk]); }
      if (W.networks && (l in W.networks)) return Math.max(0.02, W.networks[l]);
    }
    return net === (CFG.primary || "exoclick") ? 1 : 0.35;
  }

  // ─────────── generic raw-snippet injector (executes <script> tags) ───────────
  function execScripts(root) {
    var olds = root.querySelectorAll("script");
    for (var i = 0; i < olds.length; i++) {
      var o = olds[i], n = document.createElement("script");
      for (var a = 0; a < o.attributes.length; a++) n.setAttribute(o.attributes[a].name, o.attributes[a].value);
      if (!o.src) n.textContent = o.textContent;
      o.parentNode.replaceChild(n, o);
    }
  }
  function injectRaw(elId, html) {
    if (!html) return false;
    var el = document.getElementById(elId); if (!el) return false;
    var box = document.createElement("div"); box.innerHTML = html; el.appendChild(box); execScripts(box);
    el.style.display = "block"; return true;
  }
  function injectBody(html) { if (!html) return; var b = document.createElement("div"); b.innerHTML = html; document.body.appendChild(b); execScripts(b); }

  // ─────────── ExoClick ───────────
  var exo = CFG.exoclick || {};
  function exoOn(fmt) { return exo.enabled && exo.zones && exo.zones[fmt]; }
  function exoProvider() {
    if (document.querySelector('script[src*="magsrv.com/ad-provider"]')) return;
    var s = document.createElement("script"); s.async = true; s.src = "https://a.magsrv.com/ad-provider.js"; document.head.appendChild(s);
  }
  function exoServe() { (window.AdProvider = window.AdProvider || []).push({ serve: {} }); }
  function exoIns(elId, fmt, keywords) {
    if (!exoOn(fmt)) return false;
    var el = document.getElementById(elId); if (!el) return false;
    exoProvider();
    var ins = document.createElement("ins");
    ins.className = exo.class || "eas6a97888e31";
    ins.dataset.zoneid = exo.zones[fmt];
    ins.setAttribute("data-block-ad-types", "0");
    ins.dataset.keywords = kw(keywords);
    if (fmt === "native") ins.setAttribute("data-ad_tags", kw(keywords));
    el.appendChild(ins);
    el.style.display = "block"; el.style.width = "100%"; el.style.maxWidth = el.style.maxWidth || "540px"; el.style.margin = "16px auto";
    exoServe(); return true;
  }

  // ─────────── TrafficStars ───────────
  var ts = CFG.trafficstars || {};
  function tsOn(fmt) { return ts.enabled && ts.spots && ts.spots[fmt]; }
  function tsPopunder() {
    if (!tsOn("popunder")) return false;
    if (document.querySelector('script[data-ts-spot="' + ts.spots.popunder + '"]')) return true;
    var p = document.createElement("script");
    p.src = "//cdn.tsyndicate.com/sdk/v1/p.js"; p.async = true; p.defer = true;
    p.setAttribute("data-ts-spot", ts.spots.popunder);
    p.setAttribute("data-ts-count", String(ts.popCount || 3));
    p.setAttribute("data-ts-session-duration", String(ts.popWindow || 1800));
    p.setAttribute("data-ts-subid", location.hostname);
    document.head.appendChild(p); return true;
  }
  function tsVideo(elId) {
    if (!tsOn("video")) return false;
    var el = document.getElementById(elId); if (!el) return false;
    var cid = "ts_v_" + (el.id || "x") + "_" + el.children.length;
    var d = document.createElement("div"); d.id = cid; el.appendChild(d);
    var s = document.createElement("script"); s.async = true; s.src = "//cdn.tsyndicate.com/sdk/v1/outstream.video.js";
    s.onload = function () { try { window.TSOutstream && window.TSOutstream.init({ spot: ts.spots.video, container: cid }); } catch (e) {} };
    document.head.appendChild(s); el.style.display = "block"; return true;
  }
  function tsNative(elId) {
    if (!tsOn("native")) return false;
    var el = document.getElementById(elId); if (!el || el.querySelector("[data-ts-spot]")) return false;
    var s = document.createElement("script"); s.async = true; s.src = "https://cdn.tsyndicate.com/sdk/v1/ms.js";
    s.setAttribute("data-ts-spot", ts.spots.native); el.appendChild(s); el.style.display = "block"; return true;
  }

  // ─────────── JuicyAds ───────────
  var ja = CFG.juicyads || {};
  function jaOn(fmt) { return ja.enabled && ja.zones && ja.zones[fmt]; }
  function jaLoad() {
    if (document.querySelector('script[src*="poweredby.jads.co"]')) return;
    var s = document.createElement("script"); s.async = true; s.setAttribute("data-cfasync", "false"); s.src = "https://poweredby.jads.co/js/jads.js"; document.head.appendChild(s);
  }
  function jaIns(elId, fmt) {
    if (!jaOn(fmt)) return false;
    var el = document.getElementById(elId); if (!el) return false;
    jaLoad();
    var ins = document.createElement("ins"); ins.id = ja.zones[fmt]; el.appendChild(ins);
    el.style.display = "block"; el.style.margin = "16px auto";
    (window.adsbyjuicy = window.adsbyjuicy || []).push({ adzone: ja.zones[fmt] });
    return true;
  }

  // ─────────── weighted mediation ───────────
  function rawCands(fmt) {
    var v = CFG.raw && CFG.raw[fmt]; if (!v) return [];
    if (typeof v === "string") return v ? [{ net: "raw", html: v }] : [];
    return Object.keys(v).filter(function (k) { return v[k]; }).map(function (k) { return { net: k, html: v[k] }; });
  }
  function serveWeighted(elId, cands) {
    var pool = cands.filter(Boolean).map(function (c) {
      if (c.run) return c;
      var html = c.html; return { net: c.net, run: function () { return injectRaw(elId, html); } };
    });
    pool.forEach(function (c) { c.__k = Math.pow(Math.random(), 1 / weightOf(c.net, c.zid)); }); // Efraimidis–Spirakis weighted order
    pool.sort(function (a, b) { return b.__k - a.__k; });
    for (var i = 0; i < pool.length; i++) { try { if (pool[i].run()) return true; } catch (e) {} }
    return false;
  }

  window.injectMultiformat = function (elId, sub, keywords) {
    serveWeighted(elId, [
      { net: "exoclick", zid: exo.zones && exo.zones.multiformat, run: function () { return exoIns(elId, "multiformat", keywords); } },
      { net: "juicyads", zid: ja.zones && ja.zones.multiformat, run: function () { return jaIns(elId, "multiformat"); } }
    ].concat(rawCands("multiformat")));
  };
  window.injectBanner = window.injectMultiformat;
  window.injectRecommendationWidget = function (elId, sub, keywords) {
    serveWeighted(elId, [
      { net: "exoclick", zid: exo.zones && exo.zones.native, run: function () { return exoIns(elId, "native", keywords); } },
      { net: "juicyads", zid: ja.zones && ja.zones.native, run: function () { return jaIns(elId, "native"); } },
      { net: "trafficstars", zid: ts.spots && ts.spots.native, run: function () { return tsNative(elId); } }
    ].concat(rawCands("native")));
  };
  window.injectOutstreamVideo = function (elId, sub, keywords) {
    serveWeighted(elId, [
      { net: "exoclick", zid: exo.zones && exo.zones.outstream, run: function () { return exoIns(elId, "outstream", keywords); } },
      { net: "trafficstars", zid: ts.spots && ts.spots.video, run: function () { return tsVideo(elId); } }
    ].concat(rawCands("outstream")));
  };
  window.injectTSVideo = function (elId) {
    serveWeighted(elId, [
      { net: "trafficstars", zid: ts.spots && ts.spots.video, run: function () { return tsVideo(elId); } },
      { net: "exoclick", zid: exo.zones && exo.zones.outstream, run: function () { return exoIns(elId, "outstream"); } }
    ].concat(rawCands("outstream")));
  };
  window.injectTSNative = function (elId) { tsNative(elId); };
  window.injectRawSnippet = injectRaw;
  window.lazyInject = function (elId, fn) {
    var el = document.getElementById(elId); if (!el) return;
    if (!window.IntersectionObserver) return fn();
    var o = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: "400px" });
    o.observe(el);
  };

  // ─────────── popunder: fire exactly ONE, weighted ───────────
  function firePopunder() {
    var cands = [];
    if (tsOn("popunder")) cands.push({ net: "trafficstars", zid: ts.spots.popunder, run: tsPopunder });
    (CFG.popunder || []).forEach(function (p) {
      if (!p) return;
      if (p.net === "trafficstars") return;                 // already handled above
      if (p.html) cands.push({ net: p.net || "house", zid: p.zid, run: function () { injectBody(p.html); return true; } });
    });
    if (!cands.length) return;
    cands.forEach(function (c) { c.__k = Math.pow(Math.random(), 1 / weightOf(c.net, c.zid)); });
    cands.sort(function (a, b) { return b.__k - a.__k; });
    for (var i = 0; i < cands.length; i++) { try { if (cands[i].run()) return; } catch (e) {} }
  }

  function loadWeights() {
    if (!API) return;
    fetch(API + "/api/ads/weights").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.weights) window.__adWeights = d.weights; }).catch(function () {});
  }

  // ─────────── boot ───────────
  function boot() {
    if (!window.ADS_ENABLED) return;
    loadWeights();
    if (exoOn("multiformat") || exoOn("native") || exoOn("outstream") || exoOn("interstitial")) exoProvider();
    firePopunder();
    (CFG.headSnippets || []).forEach(injectBody);
    if (exoOn("interstitial") && !onReader && window.innerWidth < 900) {
      var pv = 0; try { pv = (parseInt(sessionStorage.getItem("_pv"), 10) || 0) + 1; sessionStorage.setItem("_pv", String(pv)); } catch (e) {}
      var last = 0; try { last = parseInt(localStorage.getItem("_fsT"), 10) || 0; } catch (e) {}
      if (pv >= 2 && (Date.now() - last) > 900000) {
        try { localStorage.setItem("_fsT", String(Date.now())); } catch (e) {}
        var el = document.createElement("div"); el.id = "_fsm"; el.style.display = "none"; document.body.appendChild(el);
        setTimeout(function () { exoIns("_fsm", "interstitial"); }, 2500);
      }
    }
    window.__adsReady = true;
    (window.__adsCbs || []).forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  window.__adsCbs = window.__adsCbs || [];
  window.onAdsReady = function (fn) { if (window.__adsReady) fn(); else window.__adsCbs.push(fn); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

/* PRE-ROLL (VAST) — highest-value video format. Needs a VAST tag + a VAST-capable
   player wired into watch.html's <video>. Add once an instream zone exists; kept out
   of Phase 1 so the player never hangs waiting on an ad. */
