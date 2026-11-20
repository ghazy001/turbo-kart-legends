import { raceMusicConfig as config } from '../../config/raceMusicConfig';

export type MusicInstrument = 'lead' | 'bass' | 'pad' | 'kick' | 'snare' | 'hat';
export interface MusicNote { instrument: MusicInstrument; time: number; duration: number; midi: number; gain: number }
export const raceMusicDuration = config.bars * config.beatsPerBar * 60 / config.bpm;
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Original sixteen-bar coastal arcade theme. No sampled or transcribed soundtrack.
const chords = [[50, 54, 57], [47, 50, 54], [43, 47, 50], [45, 49, 52]] as const;
const phrases = [
  [74, null, 78, 81, null, 78, 76, 74],
  [78, 81, null, 83, 81, null, 78, 76],
  [79, null, 78, 74, 76, 79, null, 83],
  [81, 76, null, 73, 76, null, 78, 81],
  [86, null, 81, 78, 81, 83, null, 81],
  [83, 81, null, 78, 74, null, 78, 81],
  [79, 83, null, 86, 83, null, 79, 78],
  [76, null, 73, 76, 81, 78, 76, null],
] as const;

export function raceMusicScore(): MusicNote[] {
  const beat = 60 / config.bpm, notes: MusicNote[] = [];
  const add = (instrument: MusicInstrument, time: number, duration: number, midi: number, gain: number) => {
    notes.push({ instrument, time, duration: Math.min(duration, raceMusicDuration - time), midi, gain });
  };
  for (let bar = 0; bar < config.bars; bar++) {
    const start = bar * config.beatsPerBar * beat, chord = chords[bar % chords.length];
    for (const midi of chord) add('pad', start, beat * 3.9, midi + 12, 0.022);
    for (let step = 0; step < 8; step++) {
      const time = start + step * beat / 2, melody = phrases[bar % phrases.length][step];
      if (melody !== null) add('lead', time, beat * (step === 7 ? 0.43 : 0.38), melody, step % 2 ? 0.10 : 0.12);
      add('hat', time, 0.055, 0, step % 2 ? 0.025 : 0.016);
      if (step % 2 === 0) {
        add('kick', time, 0.18, 0, step === 0 ? 0.28 : 0.22);
        add('bass', time + beat * 0.18, beat * 0.62, chord[step === 4 ? 2 : 0] - 12, 0.14);
      }
      if (step === 2 || step === 6) add('snare', time, 0.11, 0, 0.075);
    }
  }
  return notes;
}
