// vad.ts
// Edge-Safe Adaptive Voice Activity Detection (VAD)

export class AdaptiveVAD {
  private noiseFloor = 0.005;
  private speechEnergyThreshold = 0.015;
  private decayRate = 0.9995; // Noise floor adaptation decay
  private attackRate = 0.05;  // Noise floor adaptation attack
  
  private fastAlpha = 0.1;   // Short-term energy window (fast tracking)
  private slowAlpha = 0.01;  // Long-term energy window (slow tracking)
  private fastEnergy = 0.0;
  private slowEnergy = 0.0;

  public process(samples: Float32Array): { isSpeech: boolean; confidence: number } {
    let energySum = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] ?? 0;
      energySum += sample * sample;
    }
    const currentEnergy = Math.sqrt(energySum / Math.max(1, samples.length));

    // Exponential smoothing tracking
    this.fastEnergy = (this.fastAlpha * currentEnergy) + ((1 - this.fastAlpha) * this.fastEnergy);
    this.slowEnergy = (this.slowAlpha * currentEnergy) + ((1 - this.slowAlpha) * this.slowEnergy);

    // Adapt noise floor
    if (this.fastEnergy < this.noiseFloor) {
      this.noiseFloor = (this.attackRate * this.fastEnergy) + ((1 - this.attackRate) * this.noiseFloor);
    } else {
      this.noiseFloor = (this.decayRate * this.noiseFloor) + ((1 - this.decayRate) * this.fastEnergy);
    }

    // Dynamic threshold assignment
    const dynamicThreshold = this.noiseFloor + this.speechEnergyThreshold;
    const isSpeech = this.fastEnergy > dynamicThreshold;
    
    const confidence = isSpeech 
      ? Math.min(1.0, (this.fastEnergy - dynamicThreshold) / 0.1) 
      : 0.0;

    return { isSpeech, confidence };
  }
}
