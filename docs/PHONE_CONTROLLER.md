# Wireless phone controller — Milestone 3.6

The phone is an input device for one player, not a multiplayer race client. The same-origin Socket.IO relay runs inside Vite for local development/preview, or the dedicated production Node server for the subsequent Railway deployment preparation below. All movement, physics, drift, boost, AI, checkpoint, camera and race rules stay in the desktop game. No account, database, multiplayer game-state synchronization or new item system is introduced.

## Quick setup on the same Wi-Fi

Use Node 20.19+ (20.x), or Node 22.13+, and npm. The computer and phone must reach one another on the same trusted Wi-Fi; guest networks/AP isolation, VPN routing and firewalls can prevent local connections.

```sh
npm install
npm run phone:cert
# Trust the generated public CA on your computer and phone as described below.
npm run dev:phone
```

Stop the normal port-5173 dev server first. Alternatively, choose another port:

```sh
npm run dev:phone -- --port 5175
```

1. Open the printed **HTTPS Network URL** on the computer, e.g. `https://192.168.1.42:5173/` (use your actual address).
2. Click **Connect Phone**. Pick the Wi-Fi interface address, not a VM/VPN/loopback address. A QR token lasts **two minutes** and pairs exactly one phone.
3. Scan the QR with the phone camera. Open it in **Safari on iPhone** or **Chrome on Android**, not an embedded QR/social-app browser. Certificate trust must already be configured; do not bypass certificate warnings.
4. Wait for **CONNECTED**. Close the PC panel, select a mode and Play/resume on the computer. Release all phone buttons and center steering to arm.
5. Hold GO, drag the steering pad left/right, hold BRAKE to stop/reverse, and hold DRIFT while steering at speed; release DRIFT for the existing charged turbo. Two or more fingers work together. Pause/Resume uses the existing pause action; the phone cannot start a menu race or manipulate lap state.
6. **Disconnect phone** on the PC revokes the session. A lost/stale phone neutralizes controls and pauses an active game; keyboard and gamepad remain usable after explicit resume.

Normal `npm run dev` stays bound to loopback and offers a **computer-only test QR**. It works between tabs for UI/relay checks, but a phone cannot reach the computer through `localhost` or `127.0.0.1`. Use `dev:phone` for real Wi-Fi access and motion sensors.

## Local HTTPS certificates and device trust

`phone:cert` uses an installed OpenSSL executable to generate files under ignored `.certs/`:

- `turbo-kart-ca.pem`: public local-development CA certificate, valid for one year.
- `turbo-kart-ca-key.pem`: private signing key. **Never transfer or publish it.**
- `localhost.pem` and `localhost-key.pem`: 30-day server certificate and private key, with localhost, machine hostname and current IPv4 LAN interfaces in its subject alternative names.

The script only writes local files. It does **not** install certificates, change system/browser trust, disable TLS verification or open firewall rules. Private keys are mode 0600; the directory is ignored by Git and explicitly denied by the Vite file server. The CA is reused so renewing the server certificate does not require installing a new CA.

Transfer only **`turbo-kart-ca.pem`** to your test phone using your own trusted file transfer (for example AirDrop or USB). Trust installation is an explicit manual device action:

- **macOS:** open the public CA in Keychain Access, add it to the desired keychain and explicitly trust it for SSL on your own development computer. Browsers may need restarting. Other desktop platforms use their OS/browser certificate store.
- **iPhone/iPad:** install the downloaded CA profile in Settings (General → VPN & Device Management), then enable full trust for that CA under General → About → Certificate Trust Settings. Exact labels vary with OS version and device management policies. See [Apple’s certificate trust instructions](https://support.apple.com/en-gb/102390).
- **Android:** install the CA through Settings → Security/Privacy → Encryption & credentials / Install a certificate → CA certificate (labels vary). Managed devices may prohibit user CAs, and browser/WebView trust policies differ. Use Chrome and verify a warning-free HTTPS connection before enabling motion. [Google’s certificate management guide](https://support.google.com/pixelphone/answer/2844832?hl=en) describes this settings area; the CA-trust option and browser policy depend on the device.

A local CA can issue trusted certificates, so keep its private key on your computer, use it only for development, and remove the CA/profile from test devices when no longer needed. Do not commit `.certs/` or copy private keys into `public/`. The game does not distribute or install a CA automatically.

If Wi-Fi addresses change or a server certificate expires, rerun `npm run phone:cert`; additional hostnames/IPs can be supplied as positional arguments. For certificates from another trusted tool/CA, set `TKL_TLS_CERT` and `TKL_TLS_KEY` to their paths before starting `dev:phone`. Certificates must cover the exact LAN hostname/IP used by the phone.

For the built application with the same relay:

```sh
npm run build
npm run preview:phone
# Or: npm run preview:phone -- --port 4175
```

`npm run preview` also supports loopback pairing. A plain static file host serving `dist/` does **not** provide the relay. Use Node/Vite preview for local checks, or the later production entry and Railway setup below. TURN, peer-to-peer NAT traversal and authoritative multiplayer remain outside scope.

## Tilt steering

Touch mode is the default and remains available. On the phone:

1. Rotate to landscape and hold the phone in a comfortable driving position.
2. Tap **Tilt**. On browsers that require it, the button directly invokes `DeviceOrientationEvent.requestPermission()` from that user gesture. No permission request occurs on page load.
3. Allow motion if desired, wait for readings, then tap **Calibrate to drive**. If permission is denied or no readings arrive, use Touch. **Recalibrate** updates the neutral angle afterward.
4. Tilt relative to the calibrated neutral. Sensitivity is expressed as the angle required for full steering lock (default 25°); smaller angles feel stronger. Tune the dead zone (default 6%), smoothing time (default 80 ms), and inversion in the settings section.
5. Recalibrate after changing screen orientation or grip. Orientation changes clear inputs and invalidate calibration. Missing/stale sensor readings inhibit tilt driving; they do not leave a previous steering/throttle value active.

The adapter projects beta/gamma gravity readings onto the displayed screen axis and normalizes them to −1…1. Both landscape orientations and steering inversion are unit-tested. These math tests do not replace physical-device direction testing; use inversion if a device/browser convention differs. Compass/absolute orientation is not requested.

Motion APIs require an appropriate secure context and browser permission/support. See [MDN's permission requirements](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static) and [orientation event behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/deviceorientation_event). Screen rotation/fullscreen locking is not required or forced. Older Safari versions, embedded browsers, desktop sensors, restrictive OS settings and managed devices may expose no useful sensor events.

## Transport and safety behavior

- Socket.IO 4.8.4, same-origin WebSocket path `/phone-socket`, using TLS/WSS in phone development mode. No wildcard CORS or public relay.
- Cryptographically random 192-bit, single-use pairing tokens; hashes stored only in relay memory, expiration checked server-side. QR secrets live in URL fragments, are stripped from the phone URL after load and are not sent as HTTP page queries/referrers.
- One active phone per desktop session. Reconnection uses a different random secret, rotated on successful rejoin, with a **30-second** disconnected grace window and **8-hour** absolute session limit. The phone uses sessionStorage where available; storage denial permits memory-only reconnect. Closing/reloading the PC or restarting the relay requires a new QR.
- Validated protocol version, boolean actions, finite normalized values, increasing sequence numbers, bounded payloads (2 KiB), packet/event rate limit (90/s), session/connection limits and same-origin/known-host checks. An unpaired client cannot send input or pause another game.
- The phone sends the latest **normalized state at 30 Hz** (selectable 20/30/45/60 Hz), never raw sensor events. Volatile input packets avoid reconnect replay queues. Pause is a separate rate-limited action.
- Independent **350 ms** receipt-time watchdogs on the relay and desktop. Disconnect, hidden/inactive phone, missing tilt samples, window blur or tab suspension release controls. The desktop pauses before another driving tick and requires neutral after pairing, pause, reset and recovery. No phone/computer clock synchronization is assumed.
- Keyboard steering has priority over gamepad, then phone. Throttle/brake/drift combine through the existing normalized input path; brake retains the controller's original precedence. The core controller formulas are untouched.
- PC focus-loss pause remains in force: keep the game tab visible/focused. Switching between controller and game tabs on the same computer is a UI test, not a substitute for two-device operation.
- Closing the PC pairing dialog keeps a valid controller paired. Closing the phone, PC disconnect/revoke or expired credentials cannot leave acceleration stuck. A network reconnect never resumes a paused race automatically; resume explicitly and release controls.
- Sockets, relay maintenance timers, transmit/ping timers, pointer holds, visibility/orientation listeners and sensor listeners clean up on their lifecycle boundaries. Vite shutdown/restart disposes the relay.

Transport configuration follows the primary [Socket.IO server options](https://socket.io/docs/v4/server-options/) and [client options](https://socket.io/docs/v4/client-options/). Development TLS alone is not production deployment; the later Railway section adds explicit public-origin handling and a separate production server.

## Verification and remaining device work

Automated tests cover normalized validation, neutral arming, stale/hidden/disconnect safety, reordered packets, keyboard priority, multi-pointer holds/cancellation, both landscape steering signs, calibration, sensitivity, inversion and delta-aware smoothing. Real loopback Socket.IO tests cover origin rejection, single-use pairing, unauthorized/invalid input, sequence filtering, host acknowledgements, resume-secret rotation/grace expiry, token expiry/revocation, stale streams and excessive senders. Existing M1–M3/3.5 tests remain intact.

**Quality gates:** `npm install`, `npm run typecheck`, `npm run lint`, `npm run test` (**122 tests / 14 files**) and `npm run build` passed. The existing simulation/kart/drift/jump/race/AI/tuning/camera source hashes remain unchanged. New dependency installation reported zero vulnerabilities.

Browser checks verified PC QR creation, actual mobile page pairing, a 1–2 ms local end-to-end RTT display, browser reload/rejoin using the session credential, and the real game's response to normalized remote throttle packets. Disconnect brought up the existing pause dialog. A subsequent keyboard-only browser check reached 42 km/h with the phone disconnected, then Escape paused normally. These are local automated clients/browser checks, not physical phone/Wi-Fi measurements.

An HTTPS/WSS smoke run with the generated CA and certificate verification enabled returned HTTP 200 for the controller route, paired successfully and relayed 88 frames. Four local encrypted relay acknowledgements measured **1.92 ms median / 5.27 ms maximum**. A final hardened run also verified that a private-key request returns HTTP 403 and relayed 88 frames at **1.58 ms median / 1.70 ms maximum** local acknowledgement time. This is loopback timing, not a Wi-Fi latency guarantee. `node scripts/phone-tls-smoke.mjs https://localhost:5175` repeats the measurement while an HTTPS server runs on that port.

**Still manual:** iPhone Safari and Android Chrome hardware motion permission/readings; on-device certificate trust; real multi-finger ergonomics; physical steering sign in both landscape orientations; WLAN jitter/packet loss/roaming; phone lock/call/browser background transitions; managed-device/network restrictions. No physical-device pass or target Wi-Fi latency is claimed.


## Milestone 4 item action

The mobile controller now includes **ITEM** beside DRIFT. It fires the held Spark Bolt in Quick Race, VS or cup races and stays disabled in menus, Time Trial and Free Drive. A short touch is latched until the next normalized transmit packet. Pointer cancellation, blur, hidden state, disconnect/watchdog and neutral rearming include this action. Protocol version 1 accepts legacy clients without `useItem`; supplied values must be booleans and the relay forwards only the validated action. A real loopback socket regression verifies the item-enabled state and action reach the desktop. Physical phone item-button ergonomics and WLAN testing remain manual; existing historical device limitations above still apply.


The subsequent Banana Trap integration uses the same ITEM action: it fires Spark Bolt forward or drops the held trap behind. The mobile caption now says TAP TO USE. No new protocol field or additional touch action is required. Physical device validation remains manual; see docs/MILESTONE_4_ITEMS.md.


Bubble Guard uses the same ITEM action and protocol: collect it, then tap ITEM to activate. Protection lasts five simulation seconds or one item hit. Desktop HUD shows the countdown. No additional phone packet field was added; the existing neutral/timeout safety remains. This does not constitute a new physical-phone validation pass. See docs/BUBBLE_GUARD.md.


Item balance follow-up: position-weighted rewards and recovery timers reuse the same **ITEM** action and existing host status. No protocol, pairing or sensor changes were required. See [item balance](ITEM_BALANCE.md).

## Controller design follow-up — 2026-11-20

The phone route now uses the game's coastal palette: deep teal, warm cream and a restrained gold accelerator. No new assets/dependencies or rendering canvas are required.

- Large captured-pointer steering area with a rotating original SVG wheel, L/R meter, centered release and accurate accessible slider feedback. Touch/Tilt remain directly available.
- Distinct Item/Drift row, Brake/reverse and a larger gold GO pedal. Pressed feedback follows actual holds, including more than one finger on the same button. Throttle/drift remain separate normalized actions; no automatic acceleration or new driving formula.
- Compact logo, pairing/latency badge, Settings and Pause/Resume. No permanent tutorial footer or tuning form below the driving deck. Portrait stacks the same controls and suggests landscape without blocking play.
- Existing sensitivity/dead-zone/smoothing/inversion/rate controls live in a keyboard-accessible dialog. Opening settings releases inputs and requests pause during active driving. Closing restores focus; resume remains explicit. Motion permission stays on the direct Tilt gesture, with denied/unavailable touch fallback.
- Unpaired, host-disabled, uncalibrated-tilt and settings-open states disarm controls and outgoing activity. Existing blur/visibility/orientation/disconnect cleanup, safe rearming, item-free modes, token handling and relay validation remain.
- Phone CSS is separated from shared desktop pairing CSS, reducing the desktop QR styling chunk. `viewport-fit=cover` lets the existing safe-area padding account for device cutouts; compact landscape controls fit without scrolling. Reduced-motion preferences disable cosmetic transitions.

Files: `src/phone/{PhoneController,PhoneControlDeck,ControllerSettings,ControllerIcon}.tsx`, `controller.css`, shared `phone.css`, the read-only `TouchInput.isHeld` helper and viewport metadata. The browser test exposed an existing shared dialog focus issue under StrictMode: simulated cleanup restored focus outside the open dialog. `useDialogFocus` now cancels that stale restoration and retains the original return target until actual close.

Browser checks used an isolated local Chrome 157 session and the actual Socket.IO relay (not the user's tab/profile). Verified simultaneous throttle/left/right, steering+throttle+drift, cancellation to neutral, item tap transmission, pause/resume, settings pause/focus trap/Escape restoration, item-free mode gating and disconnect. Four layouts passed: **844×390, 667×375, 568×320, 390×844**; landscape had no horizontal/vertical overflow, portrait had no horizontal overflow, and all four driving targets were at least 44×44 pixels. No page errors were reported. The test respects the relay's existing 500 ms pause-command debounce.

Saved evidence: [browser report](design-qa/phone-controller/browser-checks.json), [landscape](design-qa/phone-controller/landscape-active.png), [portrait](design-qa/phone-controller/portrait.png), [settings](design-qa/phone-controller/settings.png).

Verification: `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` passed. Focused presentation/input tests: 14 passed. Full `npm run test`: **554 tests in 49 files passed**, 156.60 seconds, including existing gameplay, audio and relay regressions. Upstream Three.js CommonJS/Node experimental warnings remain unsuppressed. Final build: 830 modules; the phone-only presentation CSS is 3.37 KB gzip, phone page JS 6.54 KB gzip and shared PC pairing CSS 1.07 KB gzip. Six new unit tests cover accessible controls, inactive/item-free/calibration availability, retained settings and multi-finger pressed feedback. Existing simulation, collision, AI, camera, audio and server/protocol files were not modified.

Remaining manual checks: actual iPhone Safari/Android Chrome comfort, simultaneous physical fingers, landscape cutouts/browser toolbars, motion permission/calibration/sign in both orientations and real Wi-Fi jitter/background recovery. Emulated touch and loopback latency do not establish physical-device performance. Separate music/audio changes are unaffected.

## Railway deployment — production preparation 2026-11-20

The user's step-by-step hosting request adds a production startup path. It prepares deployment; no Railway project, cloud publication or Git push was performed by the agent. Gameplay, camera, models, controls, audio, AI and race rules remain unchanged.

### What is prepared

- `npm run build` emits `dist/` and `dist-server/`. `npm start` runs the compiled Node entry, serving both `/` and `/controller` plus the same Socket.IO relay. `/healthz` returns 200 JSON for Railway readiness.
- `server/productionConfig.ts` reads `PORT` (default 3000), then an explicitly validated `TKL_PUBLIC_ORIGIN` or `https://${RAILWAY_PUBLIC_DOMAIN}`. Origins must be HTTPS with no credentials/path/query/fragment. An unconfigured local startup permits only localhost/127.0.0.1 origins.
- Public WebSocket handshakes must match the configured origin exactly; proxy backend Host names do not configure trust, and forwarded-host headers cannot select an origin. Local Vite/preview validation is unchanged. Optional public pairing metadata displays online guidance instead of local Wi-Fi/certificate instructions.
- sirv 3.0.2 serves immutable hashed bundles and revalidated stable model/image URLs, with MIME, ETag and common byte ranges. Unsupported/malformed ranges are ignored safely. Missing files/private paths are never rewritten into HTML. HTML/controller responses are uncached and retain sensor/referrer protections.
- `Dockerfile` builds on Node 24, then copies only built browser/server output and runtime dependencies into a non-root image. `.dockerignore` excludes local credentials, certificates, Git and generated output from the build context. Development docs remain available to the build because TypeScript imports audit JSON from `docs/assets/`; the final image does not copy those docs. Preserved public assets/credits remain in the build.
- `railway.json` selects that Dockerfile, `npm start`, one replica, `/healthz`, a readiness timeout and bounded failure restarts. No database or volume is needed. Pairings are memory-only; restarting/deploying requires pairing again. Current relay caps (16 sessions/64 sockets) remain, so this is an initial single-instance deployment, not a distributed service.

### Step by step in Railway

1. Push the verified local commits to your GitHub repository yourself. Never upload `.certs/`, `.env` files or private keys.
2. In Railway, create a project from that GitHub repository. Keep the service root at this project's root. The checked-in Dockerfile/manifest supply build/start/health settings; no database service is needed.
3. Wait for the first deployment to become healthy. The log identifies the listening port. Under Settings → Networking → Public Networking, generate a Railway domain. Railway normally detects the single listening port; if you choose a target port manually, it must match `PORT`. An optional fixed `PORT=3000` service variable may be used with target port 3000.
4. Copy the resulting HTTPS address, e.g. `https://your-game.up.railway.app`. Under Variables, set **TKL_PUBLIC_ORIGIN** to that exact origin and deploy the change. The Railway-provided domain is also recognized automatically; the explicit variable makes the intended canonical game address clear. For a custom domain, update this value to that domain after configuring its DNS/certificate.
5. Open the public game and visit `/healthz` to check readiness. Test Home → setup → race, model/scenery loading, audio and pause/reset. Keep replicas at **one**; do not enable multi-region replicas with memory-only pairings.
6. Open phone pairing on the computer and scan the generated HTTPS QR on the phone. The online link uses the public origin, not a LAN address, and requires no development certificate installation. Keep the PC game visible. Test touch/tilt calibration, drift/items and disconnect recovery; Internet latency can trigger the existing 350 ms stale-input safeguard, so choose a region near the players.

Railway supplies external HTTPS/WSS and forwards traffic to the internal HTTP server. Do not set TKL_PHONE_TLS/TKL_PHONE_LAN or upload local development certificates there. No platform token is embedded in client code. A static Vercel deployment of dist alone still does not run this relay; moving the relay across instances/providers requires additional architecture work.

Primary platform references: [domain/target-port setup](https://docs.railway.com/networking/domains/working-with-domains), [platform variables](https://docs.railway.com/variables/reference), [configuration schema](https://railway.com/railway.schema.json).

### Local verification and remaining limits

- Stable dependency installation: sirv 3.0.2, four packages added, npm audit reported zero vulnerabilities. Existing Node 23.3 host/toolchain engine warnings remain; the container targets supported Node 24.
- Typecheck, zero-warning lint and production browser/server build passed. Full suite: **563 tests in 50 files passed**, 140.72 seconds, including nine production HTTP/config/relay tests and the existing regression suite. Upstream Three.js CommonJS warnings remain unsuppressed. `git diff --check` passed.
- The actual compiled `npm start` entry ran on an isolated local port. Chrome loaded the built Home/3D menu and `/controller`, paired through the real relay and sent normalized throttle. Health, HTML/bundle cache behavior and missing-model responses passed; no browser page errors occurred. Source tests separately verified explicit HTTPS-origin pairing behind an internal proxy Host, rejection of other origins/forwarded-host spoofing, safe static paths/methods/ranges and idempotent connection shutdown.
- Docker CLI is installed but its daemon is stopped; the container image could not be built/run locally. No actual Railway build/domain/TLS deployment is claimed. The first cloud build and public-device checks remain required. Local browser/loopback tests do not establish real Wi-Fi/Internet latency or physical iPhone/Android motion behavior.
- Supplied franchise-asset permissions were recorded for the local prototype. Independently verified public-release rights are not established by this hosting setup; retain credits and confirm distribution rights before a public release.

### Railway build-context correction — 2026-11-20

The first cloud build failed because `.dockerignore` excluded the entire docs directory. The TypeScript program includes the development inspector and test sources, which statically import `docs/assets/asset-audit.json`, `environment-audit.json` and `environment-optimization.json`. Their absence also caused the reported implicit-any errors. Removed the docs exclusion and documented why these are build inputs; strict checks remain enabled. The final multi-stage runtime still copies only dist/dist-server and runtime dependencies.

Verification: typecheck and zero-warning lint passed. An isolated source copy filtered with the current `.dockerignore` exclusions contained all three required JSON files, omitted private/generated paths, and passed the complete `npm run build` (TypeScript, Vite's 830 modules and server compilation) using the installed dependency set. The temporary copy was removed afterward. No gameplay/runtime code changed, so the previously passing 563-test suite was not repeated. Docker's local daemon remains stopped: this verifies the filtered build inputs, not an actual local container build. Push the correction and check the next Railway deployment.

## Pairing-panel design follow-up — 2026-11-20

The user requested a minimalist redesign of “Your phone. Your steering wheel.” The desktop panel now uses a consistent coastal teal/cream/gold composition, a clear QR on white, a quiet connection badge and a single Done action. Connected/reconnecting/inactive/busy/error/expired/idle states use truthful existing host state and a lightweight original SVG/CSS phone illustration. There is no new model, dependency, canvas or animation loop; reduced motion disables the entry transition.

Steering preferences, local address selection, manual link, new-code/disconnect controls and local certificate help remain available under one native **Options** disclosure. Public sessions show public-origin guidance; local preview/LAN guidance stays accurate. Clipboard failure points to the selectable manual link. Copy success is keyed to its URL, so regenerating a token does not leave a false success message. QR images are keyed to their URL as well: old codes disappear while replacements render, and consumed/expired codes are hidden.

`PairingPanel` now owns menu/focus handling once, including return to Settings; the wrapper supplies tuning without a second focus handler. Summary elements participate in keyboard/gamepad navigation, and invisible controls are skipped. Explicitly hidden closed Options content prevents browsers from reporting layout rectangles for non-interactive descendants. The sensitivity range has an explicit accessible name. All existing phone configuration/calibration, pairing/renew/revoke and safe driving lifecycle handlers are retained. No relay, production server, sensor permission, packet schema, gameplay, audio, physics or camera changes.

Files: `src/phone/{PairingPanel,pairingPresentation,ControllerIcon}`, `src/phone/phone.css`, menu `PhoneControllerPanel`/`useMenuNavigation`, and removal of obsolete pairing overrides from `src/styles/menus.css`. Eight new unit cases cover approved public/local origins, countdown/expiry, consumed-code protection, busy/error priority and accessible recovery/manual actions. Typecheck, lint, browser/server production build and all **571 tests / 51 files** passed (full-suite duration 152.11 seconds). Existing upstream Three.js CommonJS warnings remain unsuppressed.

Isolated Chrome 157 checks against the real local relay verified initial Done focus, collapsed controls, keyboard disclosure navigation, link copying with a stubbed clipboard, QR replacement/copy reset, real pairing with the new code, consumed QR removal, native keyboard sensitivity updates delivered to a paired test client, disconnect/recovery, client-side expiry, focus containment and Escape return to Settings. Layouts 1280×800, 844×390 and 390×844 stayed within the viewport without horizontal overflow, with Done visible. Clipboard was stubbed to avoid accessing the user's system clipboard; no new physical-camera scan or handset check is claimed. Screenshots contain a temporary local test code whose session was revoked when the test browser closed; no active pairing credential is stored.

Evidence: [browser report](design-qa/phone-pairing/browser-checks.json), [waiting](design-qa/phone-pairing/waiting.png), [connected](design-qa/phone-pairing/connected.png), [options](design-qa/phone-pairing/options.png), [expired](design-qa/phone-pairing/expired.png), [narrow](design-qa/phone-pairing/narrow.png). The user previously confirmed deployed touch/tilt operation; that confirmation predates this cosmetic panel pass. A fresh physical QR scan and production review follow the user's push/deployment.
