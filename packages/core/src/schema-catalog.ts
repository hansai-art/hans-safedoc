import auditEvent from '../../../schemas/audit-event.schema.json' with { type: 'json' };
import candidate from '../../../schemas/candidate.schema.json' with { type: 'json' };
import clientProfile from '../../../schemas/client-profile.schema.json' with { type: 'json' };
import detectionRun from '../../../schemas/detection-run.schema.json' with { type: 'json' };
import dictionary from '../../../schemas/dictionary.schema.json' with { type: 'json' };
import encryptedEnvelope from '../../../schemas/encrypted-envelope.schema.json' with { type: 'json' };
import entityMap from '../../../schemas/entity-map.schema.json' with { type: 'json' };
import exportManifest from '../../../schemas/export-manifest.schema.json' with { type: 'json' };
import jobKeyEnvelope from '../../../schemas/job-key-envelope.schema.json' with { type: 'json' };
import job from '../../../schemas/job.schema.json' with { type: 'json' };
import lock from '../../../schemas/lock.schema.json' with { type: 'json' };
import occurrenceMap from '../../../schemas/occurrence-map.schema.json' with { type: 'json' };
import pathMap from '../../../schemas/path-map.schema.json' with { type: 'json' };
import restoreManifest from '../../../schemas/restore-manifest.schema.json' with { type: 'json' };
import resultPackage from '../../../schemas/result-package.schema.json' with { type: 'json' };
import reviewDecision from '../../../schemas/review-decision.schema.json' with { type: 'json' };
import store from '../../../schemas/store.schema.json' with { type: 'json' };
import transactionJournal from '../../../schemas/transaction-journal.schema.json' with { type: 'json' };

export const schemaCatalog = [
  auditEvent,
  candidate,
  clientProfile,
  detectionRun,
  dictionary,
  encryptedEnvelope,
  entityMap,
  exportManifest,
  jobKeyEnvelope,
  job,
  lock,
  occurrenceMap,
  pathMap,
  restoreManifest,
  resultPackage,
  reviewDecision,
  store,
  transactionJournal,
] as const;
