# Hearly Local Model Files

Drop local model artifacts in this folder before loading the extension build.

## Speaker Verification

- `hearly-speaker-v1.onnx`

Used by enrollment and runtime speaker matching.

## Speech-to-Text (Offline Transcript)

- `hearly-stt-wav2vec2.onnx`
- `hearly-stt-vocab.json`

Expected runtime contract:

- Input tensor: raw waveform float32 shape `[1, samples]` at 16 kHz
- Output tensor: logits shape `[1, frames, vocab_size]`
- Vocab JSON: either an array of tokens by index, or an object map `{ "0": "<pad>", ... }`

If STT files are missing, Hearly shows a local model unavailable error and
skips transcript entry creation.
