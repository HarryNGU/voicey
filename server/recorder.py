import re
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from scripts_data import build_flat_prompt_list

VOICE_DATA_DIR = Path(__file__).resolve().parent.parent / "voice_data" / "raw"
VOICE_DATA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:40]


@app.get("/api/prompts")
def get_prompts():
    prompts = build_flat_prompt_list()
    existing = {p.stem for p in VOICE_DATA_DIR.glob("*.wav")}
    for p in prompts:
        p["recorded"] = p["id"] in existing
    return {"prompts": prompts}


@app.post("/api/save/{prompt_id}")
async def save_recording(prompt_id: str, file: UploadFile):
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(await file.read())
        tmp_in_path = tmp_in.name

    out_path = VOICE_DATA_DIR / f"{prompt_id}.wav"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", tmp_in_path,
            "-ar", "48000", "-ac", "1",
            str(out_path),
        ],
        check=True,
        capture_output=True,
    )
    Path(tmp_in_path).unlink(missing_ok=True)
    return {"ok": True, "saved": str(out_path)}


@app.get("/api/audio/{prompt_id}")
def get_audio(prompt_id: str):
    path = VOICE_DATA_DIR / f"{prompt_id}.wav"
    if not path.exists():
        return {"ok": False}
    return FileResponse(path, media_type="audio/wav")


app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="static")
