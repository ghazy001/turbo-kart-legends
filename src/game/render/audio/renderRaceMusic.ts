import { raceMusicConfig as config } from '../../config/raceMusicConfig';
import { midiFrequency, raceMusicDuration, raceMusicScore } from './raceMusicScore';

/** Native offline rendering happens once, never in the visual/physics frame loop. */
export async function renderRaceMusic(): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === 'undefined') return null;
  const context = new OfflineAudioContext(1, Math.ceil(raceMusicDuration * config.sampleRate), config.sampleRate);
  const noise = context.createBuffer(1, Math.ceil(config.sampleRate * 0.2), config.sampleRate), samples = noise.getChannelData(0);
  let seed = 419;
  for (let i = 0; i < samples.length; i++) { seed = (seed * 16807) % 2147483647; samples[i] = seed / 2147483647 * 2 - 1; }
  for (const note of raceMusicScore()) {
    const envelope = context.createGain(), end = note.time + note.duration;
    envelope.gain.setValueAtTime(0, note.time);
    envelope.gain.linearRampToValueAtTime(note.gain, note.time + (note.instrument === 'pad' ? 0.08 : 0.006));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.002);
    envelope.gain.linearRampToValueAtTime(0, end);
    envelope.connect(context.destination);
    if (note.instrument === 'hat' || note.instrument === 'snare') {
      const source = context.createBufferSource(), filter = context.createBiquadFilter();
      source.buffer = noise;
      filter.type = note.instrument === 'hat' ? 'highpass' : 'bandpass';
      filter.frequency.value = note.instrument === 'hat' ? 6500 : 1800; filter.Q.value = 0.7;
      source.connect(filter); filter.connect(envelope); source.start(note.time); source.stop(end);
    } else {
      const source = context.createOscillator();
      source.type = note.instrument === 'pad' || note.instrument === 'kick' ? 'sine' : 'triangle';
      if (note.instrument === 'kick') {
        source.frequency.setValueAtTime(130, note.time); source.frequency.exponentialRampToValueAtTime(44, end);
      } else source.frequency.value = midiFrequency(note.midi);
      source.connect(envelope); source.start(note.time); source.stop(end);
    }
  }
  return context.startRendering();
}
