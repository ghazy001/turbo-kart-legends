import { describe, expect, it, vi } from 'vitest';
import { RaceAssetLoading } from '../render/models/RaceAssetLoading';

describe('race grid asset loading', () => {
  it('waits for the player and every CPU assembly, regardless of load order', () => {
    const grid = new RaceAssetLoading(['player', 'breeze', 'nova', 'moss']);
    expect(grid.getSnapshot()).toEqual({ ready: false, settled: 0, total: 4, failed: 0 });
    for (const id of ['moss', 'player', 'breeze']) {
      grid.reporter(id)('ready'); expect(grid.getSnapshot().ready).toBe(false);
    }
    grid.reporter('nova')('ready');
    expect(grid.getSnapshot()).toEqual({ ready: true, settled: 4, total: 4, failed: 0 });
  });
  it('allows an explicit error fallback to settle, but not a pending model', () => {
    const grid = new RaceAssetLoading(['player', 'breeze']);
    grid.reporter('breeze')('error');
    expect(grid.getSnapshot()).toEqual({ ready: false, settled: 1, total: 2, failed: 1 });
    grid.reporter('player')('ready'); expect(grid.getSnapshot().ready).toBe(true);
    grid.reporter('breeze')('loading'); expect(grid.getSnapshot().ready).toBe(false);
    grid.reporter('breeze')('ready'); expect(grid.getSnapshot().failed).toBe(0);
  });
  it('does not wait for CPUs in a solo lineup', () => {
    const grid = new RaceAssetLoading(['player']);
    grid.reporter('player')('ready'); expect(grid.getSnapshot().ready).toBe(true);
    expect(() => grid.reporter('breeze')).toThrow('Unknown race asset slot');
  });
  it('keeps stable reporters/snapshots and cleans up subscriptions', () => {
    const grid = new RaceAssetLoading(['player']), changed = vi.fn();
    const unsubscribe = grid.subscribe(changed), before = grid.getSnapshot();
    grid.reporter('player')('loading'); expect(grid.getSnapshot()).toBe(before);
    expect(grid.reporter('player')).toBe(grid.reporter('player')); expect(changed).not.toHaveBeenCalled();
    grid.reporter('player')('ready'); expect(changed).toHaveBeenCalledTimes(1);
    unsubscribe(); grid.reporter('player')('error'); expect(changed).toHaveBeenCalledTimes(1);
  });
  it('isolates late events from the previous race/selection', () => {
    const previous = new RaceAssetLoading(['player']), next = new RaceAssetLoading(['player']);
    previous.reporter('player')('ready'); expect(next.getSnapshot().ready).toBe(false);
    next.reporter('player')('ready'); previous.reporter('player')('loading');
    expect(next.getSnapshot().ready).toBe(true);
  });
});
