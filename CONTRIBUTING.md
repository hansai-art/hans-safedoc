# Contributing

1. Read `docs/MASTER-SPEC.md`.
2. Select an issue that references Requirement and Acceptance IDs.
3. Add a failing test before security or data logic.
4. Do not introduce network behavior, telemetry, runtime downloads or plaintext sensitive logs.
5. Do not copy GPL source into this MIT repository.
6. Update traceability, docs and migration for contract changes.
7. Run the full CI suite.

A PR that changes locked product scope must be closed or moved to `v1.1-backlog`.
