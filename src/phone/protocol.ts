import type { KartInput, GameMode } from '../game/core/types.ts';
export const PHONE_CONFIG = {
  version: 1, rateHz: 30, inputTimeoutMs: 350, pairLifetimeMs: 120_000,
  reconnectGraceMs: 30_000, sessionLifetimeMs: 8 * 60 * 60_000, maxSessions: 16,
  maxPacketsPerSecond: 90, path: '/phone-socket',
} as const;
export interface ControlPacket { version: 1; seq: number; sentAt: number; active: boolean; input: KartInput }
export interface GameControlState { enabled: boolean; mode: GameMode; itemsEnabled?: boolean }
export type LinkState = 'waiting' | 'connected' | 'reconnecting' | 'inactive' | 'offline';
export interface LinkStatus { state: LinkState; reason: string }
export interface PairOffer { id: string; token: string; expiresAt: number; origins: string[]; lan: boolean; rateHz: number }
export interface ResumeCredentials { id: string; resume: string }
export interface PhonePreferences { touch: boolean; fullLockDegrees: number }
export interface PhoneConfiguration extends PhonePreferences { calibrate: boolean }
export function validPhoneConfiguration(value: unknown): value is PhoneConfiguration {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<PhoneConfiguration>;
  return typeof config.touch === 'boolean' && typeof config.calibrate === 'boolean'
    && typeof config.fullLockDegrees === 'number' && Number.isFinite(config.fullLockDegrees) && config.fullLockDegrees >= 10 && config.fullLockDegrees <= 50;
}
export type Reply<T> = ({ ok: true } & T) | { ok: false; error: string };
export interface JoinRequest { token?: string; id?: string; resume?: string }
export interface ClientEvents {
  'host:create': (ack: (reply: Reply<PairOffer>) => void) => void;
  'host:revoke': () => void;
  'host:state': (state: GameControlState) => void;
  'host:configure': (configuration: PhoneConfiguration) => void;
  'phone:join': (request: JoinRequest, ack: (reply: Reply<ResumeCredentials & { game: GameControlState }>) => void) => void;
  'phone:input': (packet: ControlPacket) => void;
  'phone:pause': () => void;
  'phone:ping': (ack: () => void) => void;
}
export interface ServerEvents {
  'host:input': (packet: ControlPacket) => void;
  'host:link': (status: LinkStatus) => void;
  'host:pause': () => void;
  'host:ping': (ack: () => void) => void;
  'phone:state': (state: GameControlState) => void;
  'phone:configure': (configuration: PhoneConfiguration) => void;
  'phone:ended': (reason: string) => void;
}
export function validPacket(value: unknown): value is ControlPacket {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ControlPacket>, i = v.input;
  return v.version === 1 && Number.isSafeInteger(v.seq) && (v.seq ?? -1) >= 0 && (v.seq ?? Infinity) <= 0x7fffffff
    && typeof v.sentAt === 'number' && Number.isFinite(v.sentAt) && v.sentAt >= 0 && typeof v.active === 'boolean'
    && !!i && typeof i === 'object' && typeof i.drift === 'boolean' && (i.useItem === undefined || typeof i.useItem === 'boolean')
    && [i.throttle, i.brake, i.steer].every(n => typeof n === 'number' && Number.isFinite(n))
    && i.throttle >= 0 && i.throttle <= 1 && i.brake >= 0 && i.brake <= 1 && i.steer >= -1 && i.steer <= 1;
}
export function validGameState(value: unknown): value is GameControlState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<GameControlState>;
  return typeof v.enabled === 'boolean' && (v.itemsEnabled === undefined || typeof v.itemsEnabled === 'boolean') && ['menu', 'playing', 'paused', 'results'].includes(v.mode ?? '');
}
export function isNeutral(input: KartInput) { return input.throttle < 0.05 && input.brake < 0.05 && Math.abs(input.steer) < 0.05 && !input.drift && !input.useItem; }
export function pairingUrl(origin: string, token: string) { return `${origin}/controller#${encodeURIComponent(token)}`; }
