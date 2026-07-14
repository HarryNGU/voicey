// Offscreen document: the only extension context that can call getUserMedia.
// The background hands us a tabCapture stream id; we open the audio stream,
// keep it audible, downsample it to 16 kHz mono int16 PCM, and stream it to
// the local server's /stt WebSocket. Transcripts come back on the same socket
// and are forwarded to the background, which pushes them to the page's caption.

let ws = null;
let audioCtx = null;
let source = null;
let processor = null;
let stream = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.target !== "offscreen") return;
  if (msg.type === "OFFSCREEN_START") start(msg.streamId, msg.wsUrl);
  else if (msg.type === "OFFSCREEN_STOP") stop();
});

function toBackground(payload) {
  chrome.runtime.sendMessage({ target: "background", type: "STT_RESULT", payload }).catch(() => {});
}

// Resample an arbitrary-rate mono Float32 frame to 16 kHz int16 via linear
// interpolation (tab capture is usually 48 kHz).
function downsampleTo16k(input, inRate) {
  const OUT = 16000;
  const clamp = (s) => (s < -1 ? -1 : s > 1 ? 1 : s);
  const enc = (s) => (s < 0 ? s * 0x8000 : s * 0x7fff);
  if (inRate === OUT) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = enc(clamp(input[i]));
    return out;
  }
  const ratio = inRate / OUT;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = idx - i0;
    out[i] = enc(clamp(input[i0] * (1 - frac) + input[i1] * frac));
  }
  return out;
}

async function start(streamId, wsUrl) {
  stop(); // never run two captures at once
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
      video: false,
    });
  } catch (e) {
    toBackground({ type: "status", text: "Couldn't capture tab audio." });
    return;
  }

  audioCtx = new AudioContext();
  source = audioCtx.createMediaStreamSource(stream);
  // tabCapture silences the tab for the user unless we re-output it.
  source.connect(audioCtx.destination);

  const inRate = audioCtx.sampleRate;
  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioCtx.destination); // keep the node pulling; outputs silence

  ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";
  ws.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch (_) { return; }
    toBackground(m);
  };
  ws.onerror = () => toBackground({ type: "status", text: "Can't reach the server. Is it running?" });
  ws.onclose = () => { /* client-initiated stop or server drop; nothing to do */ };

  processor.onaudioprocess = (ev) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const pcm = downsampleTo16k(ev.inputBuffer.getChannelData(0), inRate);
    if (pcm.length) ws.send(pcm.buffer);
  };
}

function stop() {
  try { if (processor) { processor.onaudioprocess = null; processor.disconnect(); } } catch (_) {}
  try { if (source) source.disconnect(); } catch (_) {}
  try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
  try { if (audioCtx) audioCtx.close(); } catch (_) {}
  try { if (ws) ws.close(); } catch (_) {}
  ws = audioCtx = source = processor = stream = null;
}
