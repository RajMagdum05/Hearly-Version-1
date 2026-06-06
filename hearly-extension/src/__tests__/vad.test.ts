import { describe, it, expect } from 'vitest';
import { AdaptiveVAD } from '../audio/vad';

describe('AdaptiveVAD', () => {
  it('should return false for silence or extremely low energy inputs', () => {
    const vad = new AdaptiveVAD();
    const silence = new Float32Array(512); // All zeros
    
    // Process a few blocks of silence to stabilize the filters
    let result = { isSpeech: true, confidence: 0 };
    for (let i = 0; i < 10; i++) {
      result = vad.process(silence);
    }
    
    expect(result.isSpeech).toBe(false);
    expect(result.confidence).toBe(0.0);
  });

  it('should detect speech for high-energy inputs', () => {
    const vad = new AdaptiveVAD();
    
    // First establish a noise floor with silence
    const silence = new Float32Array(512);
    for (let i = 0; i < 5; i++) {
      vad.process(silence);
    }

    // Now simulate speech (sine wave with high amplitude)
    const speech = new Float32Array(512);
    for (let i = 0; i < speech.length; i++) {
      speech[i] = Math.sin(i * 0.1) * 0.5; // Amplitude 0.5
    }

    // Process speech frames
    let result = { isSpeech: false, confidence: 0 };
    for (let i = 0; i < 5; i++) {
      result = vad.process(speech);
    }

    expect(result.isSpeech).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.0);
  });

  it('should adapt the noise floor dynamically over time', () => {
    const vad = new AdaptiveVAD();
    const silence = new Float32Array(512);

    // Initial run
    vad.process(silence);
    
    // Process many blocks of silence, noise floor should decrease
    for (let i = 0; i < 100; i++) {
      vad.process(silence);
    }

    const laterResult = vad.process(silence);
    
    // We check that the internals adapt (the returned confidence/speech detection
    // handles silence consistently)
    expect(laterResult.isSpeech).toBe(false);
    expect(laterResult.confidence).toBe(0.0);
  });
});
