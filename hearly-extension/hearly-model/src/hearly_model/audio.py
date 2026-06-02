from __future__ import annotations

from pathlib import Path

import torch
import torchaudio


TARGET_SAMPLE_RATE = 16_000


def load_mono_audio(path: str | Path, sample_rate: int = TARGET_SAMPLE_RATE) -> torch.Tensor:
    waveform, original_rate = torchaudio.load(str(path))
    if waveform.ndim != 2:
        raise ValueError(f"Expected waveform [channels, samples], got {tuple(waveform.shape)}")

    waveform = waveform.mean(dim=0, keepdim=True)
    if original_rate != sample_rate:
        waveform = torchaudio.functional.resample(waveform, original_rate, sample_rate)

    return waveform.squeeze(0).contiguous()


def fit_length(waveform: torch.Tensor, seconds: float, sample_rate: int = TARGET_SAMPLE_RATE) -> torch.Tensor:
    target_length = int(seconds * sample_rate)
    if waveform.numel() == target_length:
        return waveform
    if waveform.numel() > target_length:
        max_start = waveform.numel() - target_length
        start = int(torch.randint(0, max_start + 1, ()).item())
        return waveform[start : start + target_length]

    repeats = (target_length + waveform.numel() - 1) // max(1, waveform.numel())
    return waveform.repeat(repeats)[:target_length]


def log_mel_spectrogram(
    waveform: torch.Tensor,
    sample_rate: int = TARGET_SAMPLE_RATE,
    n_mels: int = 64,
) -> torch.Tensor:
    transform = torchaudio.transforms.MelSpectrogram(
        sample_rate=sample_rate,
        n_fft=400,
        hop_length=160,
        win_length=400,
        n_mels=n_mels,
        f_min=40,
        f_max=7600,
        power=2.0,
    )
    mel = transform(waveform.unsqueeze(0)).squeeze(0)
    mel = torch.log(torch.clamp(mel, min=1e-6))
    mean = mel.mean(dim=-1, keepdim=True)
    std = mel.std(dim=-1, keepdim=True).clamp_min(1e-5)
    return (mel - mean) / std
