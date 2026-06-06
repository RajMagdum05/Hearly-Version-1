import { describe, it, expect, beforeEach } from 'vitest';
import { TranscriptMerger } from '../audio/transcriptMerger';

describe('TranscriptMerger', () => {
  let merger: TranscriptMerger;

  beforeEach(() => {
    merger = new TranscriptMerger();
  });

  it('should return the full string for the first chunk when buffer is empty', () => {
    const result = merger.merge('hello world');
    expect(result).toBe('hello world');
  });

  it('should filter out overlapping words at the boundary', () => {
    merger.merge('hello world');
    const result = merger.merge('world how are you');
    expect(result).toBe('how are you');
  });

  it('should handle multi-word overlaps correctly', () => {
    merger.merge('we are coding a chrome extension');
    const result = merger.merge('a chrome extension for meetings');
    expect(result).toBe('for meetings');
  });

  it('should be case-insensitive when detecting overlaps', () => {
    merger.merge('Hello World');
    const result = merger.merge('WORLD how are you');
    expect(result).toBe('how are you');
  });

  it('should return the full string if there is no overlap', () => {
    merger.merge('hello world');
    const result = merger.merge('testing testing');
    expect(result).toBe('testing testing');
  });

  it('should return empty string for empty inputs', () => {
    const result = merger.merge('   ');
    expect(result).toBe('');
  });

  it('should cap the buffer to the last 200 words to avoid memory leaks', () => {
    // Generate 210 words
    const largeInput = Array.from({ length: 210 }, (_, i) => `word${i}`).join(' ');
    merger.merge(largeInput);

    // Merge something overlapping the tail of the large input
    // The last 200 words will start from word10 to word209.
    // So overlapping "word208 word209 newstuff" should filter out word208 word209.
    const result = merger.merge('word208 word209 newstuff');
    expect(result).toBe('newstuff');
  });
});
