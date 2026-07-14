# Voicey

Read any webpage aloud in your **own cloned voice**, with word-by-word highlighting, plus live speech-to-text captions for videos. Everything runs **locally on your Mac** — no cloud, no paid APIs, no subscriptions.

Voicey turns reading into listening for long days, tired eyes, dyslexia, or low vision, in a voice cloned from your own.

## Parts

| Folder | What it is |
| --- | --- |
| `extension/` | Chrome extension (Manifest V3). Reads the page aloud, highlights each word, and shows roaming cross-tab captions. |
| `server/` | Local FastAPI server (port 8765). XTTS v2 text-to-speech in your cloned voice, sentence splitting, and a faster-whisper `/stt` WebSocket for live captions + on-device translation (EN ↔ Tiếng Việt). |
| `landing/` | Marketing landing page, sign-in, and onboarding flow (single-file HTML). |
| `xtts_finetune_*.py` | Scripts used to fine-tune the XTTS v2 voice model. |

## Privacy

The trained voice model and voice recordings are intentionally **not** in this repository (see `.gitignore`). Your voiceprint stays on your machine. Optional cross-device sync is designed to be end-to-end encrypted, so a synced voice is stored only as a file that cannot be opened without a key you hold.

## Running the server

```bash
cd server
uv sync
uv run uvicorn main:app --port 8765
```

Then load `extension/` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Stack

XTTS v2 · faster-whisper (CTranslate2) · Helsinki-NLP opus-mt · FastAPI · Chrome MV3 (offscreen documents, tabCapture, Web Audio)

---

Built locally on an M-series Mac. All inference runs on-device.
