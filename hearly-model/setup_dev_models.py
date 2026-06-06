import os
import subprocess
import sys
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT_DIR / "hearly-model"
VENV_DIR = MODEL_DIR / ".venv"
EXTENSION_MODELS_DIR = ROOT_DIR / "hearly-extension" / "public" / "models"

def run_cmd(cmd, cwd=None):
    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=cwd, check=True)

def main():
    EXTENSION_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Setup Venv
    if not VENV_DIR.exists():
        print("Creating virtual environment...")
        run_cmd([sys.executable, "-m", "venv", str(VENV_DIR)])
    
    # Pip executable path
    if os.name == "nt":
        pip_path = VENV_DIR / "Scripts" / "pip.exe"
        python_path = VENV_DIR / "Scripts" / "python.exe"
    else:
        pip_path = VENV_DIR / "bin" / "pip"
        python_path = VENV_DIR / "bin" / "python"

    print("Installing dependencies...")
    run_cmd([str(pip_path), "install", "--upgrade", "pip"])
    run_cmd([str(pip_path), "install", "torch", "torchaudio", "transformers", "onnx"])

    # Write internal export script
    export_script = f"""
import torch
import torch.nn as nn
import json
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from pathlib import Path

models_dir = Path(r"{EXTENSION_MODELS_DIR}")

# ---- 1. Export Dummy Speaker Encoder ----
class DummySpeakerEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv1d(64, 192, kernel_size=3, padding=1)
        self.pool = nn.AdaptiveAvgPool1d(1)
        
    def forward(self, log_mel):
        x = self.conv(log_mel)
        x = self.pool(x).squeeze(-1)
        norm = torch.norm(x, p=2, dim=1, keepdim=True).clamp_min(1e-5)
        return x / norm

print("Exporting dummy speaker model...")
speaker_model = DummySpeakerEncoder().eval()
dummy_mel = torch.randn(1, 64, 301)
torch.onnx.export(
    speaker_model,
    dummy_mel,
    str(models_dir / "hearly-speaker-v1.onnx"),
    input_names=["log_mel"],
    output_names=["embedding"],
    dynamic_axes={{
        "log_mel": {{0: "batch_size", 2: "frames"}},
        "embedding": {{0: "batch_size"}},
    }},
    opset_version=17,
)
print("Dummy speaker model exported successfully!")

# ---- 2. Export Pre-Trained Wav2Vec2 STT Model & Vocab ----
print("Loading facebook/wav2vec2-base-960h model from Hugging Face...")
processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
stt_model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h").eval()

# Save vocab
vocab = processor.tokenizer.get_vocab()
sorted_vocab = [tok for tok, idx in sorted(vocab.items(), key=lambda x: x[1])]
with open(models_dir / "hearly-stt-vocab.json", "w", encoding="utf-8") as f:
    json.dump(sorted_vocab, f)
print("STT vocabulary written.")

# Export STT to ONNX
print("Exporting STT model to ONNX...")
dummy_audio = torch.randn(1, 16000) # 1 second of audio at 16kHz
torch.onnx.export(
    stt_model,
    dummy_audio,
    str(models_dir / "hearly-stt-wav2vec2.onnx"),
    input_names=["input_values"],
    output_names=["logits"],
    dynamic_axes={{
        "input_values": {{0: "batch_size", 1: "sequence_length"}},
        "logits": {{0: "batch_size", 1: "sequence_length"}},
    }},
    opset_version=14,
)
print("STT model exported successfully!")
"""

    temp_script = MODEL_DIR / "temp_export.py"
    temp_script.write_text(export_script, encoding="utf-8")

    try:
        print("Running ONNX exports...")
        run_cmd([str(python_path), str(temp_script)])
    finally:
        if temp_script.exists():
            temp_script.unlink()

    print("\nAll dev models set up successfully in hearly-extension/public/models/!")

if __name__ == "__main__":
    main()
