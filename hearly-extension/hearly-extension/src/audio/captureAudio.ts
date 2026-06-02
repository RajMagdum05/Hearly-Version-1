/**
 * Microphone capture — Web Audio API wiring (Phase F).
 */
export async function ensureMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}
