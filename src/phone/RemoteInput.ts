import { NEUTRAL_INPUT, type KartInput } from '../game/core/types';
import { isNeutral, PHONE_CONFIG, validPacket, type ControlPacket } from './protocol';
/** Receipt-time watchdog; no dependency on phone/computer clock synchronization. */
export class RemoteInput {
  private input: KartInput = { ...NEUTRAL_INPUT };
  private lastAt = -Infinity;
  private seq = -1;
  private requireNeutral = true;
  private live = false;
  constructor(private readonly now: () => number, private readonly onUnsafe: () => void) {}
  clear() { this.input = { ...NEUTRAL_INPUT }; this.requireNeutral = true; }
  connect() { this.clear(); this.seq = -1; this.lastAt = this.now(); this.live = true; }
  lose() { const wasLive = this.live; this.live = false; this.clear(); if (wasLive) this.onUnsafe(); }
  receive(packet: ControlPacket) {
    if (!validPacket(packet) || packet.seq <= this.seq) return;
    if (this.live && this.now() - this.lastAt > PHONE_CONFIG.inputTimeoutMs) this.lose();
    this.seq = packet.seq; this.lastAt = this.now();
    if (!packet.active) { this.lose(); return; }
    this.live = true;
    if (this.requireNeutral) { if (isNeutral(packet.input)) this.requireNeutral = false; this.input = { ...NEUTRAL_INPUT }; return; }
    this.input = { ...packet.input, drift: false };
  }
  sample(enabled = true): KartInput {
    if (this.live && this.now() - this.lastAt > PHONE_CONFIG.inputTimeoutMs) this.lose();
    if (!enabled) { this.clear(); return { ...NEUTRAL_INPUT }; }
    return this.live && !this.requireNeutral ? this.input : { ...NEUTRAL_INPUT };
  }
}
