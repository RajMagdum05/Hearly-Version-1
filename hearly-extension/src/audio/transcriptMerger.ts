// transcriptMerger.ts
// Merges overlapping transcript chunks using Longest Common Subsequence (LCS) alignment

export class TranscriptMerger {
  private textBuffer: string[] = [];

  /**
   * Merges a new partial transcript chunk into the global history text.
   * Leverages sliding window alignment to filter overlap redundancy.
   * Returns the newly appended non-overlapping words.
   */
  public merge(newChunk: string): string {
    const incomingWords = newChunk.trim().split(/\s+/).filter(Boolean);
    if (incomingWords.length === 0) {
      return '';
    }
    
    if (this.textBuffer.length === 0) {
      this.textBuffer = incomingWords;
      return this.textBuffer.join(' ');
    }

    const maxOverlap = Math.min(20, this.textBuffer.length, incomingWords.length);
    let bestOverlapSize = 0;

    // Sliding window check from the tail of buffer and head of incoming string
    for (let size = 1; size <= maxOverlap; size++) {
      const bufferSlice = this.textBuffer.slice(-size).join(' ').toLowerCase();
      const incomingSlice = incomingWords.slice(0, size).join(' ').toLowerCase();
      
      if (bufferSlice === incomingSlice) {
        bestOverlapSize = size;
      }
    }

    // Append only non-overlapping novel tokens
    const novelWords = incomingWords.slice(bestOverlapSize);
    this.textBuffer.push(...novelWords);

    // Keep buffer memory bounded
    if (this.textBuffer.length > 200) {
      this.textBuffer = this.textBuffer.slice(-200);
    }

    return novelWords.join(' ');
  }
}
