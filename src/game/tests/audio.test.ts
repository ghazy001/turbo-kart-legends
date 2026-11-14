import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKart } from '../core/simulation';
import { DrivingAudio } from '../render/DrivingAudio';
import { sunshineCircuit } from '../tracks/sunshineCircuit';
import { ItemSystem } from '../items/ItemSystem';

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
  it('keeps finish cues audible after driving stops and releases every scheduled voice naturally', () => {
    const { audio, context } = audioHarness(); audio.unlock(); audio.silence();
    audio.celebrate('cup-champion'); audio.update(createKart(sunshineCircuit), false);
    expect(context.createOscillator).toHaveBeenCalledTimes(6);
    expect(context.createOscillator.mock.results[5].value.start).toHaveBeenCalledWith(1.04);
    const output = context.createGain.mock.results[2].value;
    expect(output.gain.value).toBe(0.2);
    for (const voice of context.createOscillator.mock.results) voice.value.onended?.();
    expect(output.disconnect).toHaveBeenCalledTimes(1);
    audio.dispose();
    for (const voice of context.createOscillator.mock.results) expect(voice.value.disconnect).toHaveBeenCalledTimes(1);
  });
  it('cancels scheduled celebrations on mute, transition/focus silence and dispose without replay on unmute', () => {
    const { audio, context } = audioHarness();
    audio.celebrate('victory'); expect(context.createOscillator).not.toHaveBeenCalled();
    audio.unlock(); audio.celebrate('victory'); audio.setMuted(true);
    const first = context.createOscillator.mock.results.slice();
    for (const voice of first) { expect(voice.value.stop).toHaveBeenLastCalledWith(); expect(voice.value.disconnect).toHaveBeenCalledTimes(1); }
    audio.setMuted(false); expect(context.createOscillator).toHaveBeenCalledTimes(4);
    audio.celebrate('personal-best'); audio.silence(); audio.celebrate('finish'); audio.dispose();
    for (const voice of context.createOscillator.mock.results) expect(voice.value.disconnect).toHaveBeenCalledTimes(1);
  });
  it('plays each player item event once and discards paused or muted events', () => {
    const { audio, context } = audioHarness(), items = new ItemSystem(sunshineCircuit);
    audio.unlock(); audio.updateItems(items, true);
    const emit = (kind: 'pickup' | 'fire' | 'drop' | 'hit' | 'guard' | 'guard-expire' | 'guard-break') => {
      items.events.push({ id: ++items.eventSerial, kind, time: items.time, x: 0, z: 0, source: 'player', ...(kind === 'guard-break' ? { target: 'player' } : {}) });
    };
    emit('pickup'); audio.updateItems(items, true); audio.updateItems(items, true);
    emit('fire'); audio.updateItems(items, true);
    emit('drop'); audio.updateItems(items, true);
    emit('hit'); audio.updateItems(items, true);
    for (const event of ['guard', 'guard-break', 'guard-expire'] as const) { emit(event); audio.updateItems(items, true); }
    expect(context.createOscillator).toHaveBeenCalledTimes(7);
    emit('fire'); audio.updateItems(items, false); audio.updateItems(items, true);
    audio.setMuted(true); emit('pickup'); audio.updateItems(items, true);
    audio.setMuted(false); audio.updateItems(items, true);
    expect(context.createOscillator).toHaveBeenCalledTimes(7);
    audio.dispose();
  });
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
