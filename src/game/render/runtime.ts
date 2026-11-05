import type { KeyboardController } from '../controls/keyboard';
import type { RaceSession } from '../race/RaceSession';
import type { Simulation } from '../core/simulation';
import type { GameMode } from '../core/types';
import type { GamepadController } from '../controls/gamepad';
import type { DrivingAudio } from './DrivingAudio';

export interface GameRuntime {
  simulation: Simulation;
  race: RaceSession;
  /** Development-only browser QA uses normal pursuit inputs, never teleports. */
  demoDriving: boolean;
  mode: GameMode;
  keyboard: KeyboardController | null;
  gamepad: GamepadController | null;
  audio: DrivingAudio;
}

export type KartVisualRuntime = Pick<GameRuntime, 'simulation' | 'mode'>;
