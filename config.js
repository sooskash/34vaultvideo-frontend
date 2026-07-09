window.__API__ = "https://api.34vault.com";

// Theme + accent color applied via style attribute on <html>
// This is the ONLY place --accent is defined (removed from shared.css)
// so there's zero specificity conflict on any browser including Safari
(function() {
  var isLight = localStorage.getItem("theme") === "light";

  // Light-theme meta tags (set once; idempotent)
  if (isLight) {
    document.documentElement.setAttribute("data-theme", "light");
    var m = document.querySelector('meta[name="color-scheme"]');
    if (m) m.setAttribute("content", "light");
    var th = document.querySelector('meta[name="theme-color"]');
    if (th) th.setAttribute("content", "#f5f5f7");
  }

  // Build the full <html> style string (theme + accent CSS vars) for an accent color.
  function buildStyles(accent) {
    var c = accent || '#ecba58';
    var R = parseInt(c.slice(1,3),16), G = parseInt(c.slice(3,5),16), B = parseInt(c.slice(5,7),16);
    var dark = '#' + [Math.round(R*.78),Math.round(G*.78),Math.round(B*.78)].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
    // Lighter tint of the accent — top stop of the accent gradient. Lighten in HSL
    // (raise lightness, keep/boost saturation) so amber stays a vivid gold instead
    // of washing out toward beige like an RGB blend toward white would.
    var lt = (function(){
      var r=R/255, g=G/255, b=B/255;
      var mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
      var l=(mx+mn)/2, s=d===0?0:d/(1-Math.abs(2*l-1)), h=0;
      if(d!==0){
        if(mx===r) h=((g-b)/d)%6; else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4;
        h*=60; if(h<0) h+=360;
      }
      l=Math.min(.92, l+.13); s=Math.min(1, s*1.05);
      var C=(1-Math.abs(2*l-1))*s, X=C*(1-Math.abs((h/60)%2-1)), m=l-C/2, rr,gg,bb;
      if(h<60){rr=C;gg=X;bb=0}else if(h<120){rr=X;gg=C;bb=0}else if(h<180){rr=0;gg=C;bb=X}
      else if(h<240){rr=0;gg=X;bb=C}else if(h<300){rr=X;gg=0;bb=C}else{rr=C;gg=0;bb=X}
      return '#'+[rr+m,gg+m,bb+m].map(function(v){ return Math.round(v*255).toString(16).padStart(2,'0'); }).join('');
    })();
    var rgb = R+','+G+','+B;
    // Gradient accents on by default; user can disable in Settings (falls back to solid accent).
    var gradOn = localStorage.getItem('gradientAccents') !== '0';
    var grad = gradOn ? 'linear-gradient(135deg,'+lt+','+c+' 55%,'+dark+')' : c;
    var styles = isLight ? 'color-scheme:light;background:#f5f5f7;' : '';
    styles +=
      '--accent:'+c+';'+
      '--accent2:'+dark+';'+
      '--accent-lt:'+lt+';'+
      '--grad-accent:'+grad+';'+
      '--accent-06:rgba('+rgb+',.06);'+
      '--accent-08:rgba('+rgb+',.08);'+
      '--accent-10:rgba('+rgb+',.1);'+
      '--accent-15:rgba('+rgb+',.15);'+
      '--accent-22:rgba('+rgb+',.22);'+
      '--accent-35:rgba('+rgb+',.35);'+
      '--accent-40:rgba('+rgb+',.4);'+
      '--accent-45:rgba('+rgb+',.45);'+
      '--accent-60:rgba('+rgb+',.6);';
    return styles;
  }

  // Apply an accent color LIVE — updates the CSS vars on <html> in place, no reload.
  function applyAccent(accent) {
    document.documentElement.setAttribute('style', buildStyles(accent));
  }

  // Video-site default is champagne gold (#ecba58) — softer, more premium than the
  // comic site's amber. Users with a custom accent keep theirs.
  applyAccent(localStorage.getItem('accentColor') || '#ecba58');

  // Re-apply when navigating back (browser restores page from cache) — live, no reload.
  window.addEventListener('pageshow', function() {
    applyAccent(localStorage.getItem('accentColor') || '#ecba58');
  });

  // Sync accent color from the server (cross-device). Apply it LIVE instead of doing a
  // full location.reload() — the old reload was what made the homepage flash a set of
  // comics, then blank them and reload, on the first visit for anyone with a custom accent.
  if (!localStorage.getItem('accentColor')) {
    fetch(window.__API__ + '/api/me', { credentials: 'include' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(u) {
        if (u && u.accentColor && u.accentColor !== '#f59e0b' && u.accentColor !== '#ecba58') {
          localStorage.setItem('accentColor', u.accentColor);
          applyAccent(u.accentColor);
        }
      }).catch(function() {});
  }
})();
