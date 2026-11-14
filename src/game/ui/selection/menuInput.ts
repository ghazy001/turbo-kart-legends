import type { PadSnapshot } from '../../controls/gamepad';
import type { GridDirection } from './selectionStore';

export type SelectionCommand = GridDirection | 'confirm' | 'back';
export function keyboardSelectionCommand(code: string): SelectionCommand | undefined {
  return ({ ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down', Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm', Escape: 'back', Backspace: 'back' } as Record<string, SelectionCommand>)[code];
}

/** Separate menu polling never calls the driving adapter or its reset/pause callbacks. */
export class SelectionGamepad {
  private identity = '';
  private armed = false;
  private confirmHeld = false;
  private backHeld = false;
  private direction: GridDirection | undefined;
  private nextRepeat = 0;
  clear() { this.identity = ''; this.armed = false; this.direction = undefined; this.confirmHeld = false; this.backHeld = false; }
  poll(pads: readonly (PadSnapshot | null)[], now: number): SelectionCommand | undefined {
    const pad = pads.find(candidate => candidate?.connected && candidate.mapping === 'standard');
    if (!pad) { this.clear(); return; }
    const identity = `${pad.index}:${pad.id}`;
    if (identity !== this.identity) { this.clear(); this.identity = identity; }
    const down = (index: number) => pad.buttons[index]?.pressed ?? false;
    const x = Number(down(15)) - Number(down(14)) || pad.axes[0] || 0;
    const y = Number(down(13)) - Number(down(12)) || pad.axes[1] || 0;
    const direction = Math.max(Math.abs(x), Math.abs(y)) < 0.55 ? undefined : Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    const confirm = down(0), back = down(1);
    if (!this.armed) { if (!direction && !confirm && !back) this.armed = true; return; }
    const newConfirm = confirm && !this.confirmHeld, newBack = back && !this.backHeld;
    this.confirmHeld = confirm; this.backHeld = back;
    if (newBack) return 'back';
    if (newConfirm) return 'confirm';
    if (direction !== this.direction) {
      this.direction = direction; this.nextRepeat = now + 330;
      return direction;
    }
    if (direction && now >= this.nextRepeat) { this.nextRepeat = now + 125; return direction; }
  }
}
