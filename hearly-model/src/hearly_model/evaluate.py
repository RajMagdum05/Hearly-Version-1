from __future__ import annotations

import argparse
from itertools import combinations

import torch
from torch.utils.data import DataLoader

from .dataset import SpeakerDataset
from .model import SpeakerClassifier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Hearly speaker embeddings")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--threshold", type=float, default=0.58)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset = SpeakerDataset(args.manifest)
    checkpoint = torch.load(args.checkpoint, map_location="cpu")
    model = SpeakerClassifier(speaker_count=len(checkpoint["speaker_to_index"]))
    model.load_state_dict(checkpoint["model_state"])
    model.eval()

    embeddings: list[torch.Tensor] = []
    labels: list[int] = []
    with torch.no_grad():
        for features, batch_labels in DataLoader(dataset, batch_size=args.batch_size):
            _logits, batch_embeddings = model(features)
            embeddings.extend(batch_embeddings)
            labels.extend(int(label) for label in batch_labels)

    true_accepts = false_accepts = true_rejects = false_rejects = 0
    for left, right in combinations(range(len(embeddings)), 2):
        score = torch.nn.functional.cosine_similarity(
            embeddings[left].unsqueeze(0),
            embeddings[right].unsqueeze(0),
        ).item()
        same = labels[left] == labels[right]
        matched = score >= args.threshold
        if same and matched:
            true_accepts += 1
        elif same and not matched:
            false_rejects += 1
        elif not same and matched:
            false_accepts += 1
        else:
            true_rejects += 1

    total_same = true_accepts + false_rejects
    total_other = true_rejects + false_accepts
    print(f"threshold={args.threshold:.3f}")
    print(f"true_accept_rate={true_accepts / max(1, total_same):.3f}")
    print(f"false_reject_rate={false_rejects / max(1, total_same):.3f}")
    print(f"true_reject_rate={true_rejects / max(1, total_other):.3f}")
    print(f"false_accept_rate={false_accepts / max(1, total_other):.3f}")


if __name__ == "__main__":
    main()
