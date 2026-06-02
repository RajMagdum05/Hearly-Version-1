from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as F


class ConvBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, dilation: int = 1) -> None:
        super().__init__()
        padding = dilation
        self.net = nn.Sequential(
            nn.Conv1d(in_channels, out_channels, kernel_size=3, padding=padding, dilation=dilation),
            nn.BatchNorm1d(out_channels),
            nn.SiLU(),
            nn.Conv1d(out_channels, out_channels, kernel_size=1),
            nn.BatchNorm1d(out_channels),
            nn.SiLU(),
        )
        self.skip = (
            nn.Identity()
            if in_channels == out_channels
            else nn.Conv1d(in_channels, out_channels, kernel_size=1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x) + self.skip(x)


class SpeakerEncoder(nn.Module):
    def __init__(self, n_mels: int = 64, embedding_dim: int = 192) -> None:
        super().__init__()
        self.blocks = nn.Sequential(
            ConvBlock(n_mels, 128, dilation=1),
            ConvBlock(128, 192, dilation=2),
            ConvBlock(192, 256, dilation=3),
            ConvBlock(256, 256, dilation=4),
        )
        self.projection = nn.Sequential(
            nn.Linear(512, 256),
            nn.SiLU(),
            nn.Linear(256, embedding_dim),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        x = self.blocks(features)
        mean = x.mean(dim=-1)
        std = x.std(dim=-1).clamp_min(1e-5)
        pooled = torch.cat([mean, std], dim=1)
        embedding = self.projection(pooled)
        return F.normalize(embedding, p=2, dim=1)


class SpeakerClassifier(nn.Module):
    def __init__(self, speaker_count: int, embedding_dim: int = 192) -> None:
        super().__init__()
        self.encoder = SpeakerEncoder(embedding_dim=embedding_dim)
        self.classifier = nn.Linear(embedding_dim, speaker_count)

    def forward(self, features: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        embedding = self.encoder(features)
        logits = self.classifier(embedding)
        return logits, embedding
