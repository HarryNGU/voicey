import asyncio
import io
import os
import re
import threading
import time
from collections import OrderedDict
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from pydantic import BaseModel
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

VOICE_MODEL_DIR = Path(__file__).resolve().parent.parent / "voice_model"
REFERENCE_CLIP = Path(__file__).resolve().parent.parent / "voice_data/raw/fast_read_1.wav"

app = FastAPI()

# Extension origins are chrome-extension://<id> — CORS must explicitly allow
# them since fetch() from a content/background script still sends Origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)

# MPS looks faster in short bursts (~0.9x) but DEGRADES CATASTROPHICALLY
# under sustained load on this 16GB M3 — real reading sessions spiraled to
# 100-200s per chunk (ratios up to 65x) and never recovered. CPU is a bit
# slower peak (~1.2-1.4x) but stays rock-steady over long sessions, which
# is what actually matters for reading a whole article.
DEVICE = "cpu"

print(f"Loading fine-tuned voice model on {DEVICE}...", flush=True)
_config = XttsConfig()
_config.load_json(str(VOICE_MODEL_DIR / "config.json"))
model = Xtts.init_from_config(_config)
model.load_checkpoint(
    _config,
    checkpoint_path=str(VOICE_MODEL_DIR / "best_model.pth"),
    vocab_path=str(VOICE_MODEL_DIR / "vocab.json"),
    use_deepspeed=False,
)
model.eval()
if DEVICE == "mps":
    model.to("mps")

# The speaker embedding + GPT conditioning latents depend only on the
# reference clip, not the text — computing them once at startup instead of
# on every /tts call (as model.synthesize does) removes a fixed chunk of
# per-request work. These MUST use the model's own config values (not the
# get_conditioning_latents defaults) or the cloned voice comes out wrong.
print("Precomputing speaker conditioning latents...", flush=True)
GPT_COND_LATENT, SPEAKER_EMBEDDING = model.get_conditioning_latents(
    audio_path=[str(REFERENCE_CLIP)],
    gpt_cond_len=_config.gpt_cond_len,
    gpt_cond_chunk_len=_config.gpt_cond_chunk_len,
    max_ref_length=_config.max_ref_len,
    sound_norm_refs=_config.sound_norm_refs,
)

# Sampling params also come from config, matching model.synthesize (the
# path whose output was approved). The defaults on inference() differ
# (e.g. repetition_penalty 10.0 vs the model's 2.0) and change the voice.
_INFER = dict(
    temperature=_config.temperature,
    length_penalty=_config.length_penalty,
    repetition_penalty=float(_config.repetition_penalty),
    top_k=_config.top_k,
    top_p=_config.top_p,
)


# The extension fires the current request plus several prefetches at once.
# FastAPI runs sync endpoints in a threadpool, so without this lock all of
# them would run PyTorch CPU inference simultaneously, each ~N times slower
# from core contention — the playing sentence finishes before any prefetch
# is ready, causing stalls. Serializing means each runs at full speed and
# they complete in playback order, so the next chunk is ready in time.
_synth_lock = threading.Lock()


def _trim_silence(wav: np.ndarray, thresh: float = 0.015, keep_ms: int = 40) -> np.ndarray:
    # XTTS pads chunks with trailing (and some leading) near-silence, which
    # becomes dead air between chunks and reads as a stutter. Trim it, keeping
    # a short tail so the join still sounds natural.
    if wav.size == 0:
        return wav
    loud = np.abs(wav) > thresh
    if not loud.any():
        return wav
    keep = int(24000 * keep_ms / 1000)
    start = max(0, int(np.argmax(loud)) - keep)
    end = min(len(wav), len(wav) - int(np.argmax(loud[::-1])) + keep)
    return wav[start:end]


def synth(text: str, speed: float) -> np.ndarray:
    with _synth_lock, torch.no_grad():
        out = model.inference(
            text,
            "en",
            GPT_COND_LATENT,
            SPEAKER_EMBEDDING,
            speed=speed,
            enable_text_splitting=False,
            **_INFER,
        )
        if DEVICE == "mps":
            # Freeing the MPS allocator between calls curbs the memory
            # buildup that triggers the occasional latency spike on 16GB.
            torch.mps.empty_cache()
    return _trim_silence(np.asarray(out["wav"]))


# MPS compiles Metal kernels on the first few inferences (first call can be
# ~2x slower than steady state). Warm them up now so the user's first real
# sentence isn't the one that pays that cost.
# First inference pays one-time lazy-init cost (graph setup, buffer alloc)
# on both CPU and MPS; run a couple now so the user's first real chunk
# isn't the one that eats it.
print("Warming up...", flush=True)
for w in ["Warming up now.", "This is a slightly longer warmup sentence for the model."]:
    synth(w, 1.0)
print("Voice model ready.", flush=True)


class TTSRequest(BaseModel):
    text: str
    rate: int = 175  # words per minute; 175 = 1.0x speed baseline


# Each chunk is ONE full sentence so the model gets whole-sentence context and
# places pauses naturally — splitting mid-sentence (at commas) made it pause in
# the wrong places. XTTS can garble very long inputs, so only sentences beyond
# this character budget are sub-split, and then only at strong punctuation.
MAX_CHARS = 260


def _split_long(sentence: str) -> list[str]:
    if len(sentence) <= MAX_CHARS:
        return [sentence]
    # Too long for one pass — break at clause punctuation, packing clauses up
    # to the budget so breaks land at natural boundaries, not mid-phrase.
    parts = re.split(r"(?<=[,;:—])\s+", sentence)
    chunks, buf = [], ""
    for part in parts:
        candidate = f"{buf} {part}".strip()
        if len(candidate) > MAX_CHARS and buf:
            chunks.append(buf.strip())
            buf = part
        else:
            buf = candidate
    if buf.strip():
        chunks.append(buf.strip())
    return chunks


def split_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    raw = re.split(r"(?<=[.!?])\s+", text)
    out = []
    for s in raw:
        s = s.strip()
        # Drop fragments with too little alphabetic content (nav labels, lone
        # symbols) — the model emits near-empty audio the browser won't play.
        if len(re.sub(r"[^A-Za-z]", "", s)) < 3:
            continue
        out.extend(_split_long(s))
    return out


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/sentences")
def sentences(req: TTSRequest):
    return {"sentences": split_sentences(req.text)}


# Cache finished audio so re-reading a page (reload, back-navigation, toggling
# Voicey off/on) is near-instant instead of regenerating everything. Keyed by
# (text, rate); persists for the life of the server process. Byte-capped LRU.
_TTS_CACHE = OrderedDict()
_TTS_CACHE_BYTES = 0
_TTS_CACHE_MAX_BYTES = 500 * 1024 * 1024  # ~500 MB
_cache_lock = threading.Lock()


@app.post("/tts")
def tts(req: TTSRequest):
    text = req.text.strip()
    if not text:
        return Response(status_code=400)

    key = (text, req.rate)
    with _cache_lock:
        hit = _TTS_CACHE.get(key)
        if hit is not None:
            _TTS_CACHE.move_to_end(key)
    if hit is not None:
        return Response(content=hit, media_type="audio/wav")

    t0 = time.time()
    speed = req.rate / 175.0
    wav = synth(text, speed)
    gen_s = time.time() - t0
    audio_s = len(wav) / 24000
    print(f"/tts gen={gen_s:.1f}s audio={audio_s:.1f}s ratio={gen_s/max(audio_s,0.01):.2f} :: {text[:50]!r}", flush=True)

    if len(wav) < 2400:  # under 0.1s at 24kHz — model produced near-nothing
        return Response(status_code=422)

    buf = io.BytesIO()
    sf.write(buf, wav, 24000, format="WAV")
    data = buf.getvalue()

    global _TTS_CACHE_BYTES
    with _cache_lock:
        _TTS_CACHE[key] = data
        _TTS_CACHE.move_to_end(key)
        _TTS_CACHE_BYTES += len(data)
        while _TTS_CACHE_BYTES > _TTS_CACHE_MAX_BYTES and len(_TTS_CACHE) > 1:
            _, old = _TTS_CACHE.popitem(last=False)
            _TTS_CACHE_BYTES -= len(old)

    return Response(content=data, media_type="audio/wav")


@app.post("/tts_stream")
def tts_stream(req: TTSRequest):
    """Stream audio as it is generated, as raw 24kHz mono little-endian
    int16 PCM. Time-to-first-byte is ~1s (vs ~5s to wait for a full
    sentence), and the client schedules chunks gaplessly. enable_text_
    splitting lets one request cover the whole article, so playback is
    continuous without per-sentence request orchestration.
    """
    text = req.text.strip()
    if not text:
        return Response(status_code=400)
    speed = req.rate / 175.0

    def generate():
        t0 = time.time()
        first = True
        total = 0
        # Hold the lock for the whole stream so a concurrent request can't
        # interleave inference steps on the shared model mid-stream.
        with _synth_lock, torch.no_grad():
            for chunk in model.inference_stream(
                text,
                "en",
                GPT_COND_LATENT,
                SPEAKER_EMBEDDING,
                speed=speed,
                stream_chunk_size=20,
                enable_text_splitting=True,
                **_INFER,
            ):
                pcm = chunk.detach().cpu().numpy()
                pcm = np.clip(pcm * 32767.0, -32768, 32767).astype("<i2").tobytes()
                total += len(pcm)
                if first:
                    print(f"/tts_stream TTFB={time.time()-t0:.2f}s :: {text[:50]!r}", flush=True)
                    first = False
                yield pcm
            if DEVICE == "mps":
                torch.mps.empty_cache()
        dur = total / 2 / 24000
        gen_s = time.time() - t0
        print(f"/tts_stream done gen={gen_s:.1f}s audio={dur:.1f}s ratio={gen_s/max(dur,0.01):.2f}", flush=True)

    return StreamingResponse(generate(), media_type="application/octet-stream")


# ---- Live speech-to-text (tab audio -> captions) ---------------------------
# A separate feature from reading aloud: the extension captures the audio of a
# playing tab (video, podcast, meeting) and streams 16 kHz mono int16 PCM here
# over a WebSocket; we stream back a live transcript. Fully local via
# faster-whisper (CTranslate2) — same no-cloud/no-API constraint as the voice.
STT_MODEL_NAME = os.environ.get("VOICEY_STT_MODEL", "base.en")
STT_SR = 16000
_stt_model = None
_stt_model_lock = threading.Lock()

# Pacing / silence tuning, all in seconds unless noted.
_STT_SILENCE_RMS = 0.006     # a chunk quieter than this RMS counts as silence
_STT_COMMIT_SILENCE = 0.6    # trailing silence that finalizes an utterance
_STT_MIN_BUF = 0.6           # don't bother transcribing less audio than this
_STT_INFER_EVERY = 0.45      # min wall-clock gap between partial transcriptions
_STT_MAX_UTTER = 8.0         # force a commit once a run of speech gets this long


def _load_stt_model():
    global _stt_model
    with _stt_model_lock:
        if _stt_model is None:
            from faster_whisper import WhisperModel

            print(f"Loading STT model {STT_MODEL_NAME!r} (first use)...", flush=True)
            _stt_model = WhisperModel(STT_MODEL_NAME, device="cpu", compute_type="int8")
            print("STT model ready.", flush=True)
    return _stt_model


# EN->VI translation model, loaded only when a Vietnamese session starts. We
# always pivot through English: Whisper's "translate" task turns any language
# into English, then this turns English into Vietnamese.
_MT_NAME = "Helsinki-NLP/opus-mt-en-vi"
_mt = None
_mt_lock = threading.Lock()


def _load_mt():
    global _mt
    with _mt_lock:
        if _mt is None:
            from transformers import MarianMTModel, MarianTokenizer

            print(f"Loading translation model {_MT_NAME!r} (first use)...", flush=True)
            tok = MarianTokenizer.from_pretrained(_MT_NAME)
            mdl = MarianMTModel.from_pretrained(_MT_NAME)
            _mt = (tok, mdl)
            print("Translation model ready.", flush=True)
    return _mt


def _en_to_vi(text: str) -> str:
    tok, mdl = _mt
    batch = tok([text], return_tensors="pt", padding=True, truncation=True, max_length=200)
    with torch.no_grad():
        out = mdl.generate(**batch, max_length=200, num_beams=1)
    return tok.decode(out[0], skip_special_tokens=True).strip()


def _transcribe(audio: np.ndarray) -> str:
    # task="translate" outputs English regardless of the spoken language, so a
    # French or Vietnamese video still comes out as English (and English stays
    # English). Greedy + no conditioning to keep partials from snowballing.
    segments, _ = _stt_model.transcribe(
        audio, task="translate", beam_size=1,
        condition_on_previous_text=False,
        # Silero VAD strips non-speech before decoding — the standard cure for
        # Whisper's phantom "Thank you." / "you" on silence and trailing gaps.
        vad_filter=True,
        # Stop its occasional runaway loops ("fing fing fing…") on noisy audio.
        no_repeat_ngram_size=3,
    )
    return " ".join(seg.text for seg in segments).strip()


@app.websocket("/stt")
async def stt_ws(ws: WebSocket):
    await ws.accept()
    loop = asyncio.get_event_loop()
    lang = (ws.query_params.get("lang") or "en").lower()
    if lang not in ("en", "vi"):
        lang = "en"
    await ws.send_json({"type": "status", "text": "Loading speech model…"})
    await loop.run_in_executor(None, _load_stt_model)
    if lang == "vi":
        await ws.send_json({"type": "status", "text": "Loading translation…"})
        await loop.run_in_executor(None, _load_mt)
    await ws.send_json({"type": "status", "text": "Listening…"})

    # Intake and transcription run as two tasks so the socket is always drained
    # promptly: transcription of a growing buffer gets slower than real time, so
    # if the same loop did both, incoming audio would starve and captions would
    # fall ever further behind and never reach the silence that commits them.
    st = {"buf": np.zeros(0, dtype=np.float32), "trailing": 0.0, "closed": False}
    lock = asyncio.Lock()

    def _rms(a):
        return float(np.sqrt(np.mean(a ** 2))) if a.size else 0.0

    async def receiver():
        try:
            while True:
                data = await ws.receive_bytes()
                if not data:
                    continue
                pcm = np.frombuffer(data, dtype="<i2").astype(np.float32) / 32768.0
                seg_dur = pcm.size / STT_SR
                quiet = _rms(pcm) < _STT_SILENCE_RMS
                async with lock:
                    st["buf"] = np.concatenate([st["buf"], pcm])
                    st["trailing"] = st["trailing"] + seg_dur if quiet else 0.0
        except WebSocketDisconnect:
            pass
        finally:
            st["closed"] = True

    async def transcriber():
        last_size = -1
        while not st["closed"]:
            await asyncio.sleep(_STT_INFER_EVERY)
            async with lock:
                buf = st["buf"]
                trailing = st["trailing"]
            buf_dur = buf.size / STT_SR
            if buf_dur < _STT_MIN_BUF or buf.size == last_size:
                continue
            last_size = buf.size

            # Whisper hallucinates words ("Thank you.", "you") on near-silence,
            # so skip transcribing quiet buffers; once the pause is long enough
            # to count as a gap, drop the buffer so silence can't accumulate.
            if _rms(buf) < _STT_SILENCE_RMS:
                if trailing >= _STT_COMMIT_SILENCE:
                    async with lock:
                        st["buf"] = st["buf"][buf.size:]
                        st["trailing"] = 0.0
                    last_size = -1
                continue

            text = await loop.run_in_executor(None, _transcribe, buf.copy())
            if not text:
                continue
            if lang == "vi":
                text = await loop.run_in_executor(None, _en_to_vi, text)
                if not text:
                    continue
            if trailing >= _STT_COMMIT_SILENCE or buf_dur >= _STT_MAX_UTTER:
                await ws.send_json({"type": "final", "text": text})
                async with lock:
                    # Keep only audio that streamed in during transcription so
                    # the next utterance doesn't lose its opening words.
                    st["buf"] = st["buf"][buf.size:]
                    st["trailing"] = 0.0
                last_size = -1
            else:
                await ws.send_json({"type": "partial", "text": text})

    recv_task = asyncio.create_task(receiver())
    try:
        await transcriber()
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001 — log and drop, never crash the server
        print(f"/stt error: {e}", flush=True)
    finally:
        recv_task.cancel()
        try:
            await ws.close()
        except Exception:
            pass


@app.get("/test", response_class=HTMLResponse)
def test_page():
    # A self-contained harness for validating the full fetch->blob->audio
    # pipeline in a real browser tab, independent of the extension.
    return """<!doctype html><html><head><meta charset=utf-8><title>TTS test</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:40px auto">
<h2>Voice Reader — pipeline test</h2>
<button id="go" style="font-size:18px;padding:10px 20px">Read sample</button>
<pre id="log" style="background:#111;color:#0f0;padding:12px;height:300px;overflow:auto"></pre>
<script>
const SAMPLE = "This is a full pipeline test. Each sentence is generated separately. If you can hear this, the audio path works. Here is one more sentence to check continuity.";
const log = (m)=>{document.getElementById('log').textContent += m+"\\n";};
async function fetchSentences(text){
  const r = await fetch('/sentences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
  return (await r.json()).sentences;
}
async function fetchAudio(text){
  const r = await fetch('/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,rate:175})});
  if(!r.ok) throw new Error('tts '+r.status);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}
document.getElementById('go').onclick = async ()=>{
  const audio = new Audio();
  log('splitting...');
  const sents = await fetchSentences(SAMPLE);
  log('got '+sents.length+' sentences');
  let idx=0;
  const cache = new Map();
  const get = (i)=>{ if(!cache.has(i)) cache.set(i, fetchAudio(sents[i])); return cache.get(i); };
  get(0);
  async function playNext(){
    if(idx>=sents.length){log('DONE');return;}
    const t=Date.now();
    log('gen sentence '+(idx+1)+'/'+sents.length+'...');
    let url; try{ url = await get(idx);}catch(e){log('ERR '+e);return;}
    log('  ready in '+((Date.now()-t)/1000).toFixed(1)+'s, playing');
    audio.src=url; await audio.play();
    if(idx+1<sents.length) get(idx+1);
  }
  audio.addEventListener('ended',()=>{idx++;playNext();});
  playNext();
};
</script></body></html>"""
