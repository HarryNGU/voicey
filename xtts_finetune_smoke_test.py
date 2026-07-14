import os

os.environ["COQUI_TOS_AGREED"] = "1"

from TTS.tts.layers.xtts.trainer.gpt_trainer import GPTTrainerConfig

# The demo's train_gpt hardcodes num_loader_workers=8; DataLoader worker
# processes on macOS use spawn and each re-imports the full TTS stack,
# which is both slow and RAM-hungry on 16GB. Force in-process loading.
_orig_config_init = GPTTrainerConfig.__init__


def _patched_config_init(self, *args, **kwargs):
    kwargs["num_loader_workers"] = 0
    _orig_config_init(self, *args, **kwargs)


GPTTrainerConfig.__init__ = _patched_config_init

from TTS.demos.xtts_ft_demo.utils.gpt_train import train_gpt

ROOT = "/Users/thanhtam/Desktop/Coding/voice-reader"
DATA_DIR = os.path.join(ROOT, "xtts_finetune_data")


def main():
    import torch

    # TTS/tts/layers/xtts/trainer/dataset.py pins this to 1 at import time,
    # leaving 7 of 8 M3 cores idle during training. Override after import.
    torch.set_num_threads(8)
    print("torch threads set to:", torch.get_num_threads(), flush=True)

    print("Starting CPU smoke test (1 epoch, tiny batch)...", flush=True)
    result = train_gpt(
        language="en",
        num_epochs=1,
        batch_size=1,
        grad_acumm=1,
        train_csv=os.path.join(DATA_DIR, "train_smoke.csv"),
        eval_csv=os.path.join(DATA_DIR, "eval_smoke.csv"),
        output_path=os.path.join(ROOT, "xtts_finetune_smoke_out"),
    )
    print("SMOKE TEST SUCCEEDED:", result, flush=True)


if __name__ == "__main__":
    main()
