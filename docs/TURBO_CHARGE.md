# Turbo Charge — 2026-11-14

## Behavior

Turbo Charge is the fourth pickup in Quick Race, VS and every Sunshine Cup round. Time Trial and Free Drive remain item-free. It uses the existing one-slot inventory and **E / Shift**, gamepad **X / square**, HUD button or phone **ITEM** action. No input protocol changes are needed.

Drive forward at least 4 m/s, release the brake and wait until any active boost or item slowdown ends. A fresh action consumes the charge and grants the existing Flare tier: **1.5 seconds**, **28 m/s ceiling**, original **19 m/s² acceleration** before drag. Keep accelerating to gain speed; activation does not instantly set speed or teleport the kart. These are the existing Flare values, referenced from `boostTiers`, not new handling tuning.

- Activation ends charging drift without a drift payout. It never replaces or adds time to an already active boost.
- A rejected press retains inventory, then requires release and a fresh press to retry. Inventory cooldown stays 1.1 seconds.
- Braking, solid wall/opponent contacts and damaging items retain their original boost cancellation. Bubble Guard preserves Turbo Charge when it absorbs its one item hit. Immunity also retains its existing behavior.
- The orange HUD icon/meter shows the active charge independently of inventory and shield time. Its 10 Hz countdown observes the existing boost and ends after cancellation. Standard Flare exhaust effects and synthesized boost cues are reused, including mute/pause cleanup.
- Pause freezes both clocks and disarms input. Recovery clears the inventory/countdown and resets the kart's boost through the existing recovery path. Restart clears counters/effects. Finish clears the countdown and existing results handling freezes the race.

## Four-item rewards

Every item remains possible at every position. These starting weights supersede the historical table in `ITEM_BALANCE.md`.

| Position | Spark Bolt | Banana Trap | Bubble Guard | Turbo Charge |
| --- | ---: | ---: | ---: | ---: |
| First | 15% | 25% | 50% | 10% |
| Second / third | 35% | 20% | 25% | 20% |
| Fourth | 40% | 10% | 20% | 30% |

Validated standings, per-racer seeded streams, reset/restart semantics and repeated-hit recovery are unchanged. Changing the reward table changes seeded reward sequences relative to the previous build; it does not alter stored Time Trial records or cosmetic selections.

## AI and ownership

AI uses the same item action after the existing 0.3-second reaction delay. Turbo timing rejects stationary/reversing racers, an active boost, drift, airborne poses and sharp steering/yaw. A conservative 0.75-second straight projection at the existing boost ceiling must clear the shared rail envelope and projected kart traffic. The final activation also checks brake/slowdown. This only decides item timing: waypoint steering, pace, navigation, catch-up and collision response remain unchanged. It can hold a charge through bends or traffic instead of wasting it.

`ItemSystem` grants an existing ability and owns inventory/events/counters. `turboCharge.ts` provides pure eligibility/grant helpers. Kart movement/drift still owns speed integration, expiry and cancellation. `ItemSlot.turboRemaining` is presentation bookkeeping, never a second boost controller. No new geometry/material pools, textures, light sources, GLBs or dependencies were added. Existing effects already render every racer.

## Files

- `config/itemConfig.ts`, `config/itemBalance.ts`: definition, activation tuning, four-item weights and AI projection bounds.
- `items/turboCharge.ts`, `items/ItemSystem.ts`, `items/itemAI.ts`: existing-boost grant, inventory/timers, AI timing and counters.
- `ui/ItemHUD.tsx`, `styles/items.css`, `ui/PauseMenu.tsx`: original vector icon, countdown, activation hints and help.
- `dev/RaceDiagnostics.tsx`, `dev/itemPreview.ts`, `app/App.tsx`: turbo use/reward counters and a labeled development-only fixed-reward fixture injected through existing ItemSystemOptions. The fixture changes pickup rewards for Quick / VS only; normal collection, movement and action ownership remain.
- `tests/turboCharge.test.ts`: ten behavioral tests plus preview configuration validation; existing reward, item reset and full-race fixtures include the fourth item/counter.
- Root design/architecture/roadmap/README and `AGENTS.md`: scope, controls, integration and limits. Historical three-item balance notes link to this update.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- Focused item/guard/balance run: **74 tests / four files passed**.
- Initial full run: **381 tests / 32 files passed**, 276.76 seconds with the existing two-worker script. Adding the development-preview validation brought the suite to 382 tests. Its next run passed 377 but hit five wall-clock timeouts in four files, including unchanged track/timing fixtures; no gameplay assertions failed. Final verification with `/usr/bin/caffeinate -i npm run test`: **382 / 382 tests across 32 files passed in 139.95 seconds**. This uses the same npm test script/two workers with process-scoped idle-sleep prevention, keeping all assertions and timeout budgets unchanged. Phone-relay fixtures require local loopback permission.
- `npm run build`: passed; 758 modules, Vite 2.58 seconds after TypeScript validation. App chunk 228.89 kB / 73.21 kB gzip. No new runtime dependency.
- `git diff --check`: passed.

New tests cover fresh-edge consumption, existing Flare acceleration/cap/expiry, stopped/reverse/brake/slowdown rejection, no stacking/double drift payout, brake/rail/item cancellation, shield compatibility, pause/disarming/recovery/restart/finish, 30/60/144 Hz consistency and AI clear-road/traffic/turn/boost checks. Existing suites retain four-course full three-lap combat with rail containment/recovery checks, lap/cup/VS rules, Time Trial eligibility/ghosts, driving/drift/jump, input/phone, assets and menus.

### Browser regression

An isolated in-app-browser tab used normal Home → Quick Race → Racer → Kart → Track → review/start navigation with Arnold / Boat Kart on Volcano Sprint. Development autopilot submitted normal normalized movement and item actions, without injecting poses, progress or rewards.

- Finished three ordered laps **2:31.451**, first of four, **zero player recoveries**. Laps: **51.638 / 49.683 / 50.130 seconds**. All three rivals were on lap three at the existing player-finish cutoff.
- Field totals: **19 pickups, 9 bolts, 1 trap, 3 guards, 4 Turbo Charges, 6 damaging hits, 0 shield blocks**. Awards: **9 / 3 / 3 / 4**. The player's held bolt was also fired through the HUD, using the existing shared action path.
- Browser error log: none. One existing upstream `THREE.Clock` deprecation warning remains.
- A moving sample reported 166 calls / 517,811 triangles / 203 geometries / 35 textures, median 16.6 ms / p95 21.7 ms on this host. This is a local sample, not a cross-device performance guarantee; Turbo Charge adds no render batches or assets.
- Capture: [validated race results](turbo-charge-qa/volcano-results.png).

A separate, clearly labeled development fixture used `/?race-preview&item-preview&item-reward=turbo-charge&render-stats` to check the short player activation reproducibly. It overrides only collected rewards in Quick / VS through the existing options seam, is ignored without both preview flags, validates exact registered IDs, and is disabled in production. Normal weighted races above did not use the override; Cup and item-free modes remain unchanged. The production JavaScript contains neither the fixture query key nor its diagnostic label.

The player collected a real box, then clicked **Activate Turbo Charge**. Its inventory emptied, the orange **1.5 s** countdown appeared, and the existing Flare exhausts/status were visible: [active Turbo Charge](turbo-charge-qa/active-turbo.png). A second activation was paused with Escape at **1.4 s** remaining; the normal pause overlay appeared while the timer/race clock stayed frozen. No inventory, poses or checkpoints were injected.

## Remaining work

The broader six-item set is not complete. Human driving/combat balance, perceptual audio checks, physical phone/gamepad use and cross-browser/device performance still need manual testing. AI's short linear projection does not predict every future steering decision, so ordinary collisions and their normal cancellation remain possible. Supplied local art and its recorded provenance are unchanged; original public-release art remains separate work.
