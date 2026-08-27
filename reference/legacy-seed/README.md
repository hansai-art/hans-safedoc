# Legacy Seed Notice

These TypeScript files are historical implementation and regression inputs only.

They are **not** the source of truth. Required refactors include:

- `confidence` → `ruleScore`
- `detectAll()` without UI threshold
- structured context that does not cross lines by default
- named capture indices
- multi-candidate overlap model
- `TW_PHONE_SERVICE`
- passport tiering
- `scanResidualAll()`
- secure Candidate／Review／Mapping data contracts

Any assertion conflicting with `docs/MASTER-SPEC.md` must be explicitly superseded and replaced with a new acceptance test. Do not delete a regression without documenting the Requirement ID that changes it.
