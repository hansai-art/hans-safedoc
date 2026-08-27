import { describe, expect, it } from 'vitest';
import {
  parseCandidate,
  parseClientProfile,
  parseExportManifest,
  parseJob,
  parseResultPackage,
  parseStore,
} from '@privacy-bridge/core';
import candidate from '../examples/candidate.example.json' with { type: 'json' };
import client from '../examples/client-profile.example.json' with { type: 'json' };
import manifest from '../examples/export-manifest.example.json' with { type: 'json' };
import job from '../examples/job.example.json' with { type: 'json' };
import result from '../examples/result-package.example.json' with { type: 'json' };
import store from '../examples/store.example.json' with { type: 'json' };

describe('ACC-FND-002 schema examples', () => {
  it('validates the product schemas against their shipped examples', () => {
    expect(parseStore(store).ok).toBe(true);
    expect(parseClientProfile(client).ok).toBe(true);
    expect(parseJob(job).ok).toBe(true);
    expect(parseCandidate(candidate).ok).toBe(true);
    expect(parseExportManifest(manifest).ok).toBe(true);
    expect(parseResultPackage(result).ok).toBe(true);
  });
});
