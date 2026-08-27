import { err, error, ok, type Result } from './index.js';

export type DesktopPlatform = 'darwin' | 'win32' | 'linux';
export function defaultSecureStorePath(platform: DesktopPlatform, home: string): string {
  const root = home.replace(/[\\/]+$/u, '');
  if (platform === 'darwin') return `${root}/Library/Application Support/Privacy Bridge`;
  if (platform === 'win32') return `${root}/AppData/Roaming/Privacy Bridge`;
  return `${root}/.local/share/privacy-bridge`;
}

const canonical = (value: string) => value.replace(/\\/gu, '/').replace(/\/+$/u, '').toLowerCase();
const within = (child: string, parent: string) =>
  child === parent || child.startsWith(`${parent}/`);
export function validateSecureStorePath(input: {
  readonly candidate: string;
  readonly vaultRoot: string;
  readonly shadowRoots?: readonly string[];
  readonly resultRoots?: readonly string[];
  readonly isNetworkMounted?: boolean;
  readonly isSyncPath?: boolean;
}): Result<string> {
  const candidate = canonical(input.candidate);
  const forbidden = [
    input.vaultRoot,
    ...(input.shadowRoots ?? []),
    ...(input.resultRoots ?? []),
  ].map(canonical);
  if (
    !candidate ||
    input.isNetworkMounted ||
    input.isSyncPath ||
    candidate.startsWith('//') ||
    forbidden.some((root) => within(candidate, root))
  )
    return err(error('PB-STORE-001'));
  return ok(input.candidate);
}

/** Owns the only mutable copy of an unlocked CRK and wipes it on every lock boundary. */
export class ClientSession {
  private key: Uint8Array | undefined;
  private lastActivityAt = 0;
  unlock(key: Uint8Array, now: number): Result<true> {
    if (key.length !== 32) return err(error('PB-CRYPTO-001'));
    this.lock();
    this.key = new Uint8Array(key);
    this.lastActivityAt = now;
    return ok(true);
  }
  requireKey(now: number): Result<Uint8Array> {
    if (!this.key || now - this.lastActivityAt >= 15 * 60 * 1000) {
      this.lock();
      return err(error('PB-STORE-005'));
    }
    this.lastActivityAt = now;
    return ok(new Uint8Array(this.key));
  }
  onSleep(): void {
    this.lock();
  }
  onClientSwitch(): void {
    this.lock();
  }
  onAppClose(): void {
    this.lock();
  }
  lock(): void {
    this.key?.fill(0);
    this.key = undefined;
    this.lastActivityAt = 0;
  }
  get unlocked(): boolean {
    return this.key !== undefined;
  }
}

/** New client key material is only committed after the staged record has verified. */
export function rotateClientKey<T>(input: {
  readonly current: T;
  readonly stage: () => Result<T>;
  readonly validate: (candidate: T) => boolean;
}): Result<T> {
  const staged = input.stage();
  if (!staged.ok || !input.validate(staged.value)) return err(error('PB-CRYPTO-006'));
  return ok(staged.value);
}
