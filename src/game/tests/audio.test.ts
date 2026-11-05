import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKart } from '../core/simulation';
import { DrivingAudio } from '../render/DrivingAudio';
import { sunshineCircuit } from '../tracks/sunshineCircuit';

function audioHarness() {
  const parameter = () => ({ value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const context = {
    currentTime: 0, sampleRate: 48000, state: 'running', destination: {},
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(32) })),
    createBufferSource: vi.fn(() => ({ buffer: null, loop: false, connect: vi.fn(), start: vi.fn() })),
    createBiquadFilter: vi.fn(() => ({ type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() })),
    createOscillator: vi.fn(() => ({ type: '', frequency: parameter(), connect: vi.fn(),
      disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null })),
    resume: vi.fn(() => Promise.resolve()), close: vi.fn(() => Promise.resolve()),
  };
  const constructor = vi.fn(function AudioContextMock() { return context; });
  vi.stubGlobal('AudioContext', constructor);
  return { context, constructor, audio: new DrivingAudio() };
}
afterEach(() => vi.unstubAllGlobals());

describe('procedural driving audio lifecycle', () => {
  it('creates no audio context until explicitly unlocked by the UI', () => {
    const { audio, constructor } = audioHarness();
    audio.update(createKart(sunshineCircuit), true);
    expect(constructor).not.toHaveBeenCalled();
    audio.unlock(); audio.unlock();
    expect(constructor).toHaveBeenCalledTimes(1);
    audio.dispose();
  });
  it('plays a boost once and does not replay events that occurred while muted', () => {
    const { audio, context } = audioHarness();
    audio.unlock();
    const state = { ...createKart(sunshineCircuit), boostSerial: 1, boostTier: 2 as const, boostRemaining: 1 };
    audio.update(state, true); audio.update(state, true);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    audio.setMuted(true);
    audio.update({ ...state, boostSerial: 2 }, true);
    audio.setMuted(false);
    audio.update({ ...state, boostSerial: 2 }, true);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    audio.dispose();
  });
  it('silences paused output and avoids scheduling gain updates every frame', () => {
    const { audio, context } = audioHarness();
    audio.unlock();
    const state = { ...createKart(sunshineCircuit), driftDirection: 1 as const };
    audio.update(state, true); audio.update(state, true);
    const skid = context.createGain.mock.results[1].value;
    expect(skid.gain.setTargetAtTime).toHaveBeenCalledTimes(1);
    audio.update(state, false);
    expect(skid.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.04);
    const master = context.createGain.mock.results[0].value;
    expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.02);
    audio.dispose(); expect(context.close).toHaveBeenCalledTimes(1);
  });
  it('disconnects one-shot nodes when their envelopes finish', () => {
    const { audio, context } = audioHarness();
    audio.unlock();
    audio.update({ ...createKart(sunshineCircuit), jumpSerial: 1, landingSerial: 1 }, true);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    for (const result of context.createOscillator.mock.results) {
      result.value.onended?.();
      expect(result.value.disconnect).toHaveBeenCalledTimes(1);
    }
    audio.dispose();
  });
});
