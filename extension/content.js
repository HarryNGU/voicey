(() => {
  // A right-click "Read selection" stashes the chosen text here before this
  // script is (re)injected. When present, we read that selection instead of
  // the whole page — even if Voicey is already open.
  const pendingSelection = window.__voiceReaderPendingText;
  try { delete window.__voiceReaderPendingText; } catch (_) { window.__voiceReaderPendingText = undefined; }

  if (pendingSelection != null) {
    if (window.__voiceReaderDestroy) { try { window.__voiceReaderDestroy(); } catch (_) {} }
    window.__voiceReaderToggle = null;
    // fall through to init with the selection
  } else if (window.__voiceReaderToggle) {
    // Icon/shortcut again while open → just hide/show (no reload).
    window.__voiceReaderToggle();
    return;
  } else if (window.__voiceReaderDestroy) {
    // Clean up a leftover instance from before this update (old scheme).
    try { window.__voiceReaderDestroy(); } catch (_) {}
    window.__voiceReaderDestroy = null;
  }

  const SPEEDS = [0.5, 1, 1.25, 1.5, 2]; // playback-rate multipliers
  const fmtSpeed = (m) => `${+m}×`; // 0.5 -> "0.5×", 1 -> "1×"
  const ACCENT = "124, 92, 246";
  const INTER_GAP = 0.14; // small silence between sentences for natural pacing

  const EXCLUDE_SEL = [
    "script", "style", "noscript", "iframe", "svg", "form", "button",
    "nav", "header", "footer", "aside",
    "[role=navigation]", "[role=banner]", "[role=contentinfo]", "[aria-hidden=true]",
    "[hidden]",
    ".related", ".recommended", ".recommendation", ".recommendations",
    ".comments", ".comment", ".comment-list", ".sidebar", ".share", ".sharing",
    ".social", ".newsletter", ".subscribe", ".subscription", ".promo",
    ".ad", ".ads", ".advertisement", ".read-next", ".read-more", ".more-stories",
    ".post-navigation", ".post-nav", ".nav-links", ".entry-footer",
    ".author-bio", ".author-box", ".byline", ".prev-post", ".next-post",
    "[class*=related]", "[class*=recommend]", "[class*=comment]",
    "[class*=sidebar]", "[class*=newsletter]", "[class*=promo]",
    "[class*=read-next]", "[class*=morefrom]", "[class*=more-from]",
    "[class*=navigation]", "[class*=author-bio]",
    "[class*=prev-post]", "[class*=next-post]",
    "[id*=related]", "[id*=comment]", "[id*=sidebar]",
    // YouTube / other SPA video sites use custom elements and IDs that the
    // generic class/role rules above don't catch — recommendations, comments,
    // live chat, merch shelves, the masthead and side guide.
    "#secondary", "#related", "#comments", "#chat", "#masthead", "#guide",
    "ytd-watch-next-secondary-results-renderer", "ytd-comments",
    "ytd-comment-thread-renderer", "ytd-comments-header-renderer",
    "ytd-compact-video-renderer", "ytd-live-chat-frame", "ytd-masthead",
    "ytd-merch-shelf-renderer", "tp-yt-app-drawer", "[role=complementary]",
  ].join(",");

  function extractReadable() {
    const root =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector("[role=main]") ||
      // YouTube watch page: the title + description block, so we read the
      // video's own write-up instead of the whole page (recommendations etc.).
      document.querySelector("ytd-watch-metadata") ||
      document.body;
    function isExcluded(el) {
      let cur = el;
      while (cur && cur !== root) {
        if (cur.matches && cur.matches(EXCLUDE_SEL)) return true;
        cur = cur.parentElement;
      }
      return false;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const el = node.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (isExcluded(el)) return NodeFilter.FILTER_REJECT;
        if (el.tagName !== "BODY" && !el.offsetParent) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" ||
              cs.position === "fixed" || parseFloat(cs.opacity) === 0) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let norm = "";
    const map = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent;
      if (norm.length && !norm.endsWith(" ")) { norm += " "; map.push(null); }
      for (let i = 0; i < t.length; i++) {
        if (/\s/.test(t[i])) {
          if (!norm.endsWith(" ")) { norm += " "; map.push(null); }
        } else { norm += t[i]; map.push({ node, offset: i }); }
      }
    }
    let a = 0, b = norm.length;
    while (a < b && norm[a] === " ") a++;
    while (b > a && norm[b - 1] === " ") b--;
    return { text: norm.slice(a, b), map: map.slice(a, b) };
  }

  // Build the same {text, map} from the user's current selection so a
  // right-click "Read selection" still highlights on the page.
  function extractFromSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    let root = range.commonAncestorContainer;
    if (root.nodeType !== 1) root = root.parentElement;
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let norm = "";
    const map = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent;
      let start = 0, end = t.length;
      if (node === range.startContainer && range.startContainer.nodeType === 3) start = range.startOffset;
      if (node === range.endContainer && range.endContainer.nodeType === 3) end = range.endOffset;
      if (norm.length && !norm.endsWith(" ")) { norm += " "; map.push(null); }
      for (let i = start; i < end; i++) {
        if (/\s/.test(t[i])) { if (!norm.endsWith(" ")) { norm += " "; map.push(null); } }
        else { norm += t[i]; map.push({ node, offset: i }); }
      }
    }
    let a = 0, b = norm.length;
    while (a < b && norm[a] === " ") a++;
    while (b > a && norm[b - 1] === " ") b--;
    return { text: norm.slice(a, b), map: map.slice(a, b) };
  }

  // Filled icons render solid; stroked icons (class "st") are outlines. The
  // "10" glyphs carry an inline style so they stay filled inside stroke icons.
  // Smaller, bolder "10" pushed lower so it clears the wide circular arrow.
  const T10 = `<text x="12" y="16.3" font-size="7.5" font-weight="800" text-anchor="middle" style="fill:currentColor;stroke:none">10</text>`;
  const ICON = {
    logo: `<svg viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6.5" fill="rgb(${ACCENT})"/><g fill="#fff"><rect x="4.5" y="9" width="2" height="6" rx="1"/><rect x="8.2" y="6.6" width="2" height="10.8" rx="1"/><rect x="11.9" y="4.5" width="2" height="15" rx="1"/><rect x="15.6" y="6.6" width="2" height="10.8" rx="1"/><rect x="19.3" y="9" width="2" height="6" rx="1"/></g></svg>`,
    play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`,
    // Restart / replay from beginning — circular arrow, arrowhead at top.
    replay: `<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 8-8"/><path d="M12.5 1 8 4l4.5 3z"/></svg>`,
    // Large counter-clockwise circular arrow with a roomy "10" in the middle.
    back10: `<svg viewBox="0 0 24 24"><path d="M4 9.2A9 9 0 1 1 3 12.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M1 6 4.1 9.4 7.7 6.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${T10}</svg>`,
    fwd10: `<svg viewBox="0 0 24 24"><path d="M20 9.2A9 9 0 1 0 21 12.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M23 6 19.9 9.4 16.3 6.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${T10}</svg>`,
    // Auto-scroll: lines of text with a downward arrow following along.
    sync: `<svg viewBox="0 0 24 24"><path d="M4 6h10"/><path d="M4 11h8"/><path d="M4 16h6"/><path d="M18 7v11"/><path d="M14.5 14.5 18 18l3.5-3.5"/></svg>`,
    cc: `<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M11 10.6a2.3 2.3 0 1 0 0 3.6"/><path d="M17.2 10.6a2.3 2.3 0 1 0 0 3.6"/></svg>`,
    gear: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>`,
    // Small window-control glyphs (macOS-style corner cluster).
    layH: `<svg viewBox="0 0 24 24"><rect x="3" y="8.5" width="18" height="7" rx="2.5"/></svg>`,
    layV: `<svg viewBox="0 0 24 24"><rect x="8.5" y="3" width="7" height="18" rx="2.5"/></svg>`,
    mini: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="2.6" rx="1.3"/></svg>`,
    maxi: `<svg viewBox="0 0 24 24"><rect x="4.8" y="4.8" width="14.4" height="14.4" rx="3.4" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>`,
  };

  function makeUI() {
    const host = document.createElement("div");
    host.style.cssText =
      "all:initial; position:fixed; z-index:2147483647; bottom:24px; left:50%; transform:translateX(-50%);";
    const shadow = host.attachShadow({ mode: "open" });
    const speedOpts = SPEEDS.map((w, i) =>
      `<div class="opt" data-i="${i}">${fmtSpeed(w)}</div>`).join("");
    shadow.innerHTML = `
      <style>
        :host,* { box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
        .wrap { position:relative; background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:16px;
                box-shadow:0 10px 34px rgba(0,0,0,.20); }
        .bar { display:flex; align-items:center; gap:3px; padding:7px 9px; }
        .logo { width:30px; height:30px; margin-right:2px; flex:0 0 auto; cursor:grab; position:relative; }
        .logo:active { cursor:grabbing; }
        .logo svg { width:100%; height:100%; display:block; pointer-events:none; }
        button { all:unset; cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center;
                 width:36px; height:36px; border-radius:50%; color:#3a3a3a; transition:background .15s,color .15s; flex:0 0 auto; }
        button:hover { background:rgba(${ACCENT},.14); color:rgb(${ACCENT}); }
        button svg { width:19px; height:19px; }
        button:not(.st) svg { fill:currentColor; }
        button.st svg { fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .play { width:44px; height:44px; background:rgb(${ACCENT}); color:#fff; margin:0 2px; }
        .play:hover { background:rgb(${ACCENT}); filter:brightness(1.08); color:#fff; }
        .play svg { width:20px; height:20px; }
        .sep { width:1px; height:22px; background:rgba(0,0,0,.08); margin:0 3px; flex:0 0 auto; }
        .speedWrap { position:relative; flex:0 0 auto; }
        .speed { width:auto; padding:0 12px; font-size:13px; font-weight:600; color:#444; border-radius:9999px; }
        .speedMenu { position:absolute; bottom:100%; margin-bottom:10px; left:50%; transform:translateX(-50%);
                     background:#fff; border:1px solid rgba(0,0,0,.1); border-radius:12px;
                     box-shadow:0 8px 24px rgba(0,0,0,.18); padding:5px; display:none; flex-direction:column; gap:2px; }
        /* Invisible bridge so moving the cursor from the button up to the menu
           doesn't cross an un-hovered gap that closes it. */
        .speedMenu::after { content:""; position:absolute; top:100%; left:0; right:0; height:12px; }
        .speedWrap:hover .speedMenu, .speedMenu.open { display:flex; }
        .opt { padding:7px 20px; font-size:13px; font-weight:600; color:#555; border-radius:8px; text-align:center; cursor:pointer; white-space:nowrap; }
        .opt:hover { background:rgba(${ACCENT},.14); color:rgb(${ACCENT}); }
        .opt.active { color:rgb(${ACCENT}); background:rgba(${ACCENT},.10); }
        .sync.on { background:rgb(${ACCENT}); color:#fff; }
        .sync.on:hover { background:rgb(${ACCENT}); filter:brightness(1.08); color:#fff; }
        .cc.on { background:rgb(${ACCENT}); color:#fff; }
        .cc.on:hover { background:rgb(${ACCENT}); filter:brightness(1.08); color:#fff; }
        .back10 svg, .fwd10 svg { width:23px; height:23px; }
        /* Settings popover */
        .setWrap { position:relative; flex:0 0 auto; }
        .setPanel { position:absolute; bottom:48px; right:-6px; width:264px; background:#fff;
                    border:1px solid rgba(0,0,0,.1); border-radius:14px; box-shadow:0 12px 34px rgba(0,0,0,.22);
                    padding:6px; display:none; }
        .setPanel.open { display:block; }
        .setTitle { font-size:12px; font-weight:700; color:#888; padding:8px 10px 4px; letter-spacing:.02em; }
        .srow { display:flex; align-items:center; justify-content:space-between; padding:9px 10px; border-radius:9px; }
        .srow:hover { background:rgba(0,0,0,.03); }
        .srow.col { flex-direction:column; align-items:stretch; gap:8px; }
        .srow label { font-size:13px; color:#333; font-weight:500; }
        .sset { display:flex; gap:5px; }
        .schip { flex:1 1 0; text-align:center; font-size:12px; font-weight:600; color:#555; padding:5px 0; border-radius:8px; cursor:pointer; background:#f0f0f2; }
        .schip.active { background:rgb(${ACCENT}); color:#fff; }
        .switch { position:relative; width:38px; height:22px; flex:0 0 auto; cursor:pointer; }
        .switch input { display:none; }
        .track { position:absolute; inset:0; background:#d3d3d8; border-radius:9999px; transition:background .15s; }
        .knob { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%;
                box-shadow:0 1px 3px rgba(0,0,0,.3); transition:transform .15s; }
        .switch input:checked + .track { background:rgb(${ACCENT}); }
        .switch input:checked + .track + .knob { transform:translateX(16px); }
        .kbRight { display:flex; align-items:center; gap:8px; }
        .kbView { font-family:inherit; font-size:12px; font-weight:700; background:#f0f0f2; border:1px solid rgba(0,0,0,.12);
                  border-bottom-width:2px; border-radius:6px; padding:3px 8px; color:#444; white-space:nowrap; }
        .kbChange { all:unset; cursor:pointer; font-size:12px; font-weight:600; color:rgb(${ACCENT});
                    padding:4px 8px; border-radius:7px; }
        .kbChange:hover { background:rgba(${ACCENT},.12); }
        .snote { font-size:11px; color:#999; padding:4px 10px 8px; line-height:1.4; }
        .snote code { background:#f0f0f2; padding:1px 4px; border-radius:4px; font-size:10px; }
        .hint { font-size:10px; color:#aaa; font-weight:500; }
        /* Dark theme */
        .wrap.dark { background:#242427; border-color:rgba(255,255,255,.12); }
        .wrap.dark button { color:#c9c9cf; }
        .wrap.dark button:hover { background:rgba(${ACCENT},.28); color:#fff; }
        .wrap.dark .speed { color:#c9c9cf; }
        .wrap.dark .status { color:#888; }
        .wrap.dark .sep { background:rgba(255,255,255,.12); }
        .wrap.dark .speedMenu, .wrap.dark .setPanel { background:#2c2c30; border-color:rgba(255,255,255,.14); }
        .wrap.dark .opt { color:#c9c9cf; }
        .wrap.dark .srow label { color:#e6e6ea; }
        .wrap.dark .srow:hover { background:rgba(255,255,255,.05); }
        .wrap.dark .schip, .wrap.dark .kbView { background:#3a3a40; color:#c9c9cf; border-color:rgba(255,255,255,.14); }
        .wrap.dark .snote { color:#888; }
        .wrap.dark .snote code { background:#3a3a40; }
        .wrap.dark .track { background:#4a4a52; }
        .wrap.dark .ctl { background:#3a3a40; color:#c9c9cf; border-color:rgba(255,255,255,.12); }
        .wrap.dark .ctl:hover { background:#4a4a52; color:#fff; }
        /* Translucent "glass" theme — see-through with a blur */
        .wrap.glass { background:rgba(255,255,255,.42); backdrop-filter:blur(16px) saturate(1.4);
                      -webkit-backdrop-filter:blur(16px) saturate(1.4); border-color:rgba(255,255,255,.5); }
        .wrap.glass .status { color:#555; }
        .wrap.glass .progress { background:rgba(${ACCENT},.2); }
        .status { font-size:11px; color:#999; padding:0 6px; white-space:nowrap; min-width:58px; text-align:center; flex:0 0 auto; }
        .progress { height:4px; background:rgba(${ACCENT},.14); border-radius:0 0 16px 16px; overflow:hidden; }
        .progress-fill { height:100%; width:0%; background:rgb(${ACCENT}); transition:width .2s ease; }
        /* Custom tooltips */
        [data-tip]:hover::after {
          content:attr(data-tip); position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
          background:#2a2a2a; color:#fff; font-size:11px; font-weight:500; line-height:1; padding:6px 9px;
          border-radius:7px; white-space:nowrap; pointer-events:none; z-index:20; box-shadow:0 3px 10px rgba(0,0,0,.25);
        }
        /* macOS-style window controls, revealed on hover, centered up top */
        .controls { position:absolute; top:-10px; left:50%; display:flex; gap:6px;
                    opacity:0; transform:translateX(-50%) translateY(3px); transition:opacity .14s, transform .14s; pointer-events:none; }
        .wrap:hover .controls { opacity:1; transform:translateX(-50%) translateY(0); pointer-events:auto; }
        .ctl { position:relative; width:20px; height:20px; border-radius:50%; background:#e6e6ea; color:#555;
               display:flex; align-items:center; justify-content:center; cursor:pointer;
               border:1px solid rgba(0,0,0,.08); box-shadow:0 1px 3px rgba(0,0,0,.18); transition:background .13s,color .13s; }
        .ctl:hover { background:#cfcfd6; color:#111; }
        .ctl.active { background:rgb(${ACCENT}); color:#fff; border-color:transparent; }
        .ctl svg { width:12px; height:12px; fill:currentColor; }
        .ctl[data-tip]:hover::after { bottom:calc(100% + 7px); }
        /* Vertical layout */
        .wrap.vert .bar { flex-direction:column; }
        .wrap.vert .sep { width:22px; height:1px; }
        .wrap.vert .speedMenu { bottom:auto; top:50%; left:48px; transform:translateY(-50%); }
        .wrap.vert [data-tip]:hover::after { bottom:auto; left:calc(100% + 8px); top:50%; transform:translateY(-50%); }
        /* Minimized: show only logo + play */
        .wrap.min .bar > *:not(.logo):not(.play) { display:none; }
        .wrap.min .progress { display:none; }
      </style>
      <div class="wrap">
        <div class="controls">
          <div class="ctl layH" data-tip="Horizontal">${ICON.layH}</div>
          <div class="ctl layV" data-tip="Vertical">${ICON.layV}</div>
          <div class="ctl minmax" data-tip="Minimize">${ICON.mini}</div>
        </div>
        <div class="bar">
          <span class="logo" data-tip="Drag to move">${ICON.logo}</span>
          <button class="replay st" data-tip="Restart from beginning">${ICON.replay}</button>
          <button class="back10 st" data-tip="Back 10 words">${ICON.back10}</button>
          <button class="play" data-tip="Play / Pause">${ICON.play}</button>
          <button class="fwd10 st" data-tip="Forward 10 words">${ICON.fwd10}</button>
          <div class="sep"></div>
          <div class="speedWrap">
            <button class="speed" data-tip="Reading speed">1.0×</button>
            <div class="speedMenu">${speedOpts}</div>
          </div>
          <button class="sync st" data-tip="Auto-scroll to follow reading">${ICON.sync}</button>
          <button class="cc st" data-tip="Live captions (transcribe tab audio)">${ICON.cc}</button>
          <span class="status">Loading…</span>
          <div class="setWrap">
            <button class="settings" data-tip="Settings">${ICON.gear}</button>
            <div class="setPanel">
              <div class="setTitle">VOICEY SETTINGS</div>
              <div class="srow col">
                <label>Default speed</label>
                <div class="sset setSpeed">${SPEEDS.map((w, i) => `<span class="schip" data-i="${i}">${fmtSpeed(w)}</span>`).join("")}</div>
              </div>
              <div class="srow">
                <label>Auto-scroll to follow</label>
                <label class="switch"><input type="checkbox" class="setSync"><span class="track"></span><span class="knob"></span></label>
              </div>
              <div class="srow">
                <label>Highlight text</label>
                <label class="switch"><input type="checkbox" class="setHl" checked><span class="track"></span><span class="knob"></span></label>
              </div>
              <div class="srow">
                <label>Spacebar to play / pause</label>
                <label class="switch"><input type="checkbox" class="setSpace" checked><span class="track"></span><span class="knob"></span></label>
              </div>
              <div class="srow">
                <label>Keyboard controls <span class="hint">⌥ + arrows / = / −</span></label>
                <label class="switch"><input type="checkbox" class="setKbd" checked><span class="track"></span><span class="knob"></span></label>
              </div>
              <div class="srow col">
                <label>Theme</label>
                <div class="sset themeSet">
                  <span class="schip" data-theme="light">Light</span>
                  <span class="schip" data-theme="dark">Dark</span>
                  <span class="schip" data-theme="glass">Glass</span>
                </div>
              </div>
              <div class="srow skbd">
                <label>Launch shortcut</label>
                <div class="kbRight">
                  <kbd class="kbView">…</kbd>
                  <button class="kbChange">Change</button>
                </div>
              </div>
              <div class="snote">Chrome only allows editing shortcuts on its own page — the button opens it in a new tab.</div>
            </div>
          </div>
          <button class="close" data-tip="Close">${ICON.close}</button>
        </div>
        <div class="progress"><div class="progress-fill"></div></div>
      </div>`;

    const caption = document.createElement("div");
    caption.style.cssText =
      "all:initial; position:fixed; z-index:2147483646; bottom:92px; left:50%; transform:translateX(-50%); max-width:min(680px,92vw); display:none;";
    const capShadow = caption.attachShadow({ mode: "open" });
    capShadow.innerHTML = `
      <style>
        .cap { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
               background:#fff; color:#222; border:1px solid rgba(0,0,0,.08); border-radius:14px;
               padding:12px 16px; box-shadow:0 8px 30px rgba(0,0,0,.18); font-size:16px; line-height:1.5;
               text-align:center; cursor:grab; user-select:none; }
        .cap:active { cursor:grabbing; }
        .cap.dark { background:#242427; color:#eaeaea; border-color:rgba(255,255,255,.12); }
        .cap.glass { background:rgba(255,255,255,.5); backdrop-filter:blur(16px) saturate(1.4);
                     -webkit-backdrop-filter:blur(16px) saturate(1.4); border-color:rgba(255,255,255,.5); }
        .cap b { background:rgba(${ACCENT},.30); border-radius:4px; padding:0 2px; font-weight:600; }
        .cap.dark b { background:rgba(${ACCENT},.5); color:#fff; }
        .cap .dim { opacity:.5; } /* in-progress (not-yet-finalized) STT words */
      </style>
      <div class="cap"></div>`;

    document.body.append(host, caption);
    const $ = (s) => shadow.querySelector(s);
    return {
      host, caption, shadow,
      wrap: $(".wrap"), logo: $(".logo"),
      playBtn: $(".play"), replayBtn: $(".replay"), back10Btn: $(".back10"),
      fwd10Btn: $(".fwd10"), speedBtn: $(".speed"), speedMenu: $(".speedMenu"),
      syncBtn: $(".sync"), ccBtn: $(".cc"), layHBtn: $(".layH"), layVBtn: $(".layV"), minmaxBtn: $(".minmax"),
      settingsBtn: $(".settings"), setPanel: $(".setPanel"),
      setSpeedChips: shadow.querySelectorAll(".setSpeed .schip"),
      setSync: $(".setSync"), setHl: $(".setHl"), setSpace: $(".setSpace"),
      setKbd: $(".setKbd"), themeChips: shadow.querySelectorAll(".themeSet .schip"),
      kbView: $(".kbView"), kbChange: $(".kbChange"),
      closeBtn: $(".close"), status: $(".status"),
      fill: $(".progress-fill"), capBox: capShadow.querySelector(".cap"),
      setPlaying(p) { $(".play").innerHTML = p ? ICON.pause : ICON.play; },
    };
  }

  // ---- Background port ------------------------------------------------------
  let port;
  const pendingRequests = new Map();
  let nextRequestId = 0;
  // Live-caption transcripts arrive as unsolicited pushes (no requestId); the
  // active UI instance registers a handler for them here.
  let sttPushHandler = null;
  function connectPort() {
    port = chrome.runtime.connect({ name: "voice-reader" });
    port.onMessage.addListener((msg) => {
      if (msg && msg.push && msg.type === "STT") { if (sttPushHandler) sttPushHandler(msg.payload); return; }
      const p = pendingRequests.get(msg.requestId);
      if (!p) return;
      pendingRequests.delete(msg.requestId);
      if (msg.ok) p.resolve(msg); else p.reject(new Error(msg.error || "bg error"));
    });
    port.onDisconnect.addListener(() => {
      for (const { reject } of pendingRequests.values()) reject(new Error("connection lost"));
      pendingRequests.clear();
      connectPort();
    });
  }
  connectPort();
  function sendToBackground(msg) {
    return new Promise((resolve, reject) => {
      const requestId = nextRequestId++;
      pendingRequests.set(requestId, { resolve, reject });
      port.postMessage({ ...msg, requestId });
    });
  }
  function base64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  async function fetchSentences(text) {
    return (await sendToBackground({ type: "GET_SENTENCES", text })).sentences;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  async function init(overrideText) {
    const ui = makeUI();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    let sentences = [];
    let idx = 0;
    let speedIdx = 1;
    let playing = false;
    let ready = false;
    let cancelled = false;
    let syncOn = false; // auto-scroll follow, default off
    let highlightOn = true;
    let spaceOn = true; // spacebar toggles play/pause
    let kbdOn = true;   // Option+arrows to move, Option+=/- to arrange
    let theme = "light"; // "light" | "dark" | "glass"
    let keydownCleanup = null;

    // ---- Highlighting ------------------------------------------------------
    const canHighlight = typeof Highlight !== "undefined" && CSS && CSS.highlights;
    let sentenceHL, wordHL, styleEl;
    let pageText = "", charMap = [];
    let chunkRanges = [], chunkWords = [], chunkWordCount = [], wordCumBefore = [];
    let totalWords = 0;
    const chunkDur = []; // buffer duration per chunk (from decode)

    if (canHighlight) {
      sentenceHL = new Highlight();
      wordHL = new Highlight();
      CSS.highlights.set("vr-sentence", sentenceHL);
      CSS.highlights.set("vr-word", wordHL);
      styleEl = document.createElement("style");
      styleEl.textContent =
        `::highlight(vr-sentence){background:rgba(${ACCENT},.16);}` +
        `::highlight(vr-word){background:rgba(${ACCENT},.42);border-radius:3px;}`;
      document.head.appendChild(styleEl);
    }

    function pointAt(off, dir) {
      let k = Math.max(0, Math.min(off, charMap.length - 1));
      while (k >= 0 && k < charMap.length && !charMap[k]) k += dir;
      return charMap[k] || null;
    }
    function rangeFor(s, e) {
      if (!charMap.length) return null;
      const a = pointAt(s, 1), b = pointAt(e - 1, -1);
      if (!a || !b) return null;
      // If the page swapped its DOM out from under us (SPA navigation, lazy
      // re-render), the mapped nodes are detached — a Range built on them
      // silently points nowhere, so highlight/scroll do nothing. Detect it.
      if (!a.node.isConnected || !b.node.isConnected) return null;
      const r = document.createRange();
      try { r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset + 1); }
      catch (_) { return null; }
      return r;
    }
    function buildChunkMaps() {
      chunkRanges = []; chunkWords = []; chunkWordCount = []; wordCumBefore = [];
      let cursor = 0, cum = 0;
      for (const chunk of sentences) {
        const at = pageText.indexOf(chunk, cursor);
        const words = [];
        if (at >= 0) {
          const s = at; cursor = at + chunk.length;
          chunkRanges.push({ s, e: at + chunk.length });
          let o = 0;
          for (const w of chunk.split(" ")) {
            if (w) words.push({ s: s + o, e: s + o + w.length });
            o += w.length + 1;
          }
        } else {
          chunkRanges.push(null);
        }
        chunkWords.push(words);
        chunkWordCount.push(words.length || 1);
        wordCumBefore.push(cum);
        cum += words.length || 1;
      }
      totalWords = cum;
    }

    // ---- Buffer cache ------------------------------------------------------
    const bufferCache = new Map();
    // Audio is always generated at 1x (rate 175). Playback speed is applied
    // with the audio node's playbackRate, so changing speed never regenerates
    // and the server cache is reusable regardless of the chosen speed.
    const BASE_RATE = 175;
    async function fetchBuffer(i) {
      const res = await sendToBackground({ type: "GET_AUDIO", text: sentences[i], rate: BASE_RATE });
      const buf = await audioCtx.decodeAudioData(base64ToArrayBuffer(res.base64));
      chunkDur[i] = buf.duration;
      return buf;
    }
    function getBuffer(i) {
      if (!bufferCache.has(i)) {
        bufferCache.set(i, fetchBuffer(i).catch((e) => { bufferCache.delete(i); throw e; }));
      }
      return bufferCache.get(i);
    }
    function pr() { return SPEEDS[speedIdx]; } // current playback-rate multiplier

    // ---- Scheduler (supports starting the first chunk mid-buffer) ----------
    let playToken = 0;
    let nextStartTime = 0;
    const activeSources = new Set();
    const schedule = []; // schedule[i] = {startAt, offset, full}
    let scheduling = false;

    function stopAllAudio() {
      playToken++;
      for (const s of activeSources) { try { s.stop(); } catch (_) {} }
      activeSources.clear();
    }

    async function scheduleFrom(startIdx, startOffset) {
      const myToken = ++playToken;
      scheduling = true;
      try {
        const rate = pr(); // playback speed applied to every source
        nextStartTime = audioCtx.currentTime + 0.08;
        let first = true;
        for (let i = startIdx; i < sentences.length; i++) {
          while (myToken === playToken && (!playing || nextStartTime - audioCtx.currentTime > 8)) {
            await new Promise((r) => setTimeout(r, 150));
          }
          if (myToken !== playToken) return;
          for (let j = 0; j <= 3; j++) if (i + j < sentences.length) getBuffer(i + j).catch(() => {});
          let buf;
          try { buf = await getBuffer(i); }
          catch (e) { console.error("[voice-reader]", e); continue; }
          if (myToken !== playToken) return;

          const off = first ? Math.max(0, Math.min(startOffset || 0, buf.duration - 0.05)) : 0;
          const now = audioCtx.currentTime;
          if (nextStartTime < now + 0.02) nextStartTime = now + 0.02;
          const startAt = nextStartTime;
          const src = audioCtx.createBufferSource();
          src.buffer = buf;
          src.playbackRate.value = rate;
          src.connect(audioCtx.destination);
          src.start(startAt, off);
          activeSources.add(src);
          src.onended = () => activeSources.delete(src);
          // Real time to play the remaining buffer = buffer-seconds / rate.
          schedule[i] = { startAt, offset: off, full: buf.duration, rate };
          nextStartTime += (buf.duration - off) / rate + INTER_GAP;
          first = false;
        }
        const remaining = Math.max(0, nextStartTime - audioCtx.currentTime);
        setTimeout(() => {
          if (myToken === playToken) { playing = false; idx = 0; ui.setPlaying(false); clearHighlight(); updateStatus(); hideCaption(); }
        }, remaining * 1000 + 300);
      } finally {
        if (myToken === playToken) scheduling = false;
      }
    }

    // ---- Highlight loop ----------------------------------------------------
    let rafId = 0, lastChunk = -1, curWordInChunk = 0;

    function setSentenceHighlight(i) {
      if (!canHighlight) return;
      sentenceHL.clear();
      const cr = chunkRanges[i]; if (!cr) return;
      const r = rangeFor(cr.s, cr.e); if (r) sentenceHL.add(r);
    }
    function wordAtProgress(i, progress) {
      const words = chunkWords[i];
      if (!words || !words.length) return -1;
      const chunk = sentences[i];
      const totalChars = chunk.replace(/\s/g, "").length || 1;
      const target = progress * totalChars;
      let acc = 0;
      for (let w = 0; w < words.length; w++) {
        const len = words[w].e - words[w].s;
        if (target < acc + len || w === words.length - 1) return w;
        acc += len;
      }
      return words.length - 1;
    }
    function setWordHighlight(i, wi) {
      if (!canHighlight) return;
      wordHL.clear();
      const words = chunkWords[i];
      if (!words || wi < 0 || wi >= words.length) return;
      const r = rangeFor(words[wi].s, words[wi].e);
      if (r) wordHL.add(r);
    }
    function scrollToChunk(i, force) {
      const cr = chunkRanges[i]; if (!cr) return false;
      const r = rangeFor(cr.s, cr.e); if (!r) return false;
      const rect = r.getBoundingClientRect(), vh = window.innerHeight;
      if (force || rect.top < 90 || rect.bottom > vh - 130) {
        (r.startContainer.parentElement || document.body).scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return true;
    }
    // Re-center the page on the sentence Voicey is reading right now and make
    // sure its highlight is showing. Returns false if that text can no longer
    // be located on the page (e.g. the page navigated/re-rendered since load).
    function jumpToReading() {
      const i = lastChunk >= 0 ? lastChunk : idx;
      if (i < 0 || i >= sentences.length) return false;
      const ok = scrollToChunk(i, true);
      if (ok && highlightOn) { setSentenceHighlight(i); setWordHighlight(i, curWordInChunk); }
      return ok;
    }
    function updateCaption(i, wi) {
      const cr = chunkRanges[i];
      const r = cr ? rangeFor(cr.s, cr.e) : null;
      // Hide the floating caption only when we can confirm the read text is
      // comfortably on screen (its highlight is already visible). If we can't
      // locate it — no map entry, or the page re-rendered the nodes away, as
      // on SPA sites — show the caption so the words are never lost.
      let show = true;
      if (r) {
        const rect = r.getBoundingClientRect(), vh = window.innerHeight;
        show = rect.bottom < 40 || rect.top > vh - 40;
      }
      if (show) {
        ui.capBox.innerHTML = sentences[i].split(" ")
          .map((w, k) => (k === wi ? `<b>${escapeHtml(w)}</b>` : escapeHtml(w))).join(" ");
        ui.caption.style.display = "block";
      } else ui.caption.style.display = "none";
    }
    function clearHighlight() {
      if (canHighlight) { sentenceHL.clear(); wordHL.clear(); }
      ui.caption.style.display = "none";
      lastChunk = -1;
    }
    // Find the highest-indexed scheduled chunk whose start time has passed,
    // skipping over gaps (chunks that failed to generate leave a hole in the
    // schedule — earlier this stalled the highlight while audio played on).
    function activeChunkAt(t) {
      let i = lastChunk >= 0 ? lastChunk : 0;
      // forward, hopping over undefined entries
      for (;;) {
        let k = i + 1;
        while (k < schedule.length && !schedule[k]) k++;
        if (k < schedule.length && schedule[k] && t >= schedule[k].startAt) i = k;
        else break;
      }
      // backward (after a jump), hopping over undefined entries
      while (i >= 0 && (!schedule[i] || t < schedule[i].startAt)) {
        let k = i - 1;
        while (k >= 0 && !schedule[k]) k--;
        if (k < 0) break;
        i = k;
      }
      return schedule[i] ? i : -1;
    }

    // Broadcast the current caption so the background can mirror it onto other
    // tabs. Runs on an interval (not rAF) so it keeps firing even when this
    // tab is in the background — audioCtx.currentTime stays accurate there.
    function hideCaption() {
      try { chrome.runtime.sendMessage({ type: "VR_CAPTION_HIDE" }); } catch (_) {}
    }
    const capInterval = setInterval(() => {
      if (!ready || !playing) return;
      const t = audioCtx.currentTime;
      const i = activeChunkAt(t);
      if (i < 0 || !schedule[i]) return;
      const cur = schedule[i];
      const audioPos = cur.offset + (t - cur.startAt) * (cur.rate || 1);
      const progress = Math.max(0, Math.min(audioPos / cur.full, 0.999));
      const wi = wordAtProgress(i, progress);
      try {
        chrome.runtime.sendMessage({ type: "VR_CAPTION", text: sentences[i], word: wi });
      } catch (_) {}
    }, 350);

    function tick() {
      rafId = requestAnimationFrame(tick);
      if (!ready) return;
      const t = audioCtx.currentTime;
      const i = activeChunkAt(t);
      if (i < 0) return;
      const cur = schedule[i];
      if (!cur) return;
      if (i !== lastChunk) {
        lastChunk = i; idx = i;
        if (highlightOn) setSentenceHighlight(i);
        if (syncOn) scrollToChunk(i);
        updateStatus();
      }
      // Elapsed wall time maps to buffer time via the playback rate.
      const audioPos = cur.offset + (t - cur.startAt) * (cur.rate || 1);
      const progress = Math.max(0, Math.min(audioPos / cur.full, 0.999));
      const wi = wordAtProgress(i, progress);
      curWordInChunk = wi < 0 ? 0 : wi;
      if (highlightOn) { setWordHighlight(i, wi); updateCaption(i, wi); }
    }

    // ---- Status / progress -------------------------------------------------
    let statusTimer = 0;
    function flashStatus(msg) {
      ui.status.textContent = msg;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(updateStatus, 2600);
    }
    function updateStatus() {
      if (!sentences.length) { ui.status.textContent = "No text"; return; }
      ui.status.textContent = `${Math.min(idx + 1, sentences.length)} / ${sentences.length}`;
      ui.setPlaying(playing);
      if (ready) ui.fill.style.width = `${((idx + 1) / sentences.length) * 100}%`;
    }

    // ---- Controls ----------------------------------------------------------
    // The local voice model generates one chunk at a time on the CPU, so
    // several tabs pre-generating at once all queue through the same pipeline
    // and each crawls. A tab that's hidden and not playing yields the pipeline
    // to whichever tab the user is actually using; it resumes when looked at
    // (or once it's playing, so backgrounded playback still buffers ahead).
    function waitWhileBackgrounded() {
      if (!document.hidden || playing) return Promise.resolve();
      ui.status.textContent = "Paused — open this tab to prepare";
      return new Promise((resolve) => {
        const check = () => {
          if (cancelled || !document.hidden || playing) {
            document.removeEventListener("visibilitychange", check);
            resolve();
          }
        };
        document.addEventListener("visibilitychange", check);
      });
    }
    async function preGenerateAll() {
      for (let i = 0; i < sentences.length; i++) {
        if (cancelled) return false;
        await waitWhileBackgrounded();
        if (cancelled) return false;
        try { await getBuffer(i); } catch (e) { console.error("[voice-reader]", e); }
        const pct = Math.round((100 * (i + 1)) / sentences.length);
        ui.status.textContent = `Preparing ${pct}%`;
        ui.fill.style.width = `${pct}%`;
      }
      return !cancelled;
    }
    function play() {
      if (playing || !ready) return;
      playing = true; audioCtx.resume(); updateStatus();
      if (!scheduling) scheduleFrom(idx, 0);
    }
    function pause() { playing = false; audioCtx.suspend(); updateStatus(); hideCaption(); }
    function seekChunk(newIdx, offset) {
      stopAllAudio();
      idx = Math.max(0, Math.min(sentences.length - 1, newIdx));
      lastChunk = -1;
      if (playing) { audioCtx.resume(); scheduleFrom(idx, offset || 0); }
      else { setSentenceHighlight(idx); if (syncOn) scrollToChunk(idx); updateStatus(); }
    }
    function currentGlobalWord() { return (wordCumBefore[idx] || 0) + curWordInChunk; }
    function seekWords(delta) {
      if (!totalWords) return;
      let target = Math.max(0, Math.min(currentGlobalWord() + delta, totalWords - 1));
      // find chunk containing target word
      let c = idx;
      while (c > 0 && target < wordCumBefore[c]) c--;
      while (c < sentences.length - 1 && target >= wordCumBefore[c] + chunkWordCount[c]) c++;
      const wordInC = target - wordCumBefore[c];
      const words = chunkWords[c];
      let offset = 0;
      if (words && words.length && chunkDur[c]) {
        const totalChars = sentences[c].replace(/\s/g, "").length || 1;
        let charsBefore = 0;
        for (let w = 0; w < wordInC && w < words.length; w++) charsBefore += words[w].e - words[w].s;
        offset = (charsBefore / totalChars) * chunkDur[c];
      }
      seekChunk(c, offset);
    }
    function replay() { seekChunk(0, 0); if (!playing) play(); }

    function destroy() {
      cancelled = true; stopAllAudio(); cancelAnimationFrame(rafId);
      clearInterval(capInterval); hideCaption();
      if (sttOn) { sttOn = false; sendToBackground({ type: "STT_STOP" }).catch(() => {}); }
      sttPushHandler = null;
      if (keydownCleanup) keydownCleanup();
      if (canHighlight) { CSS.highlights.delete("vr-sentence"); CSS.highlights.delete("vr-word"); }
      if (styleEl) styleEl.remove();
      try { audioCtx.close(); } catch (_) {}
      ui.host.remove(); ui.caption.remove();
      window.__voiceReaderDestroy = null;
      window.__voiceReaderToggle = null;
    }
    window.__voiceReaderDestroy = destroy;

    // Hide/show without tearing down (the icon click & shortcut use this).
    let hidden = false, wasPlaying = false;
    function toggleVisible() {
      hidden = !hidden;
      ui.host.style.display = hidden ? "none" : "";
      if (hidden) {
        wasPlaying = playing;
        if (playing) pause();
        if (sttOn) toggleStt(); // don't keep capturing while hidden
        ui.caption.style.display = "none";
      } else if (wasPlaying && ready) {
        play();
      }
    }
    window.__voiceReaderToggle = toggleVisible;

    // ---- Persistent settings (chrome.storage) ------------------------------
    function saveSettings() {
      try {
        chrome.storage &&
          chrome.storage.local.set({
            vrSpeedIdx: speedIdx, vrSync: syncOn, vrHighlight: highlightOn,
            vrSpace: spaceOn, vrKbd: kbdOn, vrTheme: theme,
          });
      } catch (_) {}
    }

    function setSpace(on, persist) {
      spaceOn = on;
      ui.setSpace.checked = on;
      if (persist) saveSettings();
    }

    function setKbd(on, persist) {
      kbdOn = on;
      ui.setKbd.checked = on;
      if (persist) saveSettings();
    }

    function setTheme(t, persist) {
      theme = (t === "dark" || t === "glass") ? t : "light";
      for (const el of [ui.wrap, ui.capBox]) {
        el.classList.toggle("dark", theme === "dark");
        el.classList.toggle("glass", theme === "glass");
      }
      ui.themeChips.forEach((c) => c.classList.toggle("active", c.dataset.theme === theme));
      if (persist) saveSettings();
    }

    function setSpeed(i, persist) {
      speedIdx = i;
      ui.speedBtn.textContent = fmtSpeed(SPEEDS[i]);
      ui.speedMenu.querySelectorAll(".opt").forEach((o) =>
        o.classList.toggle("active", +o.dataset.i === i));
      ui.setSpeedChips.forEach((c) => c.classList.toggle("active", +c.dataset.i === i));
      if (persist) saveSettings();
      if (playing) {
        // Reschedule from the current spot at the new speed. Buffers are
        // cached (generated at 1x), so this is instant — the new rate is
        // applied via playbackRate, no regeneration.
        const cur = schedule[idx];
        let off = 0;
        if (cur) off = Math.min(cur.offset + (audioCtx.currentTime - cur.startAt) * (cur.rate || 1), cur.full - 0.05);
        seekChunk(idx, Math.max(0, off));
      }
    }

    function setSync(on, persist) {
      syncOn = on;
      ui.syncBtn.classList.toggle("on", on);
      ui.syncBtn.setAttribute("data-tip", on ? "Following — click to jump to reading" : "Jump to what's being read");
      ui.setSync.checked = on;
      if (persist) saveSettings();
    }

    function setHighlight(on, persist) {
      highlightOn = on;
      ui.setHl.checked = on;
      if (!on && canHighlight) { sentenceHL.clear(); wordHL.clear(); ui.caption.style.display = "none"; }
      if (persist) saveSettings();
    }

    ui.playBtn.addEventListener("click", () => { if (ready) (playing ? pause() : play()); });
    ui.replayBtn.addEventListener("click", () => { if (ready) replay(); });
    ui.back10Btn.addEventListener("click", () => { if (ready) seekWords(-10); });
    ui.fwd10Btn.addEventListener("click", () => { if (ready) seekWords(10); });
    // The auto-scroll button now always snaps you back to what Voicey is
    // reading (and enables follow), since the common confusion was losing
    // where it was up to. Turn follow off from Settings if you don't want it.
    ui.syncBtn.addEventListener("click", () => {
      if (!syncOn) setSync(true, true);
      if (!jumpToReading()) flashStatus("Can't find that text on this page");
    });
    ui.speedMenu.querySelectorAll(".opt").forEach((o) =>
      o.addEventListener("click", () => setSpeed(+o.dataset.i, true)));

    // ---- Live captions (speech-to-text of the tab's own audio) -------------
    // A separate feature from reading: transcribe whatever video/audio is
    // playing in this tab. The caption itself is drawn by the roaming overlay
    // (so it can follow you across tabs and carry its own settings); here we
    // only drive the CC button state and start/stop.
    let sttOn = false;
    function setCcBtn(on) {
      sttOn = on;
      ui.ccBtn.classList.toggle("on", on);
      ui.ccBtn.setAttribute("data-tip", on ? "Stop live captions" : "Live captions (transcribe tab audio)");
    }
    sttPushHandler = (payload) => {
      // The overlay owns the caption; we only care about it turning off (its X
      // button) or a capture error, to keep the CC button in sync.
      if (payload && (payload.type === "stopped" || payload.type === "error")) setCcBtn(false);
    };
    async function toggleStt() {
      if (sttOn) {
        setCcBtn(false);
        sendToBackground({ type: "STT_STOP" }).catch(() => {});
        return;
      }
      if (playing) pause(); // don't read and caption at once
      setCcBtn(true);
      let lang = "en";
      try {
        const s = await chrome.storage.local.get({ voiceyCapLang: "en" });
        lang = s.voiceyCapLang || "en";
      } catch (_) {}
      try {
        await sendToBackground({ type: "STT_START", lang });
      } catch (_) {
        setCcBtn(false);
      }
    }
    ui.ccBtn.addEventListener("click", toggleStt);

    // Settings panel
    async function refreshShortcut() {
      try {
        const res = await sendToBackground({ type: "GET_SHORTCUT" });
        ui.kbView.textContent = res.shortcut ? res.shortcut : "Not set";
      } catch (_) {
        ui.kbView.textContent = "—";
      }
    }
    ui.settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = !ui.setPanel.classList.contains("open");
      ui.setPanel.classList.toggle("open");
      if (opening) refreshShortcut(); // always show the live binding
    });
    ui.kbChange.addEventListener("click", () => {
      sendToBackground({ type: "OPEN_SHORTCUTS" }).catch(() => {});
    });
    document.addEventListener("pointerdown", (e) => {
      // close the panel when clicking outside the bar
      if (ui.setPanel.classList.contains("open") && !ui.host.contains(e.target)) {
        ui.setPanel.classList.remove("open");
      }
    });
    ui.setSpeedChips.forEach((c) =>
      c.addEventListener("click", () => setSpeed(+c.dataset.i, true)));
    ui.setSync.addEventListener("change", () => setSync(ui.setSync.checked, true));
    ui.setHl.addEventListener("change", () => setHighlight(ui.setHl.checked, true));
    ui.setSpace.addEventListener("change", () => setSpace(ui.setSpace.checked, true));
    ui.setKbd.addEventListener("change", () => setKbd(ui.setKbd.checked, true));
    ui.themeChips.forEach((c) => c.addEventListener("click", () => setTheme(c.dataset.theme, true)));

    // Move the bar by a step, switching to explicit positioning if needed.
    function moveBy(dx, dy) {
      const r = ui.host.getBoundingClientRect();
      if (ui.host.style.transform && ui.host.style.transform !== "none") {
        ui.host.style.left = r.left + "px"; ui.host.style.top = r.top + "px";
        ui.host.style.right = "auto"; ui.host.style.bottom = "auto"; ui.host.style.transform = "none";
      }
      const w = ui.host.offsetWidth, h = ui.host.offsetHeight;
      const cx = parseFloat(ui.host.style.left) || r.left;
      const cy = parseFloat(ui.host.style.top) || r.top;
      ui.host.style.left = Math.max(4, Math.min(cx + dx, window.innerWidth - w - 4)) + "px";
      ui.host.style.top = Math.max(4, Math.min(cy + dy, window.innerHeight - h - 4)) + "px";
    }

    function onKeyDown(e) {
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
                            el.tagName === "SELECT" || el.isContentEditable);
      if (typing) return;

      // Spacebar → play/pause (needs audio ready)
      if (spaceOn && ready && (e.code === "Space" || e.key === " ")) {
        e.preventDefault(); e.stopPropagation();
        playing ? pause() : play();
        return;
      }
      // Option/Alt combos → move & arrange the bar (works any time it's open)
      if (kbdOn && e.altKey) {
        const STEP = 40;
        let handled = true;
        if (e.code === "ArrowLeft") moveBy(-STEP, 0);
        else if (e.code === "ArrowRight") moveBy(STEP, 0);
        else if (e.code === "ArrowUp") moveBy(0, -STEP);
        else if (e.code === "ArrowDown") moveBy(0, STEP);
        else if (e.key === "=" || e.key === "+" || e.code === "Equal") {
          ui.wrap.classList.toggle("min"); refreshWindowControls();
        } else if (e.key === "-" || e.key === "_" || e.code === "Minus") {
          ui.wrap.classList.toggle("vert"); refreshWindowControls();
        } else handled = false;
        if (handled) { e.preventDefault(); e.stopPropagation(); }
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    keydownCleanup = () => document.removeEventListener("keydown", onKeyDown, true);
    function refreshWindowControls() {
      const vert = ui.wrap.classList.contains("vert");
      const mini = ui.wrap.classList.contains("min");
      ui.layHBtn.classList.toggle("active", !vert);
      ui.layVBtn.classList.toggle("active", vert);
      ui.minmaxBtn.innerHTML = mini ? ICON.maxi : ICON.mini;
      ui.minmaxBtn.setAttribute("data-tip", mini ? "Maximize" : "Minimize");
    }
    ui.layHBtn.addEventListener("click", () => { ui.wrap.classList.remove("vert"); refreshWindowControls(); });
    ui.layVBtn.addEventListener("click", () => { ui.wrap.classList.add("vert"); refreshWindowControls(); });
    ui.minmaxBtn.addEventListener("click", () => { ui.wrap.classList.toggle("min"); refreshWindowControls(); });
    ui.closeBtn.addEventListener("click", destroy);
    setSpeed(speedIdx);
    refreshWindowControls();

    // Drag the whole bar anywhere by grabbing the logo.
    (function enableDrag() {
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
      // Interactive elements should still click, not start a drag.
      const INTERACTIVE = "button, input, label, .schip, .opt, .ctl, .speedMenu, .setPanel";
      // Drag from anywhere on the bar (empty space, logo, status), but not the buttons/menus.
      ui.wrap.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        if (e.target.closest && e.target.closest(INTERACTIVE)) return;
        dragging = true; moved = false;
        const r = ui.host.getBoundingClientRect();
        ui.host.style.left = r.left + "px";
        ui.host.style.top = r.top + "px";
        ui.host.style.right = "auto";
        ui.host.style.bottom = "auto";
        ui.host.style.transform = "none";
        ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
        ui.wrap.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      ui.wrap.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        const w = ui.host.offsetWidth, h = ui.host.offsetHeight;
        ui.host.style.left = Math.max(4, Math.min(ox + dx, window.innerWidth - w - 4)) + "px";
        ui.host.style.top = Math.max(4, Math.min(oy + dy, window.innerHeight - h - 4)) + "px";
      });
      ui.wrap.addEventListener("pointerup", (e) => {
        dragging = false;
        try { ui.wrap.releasePointerCapture(e.pointerId); } catch (_) {}
        // A click (no drag) on the logo while minimized restores the bar.
        if (!moved && ui.wrap.classList.contains("min") && e.target.closest(".logo")) {
          ui.wrap.classList.remove("min");
          refreshWindowControls();
        }
      });
    })();

    // Drag the caption box anywhere (works on this tab; the roaming caption on
    // other tabs is draggable too).
    (function enableCaptionDrag() {
      let on = false, sx = 0, sy = 0, ox = 0, oy = 0;
      ui.caption.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        on = true;
        const r = ui.caption.getBoundingClientRect();
        ui.caption.style.left = r.left + "px";
        ui.caption.style.top = r.top + "px";
        ui.caption.style.right = "auto";
        ui.caption.style.bottom = "auto";
        ui.caption.style.transform = "none";
        ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
        ui.caption.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      ui.caption.addEventListener("pointermove", (e) => {
        if (!on) return;
        const w = ui.caption.offsetWidth, h = ui.caption.offsetHeight;
        ui.caption.style.left = Math.max(4, Math.min(ox + e.clientX - sx, window.innerWidth - w - 4)) + "px";
        ui.caption.style.top = Math.max(4, Math.min(oy + e.clientY - sy, window.innerHeight - h - 4)) + "px";
      });
      ui.caption.addEventListener("pointerup", (e) => {
        on = false;
        try { ui.caption.releasePointerCapture(e.pointerId); } catch (_) {}
      });
    })();

    // ---- Boot --------------------------------------------------------------
    // Apply any saved settings before we start generating.
    try {
      const s = await chrome.storage.local.get({
        vrSpeedIdx: 1, vrSync: false, vrHighlight: true, vrSpace: true, vrKbd: true, vrTheme: "light",
      });
      setSpeed(Math.max(0, Math.min(s.vrSpeedIdx, SPEEDS.length - 1)), false);
      setSync(!!s.vrSync, false);
      setHighlight(s.vrHighlight !== false, false);
      setSpace(s.vrSpace !== false, false);
      setKbd(s.vrKbd !== false, false);
      setTheme(s.vrTheme || "light", false);
    } catch (_) {
      setSpeed(speedIdx, false);
    }

    // Selection mode: read the highlighted text (with on-page highlighting if
    // the selection is still live), otherwise fall back to the whole page.
    let ex;
    if (overrideText != null) {
      const selEx = extractFromSelection();
      ex = selEx && selEx.text ? selEx : { text: String(overrideText), map: [] };
    } else {
      ex = extractReadable();
    }
    pageText = ex.text; charMap = ex.map;
    if (!pageText) { ui.status.textContent = "No readable text found"; return; }
    try { sentences = await fetchSentences(pageText); }
    catch (e) { console.error("[voice-reader]", e); ui.status.textContent = "Error — server running?"; return; }
    if (!sentences.length) { ui.status.textContent = "No readable text found"; return; }

    buildChunkMaps();
    updateStatus();
    rafId = requestAnimationFrame(tick);
    const ok = await preGenerateAll();
    if (ok && !cancelled) { ready = true; ui.fill.style.width = "0%"; play(); }
  }

  init(pendingSelection != null ? pendingSelection : undefined);
})();
