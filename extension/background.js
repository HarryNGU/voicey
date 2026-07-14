const SERVER = "http://localhost:8765";

// ---- Cross-tab live captions ------------------------------------------------
// The reading tab broadcasts the current sentence/word; we mirror it as a
// floating caption on whatever tab the user is currently looking at.
let captionState = { active: false, text: "", word: -1, sourceTabId: null };
const overlayTabs = new Set();

async function ensureOverlay(tabId) {
  if (overlayTabs.has(tabId)) return true;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["caption-overlay.js"] });
    overlayTabs.add(tabId);
    return true;
  } catch (_) {
    return false; // chrome:// pages, PDF viewer, web store, etc. can't be injected
  }
}

async function pushCaptionTo(tabId) {
  if (!captionState.active || tabId == null || tabId === captionState.sourceTabId) return;
  if (!(await ensureOverlay(tabId))) return;
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "VR_OVERLAY_SHOW", text: captionState.text, word: captionState.word,
    });
  } catch (_) {}
}

async function activeTabId() {
  try {
    const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return t ? t.id : null;
  } catch (_) { return null; }
}

// ---- Live speech-to-text (tab audio -> captions) --------------------------
// A separate feature from reading aloud: capture the audio of the tab Voicey
// is open on, stream it to the local /stt WebSocket via an offscreen document
// (service workers can't use getUserMedia), and push transcripts back to that
// tab's caption box.
const STT_WS_BASE = "ws://localhost:8765/stt";
let sttClientPort = null;  // content-script port that started STT (for button state)
let sttSourceTabId = null; // the tab whose audio we're capturing
let sttLang = "en";
let sttActive = false;
let sttPayload = null;     // last transcript/status frame, for re-showing on tab switch
let sttShownTab = null;    // the tab currently displaying the STT overlay
let creatingOffscreen = null;

async function hasOffscreen() {
  if (!chrome.runtime.getContexts) return false;
  const ctxs = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  return ctxs.length > 0;
}

async function ensureOffscreenDoc() {
  if (await hasOffscreen()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Capture the current tab's audio for live speech-to-text captions.",
    });
  }
  try { await creatingOffscreen; } finally { creatingOffscreen = null; }
}

function sttWsUrl() { return `${STT_WS_BASE}?lang=${encodeURIComponent(sttLang)}`; }

async function startCapture() {
  // getMediaStreamId must run in the service worker; the offscreen doc opens it.
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: sttSourceTabId });
  await ensureOffscreenDoc();
  await chrome.runtime.sendMessage({
    target: "offscreen", type: "OFFSCREEN_START", streamId, wsUrl: sttWsUrl(),
  });
}

// Live captions roam with the user: show the current transcript on whatever
// tab is active, hiding it on the one they left.
async function pushSttTo(tabId, payload) {
  if (tabId == null) return;
  if (!(await ensureOverlay(tabId))) return;
  try { await chrome.tabs.sendMessage(tabId, { type: "VR_STT_SHOW", payload }); } catch (_) {}
}

async function showSttOnActive(payload) {
  const tid = await activeTabId();
  if (sttShownTab != null && sttShownTab !== tid) {
    chrome.tabs.sendMessage(sttShownTab, { type: "VR_STT_HIDE" }).catch(() => {});
  }
  sttShownTab = tid;
  await pushSttTo(tid, payload);
}

async function startStt(tabId, lang) {
  sttSourceTabId = tabId;
  sttLang = lang === "vi" ? "vi" : "en";
  sttActive = true;
  sttPayload = { type: "status", text: "Starting captions…" };
  await showSttOnActive(sttPayload); // the source tab is active at this point
  try {
    await startCapture();
  } catch (e) {
    sttActive = false;
    const why = (e && e.message) ? ` (${e.message})` : "";
    await showSttOnActive({ type: "status", text: `Couldn't capture this tab's audio${why}` });
    if (sttClientPort) { try { sttClientPort.postMessage({ push: true, type: "STT", payload: { type: "error" } }); } catch (_) {} }
    throw e;
  }
}

async function stopStt() {
  sttActive = false;
  chrome.runtime.sendMessage({ target: "offscreen", type: "OFFSCREEN_STOP" }).catch(() => {});
  if (await hasOffscreen()) { try { await chrome.offscreen.closeDocument(); } catch (_) {} }
  if (sttShownTab != null) chrome.tabs.sendMessage(sttShownTab, { type: "VR_STT_HIDE" }).catch(() => {});
  if (sttClientPort) { try { sttClientPort.postMessage({ push: true, type: "STT", payload: { type: "stopped" } }); } catch (_) {} }
  sttShownTab = null; sttSourceTabId = null; sttPayload = null;
}

async function setSttLang(lang) {
  sttLang = lang === "vi" ? "vi" : "en";
  if (!sttActive) return;
  // The language is fixed when the socket opens, so switch = reconnect.
  chrome.runtime.sendMessage({ target: "offscreen", type: "OFFSCREEN_STOP" }).catch(() => {});
  await showSttOnActive({ type: "status", text: sttLang === "vi" ? "Switching to Tiếng Việt…" : "Switching to English…" });
  try { await startCapture(); } catch (_) {}
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !msg.type) return;
  if (msg.type === "STT_RESULT") {
    // From the offscreen doc: a transcript/status frame. Show it on the tab
    // the user is currently looking at (captions roam across tabs).
    if (!sttActive) return;
    sttPayload = msg.payload;
    showSttOnActive(msg.payload);
    return;
  }
  if (msg.type === "VR_STT_CLOSE") { stopStt(); return; }        // overlay X button
  if (msg.type === "VR_STT_SETLANG") { setSttLang(msg.lang); return; } // overlay language chip
  if (msg.type === "VR_CAPTION") {
    captionState = {
      active: true, text: msg.text || "",
      word: msg.word == null ? -1 : msg.word,
      sourceTabId: sender.tab ? sender.tab.id : null,
    };
    activeTabId().then((tid) => pushCaptionTo(tid));
  } else if (msg.type === "VR_CAPTION_HIDE") {
    captionState.active = false;
    for (const tid of overlayTabs) chrome.tabs.sendMessage(tid, { type: "VR_OVERLAY_HIDE" }).catch(() => {});
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (!captionState.active) return;
  if (tabId === captionState.sourceTabId) {
    chrome.tabs.sendMessage(tabId, { type: "VR_OVERLAY_HIDE" }).catch(() => {});
  } else {
    pushCaptionTo(tabId);
  }
});

// Live captions follow the active tab too.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (!sttActive) return;
  if (sttShownTab != null && sttShownTab !== tabId) {
    chrome.tabs.sendMessage(sttShownTab, { type: "VR_STT_HIDE" }).catch(() => {});
  }
  sttShownTab = tabId;
  pushSttTo(tabId, sttPayload || { type: "status", text: "Listening…" });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  overlayTabs.delete(tabId);
  if (sttActive && tabId === sttSourceTabId) stopStt(); // captured tab closed
});
chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.status === "loading") overlayTabs.delete(tabId); });

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

// "Read selection with Voicey" — right-click any selected text on a page.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "voicey-read-selection",
    title: "Read selection with Voicey",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "voicey-read-selection" || !tab || !tab.id) return;
  // Stash the selected text on the page, then (re)inject Voicey, which reads
  // that selection instead of the whole page.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (t) => { window.__voiceReaderPendingText = t; },
    args: [info.selectionText || ""],
  });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
});

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// TTS generation regularly takes 10-30s+, which exceeds the effective
// lifetime of a one-shot chrome.runtime.sendMessage/sendResponse channel
// ("message channel closed before a response was received"). A long-lived
// Port isn't bound by that per-message timeout, so long requests use one
// instead of sendMessage.
chrome.runtime.onConnect.addListener((port) => {
  // If the page that owns live captions goes away (tab closed, navigation),
  // tear the capture down so it doesn't keep running headless.
  port.onDisconnect.addListener(() => { if (sttClientPort === port) stopStt(); });
  port.onMessage.addListener((msg) => {
    (async () => {
      try {
        let result;
        if (msg.type === "GET_SENTENCES") {
          const res = await fetch(`${SERVER}/sentences`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.text }),
          });
          if (!res.ok) throw new Error(`sentences failed: ${res.status}`);
          const data = await res.json();
          result = { sentences: data.sentences };
        } else if (msg.type === "GET_AUDIO") {
          const res = await fetch(`${SERVER}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.text, rate: msg.rate }),
          });
          if (!res.ok) throw new Error(`tts failed: ${res.status}`);
          const buf = await res.arrayBuffer();
          result = { base64: arrayBufferToBase64(buf) };
        } else if (msg.type === "HEALTH_CHECK") {
          const res = await fetch(`${SERVER}/health`);
          result = { healthy: res.ok };
        } else if (msg.type === "GET_SHORTCUT") {
          // Report the CURRENT binding (reflects any user customization).
          const cmds = await chrome.commands.getAll();
          const c = cmds.find((x) => x.name === "_execute_action");
          result = { shortcut: (c && c.shortcut) || "" };
        } else if (msg.type === "OPEN_SHORTCUTS") {
          // Chrome forbids extensions from setting shortcuts directly; the
          // best we can do is open its dedicated shortcuts page for the user.
          await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
          result = {};
        } else if (msg.type === "STT_START") {
          const tabId = port.sender && port.sender.tab ? port.sender.tab.id : null;
          if (tabId == null) throw new Error("no tab to capture");
          sttClientPort = port;
          await startStt(tabId, msg.lang);
          result = {};
        } else if (msg.type === "STT_STOP") {
          await stopStt();
          result = {};
        }
        port.postMessage({ requestId: msg.requestId, ok: true, ...result });
      } catch (e) {
        port.postMessage({ requestId: msg.requestId, ok: false, error: String(e) });
      }
    })();
  });
});
