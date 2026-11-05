import { loopConfig } from '../config/kartConfig';

export class FixedStepClock {
  private accumulator = 0;
  reset(): void { this.accumulator = 0; }

  advance(delta: number, step: (dt: number) => void): number {
    if (!Number.isFinite(delta) || delta < 0) return this.accumulator / loopConfig.step;
    this.accumulator += Math.min(delta, loopConfig.maxFrame);
    let ticks = 0;
    while (this.accumulator + 1e-10 >= loopConfig.step && ticks < loopConfig.maxSteps) {
      step(loopConfig.step);
      this.accumulator = Math.max(0, this.accumulator - loopConfig.step);
      ticks++;
    }
    if (ticks === loopConfig.maxSteps) this.accumulator %= loopConfig.step;
    return this.accumulator / loopConfig.step;
  }
}
