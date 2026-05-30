# Hearly Launch Checklist

## Required Before Public Launch

- Add trained speaker model: `hearly-extension/public/models/hearly-speaker-v1.onnx`.
- Add trained STT model: `hearly-extension/public/models/hearly-stt-wav2vec2.onnx`.
- Add STT vocab: `hearly-extension/public/models/hearly-stt-vocab.json`.
- Manually test install from `hearly-extension/dist` in Chrome.
- Test enrollment in the extension popup.
- Test Hearly toggle on Google Meet.
- Test Hearly toggle on Zoom web.
- Test Hearly toggle on Microsoft Teams web.
- Test transcript toggle with the local STT model files present.
- Test remove profile from Settings.
- Test reload/reopen popup after enrollment.
- Test extension error page after toggling on non-meeting tabs.
- Prepare Chrome Web Store screenshots.
- Prepare Chrome Web Store description using local/privacy-first wording.
- Publish or link the privacy policy in `docs/PRIVACY.md`.

## Current Launch Status

The extension builds and packages, but it is not ready for public market launch
until the trained local model files are present and manually verified.
