import { describe, expect, it } from 'vitest';
import { ClientSession } from '@privacy-bridge/core';

describe('ACC-STR-009 automatic lock', () => {
  it('clears keys for idle timeout, sleep, client switch, and app close', () => {
    for (const action of [
      (session: ClientSession) => session.requireKey(900_000),
      (session: ClientSession) => session.onSleep(),
      (session: ClientSession) => session.onClientSwitch(),
      (session: ClientSession) => session.onAppClose(),
    ]) {
      const session = new ClientSession();
      session.unlock(new Uint8Array(32).fill(1), 0);
      action(session);
      expect(session.unlocked).toBe(false);
      expect(session.requireKey(900_001).ok).toBe(false);
    }
  });
});
