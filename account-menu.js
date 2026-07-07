/* Shared account menu for every 34VaultVideo page. Add `<div id="acctMount"></div>`
   in the header and `<script src="/account-menu.js?v=1"></script>` before </body>.
   Reads the shared 34Vault account (cross-domain cookie on api.34vault.com). */
(function () {
  var mount = document.getElementById("acctMount");
  if (!mount) return;
  var API = window.__API__ || "https://api.34vault.com";
  var MAIN = "https://34vault.com"; // shared-account pages (profile/settings/auth) — native video ones coming

  if (!document.getElementById("acctCss")) {
    var st = document.createElement("style");
    st.id = "acctCss";
    st.textContent =
      ".acct{position:relative}" +
      ".avatar-btn{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:900;color:#221200;background:var(--grad-accent,linear-gradient(135deg,#ffce54,#f59e0b));border:none;cursor:pointer;font-size:15px;transition:transform .15s,box-shadow .15s;padding:0;overflow:hidden}" +
      ".avatar-btn img{width:100%;height:100%;object-fit:cover;border-radius:50%}" +
      ".avatar-btn:hover{transform:scale(1.06);box-shadow:0 4px 16px rgba(245,158,11,.5)}" +
      ".acct-menu{position:absolute;top:calc(100% + 10px);right:0;min-width:212px;background:var(--panel,#12141a);border:1px solid var(--border,#242835);border-radius:14px;padding:6px;box-shadow:0 16px 40px rgba(0,0,0,.55);display:none;z-index:1000}" +
      ".acct-menu.open{display:block}" +
      ".acct-head{display:flex;align-items:center;gap:10px;padding:9px 10px 11px;border-bottom:1px solid var(--border,#242835);margin-bottom:6px}" +
      ".acct-head .av{width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#221200;overflow:hidden;background:var(--grad-accent,linear-gradient(135deg,#ffce54,#f59e0b))}" +
      ".acct-head .av img{width:100%;height:100%;object-fit:cover}" +
      ".acct-name{font-weight:800;font-size:13px;line-height:1.2}" +
      ".acct-sub{font-size:11px;color:var(--muted,#8891a8);margin-top:1px}" +
      ".acct-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:9px;font-size:13px;font-weight:700;color:var(--text,#eef1f8);cursor:pointer;text-decoration:none}" +
      ".acct-item:hover{background:var(--panel2,#191c24)}" +
      ".acct-item .mi{width:16px;text-align:center;opacity:.85}" +
      ".acct-item.danger{color:#fca5a5}";
    document.head.appendChild(st);
  }

  mount.className = "acct";
  mount.innerHTML =
    '<button class="avatar-btn" id="avatarBtn" title="Account" type="button" aria-haspopup="true">V</button>' +
    '<div class="acct-menu" id="acctMenu" role="menu"></div>';
  var btn = mount.querySelector("#avatarBtn"), menu = mount.querySelector("#acctMenu");
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toggle(v) { menu.classList.toggle("open", v === undefined ? !menu.classList.contains("open") : v); }
  btn.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
  document.addEventListener("click", function () { toggle(false); });
  menu.addEventListener("click", function (e) { e.stopPropagation(); });

  fetch(API + "/api/me", { credentials: "include" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (me) {
    if (me) {
      var initial = (me.displayName || "V").charAt(0).toUpperCase();
      var avHtml = me.avatarUrl ? '<img src="' + esc(me.avatarUrl) + '" alt="">' : initial;
      btn.innerHTML = avHtml;
      menu.innerHTML =
        '<div class="acct-head"><div class="av">' + avHtml + '</div><div><div class="acct-name">' + esc(me.displayName || "You") + '</div><div class="acct-sub">34Vault account</div></div></div>' +
        '<a class="acct-item" href="index.html?saved=1"><span class="mi">&#9733;</span> Saved</a>' +
        '<a class="acct-item" href="' + MAIN + '/profile.html"><span class="mi">&#128100;</span> Profile</a>' +
        '<a class="acct-item" href="' + MAIN + '/settings.html"><span class="mi">&#9881;</span> Settings</a>' +
        '<div class="acct-item danger" id="acctLogout"><span class="mi">&#9099;</span> Log out</div>';
      var lo = document.getElementById("acctLogout");
      if (lo) lo.onclick = function () { fetch(API + "/api/auth/logout", { method: "POST", credentials: "include" }).catch(function () {}).then(function () { location.reload(); }); };
    } else {
      btn.textContent = "V";
      menu.innerHTML =
        '<a class="acct-item" href="' + MAIN + '/auth.html"><span class="mi">&#8594;</span> Log in</a>' +
        '<a class="acct-item" href="' + MAIN + '/auth.html"><span class="mi">&#43;</span> Sign up</a>';
    }
  }).catch(function () {
    btn.textContent = "V";
    menu.innerHTML = '<a class="acct-item" href="' + MAIN + '/auth.html"><span class="mi">&#8594;</span> Log in</a>';
  });
})();
