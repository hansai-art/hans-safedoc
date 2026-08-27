import { createHash } from 'node:crypto';
import { err, error, ok, type Result } from './index.js';
export interface AuditEvent {
  readonly sequence: number;
  readonly previousHash: string;
  readonly eventHash: string;
  readonly timestamp: string;
  readonly jobId: string;
  readonly deviceId: string;
  readonly operatorAliasFingerprint: string;
  readonly action: string;
  readonly subjectId: string;
  readonly safeCounts: Readonly<Record<string, number>>;
  readonly pluginVersion: string;
}
const digest = (value: Omit<AuditEvent, 'eventHash'>) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const forbidden = /(?:@|password|secret|passphrase|\/Users\/|[\u4e00-\u9fff]{2,}市)/iu;
export function appendAudit(
  events: readonly AuditEvent[],
  event: Omit<AuditEvent, 'sequence' | 'previousHash' | 'eventHash'>,
): Result<AuditEvent> {
  if (forbidden.test(`${event.action}|${event.subjectId}`)) return err(error('PB-AUDIT-001'));
  const previousHash = events.at(-1)?.eventHash ?? 'GENESIS';
  const draft = { ...event, sequence: events.length + 1, previousHash };
  return ok({ ...draft, eventHash: digest(draft) });
}
export function verifyAudit(events: readonly AuditEvent[]): Result<true> {
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!;
    const { eventHash, ...draft } = event;
    if (
      event.sequence !== i + 1 ||
      event.previousHash !== (i ? events[i - 1]!.eventHash : 'GENESIS') ||
      eventHash !== digest(draft)
    )
      return err(error('PB-AUDIT-001'));
  }
  return ok(true);
}
