import { performanceConfig as config } from '../../config/performanceConfig';

/** Slow, hysteretic pixel-budget changes. Never changes objects, simulation or visibility. */
export class AdaptiveResolution {
  readonly levels: number[];
  private index: number;
  private samples: number[] = [];
  private elapsed = 0;
  private activeTime = 0;
  private sinceChange: number = config.changeCooldown;
  private slow = 0;
  private fast = 0;
  constructor(maxDpr: number) {
    const maximum = Math.max(1, Math.min(1.5, maxDpr));
    this.levels = [...new Set([...config.dprSteps.filter(value => value < maximum), maximum])];
    this.index = this.levels.length - 1;
  }
  get dpr() { return this.levels[this.index]; }
  sample(delta: number, active: boolean): number | null {
    if (!active || !Number.isFinite(delta) || delta <= 0 || delta > 0.25) {
      this.samples.length = 0; this.elapsed = 0; this.activeTime = 0; this.fast = 0; this.slow = 0; return null;
    }
    this.activeTime += delta; this.sinceChange += delta;
    if (this.activeTime < config.startGrace || this.levels.length === 1) return null;
    if (this.samples.length < 240) this.samples.push(delta * 1000);
    this.elapsed += delta;
    if (this.elapsed < config.sampleSeconds) return null;
    this.samples.sort((a, b) => a - b);
    const median = this.samples[Math.floor(this.samples.length / 2)];
    this.samples.length = 0; this.elapsed = 0;
    this.slow = median > config.slowMs ? this.slow + 1 : 0;
    this.fast = median < config.fastMs ? this.fast + 1 : 0;
    if (this.sinceChange < config.changeCooldown) return null;
    const next = this.slow >= config.slowWindows ? Math.max(0, this.index - 1) : this.fast >= config.fastWindows ? Math.min(this.levels.length - 1, this.index + 1) : this.index;
    if (next === this.index) return null;
    this.index = next; this.sinceChange = 0; this.slow = 0; this.fast = 0; return this.dpr;
  }
}
