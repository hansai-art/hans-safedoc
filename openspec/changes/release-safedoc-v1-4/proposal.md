# Hans SafeDoc 1.4.0 proposal

## Problem

Enterprise users need regional analytics without exposing full Taiwan addresses, a non-technical way to prepare exact-match customer dictionaries, an unambiguous local-to-cloud handoff boundary, and a visible validation step before structured AI results are restored.

## Scope

1. Job-scoped Taiwan address privacy modes: full protection, keep city, or keep city and district.
2. Session-only Customer Dictionary Wizard for JSON, CSV, and pasted lines.
3. Safe to Upload preflight for the paired Safe Package and analysis request.
4. Result JSON Dry Run before any Result Vault is created.
5. Versioned Taiwan synthetic regression coverage and release documentation.

## Non-goals

- No NER, LLM, Ollama, model asset, downloader, inference runtime, telemetry, or cloud API.
- No stable raw-PII hash or cross-Job linkable Token.
- No ELK ingestion service, Prompt Security integration, or self-hosted AI platform.
- No direct PDF, OCR, mobile, image, audio, or video processing.

## Security invariants

- Full address protection is the default and the fail-closed fallback.
- The selected address mode is immutable for a prepared preview; changing it invalidates the preview.
- Protected address details enter only the encrypted Vault-external Job Mapping.
- Safe to Upload applies only to the exact paired `.safe-package.zip` and `.analysis-request.json`.
- Dry Run performs no writes. Restore revalidates the untrusted Result JSON before publishing a new non-overwriting Result Vault.
