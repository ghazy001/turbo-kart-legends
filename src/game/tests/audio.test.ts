import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKart } from '../core/simulation';
import { DrivingAudio } from '../render/DrivingAudio';
import { sunshineCircuit } from '../tracks/sunshineCircuit';
import { ItemSystem } from '../items/ItemSystem';
import { NEUTRAL_INPUT } from '../core/types';

function audioHarness() {
  const parameter = () => ({ value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const context = {
    currentTime: 0, sampleRate: 48000, state: 'running', destination: {},
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createBuffer: vi.fn((_channels: number, length: number) => {
      const samples = new Float32Array(length);
      return { length, getChannelData: () => samples };
    }),
    createBufferSource: vi.fn(() => ({ buffer: null, loop: false, playbackRate: parameter(), connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null })),
    createBiquadFilter: vi.fn(() => ({ type: '', frequency: parameter(), Q: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() })),
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
  it('runs prepared background music only in active unmuted gameplay, stopping for result cues', async () => {
    const { audio, context } = audioHarness();
    const offline = {
      destination: {}, createBuffer: context.createBuffer.getMockImplementation()!, createGain: context.createGain.getMockImplementation()!,
      createBufferSource: context.createBufferSource.getMockImplementation()!, createBiquadFilter: context.createBiquadFilter.getMockImplementation()!,
      createOscillator: context.createOscillator.getMockImplementation()!, startRendering: () => Promise.resolve({ duration: 30 }),
    };
    vi.stubGlobal('OfflineAudioContext', vi.fn(function OfflineAudioMock() { return offline; }));
    audio.unlock(); const state = createKart(sunshineCircuit);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    audio.update(state, false); expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    audio.update(state, true); expect(context.createBufferSource).toHaveBeenCalledTimes(3);
    const music = context.createBufferSource.mock.results[2].value;
    audio.setMuted(true); expect(music.stop).toHaveBeenCalled();
    audio.update(state, true); expect(context.createBufferSource).toHaveBeenCalledTimes(3);
    audio.setMuted(false); context.currentTime = 2; audio.update(state, true);
    expect(context.createBufferSource).toHaveBeenCalledTimes(4);
    audio.silence(); audio.celebrate('finish'); audio.update(state, false);
    expect(context.createBufferSource.mock.results[3].value.stop).toHaveBeenCalled();
    expect(context.createOscillator).toHaveBeenCalled();
    audio.dispose();
    for (const voice of context.createBufferSource.mock.results) expect(voice.value.disconnect).toHaveBeenCalledTimes(1);
  });
  it('keeps finish cues audible after driving stops and releases every scheduled voice naturally', () => {
    const { audio, context } = audioHarness(); audio.unlock(); audio.silence();
    audio.celebrate('cup-champion'); audio.update(createKart(sunshineCircuit), false);
    expect(context.createOscillator).toHaveBeenCalledTimes(6);
    expect(context.createOscillator.mock.results[5].value.start).toHaveBeenCalledWith(1.04);
    const output = context.createGain.mock.results.find(result => result.value.gain.value === 0.2)!.value;
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
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    audio.update(state, false);
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
  it('reuses two engine loops and raises revs for actual acceleration, easing off when coasting', () => {
    const { audio, context } = audioHarness(), state = createKart(sunshineCircuit);
    audio.unlock(); audio.unlock();
    expect(context.createBufferSource).toHaveBeenCalledTimes(2); // Two motor layers; no retired drift skid loop.
    const motor = context.createBufferSource.mock.results[0].value;
    const output = context.createBiquadFilter.mock.results[0].value.connect.mock.calls[0][0];
    audio.update(state, true, 0, NEUTRAL_INPUT);
    const idle = motor.playbackRate.setTargetAtTime.mock.lastCall![0];
    context.currentTime = 0.1;
    audio.update({ ...state, forwardSpeed: 15 }, true, 0, { ...NEUTRAL_INPUT, throttle: 1 });
    const accelerating = motor.playbackRate.setTargetAtTime.mock.lastCall![0];
    const loadedGain = output.gain.setTargetAtTime.mock.lastCall[0];
    context.currentTime = 0.2;
    audio.update({ ...state, forwardSpeed: 15 }, true, 0, NEUTRAL_INPUT);
    expect(accelerating).toBeGreaterThan(idle);
    expect(motor.playbackRate.setTargetAtTime.mock.lastCall![0]).toBeLessThan(accelerating);
    expect(output.gain.setTargetAtTime.mock.lastCall[0]).toBeLessThan(loadedGain);
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    audio.dispose();
  });
  it('neutralizes the motor on pause, mute, reset and focus silence; releases loops once on disposal', () => {
    const { audio, context } = audioHarness(), state = createKart(sunshineCircuit);
    audio.unlock();
    const output = context.createBiquadFilter.mock.results[0].value.connect.mock.calls[0][0];
    const silenceActions = [() => audio.update(state, false), () => audio.setMuted(true), () => audio.reset(), () => audio.silence()];
    for (const silence of silenceActions) {
      context.currentTime += 0.1; audio.setMuted(false); audio.update(state, true, 0, { ...NEUTRAL_INPUT, throttle: 1 });
      expect(output.gain.setTargetAtTime.mock.lastCall[0]).toBeGreaterThan(0);
      silence(); expect(output.gain.setTargetAtTime.mock.lastCall[0]).toBe(0);
    }
    audio.dispose(); audio.dispose();
    for (const { value: source } of context.createBufferSource.mock.results) {
      expect(source.stop).toHaveBeenCalledTimes(1); expect(source.disconnect).toHaveBeenCalledTimes(1);
    }
    for (const { value: filter } of context.createBiquadFilter.mock.results) expect(filter.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });
  it('bounds motor automation at high render rates and keeps steady targets unscheduled', () => {
    const { audio, context } = audioHarness(), state = createKart(sunshineCircuit);
    audio.unlock();
    const motor = context.createBufferSource.mock.results[0].value;
    for (let frame = 0; frame < 144; frame++) {
      context.currentTime = frame / 144;
      audio.update({ ...state, forwardSpeed: frame / 8 }, true, 0, { ...NEUTRAL_INPUT, throttle: 1 });
    }
    expect(motor.playbackRate.setTargetAtTime.mock.calls.length).toBeGreaterThan(10);
    expect(motor.playbackRate.setTargetAtTime.mock.calls.length).toBeLessThanOrEqual(31);
    context.currentTime = 2; audio.update(state, true);
    const count = motor.playbackRate.setTargetAtTime.mock.calls.length;
    for (let frame = 0; frame < 144; frame++) { context.currentTime = 3 + frame / 144; audio.update(state, true); }
    expect(motor.playbackRate.setTargetAtTime).toHaveBeenCalledTimes(count);
    audio.dispose();
  });
  it('keeps the motor quiet while the browser audio context is suspended', () => {
    const { audio, context } = audioHarness(), state = createKart(sunshineCircuit);
    audio.unlock(); context.state = 'suspended';
    const output = context.createBiquadFilter.mock.results[0].value.connect.mock.calls[0][0];
    audio.update(state, true, 0, { ...NEUTRAL_INPUT, throttle: 1 });
    expect(output.gain.setTargetAtTime).not.toHaveBeenCalled();
    context.state = 'running'; audio.update(state, true);
    expect(output.gain.setTargetAtTime.mock.lastCall[0]).toBeGreaterThan(0);
    audio.dispose();
  });
});
