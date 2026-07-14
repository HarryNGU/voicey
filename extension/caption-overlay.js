// Injected into whatever tab the user is looking at, to show a floating
// caption that follows them across tabs. Two producers drive it:
//   • read-aloud roaming — VR_OVERLAY_SHOW/HIDE (the whole-page reader)
//   • live captions (STT) — VR_STT_SHOW/HIDE (transcribing tab audio)
// STT mode adds a 3-line rolling transcript, a moving word highlight, and
// a top-right toolbar (settings + close).
(() => {
  if (window.__voiceyOverlay) return; // already injected in this tab

  const ACCENT = "124, 92, 246";
  const LOGO = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-2px">
    <rect x="1" y="1" width="22" height="22" rx="6.5" fill="rgb(${ACCENT})"/>
    <g fill="#fff"><rect x="4.5" y="9" width="2" height="6" rx="1"/><rect x="8.2" y="6.6" width="2" height="10.8" rx="1"/>
    <rect x="11.9" y="4.5" width="2" height="15" rx="1"/><rect x="15.6" y="6.6" width="2" height="10.8" rx="1"/>
    <rect x="19.3" y="9" width="2" height="6" rx="1"/></g></svg>`;
  const GEAR = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>`;
  const CLOSE = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>`;

  const box = document.createElement("div");
  box.style.cssText =
    "all:initial; position:fixed; z-index:2147483647; bottom:24px; left:50%;" +
    "transform:translateX(-50%); max-width:min(680px,92vw); display:none;";
  const sh = box.attachShadow({ mode: "open" });
  sh.innerHTML = `
    <style>
      .card { position:relative; box-sizing:border-box; width:min(600px,92vw);
              font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
              background:#fff; color:#222; border:1px solid rgba(0,0,0,.08); border-radius:14px;
              padding:10px 14px 12px; box-shadow:0 10px 34px rgba(0,0,0,.28); cursor:grab; user-select:none; }
      .card:active { cursor:grabbing; }
      .card.dark { background:#242427; color:#eee; border-color:rgba(255,255,255,.12); }
      .card.glass { background:rgba(255,255,255,.5); color:#222; border-color:rgba(255,255,255,.5);
                    backdrop-filter:blur(16px) saturate(1.4); -webkit-backdrop-filter:blur(16px) saturate(1.4); }
      .top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:5px; }
      .tag { font-size:10px; font-weight:700; letter-spacing:.06em; color:rgb(${ACCENT});
             display:flex; align-items:center; gap:5px; }
      .card.dark .tag { color:#b6a7f7; }
      .tools { display:none; align-items:center; gap:4px; }
      .card.stt .tools { display:flex; }
      .tbtn { all:unset; cursor:pointer; width:22px; height:22px; border-radius:6px; display:flex;
              align-items:center; justify-content:center; color:#666; }
      .card.dark .tbtn { color:#bbb; }
      .tbtn:hover { background:rgba(${ACCENT},.16); color:rgb(${ACCENT}); }
      /* Read-aloud: single centred line, box grows to fit. STT: a fixed
         3-line window pinned to the bottom (newest text), older lines clipped
         off the top — so the box stays one stable size. */
      .tbox { }
      .t { font-size:16px; line-height:1.45; text-align:center; }
      .card.stt .tbox { height:4.35em; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; }
      .card.stt .t { text-align:left; }
      .t b { background:rgba(${ACCENT},.30); border-radius:4px; padding:0 2px; font-weight:600; }
      .card.dark .t b { background:rgba(${ACCENT},.5); color:#fff; }
      .t .dim { opacity:.55; }
      .settings { display:none; position:absolute; top:38px; right:10px; z-index:2; min-width:150px;
                  background:#fff; color:#222; border:1px solid rgba(0,0,0,.1); border-radius:12px;
                  box-shadow:0 10px 30px rgba(0,0,0,.22); padding:9px; cursor:default; }
      .settings.open { display:block; }
      .srow { margin-bottom:8px; }
      .srow:last-child { margin-bottom:0; }
      .slabel { font-size:9px; font-weight:700; letter-spacing:.05em; color:#999; margin-bottom:5px; }
      .chips { display:flex; gap:5px; }
      .chip { font-size:12px; font-weight:600; color:#555; background:#eee; border-radius:7px;
              padding:5px 9px; cursor:pointer; flex:1; text-align:center; white-space:nowrap; }
      .chip:hover { background:#e2e2e6; }
      .chip.active { background:rgb(${ACCENT}); color:#fff; }
    </style>
    <div class="card">
      <div class="top">
        <span class="tag">${LOGO} VOICEY</span>
        <span class="tools">
          <button class="tbtn gear" title="Caption settings">${GEAR}</button>
          <button class="tbtn close" title="Turn off captions">${CLOSE}</button>
        </span>
      </div>
      <div class="settings">
        <div class="srow">
          <div class="slabel">THEME</div>
          <div class="chips theme">
            <span class="chip" data-theme="light">Light</span>
            <span class="chip" data-theme="dark">Dark</span>
            <span class="chip" data-theme="glass">Glass</span>
          </div>
        </div>
        <div class="srow">
          <div class="slabel">LANGUAGE (auto-translate)</div>
          <div class="chips lang">
            <span class="chip" data-lang="en">English</span>
            <span class="chip" data-lang="vi">Tiếng Việt</span>
          </div>
        </div>
      </div>
      <div class="tbox"><div class="t"></div></div>
    </div>`;

  const card = sh.querySelector(".card");
  const textEl = sh.querySelector(".t");
  const settingsEl = sh.querySelector(".settings");
  (document.body || document.documentElement).appendChild(box);

  const esc = (s) => String(s).replace(/[&<>"]/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  function renderWordsHighlightLast(str) {
    const words = String(str).split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const last = words.length - 1;
    return words.map((w, i) => (i === last ? `<b>${esc(w)}</b>` : esc(w))).join(" ");
  }

  // ---- Theme + language (persisted) -----------------------------------------
  function applyTheme(t) {
    card.classList.remove("dark", "glass");
    if (t === "dark" || t === "glass") card.classList.add(t);
    sh.querySelectorAll(".theme .chip").forEach((c) => c.classList.toggle("active", c.dataset.theme === t));
  }
  function markLang(l) {
    sh.querySelectorAll(".lang .chip").forEach((c) => c.classList.toggle("active", c.dataset.lang === l));
  }
  try {
    chrome.storage.local.get({ voiceyCapTheme: "light", voiceyCapLang: "en" }, (s) => {
      applyTheme(s.voiceyCapTheme || "light");
      markLang(s.voiceyCapLang || "en");
    });
  } catch (_) { applyTheme("light"); markLang("en"); }

  sh.querySelector(".gear").addEventListener("click", (e) => {
    e.stopPropagation(); settingsEl.classList.toggle("open");
  });
  sh.querySelector(".close").addEventListener("click", (e) => {
    e.stopPropagation();
    try { chrome.runtime.sendMessage({ target: "background", type: "VR_STT_CLOSE" }); } catch (_) {}
  });
  sh.querySelectorAll(".theme .chip").forEach((c) =>
    c.addEventListener("click", (e) => {
      e.stopPropagation();
      applyTheme(c.dataset.theme);
      try { chrome.storage.local.set({ voiceyCapTheme: c.dataset.theme }); } catch (_) {}
    }));
  sh.querySelectorAll(".lang .chip").forEach((c) =>
    c.addEventListener("click", (e) => {
      e.stopPropagation();
      markLang(c.dataset.lang);
      try { chrome.storage.local.set({ voiceyCapLang: c.dataset.lang }); } catch (_) {}
      try { chrome.runtime.sendMessage({ target: "background", type: "VR_STT_SETLANG", lang: c.dataset.lang }); } catch (_) {}
    }));

  // ---- Drag anywhere (but not on the toolbar / settings) --------------------
  // Listen on `card` (inside the shadow root), NOT on `box` (the host): events
  // from the shadow tree are retargeted to the host, so a host-level listener
  // sees every click as the host and can't tell a button apart — which would
  // swallow the settings/close clicks.
  (function drag() {
    let on = false, sx = 0, sy = 0, ox = 0, oy = 0;
    card.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest && e.target.closest("button, .settings")) return;
      on = true;
      const r = box.getBoundingClientRect();
      box.style.left = r.left + "px"; box.style.top = r.top + "px";
      box.style.right = "auto"; box.style.bottom = "auto"; box.style.transform = "none";
      ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
      card.setPointerCapture(e.pointerId); e.preventDefault();
    });
    card.addEventListener("pointermove", (e) => {
      if (!on) return;
      const w = box.offsetWidth, h = box.offsetHeight;
      box.style.left = Math.max(4, Math.min(ox + e.clientX - sx, innerWidth - w - 4)) + "px";
      box.style.top = Math.max(4, Math.min(oy + e.clientY - sy, innerHeight - h - 4)) + "px";
    });
    card.addEventListener("pointerup", (e) => { on = false; try { card.releasePointerCapture(e.pointerId); } catch (_) {} });
  })();

  // ---- STT rolling transcript ----------------------------------------------
  let committed = "", partial = "";
  function renderStt() {
    let full = (committed + " " + partial).trim();
    if (full.length > 320) full = full.slice(-320); // the 3-line clamp trims the top
    textEl.innerHTML = renderWordsHighlightLast(full);
  }
  function showStt(payload) {
    card.classList.add("stt");
    box.style.display = "block";
    if (!payload) return;
    if (payload.type === "status") {
      committed = ""; partial = "";
      textEl.innerHTML = `<span class="dim">${esc(payload.text || "…")}</span>`;
    } else if (payload.type === "partial") {
      partial = payload.text || ""; renderStt();
    } else if (payload.type === "final") {
      committed = (committed + " " + (payload.text || "")).trim();
      if (committed.length > 320) committed = committed.slice(-320);
      partial = ""; renderStt();
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.type) return;
    if (msg.type === "VR_OVERLAY_SHOW") {
      card.classList.remove("stt");
      settingsEl.classList.remove("open");
      const words = String(msg.text || "").split(" ");
      textEl.innerHTML = words.map((w, k) => (k === msg.word ? `<b>${esc(w)}</b>` : esc(w))).join(" ");
      box.style.display = "block";
    } else if (msg.type === "VR_STT_SHOW") {
      showStt(msg.payload);
    } else if (msg.type === "VR_OVERLAY_HIDE" || msg.type === "VR_STT_HIDE") {
      settingsEl.classList.remove("open");
      committed = ""; partial = "";
      box.style.display = "none";
    }
  });

  window.__voiceyOverlay = { hide() { box.style.display = "none"; } };
})();
