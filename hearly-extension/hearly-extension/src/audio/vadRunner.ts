/**
 * Silero VAD wrapper — loads ONNX lazily in service worker / audio context (Phase F).
 */
export function createVadPlaceholder(): { dispose: () => void } {
  return { dispose: () => undefined };
}
