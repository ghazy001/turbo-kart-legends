/** Reproducible, item-free solo lap measurements through the real 60 Hz controller. */
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  configFile: false, root, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
});
try {
  const { trackCatalog } = await server.ssrLoadModule('/src/game/tracks/trackCatalog.ts');
  const { Simulation } = await server.ssrLoadModule('/src/game/core/simulation.ts');
  const { waypointInput, createAIDriverState } = await server.ssrLoadModule('/src/game/ai/waypointController.ts');
  const { aiProfiles } = await server.ssrLoadModule('/src/game/config/raceConfig.ts');
  const { kartConfig } = await server.ssrLoadModule('/src/game/config/kartConfig.ts');
  const { createRaceProgress, advanceRaceProgress } = await server.ssrLoadModule('/src/game/race/raceProgress.ts');
  const { createCheckpoints } = await server.ssrLoadModule('/src/game/race/trackProgress.ts');
  const { nearestRoadPoint } = await server.ssrLoadModule('/src/game/tracks/trackSampling.ts');
  const { aiDifficulties } = await server.ssrLoadModule('/src/game/config/raceOptions.ts');
  const requested = process.argv[2];
  const difficulties = aiDifficulties.filter(d => !requested || d.id === requested);
  if (!difficulties.length) throw new Error('Expected easy, normal or hard.');
  const output = [];
  for (const course of trackCatalog) for (const difficulty of difficulties) for (const source of aiProfiles) {
    const profile = { ...source, targetSpeed: Math.min(kartConfig.maxForwardSpeed, source.targetSpeed + difficulty.speedOffset) };
    const context = { brain: createAIDriverState(), difficulty: difficulty.id, dt: 1 / 60 };
    const sim = new Simulation(course.track);
    const progress = createRaceProgress(-(course.track.definition.startDistance ?? 0));
    const gates = createCheckpoints(course.track);
    let maxSpeed = 0, scrapes = 0;
    for (let tick = 0; tick < 15000 && progress.finishTime === null; tick++) {
      sim.step(1 / 60, waypointInput(sim.current, course.track, profile, [], 0, context));
      advanceRaceProgress(progress, sim.previous, sim.current, (tick + 1) / 60, 1 / 60, course.track, gates, 1);
      maxSpeed = Math.max(maxSpeed, sim.current.forwardSpeed);
      // Conservative near-edge ticks, not a claim of physical rail contact.
      if (nearestRoadPoint(course.track, sim.current).distance > 3.5) scrapes++;
    }
    output.push({ track: course.id, difficulty: difficulty.id, racer: profile.id, time: progress.finishTime,
      maxSpeed, scrapes, boosts: sim.current.boostSerial, jumps: sim.current.jumpSerial });
  }
  writeFileSync(`${root}/docs/ai-qa/${requested ?? 'all'}-pace.json`, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
  if (output.some(lap => lap.time === null)) process.exitCode = 1;
} finally { await server.close(); }
