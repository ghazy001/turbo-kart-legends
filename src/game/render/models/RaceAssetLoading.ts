export type AssetStatus = 'loading' | 'ready' | 'error';
export type AssetStatusReporter = (status: AssetStatus) => void;
export interface RaceAssetSnapshot { ready: boolean; settled: number; total: number; failed: number }
export const itemVisualSlots = (enabled: boolean): string[] => enabled ? ['items:pickup', 'items:spark-bolt', 'items:banana-trap'] : [];

/** Per-lineup loading barrier. Errors settle through the existing visual fallback. */
export class RaceAssetLoading {
  private statuses = new Map<string, AssetStatus>();
  private reporters = new Map<string, AssetStatusReporter>();
  private listeners = new Set<() => void>();
  private snapshot: RaceAssetSnapshot;

  constructor(ids: readonly string[]) {
    for (const id of ids) {
      this.statuses.set(id, 'loading');
      this.reporters.set(id, status => {
        if (this.statuses.get(id) === status) return;
        this.statuses.set(id, status);
        const values = [...this.statuses.values()];
        const settled = values.filter(value => value !== 'loading').length;
        this.snapshot = { ready: settled === values.length, settled, total: values.length, failed: values.filter(value => value === 'error').length };
        this.listeners.forEach(listener => listener());
      });
    }
    this.snapshot = { ready: ids.length === 0, settled: 0, total: this.statuses.size, failed: 0 };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  reporter = (id: string): AssetStatusReporter => {
    const report = this.reporters.get(id);
    if (!report) throw new Error(`Unknown race asset slot: ${id}`);
    return report;
  };
}
