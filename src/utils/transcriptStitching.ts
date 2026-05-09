/**
 * Intelligent transcript stitching utility
 * Combines partial transcripts from speech-to-text into coherent utterances
 * Handles overlapping text, punctuation, and case differences intelligently
 */

export const intelligentStitch = (baseText: string, newFragment: string): string => {
  const base = baseText.trim();
  const fragment = newFragment.trim();
  
  if (!base) return fragment;
  if (!fragment) return base;
  
  const baseWords = base.split(/\s+/);
  const fragmentWords = fragment.split(/\s+/);
  let overlapLength = 0;
  
  // A helper function to clean words for comparison ONLY.
  const cleanWord = (word: string) => word.replace(/[.,?!;:"']/g, '').toLowerCase();
  
  // Find the length of the longest suffix of `baseWords` that is a prefix of `fragmentWords`
  for (let i = Math.min(baseWords.length, fragmentWords.length); i >= 1; i--) {
    const baseSuffix = baseWords.slice(baseWords.length - i);
    const fragmentPrefix = fragmentWords.slice(0, i);
    
    // Compare the *cleaned* versions of the words to find the true overlap.
    const cleanedBaseSuffix = baseSuffix.map(cleanWord).join(' ');
    const cleanedFragmentPrefix = fragmentPrefix.map(cleanWord).join(' ');
    
    if (cleanedBaseSuffix === cleanedFragmentPrefix) {
      overlapLength = i;
      // We've found the longest possible overlap, so we can stop searching.
      break;
    }
  }
  
  // Append only the part of the new fragment that doesn't overlap.
  const nonOverlappingFragment = fragmentWords.slice(overlapLength).join(' ');
  
  // Combine the original base text with the new, non-overlapping part.
  // This ensures punctuation from the original text is preserved.
  return (base + ' ' + nonOverlappingFragment).trim();
};

/**
 * Advanced transcript processing for better speech-to-text handling
 */
export class TranscriptProcessor {
  private currentUtterance: string = '';
  private lastUpdateTime: number = 0;
  private silenceThreshold: number = 2000; // 2 seconds of silence to finalize
  
  constructor(silenceThreshold: number = 2000) {
    this.silenceThreshold = silenceThreshold;
  }
  
  /**
   * Process a new transcript fragment
   * @param transcript The new transcript fragment
   * @param isFinal Whether this is a final transcript from STT
   * @returns Object with current utterance and whether it should be sent
   */
  processTranscript(transcript: string, isFinal: boolean): {
    utterance: string;
    shouldSend: boolean;
    isUpdated: boolean;
  } {
    const now = Date.now();
    this.lastUpdateTime = now;
    
    // Use intelligent stitching to combine transcripts
    const previousUtterance = this.currentUtterance;
    this.currentUtterance = intelligentStitch(this.currentUtterance, transcript);
    
    const isUpdated = this.currentUtterance !== previousUtterance;
    
    // Send if final and has content
    const shouldSend = isFinal && this.currentUtterance.trim().length > 0;
    
    if (shouldSend) {
      // Reset for next utterance
      const utteranceToSend = this.currentUtterance;
      this.currentUtterance = '';
      return {
        utterance: utteranceToSend,
        shouldSend: true,
        isUpdated: true
      };
    }
    
    return {
      utterance: this.currentUtterance,
      shouldSend: false,
      isUpdated
    };
  }
  
  /**
   * Check if enough silence has passed to finalize current utterance
   */
  checkSilenceTimeout(): { utterance: string; shouldSend: boolean } {
    const now = Date.now();
    const silenceTime = now - this.lastUpdateTime;
    
    if (silenceTime >= this.silenceThreshold && this.currentUtterance.trim().length > 0) {
      const utteranceToSend = this.currentUtterance;
      this.currentUtterance = '';
      return {
        utterance: utteranceToSend,
        shouldSend: true
      };
    }
    
    return {
      utterance: this.currentUtterance,
      shouldSend: false
    };
  }
  
  /**
   * Get current utterance without sending
   */
  getCurrentUtterance(): string {
    return this.currentUtterance;
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.currentUtterance = '';
    this.lastUpdateTime = 0;
  }
  
  /**
   * Force finalize current utterance
   */
  finalize(): string {
    const utterance = this.currentUtterance;
    this.currentUtterance = '';
    return utterance;
  }
}