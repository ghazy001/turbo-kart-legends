import type { ActionInput } from '../controls/actionInput';
import type { RemoteHost } from '../../phone/RemoteHost';
import type { VisualSelection } from '../config/visualAssets';
import type { KeyboardController } from '../controls/keyboard';
import type { RaceSession } from '../race/RaceSession';
import type { Simulation } from '../core/simulation';
import type { GameMode } from '../core/types';
import type { GamepadController } from '../controls/gamepad';
import type { DrivingAudio } from './DrivingAudio';
import type { TrialRecords } from '../timeTrial/TrialRecords';

export interface GameRuntime {
  records: TrialRecords;
  trialGhostVisible: boolean;
  simulation: Simulation;
  selection: VisualSelection;
  race: RaceSession;
  /** Development-only browser QA uses normal pursuit inputs, never teleports. */
  demoDriving: boolean;
  /** Development-only pursuit line for collision QA; never changes simulation state directly. */
  demoLane?: number;
  demoItems?: boolean;
  demoSpeed?: number;
  mode: GameMode;
  uiInput: ActionInput;
  keyboard: KeyboardController | null;
  gamepad: GamepadController | null;
  phone: RemoteHost;
  audio: DrivingAudio;
}

export type KartVisualRuntime = Pick<GameRuntime, 'simulation' | 'mode'>;
