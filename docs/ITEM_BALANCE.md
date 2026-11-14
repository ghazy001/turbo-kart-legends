# Three-item balance — 2026-11-08

## Delivered behavior

Every pickup now rolls its reward when collected, using the collector's current validated race position. The nine visible boxes, shared collection query, respawn timing and one-slot inventory remain. Quick Race, VS and cup rounds use this system; Time Trial and Free Drive remain item-free.

| Position (four racers) | Spark Bolt | Banana Trap | Bubble Guard |
| --- | ---: | ---: | ---: |
| First | 20% | 25% | 55% |
| Second / third | 45% | 25% | 30% |
| Fourth | 65% | 10% | 25% |

All three items remain possible in every position. This is probabilistic, not a guarantee of a balanced sequence in a small race. Finishers rank ahead of remaining racers; unfinished racers use validated distance with stable ties, matching standings.

Each racer has an independent seeded random stream. Unrelated pickups do not consume the player's rolls. Browser race setup creates a fresh crypto seed outside simulation; the pure subsystem has a deterministic default and accepts an explicit seed. A cup derives each round from its setup seed. Restart replays that race's stream; identical collections/standings reproduce awards. Recovery empties inventory/history without rewinding the reward stream. No RNG is driven by render frames.

## AI and recovery tuning

- AI waits 0.3 simulation seconds after collecting. All consumed items have a 1.1 s inventory cooldown and still require a fresh action edge.
- Spark Bolt decisions sweep the actual straight trajectory against projected moving kart capsules. The first kart and intervening rails matter; a closer immune kart cannot be shot through to hit another. Prediction does not aim or home the projectile.
- Banana Trap decisions predict a pursuer reaching the safe drop point after the existing 0.65 s arming interval. Stationary, out-of-path and too-early pursuers are rejected.
- Bubble Guard retains predictive threat defense. After holding it for three seconds, an AI moving at least 4 m/s can also prepare it within a 24 m pack. This prevents an all-guard opening from locking every inventory indefinitely. Isolated/stationary racers keep it.
- Initial damage retains 55% speed, applies the existing 0.8 s / 12 m/s cap and cancels drift/boost. Item-hit immunity is now 2.2 s, leaving time to accelerate after slowdown.
- A further damaging hit within six seconds retains 75% speed, caps at 14 m/s for 0.45 s and grants 3 s immunity. Only damaging hits refresh this window. Immunity-blocked hits and shield blocks cannot extend it. Shield behavior remains five seconds / one contact.
- The HUD shows item-hit protection independently from inventory and guard time. A pooled gold ground ring follows each protected kart. It has no extra collider, light or shadow.

Core movement, steering, boost/drift formulas, pursuit navigation, target pace, rail/kart shapes, checkpoints, lap/cup rules and camera are unchanged. AI still submits only the existing normalized `useItem` action. Controls remain **E / Shift**, gamepad **X / square**, HUD card or phone **ITEM**. No new protocol or assets are needed.

## Implementation map

- `src/game/config/itemBalance.ts`: weights, AI delays, cooldown and repeated-hit tuning.
- `src/game/items/itemRewards.ts`: weighted selection, independent seed derivation and rolls.
- `src/game/items/itemAI.ts`: straight-shot, trap and defensive prediction.
- `src/game/items/ItemSystem.ts`: collection context, RNG lifecycle, cooldown/hit history and award counters.
- `src/app/createRaceSeed.ts`, `App.tsx`, `RaceSession.ts`, `CupSession.ts`: seed creation/injection only.
- `ItemHUD.tsx`, `ItemVisuals.tsx`, `items.css`: protection countdown and pooled ring.
- `RaceDiagnostics.tsx`: unassigned lane labels and per-item award totals.
- `itemBalance.test.ts`, `itemBalanceRace.test.ts`, `helpers/itemWorld.ts`: deterministic behavior, distribution and full-course regressions; existing combat/guard fixtures now explicitly inject their required reward.

## Verification

Focused balance/guard/full-course run: **31 tests / three files passed**. Existing item/guard focused tests also pass. Weighted-selection tests check exact probability intervals and 10,000 seeded samples for each position band, within two percentage points. They cover rank changes, independent streams/reset replay, first/repeat damage, ignored spam, cooldown, AI reaction/trajectory/arming and pack-defense behavior.

The full-race fixture drives the ordinary waypoint input at a 17 m/s target, submits the normal item action and advances the existing 60 Hz RaceSession for three ordered laps. It checks finish/lap count, rail containment, recovery counts, bounded hazards, damaging-hit spacing and award accounting. These are deterministic simulations, not human playtests.

| Course | Seed | Simulated time | Player place | Recoveries (all four) | Pickups | Bolts / traps / guards used | Hits / blocks | Awards (bolt / trap / guard) |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- | --- |
| Sunshine Circuit | 8241 | 137.133 s | 1 | 0 / 0 / 0 / 0 | 22 | 6 / 3 / 10 | 5 / 1 | 8 / 4 / 10 |
| Sugar Rush Valley | 8242 | 143.700 s | 1 | 0 / 0 / 0 / 0 | 21 | 8 / 2 / 8 | 7 / 0 | 9 / 4 / 8 |

`npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` pass. The build transforms 732 modules and Vite completed in 2.19 s after TypeScript validation. No dependencies or source assets changed in this follow-up.

The first full run passed 296/300 tests, with four CPU timeout failures: one exhaustive GLB audit (15 s), the render-interval race fixture (5 s), and two long CPU-race fixtures (30 s each). No failed gameplay assertions were reported. Their dedicated budgets are now 60 / 15 / 60 s respectively, with every assertion retained. The final normal `npm run test` rerun passed **300/300 tests across 27 files in 151.73 s**, using the existing two-worker script. This includes movement, drift/boost/jump, track/rail/contact bounds, AI navigation/recovery, laps/cup/VS, keyboard/gamepad/phone/relay, combat/shield, asset and menu regressions.

### Browser verification

The existing dev server was stopped at the start of this pass; it was restarted locally at `http://127.0.0.1:5173`. The normal Home → Quick Race → racer → kart → Sugar Rush → review/start flow was used. Development pursuit submits ordinary normalized inputs (rival lane +1.75 m, gentle 14 m/s target), with the normal item action; no positions/progress were injected.

- Three ordered laps completed **2:43.004**, first place, **zero recoveries**; all three opponents were on lap three at the existing player-finish cutoff.
- Lap times: **55.572 / 53.991 / 53.441 s**.
- Counters: **18 pickups, 9 bolts, 4 traps, 3 guards, 13 damaging hits, zero shield blocks**. Awards: **10 bolts / 5 traps / 3 guards**. Damaging hits here are field totals, not player-only.
- The HUD exposed **Item hit protection** with the hit notice during lap two and returned to ready afterward. A later paused recovery independently displayed protection, empty inventory and zero speed; it stayed frozen while paused and the race resumed afterward. Exact damage spacing/blocked spam are covered by deterministic tests.
- Race Again cleared all counters/inventory/progress and returned to countdown. The ordinary `/` Home route was restored afterward, removing QA controls/autodrive.
- Console inspection found no game/render/model errors, only the previously documented upstream `THREE.Clock` deprecation.
- Renderer showed **221 geometries / 35 textures**, compared with 220 / 35 at the shield milestone: one recovery-ring geometry, no new textures or shadow/light sources. The ring adds at most one instanced draw. Sampled frame timings during parallel test work are not a release performance benchmark.

Captures: [live combat](milestone-4/balance/combat-race.png), [lap two](milestone-4/balance/combat-lap-two.png), [results](milestone-4/balance/results.png), [paused recovery](milestone-4/balance/paused-recovery.png). The pause overlay blurs the HUD in its capture; the countdown was verified in the accessibility state. Human handling, audiovisual listening and physical-device checks are not claimed.

## Limits / next work

The six-item roadmap is not complete. These weights are starting balance values; human races must assess frustration, comeback strength, trap visibility and AI effectiveness. Linear prediction ignores future steering and uses a short horizon; it can miss opportunities on curves. Shields can expire unused after anticipatory defense. No physical phone/gamepad checks or cross-device performance guarantee is claimed. Existing supplied local art and credits remain unchanged. Time Trial records/ghosts are a possible later milestone, not implemented here.
