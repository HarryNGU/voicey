import os
import time

os.environ["COQUI_TOS_AGREED"] = "1"

from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

ROOT = "/Users/thanhtam/Desktop/Coding/voice-reader"
RUN_DIR = os.path.join(
    ROOT,
    "xtts_finetune_out/run/training/GPT_XTTS_FT-July-04-2026_01+35AM-e25e126",
)
CONFIG_PATH = os.path.join(RUN_DIR, "config.json")
CHECKPOINT_PATH = os.path.join(RUN_DIR, "best_model.pth")
VOCAB_PATH = os.path.join(
    ROOT,
    "xtts_finetune_out/run/training/XTTS_v2.0_original_model_files/vocab.json",
)

print("Loading fine-tuned model...", flush=True)
t0 = time.time()
config = XttsConfig()
config.load_json(CONFIG_PATH)
model = Xtts.init_from_config(config)
model.load_checkpoint(config, checkpoint_path=CHECKPOINT_PATH, vocab_path=VOCAB_PATH, use_deepspeed=False)
print("MODEL LOADED in", time.time() - t0, "s", flush=True)

t1 = time.time()
outputs = model.synthesize(
    "This is a test of my own cloned voice, reading a brand new sentence it has never seen before.",
    config,
    speaker_wav=os.path.join(ROOT, "voice_data/raw/fast_read_1.wav"),
    language="en",
)
print("GENERATED in", time.time() - t1, "s", flush=True)

import soundfile as sf

sf.write("/tmp/xtts_finetuned_test.wav", outputs["wav"], 24000)
print("SAVED to /tmp/xtts_finetuned_test.wav", flush=True)
