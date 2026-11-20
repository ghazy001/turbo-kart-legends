import { raceMusicConfig as config } from '../../config/raceMusicConfig';
import { renderRaceMusic } from './renderRaceMusic';

interface MusicVoice { source: AudioBufferSourceNode; gain: GainNode; startedAt: number; offset: number }

/** One cached music buffer, one playing loop and at most one short retiring fade. */
export class RaceMusic {
  private buffer: AudioBuffer | null = null;
  private active: MusicVoice | null = null;
  private retiring: MusicVoice | null = null;
  private offset = 0;
  private wanted = false;
  private disposed = false;

  constructor(private readonly context: AudioContext, private readonly destination: AudioNode,
    prepare: () => Promise<AudioBuffer | null> = renderRaceMusic) {
    void prepare().then(buffer => {
      if (this.disposed) return;
      this.buffer = buffer; this.startIfReady();
    }).catch(error => console.warn('Background music is unavailable; driving sounds remain available.', error));
  }

  setPlaying(playing: boolean): void {
    if (this.disposed) return;
    this.wanted = playing;
    if (playing) this.startIfReady(); else this.stop();
  }

  private startIfReady(): void {
    if (!this.wanted || this.active || !this.buffer || this.context.state !== 'running') return;
    const now = this.context.currentTime, source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = this.buffer; source.loop = true;
    gain.gain.value = 0; gain.gain.setTargetAtTime(config.volume, now, config.fadeIn);
    source.connect(gain); gain.connect(this.destination);
    this.active = { source, gain, startedAt: now, offset: this.offset };
    source.start(now, this.offset);
  }

  private release(voice: MusicVoice): void {
    voice.source.onended = null; voice.source.disconnect(); voice.gain.disconnect();
    if (this.retiring === voice) this.retiring = null;
  }

  private stop(): void {
    const voice = this.active;
    if (!voice || !this.buffer) return;
    const now = this.context.currentTime;
    this.offset = (voice.offset + Math.max(0, now - voice.startedAt)) % this.buffer.duration;
    this.active = null;
    if (this.retiring) { this.retiring.source.stop(); this.release(this.retiring); }
    this.retiring = voice;
    voice.gain.gain.setTargetAtTime(0, now, config.fadeOut);
    voice.source.onended = () => this.release(voice);
    voice.source.stop(now + config.stopTail);
  }

  reset(): void { this.setPlaying(false); this.offset = 0; }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.wanted = false;
    for (const voice of [this.active, this.retiring]) if (voice) { voice.source.stop(); this.release(voice); }
    this.active = null; this.retiring = null; this.buffer = null;
  }
}
