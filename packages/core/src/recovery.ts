import { err, error, ok, type Result } from './index.js';

export type JournalPhase = 'PREPARED' | 'WRITING_TEMP' | 'TEMP_VALIDATED' | 'SWAP_PENDING' | 'SWAPPED' | 'POST_VALIDATION' | 'COMMITTED' | 'ROLLBACK_PENDING' | 'ROLLED_BACK' | 'FAILED';
export type RecoveryAction = 'ROLLBACK' | 'ROLL_FORWARD' | 'CLEANUP' | 'REQUIRE_WIZARD';

/** A stale lock is never inferred from time alone. */
export function isStaleLock(
  lock: { readonly heartbeatAt: string }, now: Date, processAlive: boolean, sameDeviceOwned: boolean,
): boolean {
  const heartbeat = Date.parse(lock.heartbeatAt);
  return Number.isFinite(heartbeat) && now.getTime() - heartbeat > 60_000 && !processAlive && !sameDeviceOwned;
}
export function decideRecovery(phase: JournalPhase, fullyValidated: boolean, requested?: 'ROLL_FORWARD'): RecoveryAction {
  if (phase === 'COMMITTED') return 'CLEANUP';
  if (phase === 'FAILED') return 'REQUIRE_WIZARD';
  return requested === 'ROLL_FORWARD' && fullyValidated && (phase === 'SWAPPED' || phase === 'POST_VALIDATION') ? 'ROLL_FORWARD' : 'ROLLBACK';
}
export interface MigrationResult {
  readonly active: ReadonlyMap<string, Uint8Array>;
  readonly recoverySnapshot: ReadonlyMap<string, Uint8Array>;
  readonly committed: true;
}
const clone = (source: ReadonlyMap<string, Uint8Array>) => new Map([...source].map(([name, bytes]) => [name, new Uint8Array(bytes)]));
/** Adapter-level copy-on-write primitive: the original map is never mutated. */
export function copyOnWriteMigrate(
  current: ReadonlyMap<string, Uint8Array>, migrate: (staging: Map<string, Uint8Array>) => void,
): Result<MigrationResult> {
  const recoverySnapshot = clone(current), staging = clone(current);
  try {
    migrate(staging);
    if ([...staging].some(([name, bytes]) => !name || bytes.length === 0)) return err(error('PB-MIG-001'));
    return ok({ active: staging, recoverySnapshot, committed: true });
  } catch { return err(error('PB-MIG-001')); }
}
