import type { ItemSystem } from '../items/ItemSystem';
import { NEUTRAL_INPUT, type KartInput, type KartState } from '../core/types';
import { resultCues, type ResultCue } from '../config/resultCues';
import { KartEngineSound } from './audio/KartEngineSound';

/** Small original synthesized cues. Nothing downloads and no audio starts before a gesture. */
export class DrivingAudio {
  muted = false;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private skid: GainNode | null = null;
  private skidSource: AudioBufferSourceNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private engine: KartEngineSound | null = null;
  private seenBoost = 0;
  private seenJump = 0;
  private seenLanding = 0;
  private lastItems: ItemSystem | null = null;
  private seenItem = 0;
  private masterTarget = 0;
  private skidTarget = 0;
  private celebrationGain: GainNode | null = null;
  private readonly celebrationVoices = new Set<() => void>();

  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      this.master = context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.28;
      this.masterTarget = this.master.gain.value;
      this.master.connect(context.destination);
      const noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.25), context.sampleRate);
      const data = noise.getChannelData(0);
      let seed = 713;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647 * 2 - 1) * 0.5;
      }
      const source = context.createBufferSource();
      source.buffer = noise; source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 1100; filter.Q.value = 0.7;
      this.skid = context.createGain(); this.skid.gain.value = 0;
      source.connect(filter); filter.connect(this.skid); this.skid.connect(this.master);
      source.start(); this.skidSource = source; this.skidFilter = filter;
      this.engine = new KartEngineSound(context, this.master);
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(error => console.warn('Audio will stay silent until the browser allows playback.', error));
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) { this.engine?.silence(); this.setMaster(0); this.stopCelebration(); }
  }

  reset(): void { this.lastItems = null; this.seenItem = 0; this.seenBoost = 0; this.seenJump = 0; this.seenLanding = 0; this.silence(); }

  silence(): void {
    this.engine?.silence(); this.setSkid(0); this.setMaster(0); this.stopCelebration();
  }

  /** Results have a separate quiet bus: stopped driving audio cannot mute the finish cue. */
  celebrate(cue: ResultCue): void {
    this.stopCelebration();
    const context = this.context;
    if (!context || this.muted || context.state !== 'running') return;
    const output = context.createGain(); output.gain.value = 0.2; output.connect(context.destination);
    this.celebrationGain = output;
    for (const [frequency, delay, duration] of resultCues[cue]) this.tone(frequency, frequency, duration, 0.28, 'triangle', delay, output, true);
  }
  private stopCelebration(): void {
    for (const cancel of [...this.celebrationVoices]) cancel();
    this.celebrationGain?.disconnect(); this.celebrationGain = null;
  }

  update(state: KartState, playing: boolean, ground = 0, input: KartInput = NEUTRAL_INPUT): void {
    const context = this.context;
    if (!context) return;
    if (playing && !this.muted && context.state === 'running') this.engine?.update(state, input);
    else this.engine?.silence();
    this.setMaster(playing && !this.muted ? 0.28 : 0);
    this.setSkid(playing && state.driftDirection !== 0 && state.y <= ground + 0.01 ? 0.12 : 0);
    if (playing && !this.muted && context.state === 'running') {
      if (state.boostSerial > this.seenBoost && state.boostRemaining > 0) {
        const base = 220 + state.boostTier * 90;
        this.tone(base, base * 2, 0.38, 0.3, 'triangle');
        this.tone(base * 1.5, base * 2.5, 0.28, 0.12, 'sine');
      }
      if (state.jumpSerial > this.seenJump) this.tone(150, 280, 0.12, 0.08, 'sine');
      if (state.landingSerial > this.seenLanding) this.tone(95, 45, 0.12, 0.14, 'triangle');
    }
    this.seenBoost = state.boostSerial; this.seenJump = state.jumpSerial; this.seenLanding = state.landingSerial;
  }

  updateItems(items: ItemSystem, playing: boolean): void {
    if (this.lastItems !== items) { this.lastItems = items; this.seenItem = items.eventSerial; return; }
    for (const event of items.events) {
      if (event.id <= this.seenItem || items.time - event.time > 0.2 || !playing || this.muted || this.context?.state !== 'running') continue;
      if (event.source === 'player' && event.kind === 'pickup') this.tone(440, 880, 0.16, 0.16, 'sine');
      if (event.source === 'player' && event.kind === 'guard') this.tone(330, 990, 0.26, 0.12, 'sine');
      if (event.target === 'player' && event.kind === 'guard-break') this.tone(960, 340, 0.18, 0.16, 'triangle');
      if (event.source === 'player' && event.kind === 'guard-expire') this.tone(480, 220, 0.14, 0.07, 'sine');
      if (event.source === 'player' && event.kind === 'drop') this.tone(520, 210, 0.16, 0.14, 'sine');
      if (event.source === 'player' && event.kind === 'fire') this.tone(1100, 260, 0.18, 0.12, 'triangle');
      if (event.kind === 'hit' && (event.source === 'player' || event.target === 'player')) this.tone(170, 65, 0.24, 0.15, 'triangle');
    }
    this.seenItem = items.eventSerial;
  }

  private setMaster(target: number): void {
    if (!this.context || !this.master || target === this.masterTarget) return;
    this.masterTarget = target;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.02);
  }

  private setSkid(target: number): void {
    if (!this.context || !this.skid || target === this.skidTarget) return;
    this.skidTarget = target;
    this.skid.gain.setTargetAtTime(target, this.context.currentTime, 0.04);
  }

  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType, delay = 0, output = this.master, celebration = false): void {
    const context = this.context;
    if (!context || !output) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(volume, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope); envelope.connect(output);
    oscillator.start(now); oscillator.stop(now + duration);
    const cleanup = () => {
      oscillator.onended = null; oscillator.disconnect(); envelope.disconnect();
      if (celebration) {
        this.celebrationVoices.delete(cancel);
        if (!this.celebrationVoices.size && this.celebrationGain === output) { output.disconnect(); this.celebrationGain = null; }
      }
    };
    const cancel = () => { oscillator.stop(); cleanup(); };
    if (celebration) this.celebrationVoices.add(cancel);
    oscillator.onended = cleanup;
  }

  dispose(): void {
    this.stopCelebration();
    this.engine?.dispose(); this.engine = null;
    this.skidSource?.stop(); this.skidSource?.disconnect(); this.skidFilter?.disconnect(); this.skid?.disconnect(); this.master?.disconnect();
    this.skidSource = null; this.skidFilter = null;
    if (this.context) void this.context.close().catch(error => console.warn('Audio cleanup was interrupted.', error));
    this.context = null; this.master = null; this.skid = null; this.masterTarget = 0; this.skidTarget = 0;
  }
}
