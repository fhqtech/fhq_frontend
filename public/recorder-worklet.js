class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferPos = 0;
    this.noiseFloor = 0.01;
    this.P = 1;
    this.Q = 1e-5;
    this.R = 1e-1;
    this.silenceMultiplier = 2.5;
    this.speechMultiplier = 10;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const pcm = input[0];

    let sumSq = 0;
    for (let i = 0; i < pcm.length; i++) {
      sumSq += pcm[i] * pcm[i];
    }
    const rms = Math.sqrt(sumSq / pcm.length);

    const Pp = this.P + this.Q;
    const K = Pp / (Pp + this.R);
    this.noiseFloor = this.noiseFloor + K * (rms - this.noiseFloor);
    this.P = (1 - K) * Pp;

    const silenceThreshold = this.noiseFloor * this.silenceMultiplier;
    const speechThreshold = this.noiseFloor * this.speechMultiplier;

    this.port.postMessage({
      type: "metrics",
      noiseFloor: this.noiseFloor,
      silenceThreshold,
      speechThreshold,
      currentRms: rms,
    });

    this.port.postMessage(pcm.slice());

    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);