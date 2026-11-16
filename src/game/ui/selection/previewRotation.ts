const fullTurn = Math.PI * 2;

/** Menu-only gesture state. Never touches a gameplay actor or camera. */
export class PreviewRotation {
  private angle = 0;
  private pointer: { id: number; x: number; width: number } | null = null;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.angle;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  begin(id: number, x: number, width: number): boolean {
    if (this.pointer || !Number.isInteger(id) || !Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return false;
    this.pointer = { id, x, width }; return true;
  }
  move(id: number, x: number): void {
    if (!this.pointer || this.pointer.id !== id || !Number.isFinite(x)) return;
    const delta = x - this.pointer.x; this.pointer.x = x;
    this.turn(delta / this.pointer.width * fullTurn);
  }
  end(id: number): void { if (this.pointer?.id === id) this.cancel(); }
  cancel(): void { this.pointer = null; }
  reset(): void { this.cancel(); this.turn(-this.angle); }
  turn(radians: number): void {
    if (!Number.isFinite(radians)) return;
    const next = ((this.angle + radians) % fullTurn + fullTurn) % fullTurn;
    if (next === this.angle) return;
    this.angle = next; this.listeners.forEach(listener => listener());
  }
}
