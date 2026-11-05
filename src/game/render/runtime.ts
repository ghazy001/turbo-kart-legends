import type { KeyboardController } from '../controls/keyboard';
import type { Simulation } from '../core/simulation';
import type { GameMode } from '../core/types';

export interface GameRuntime {
  simulation: Simulation;
  mode: GameMode;
  keyboard: KeyboardController | null;
}
