import type { KartState } from '../core/types';

/** Small original synthesized cues. Nothing downloads and no audio starts before a gesture. */
export class DrivingAudio {
  muted = false;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private skid: GainNode | null = null;
  private seenBoost = 0;
  private seenJump = 0;
  private seenLanding = 0;
  private masterTarget = 0;
  private skidTarget = 0;

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
      source.start();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(error => console.warn('Audio will stay silent until the browser allows playback.', error));
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.setMaster(0);
  }

  reset(): void { this.seenBoost = 0; this.seenJump = 0; this.seenLanding = 0; this.silence(); }

  silence(): void {
    this.setSkid(0); this.setMaster(0);
  }

  update(state: KartState, playing: boolean): void {
    const context = this.context;
    if (!context) return;
    this.setMaster(playing && !this.muted ? 0.28 : 0);
    this.setSkid(playing && state.driftDirection !== 0 && state.y === 0 ? 0.12 : 0);
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

  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType): void {
    const context = this.context;
    if (!context || !this.master) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(volume, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope); envelope.connect(this.master);
    oscillator.start(now); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  dispose(): void {
    if (this.context) void this.context.close().catch(error => console.warn('Audio cleanup was interrupted.', error));
    this.context = null; this.master = null; this.skid = null; this.masterTarget = 0; this.skidTarget = 0;
  }
}
