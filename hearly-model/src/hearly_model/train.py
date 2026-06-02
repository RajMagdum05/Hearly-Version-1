from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split

from .dataset import SpeakerDataset
from .model import SpeakerClassifier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Hearly's local speaker encoder")
    parser.add_argument("--manifest", required=True, help="JSONL dataset manifest")
    parser.add_argument("--output-dir", required=True, help="Directory for checkpoints")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--seconds", type=float, default=3.0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    dataset = SpeakerDataset(args.manifest, seconds=args.seconds)
    val_count = max(1, int(len(dataset) * 0.15))
    train_count = len(dataset) - val_count
    train_set, val_set = random_split(
        dataset,
        [train_count, val_count],
        generator=torch.Generator().manual_seed(42),
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SpeakerClassifier(speaker_count=len(dataset.speaker_to_index)).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()

    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=0)

    best_val = float("inf")
    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss = 0.0
        for features, labels in train_loader:
            features = features.to(device)
            labels = labels.to(device)
            logits, _embedding = model(features)
            loss = criterion(logits, labels)
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * features.size(0)

        model.eval()
        val_loss = 0.0
        correct = 0
        seen = 0
        with torch.no_grad():
            for features, labels in val_loader:
                features = features.to(device)
                labels = labels.to(device)
                logits, _embedding = model(features)
                loss = criterion(logits, labels)
                val_loss += loss.item() * features.size(0)
                correct += (logits.argmax(dim=1) == labels).sum().item()
                seen += labels.numel()

        train_loss /= max(1, train_count)
        val_loss /= max(1, val_count)
        accuracy = correct / max(1, seen)
        print(
            f"epoch={epoch:03d} train_loss={train_loss:.4f} "
            f"val_loss={val_loss:.4f} val_acc={accuracy:.3f}"
        )

        checkpoint = {
            "model_state": model.state_dict(),
            "speaker_to_index": dataset.speaker_to_index,
            "seconds": args.seconds,
            "embedding_dim": 192,
        }
        torch.save(checkpoint, output_dir / "last.pt")
        if val_loss < best_val:
            best_val = val_loss
            torch.save(checkpoint, output_dir / "best.pt")

    metadata = {
        "manifest": str(Path(args.manifest).resolve()),
        "speaker_to_index": dataset.speaker_to_index,
        "best_val_loss": best_val,
        "embedding_dim": 192,
        "sample_rate": 16000,
        "n_mels": 64,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
