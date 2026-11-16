import { describe, expect, it } from 'vitest';
import { PreviewRotation } from '../ui/selection/previewRotation';

describe('racer preview rotation', () => {
  it('follows horizontal pointer distance, with a full surface-width drag turning 360 degrees', () => {
    const rotation = new PreviewRotation();
    expect(rotation.begin(1, 40, 400)).toBe(true);
    rotation.move(1, 140); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI / 2);
    rotation.move(1, 240); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI);
    rotation.move(1, 440); expect(rotation.getSnapshot()).toBeCloseTo(0);
    rotation.move(1, 340); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI * 1.5);
  });
  it('ignores secondary fingers and ends only the captured gesture', () => {
    const rotation = new PreviewRotation(); rotation.begin(2, 0, 200);
    expect(rotation.begin(3, 20, 200)).toBe(false);
    rotation.move(3, 100); rotation.end(3); expect(rotation.getSnapshot()).toBe(0);
    rotation.move(2, 50); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI / 2);
    rotation.end(2); rotation.move(2, 100); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI / 2);
    expect(rotation.begin(3, 100, 200)).toBe(true);
  });
  it('cancels on lifecycle loss and resets without retaining a pressed gesture', () => {
    const rotation = new PreviewRotation(); rotation.begin(1, 0, 300); rotation.move(1, 150);
    rotation.cancel(); rotation.move(1, 200); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI);
    rotation.begin(1, 0, 300); rotation.reset(); rotation.move(1, 150); expect(rotation.getSnapshot()).toBe(0);
    expect(rotation.begin(4, 0, 300)).toBe(true);
  });
  it('supports keyboard increments and multiple turns while bounding the angle', () => {
    const rotation = new PreviewRotation();
    for (let i = 0; i < 24; i++) rotation.turn(Math.PI / 12);
    expect(Math.min(rotation.getSnapshot(), Math.PI * 2 - rotation.getSnapshot())).toBeCloseTo(0);
    rotation.turn(-Math.PI / 2); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI * 1.5);
    rotation.turn(40 * Math.PI); expect(rotation.getSnapshot()).toBeCloseTo(Math.PI * 1.5);
  });
  it('rejects invalid inputs and releases subscriptions without affecting another preview', () => {
    const rotation = new PreviewRotation(), other = new PreviewRotation(); let changes = 0;
    const stop = rotation.subscribe(() => changes++);
    expect(rotation.begin(1, 0, 0)).toBe(false); expect(rotation.begin(1, NaN, 100)).toBe(false);
    rotation.turn(NaN); rotation.turn(Infinity); expect(changes).toBe(0);
    rotation.begin(1, 0, 100); rotation.move(1, NaN); rotation.move(1, 25);
    expect(changes).toBe(1); expect(other.getSnapshot()).toBe(0);
    stop(); rotation.turn(0.2); expect(changes).toBe(1);
  });
});
