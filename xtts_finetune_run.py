import os

os.environ["COQUI_TOS_AGREED"] = "1"

from TTS.tts.layers.xtts.trainer.gpt_trainer import GPTTrainerConfig

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

    torch.set_num_threads(8)
    print("torch threads set to:", torch.get_num_threads(), flush=True)
    print("Starting FULL fine-tune run (10 epochs, 78 train samples)...", flush=True)

    result = train_gpt(
        language="en",
        num_epochs=10,
        batch_size=1,
        grad_acumm=1,
        train_csv=os.path.join(DATA_DIR, "train.csv"),
        eval_csv=os.path.join(DATA_DIR, "eval.csv"),
        output_path=os.path.join(ROOT, "xtts_finetune_out"),
    )
    print("FINE-TUNE SUCCEEDED:", result, flush=True)


if __name__ == "__main__":
    main()
