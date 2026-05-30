from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import torch
from torch.utils.data import Dataset

from .audio import fit_length, load_mono_audio, log_mel_spectrogram


@dataclass(frozen=True)
class SpeakerClip:
    path: Path
    speaker_id: str


def read_manifest(manifest_path: str | Path) -> list[SpeakerClip]:
    base_dir = Path(manifest_path).resolve().parent
    clips: list[SpeakerClip] = []
    with Path(manifest_path).open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if "path" not in row or "speaker_id" not in row:
                raise ValueError(f"Manifest line {line_number} must include path and speaker_id")
            path = Path(row["path"])
            if not path.is_absolute():
                path = base_dir / path
            clips.append(SpeakerClip(path=path, speaker_id=str(row["speaker_id"])))
    return clips


def build_speaker_index(clips: Iterable[SpeakerClip]) -> dict[str, int]:
    speaker_ids = sorted({clip.speaker_id for clip in clips})
    return {speaker_id: index for index, speaker_id in enumerate(speaker_ids)}


class SpeakerDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(self, manifest_path: str | Path, seconds: float = 3.0) -> None:
        self.clips = read_manifest(manifest_path)
        self.speaker_to_index = build_speaker_index(self.clips)
        self.seconds = seconds

        if len(self.speaker_to_index) < 2:
            raise ValueError("Speaker training needs at least two speaker_id values")

    def __len__(self) -> int:
        return len(self.clips)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        clip = self.clips[index]
        waveform = load_mono_audio(clip.path)
        waveform = fit_length(waveform, self.seconds)
        features = log_mel_spectrogram(waveform)
        label = torch.tensor(self.speaker_to_index[clip.speaker_id], dtype=torch.long)
        return features, label
