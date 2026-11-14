export type ResultCue = 'finish' | 'victory' | 'personal-best' | 'cup-champion';
/** Original short synthesized motifs: frequency, start offset, note duration. */
export const resultCues: Record<ResultCue, readonly (readonly [number, number, number])[]> = {
  finish: [[330, 0, 0.18], [440, 0.18, 0.34]],
  victory: [[392, 0, 0.18], [494, 0.15, 0.18], [587, 0.3, 0.2], [784, 0.5, 0.5]],
  'personal-best': [[523, 0, 0.15], [659, 0.13, 0.15], [1047, 0.3, 0.55]],
  'cup-champion': [[392, 0, 0.2], [494, 0.17, 0.2], [587, 0.34, 0.2], [784, 0.56, 0.25], [988, 0.8, 0.25], [1175, 1.04, 0.6]],
};
