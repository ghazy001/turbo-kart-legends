import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraConfig } from '../config/kartConfig';
import { createKeyboard } from '../controls/keyboard';
import { createKart } from '../core/simulation';
import { moveKart } from '../kart/kartController';
import { sunshineCircuit } from '../tracks/sunshineCircuit';

describe('keyboard steering as seen by the chase camera', () => {
  it.each([
    ['KeyD', 1], ['ArrowRight', 1], ['KeyA', -1], ['ArrowLeft', -1],
  ] as const)('%s moves toward the correct side of the screen', (code, side) => {
    const host = new EventTarget();
    const visibility = Object.assign(new EventTarget(), { hidden: false });
    const keyboard = createKeyboard(host, visibility, {
      enabled: () => true, onReset: () => undefined,
      onPause: () => undefined, onFocusLost: () => undefined,
    });
    host.dispatchEvent(Object.assign(new Event('keydown'), { code, repeat: false }));
    host.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyW', repeat: false }));
    const input = keyboard.sample();
    keyboard.dispose();

    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2, sunshineCircuit.spawn.heading]) {
      const start = { ...createKart(sunshineCircuit), heading, forwardSpeed: 8 };
      const camera = new PerspectiveCamera(cameraConfig.fov, 16 / 9, 0.1, 450);
      camera.position.set(
        start.x - Math.sin(heading) * cameraConfig.distance,
        cameraConfig.height,
        start.z - Math.cos(heading) * cameraConfig.distance,
      );
      camera.lookAt(
        start.x + Math.sin(heading) * cameraConfig.lookAhead,
        cameraConfig.lookHeight,
        start.z + Math.cos(heading) * cameraConfig.lookAhead,
      );
      camera.updateMatrixWorld();
      let kart = start;
      for (let tick = 0; tick < 30; tick++) kart = moveKart(kart, input, 1 / 60);
      const before = new Vector3(start.x, 0, start.z).project(camera);
      const after = new Vector3(kart.x, 0, kart.z).project(camera);
      expect((after.x - before.x) * side).toBeGreaterThan(0.03);
    }
  });
});
