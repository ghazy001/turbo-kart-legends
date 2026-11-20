import { afterEach, describe, expect, it, vi } from 'vitest';
import { raceMusicConfig } from '../config/raceMusicConfig';
import { RaceMusic } from '../render/audio/RaceMusic';
import { midiFrequency, raceMusicDuration, raceMusicScore } from '../render/audio/raceMusicScore';
import { renderRaceMusic } from '../render/audio/renderRaceMusic';

function harness() {
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const context = {
    currentTime: 0, state: 'running', destination: {},
    createBufferSource: vi.fn(() => ({ buffer: null, loop: false, connect: vi.fn(), disconnect: vi.fn(),
      start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null })),
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createOscillator: vi.fn(() => ({ type: '', frequency: parameter(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    createBiquadFilter: vi.fn(() => ({ type: '', frequency: parameter(), Q: { value: 0 }, connect: vi.fn() })),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
  };
  const buffer = { duration: raceMusicDuration } as AudioBuffer;
  let finish!: (buffer: AudioBuffer | null) => void;
  const prepare = vi.fn(() => new Promise<AudioBuffer | null>(resolve => { finish = resolve; }));
  const music = new RaceMusic(context as unknown as AudioContext, context.destination as AudioNode, prepare);
  return { context, buffer, prepare, music, ready: async () => { finish(buffer); await Promise.resolve(); } };
}
afterEach(() => vi.unstubAllGlobals());

describe('original race soundtrack', () => {
  it('has bounded, deterministic, complete notes and rests inside a sixteen-bar loop', () => {
    const notes = raceMusicScore();
    expect(notes).toEqual(raceMusicScore());
    expect(new Set(notes.map(note => note.instrument)).size).toBe(6);
    expect(notes.length).toBeLessThan(500);
    expect(notes.every(note => note.time >= 0 && note.duration > 0.01 && note.time + note.duration <= raceMusicDuration + 1e-9 && note.gain > 0 && note.gain < 0.3)).toBe(true);
    expect(notes.filter(note => note.instrument === 'lead').length).toBeLessThan(raceMusicConfig.bars * 8);
    expect(raceMusicDuration).toBeGreaterThan(25);
    expect(midiFrequency(69)).toBe(440);
  });
  it('renders once through native offline audio with silent envelope ends and no network assets', async () => {
    const { context, buffer, music } = harness(); music.dispose();
    const startRendering = vi.fn(() => Promise.resolve(buffer));
    const constructor = vi.fn(function OfflineAudioMock() { return { ...context, startRendering }; });
    vi.stubGlobal('OfflineAudioContext', constructor);
    expect(await renderRaceMusic()).toBe(buffer);
    expect(constructor).toHaveBeenCalledWith(1, Math.ceil(raceMusicDuration * raceMusicConfig.sampleRate), raceMusicConfig.sampleRate);
    expect(startRendering).toHaveBeenCalledTimes(1);
    expect(context.createGain).toHaveBeenCalledTimes(raceMusicScore().length);
    for (const { value: envelope } of context.createGain.mock.results) {
      expect(envelope.gain.setValueAtTime.mock.calls[0][0]).toBe(0);
      expect(envelope.gain.linearRampToValueAtTime.mock.lastCall![0]).toBe(0);
    }
    for (const { value: source } of [...context.createOscillator.mock.results, ...context.createBufferSource.mock.results]) {
      expect(source.start).toHaveBeenCalledTimes(1); expect(source.stop).toHaveBeenCalledTimes(1);
    }
  });
  it('gracefully omits music where native offline audio is unavailable', async () => {
    vi.stubGlobal('OfflineAudioContext', undefined);
    expect(await renderRaceMusic()).toBeNull();
  });
  it('prepares without autoplay and keeps one loop for arbitrarily many playing frames', async () => {
    const { context, prepare, music, ready } = harness();
    await ready(); expect(context.createBufferSource).not.toHaveBeenCalled();
    for (let i = 0; i < 300; i++) music.setPlaying(true);
    expect(prepare).toHaveBeenCalledTimes(1); expect(context.createBufferSource).toHaveBeenCalledTimes(1);
    const source = context.createBufferSource.mock.results[0].value;
    expect(source.loop).toBe(true); expect(source.start).toHaveBeenCalledWith(0, 0);
    music.dispose();
  });
  it('does not play a late rendered buffer after pause or disposal', async () => {
    for (const dispose of [false, true]) {
      const { context, music, ready } = harness();
      music.setPlaying(true);
      if (dispose) music.dispose(); else music.setPlaying(false);
      await ready(); expect(context.createBufferSource).not.toHaveBeenCalled();
      music.dispose();
    }
  });
  it('starts after asynchronous preparation when gameplay is still active', async () => {
    const { context, music, ready } = harness();
    music.setPlaying(true); expect(context.createBufferSource).not.toHaveBeenCalled();
    await ready(); expect(context.createBufferSource).toHaveBeenCalledTimes(1); music.dispose();
  });
  it('resumes at the paused musical position, wrapping across the loop', async () => {
    const { context, music, ready } = harness(); await ready();
    music.setPlaying(true); context.currentTime = raceMusicDuration + 2; music.setPlaying(false);
    context.currentTime += 10; music.setPlaying(true);
    expect(context.createBufferSource.mock.results[1].value.start).toHaveBeenCalledWith(context.currentTime, 2);
    music.dispose();
  });
  it('resets to the opening without re-rendering and suppresses suspended-context playback', async () => {
    const { context, music, prepare, ready } = harness(); await ready();
    context.state = 'suspended'; music.setPlaying(true); expect(context.createBufferSource).not.toHaveBeenCalled();
    context.state = 'running'; music.setPlaying(true); context.currentTime = 3; music.reset();
    music.setPlaying(true); expect(context.createBufferSource.mock.results[1].value.start).toHaveBeenCalledWith(3, 0);
    expect(prepare).toHaveBeenCalledTimes(1); music.dispose();
  });
  it('bounds retiring fades and disconnects every voice on disposal', async () => {
    const { context, music, ready } = harness(); await ready();
    for (let i = 0; i < 20; i++) { music.setPlaying(true); context.currentTime += 0.001; music.setPlaying(false); }
    const voices = context.createBufferSource.mock.results;
    expect(voices.filter(voice => !voice.value.disconnect.mock.calls.length)).toHaveLength(1);
    voices.at(-1)!.value.onended?.();
    music.dispose(); music.dispose();
    for (const voice of voices) expect(voice.value.disconnect).toHaveBeenCalledTimes(1);
    for (const gain of context.createGain.mock.results) expect(gain.value.disconnect).toHaveBeenCalledTimes(1);
  });
});
