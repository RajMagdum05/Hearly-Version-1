from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from .model import SpeakerClassifier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export Hearly speaker encoder to ONNX")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    checkpoint = torch.load(args.checkpoint, map_location="cpu")
    speaker_count = len(checkpoint["speaker_to_index"])
    model = SpeakerClassifier(speaker_count=speaker_count)
    model.load_state_dict(checkpoint["model_state"])
    encoder = model.encoder.eval()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    dummy_features = torch.randn(1, 64, 301)
    torch.onnx.export(
        encoder,
        dummy_features,
        str(output_path),
        input_names=["log_mel"],
        output_names=["embedding"],
        dynamic_axes={
            "log_mel": {0: "batch", 2: "frames"},
            "embedding": {0: "batch"},
        },
        opset_version=17,
    )

    metadata = {
        "model": "hearly-speaker-encoder",
        "embedding_dim": checkpoint.get("embedding_dim", 192),
        "sample_rate": 16000,
        "n_mels": 64,
        "input": "normalized log-mel spectrogram [batch, 64, frames]",
        "output": "l2-normalized speaker embedding [batch, 192]",
        "speaker_to_index": checkpoint["speaker_to_index"],
    }
    output_path.with_suffix(".json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Exported {output_path}")


if __name__ == "__main__":
    main()
