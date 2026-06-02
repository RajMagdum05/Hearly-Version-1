# Hearly Local Speaker Model

This folder is the local training/export pipeline for Hearly's own speaker
verification model. It does not call an API.

## Dataset Format

Create a JSONL manifest where each line points to one speech clip:

```json
{"path":"data/speakers/rehan/clip-001.wav","speaker_id":"rehan"}
{"path":"data/speakers/rehan/clip-002.wav","speaker_id":"rehan"}
{"path":"data/speakers/other-001/clip-001.wav","speaker_id":"other-001"}
```

For a useful first model, collect at least:

- 20-50 clips for the target user.
- 10+ different non-target speakers.
- Quiet, noisy, near-mic, far-mic, laptop-mic, and headset examples.
- Clips around 2-6 seconds long.

## Install

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r hearly-model/requirements.txt
```

## Train

```bash
python -m hearly_model.train \
  --manifest hearly-model/dataset.example.jsonl \
  --output-dir hearly-model/runs/speaker-v1 \
  --epochs 25
```

## Evaluate

```bash
python -m hearly_model.evaluate \
  --manifest hearly-model/dataset.example.jsonl \
  --checkpoint hearly-model/runs/speaker-v1/best.pt
```

## Export ONNX

```bash
python -m hearly_model.export_onnx \
  --checkpoint hearly-model/runs/speaker-v1/best.pt \
  --output hearly-extension/public/models/hearly-speaker-v1.onnx
```

The extension now looks for `public/models/hearly-speaker-v1.onnx` during voice
enrollment. If the file is present, `src/ai/localSpeakerModel.ts` runs it
locally through ONNX Runtime Web. If it is missing, Hearly falls back to the
deterministic local fingerprint.
