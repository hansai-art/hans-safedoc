# Build Report

**Package:** Privacy Bridge Product & Engineering Specification  
**Version:** 1.0.0 LOCKED  
**Generated:** 2026-08-25  

## Validation

| Item | Result |
|---|---:|
| Master Spec lines | 1832 |
| Master Spec characters | 28834 |
| Requirement IDs | 121 |
| JSON Schema files | 18 |
| Root schema examples validated | 18 |
| Backup manifest sub-schema example | Validated |
| Acceptance Matrix items | 105 |
| Release blockers | 105 |
| Open product decisions | 0 |
| Crypto test vector | Generated and internally verified |
| Specification validation script | Passed |

## Legacy Seed

- Files copied: 2
- Test execution: Copied as legacy seed; no compatible local TypeScript runner completed in the packaging environment
- Compile status: TypeScript strict compile succeeded
- Classification: regression seed only; not a source of truth and not evidence of production recall or precision.

## Locked Engineering Decisions

- Client-level Passphrase with independent Job Root Keys
- scrypt N=131072, r=8, p=1
- AES-256-GCM, HKDF-SHA-256, HMAC-SHA-256
- 96-bit Token authentication tag
- UTF-16 offsets
- No Markdown AST reserialization
- Occurrence-level effective handling
- No network, telemetry, runtime downloads
- Original Vault read-only
- 105 acceptance blockers before GitHub Alpha

## Validation Command

```bash
python scripts/validate_spec.py
```

Expected:

```text
Privacy Bridge specification validation passed
Schemas: 18
Schema examples: 18
Acceptance items: 105
```

## Completion

```text
Product Scope: FROZEN
Architecture: FROZEN
Security Model: FROZEN
Data Contracts: FROZEN
Open Product Decisions: 0
Development Status: READY
```
