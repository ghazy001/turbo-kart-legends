import { engineAudioConfig as config } from '../../config/engineAudioConfig';
import type { KartInput, KartState } from '../../core/types';
import { engineCycleSample, engineSoundTargets } from './engineSound';

/** Two reusable loop voices; audio-clock smoothing keeps pitch independent of render FPS. */
export class KartEngineSound {
  private readonly body: AudioBufferSourceNode;
  private readonly detail: AudioBufferSourceNode;
  private readonly bodyGain: GainNode;
  private readonly detailGain: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly output: GainNode;
  private readonly baseFrequency: number;
  private lastUpdate = -Infinity;
  private frequency = -1;
  private cutoff = -1;
  private gain = 0;
  private disposed = false;

  constructor(private readonly context: AudioContext, destination: AudioNode) {
    const buffer = context.createBuffer(1, config.cycleSamples, context.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = engineCycleSample(i / data.length);
    this.baseFrequency = context.sampleRate / buffer.length;
    this.body = context.createBufferSource(); this.detail = context.createBufferSource();
    this.body.buffer = buffer; this.detail.buffer = buffer; this.body.loop = true; this.detail.loop = true;
    this.bodyGain = context.createGain(); this.bodyGain.gain.value = config.bodyMix;
    this.detailGain = context.createGain(); this.detailGain.gain.value = config.detailMix;
    this.filter = context.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = 0.65;
    this.output = context.createGain(); this.output.gain.value = 0;
    this.body.connect(this.bodyGain); this.detail.connect(this.detailGain);
    this.bodyGain.connect(this.filter); this.detailGain.connect(this.filter); this.filter.connect(this.output); this.output.connect(destination);
    this.body.start(); this.detail.start();
  }

  update(state: KartState, input: KartInput): void {
    const now = this.context.currentTime;
    if (this.disposed || now >= this.lastUpdate && now - this.lastUpdate < 1 / config.updatesPerSecond) return;
    this.lastUpdate = now;
    const target = engineSoundTargets(state, input), frequency = Math.round(target.frequency), cutoff = Math.round(target.cutoff / 20) * 20;
    if (frequency !== this.frequency) {
      this.frequency = frequency;
      this.body.playbackRate.setTargetAtTime(frequency / this.baseFrequency, now, config.pitchDamping);
      this.detail.playbackRate.setTargetAtTime(frequency / this.baseFrequency * config.detailRatio, now, config.pitchDamping);
    }
    if (cutoff !== this.cutoff) { this.cutoff = cutoff; this.filter.frequency.setTargetAtTime(cutoff, now, config.filterDamping); }
    this.setGain(Math.round(target.gain * 1000) / 1000);
  }

  private setGain(gain: number) {
    if (gain === this.gain || this.disposed) return;
    this.gain = gain; this.output.gain.setTargetAtTime(gain, this.context.currentTime, config.volumeDamping);
  }
  silence(): void { this.setGain(0); this.lastUpdate = -Infinity; }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.body.stop(); this.detail.stop();
    this.body.disconnect(); this.detail.disconnect(); this.bodyGain.disconnect(); this.detailGain.disconnect(); this.filter.disconnect(); this.output.disconnect();
  }
}
