## 1. Contract and test harness

- [x] 1.1 Implement “Machine allowlist before extraction” and lock “OOXML packages are admitted by exact profile” with positive corpus plus unknown part, Content Type, relationship, QName, attribute, duplicate, traversal, external target, and resource-limit RED fixtures.
- [x] 1.2 Implement and test the “One discriminated Office review document model” and “Rewrite only candidate text in v1.2” with typed candidate and mandatory-record IDs.
- [x] 1.3 Add Host regression tests proving “Mandatory review records reach the export guard” and “Sensitive state is ephemeral”.

## 2. DOCX production closure

- [x] 2.1 Complete the “Narrow DOCX release profile” and prove “DOCX supported surfaces are complete” across body, tables, headers, footers, footnotes, endnotes, comments, metadata, links, theme/name surfaces, and media.
- [x] 2.2 Prove “DOCX unsafe structures fail closed” for revisions, fields, AlternateContent, DrawingML outside the profile, macros, signatures, OLE, ActiveX, embeddings, encryption, and unknown XML/package structures.
- [x] 2.3 Prove “Rewrite is locator-bound” for DOCX cross-run replacements, overlap, stale hashes, forged locators, changed source, exact changed-entry scope, and unrelated byte canaries.

## 3. XLSX production closure

- [x] 3.1 Complete the “Formula-free XLSX release profile” and prove “XLSX supported surfaces are complete” for visible/hidden/veryHidden sheets, shared/inline strings, raw/display values, names, metadata, hyperlinks, table names, and merges.
- [x] 3.2 Prove “XLSX unsafe structures fail closed” for formulas/caches, calcChain, comments/VML, charts, drawings, media, macros, external data, connections, queries, pivots, slicers, and unknown XML/package structures.
- [x] 3.3 Prove “Rewrite is locator-bound” for XLSX, including shared-string isolation, display-to-text disclosure, rich-text policy, stale hashes, overlap, exact changed-entry scope, and unrelated logical-cell conservation.

## 4. Disk verification and atomic publication

- [x] 4.1 Implement the “Distinct disk verification manifest” so “Office artifacts are independently verified” from fresh staging bytes with package closure, graph conservation, token presence, decision-aware residuals, retained-record traceability, and source hash equality.
- [x] 4.2 Implement “Atomic publish and cleanup” so “Output publication is private, opaque, and non-overwriting” under success, collision, cancellation, source mutation, and every failure boundary.

## 5. Obsidian Host workflow

- [x] 5.1 Make “File support is generated from one matrix” and enable Office only after format/Host tests pass.
- [x] 5.2 Wire “Office documents use the common review workflow” through choose, preflight, review, preview, export, error recovery, and process-another-document states.
- [x] 5.3 Render “Office preview states the fidelity boundary”, hidden-sheet/cell and DOCX-part locations, pending mandatory counts, and no-layout-preview disclosure.
- [x] 5.4 Implement “Office blockers are actionable and non-sensitive” and verify no plaintext/full paths/tokens leak into notices, logs, or persisted data.
- [ ] 5.5 Implement “Completion is a separate UI state” with native-open/reveal actions, retained-risk warnings, keyboard order, 44-pixel targets, and dark/light visual checks.

## 6. Product verification

- [x] 6.1 Run focused DOCX/XLSX suites, OOXML mutation/fuzz suites, source-immutability and failure-no-output assertions.
- [x] 6.2 Run full format, lint, typecheck, tests, 105 acceptance, schema/spec validation, build, network/secret/license/model scans, SBOM, and diff checks.
- [ ] 6.3 Install exact artifacts in the test Vault and validate fresh install, 1.1.0 upgrade, rollback/remove, keyboard-only, VoiceOver, common synthetic DOCX/XLSX, and 50 MiB resource evidence where safely reproducible.

## 7. Verified release

- [ ] 7.1 Establish “Release source is clean and traceable” in the clean-room without modifying the original dirty workspace.
- [ ] 7.2 Align “Version sources and assets are aligned” at 1.2.0 and enforce “Release artifact excludes model capability”.
- [ ] 7.3 Enforce “Publication states remain distinct” and “Release truth states remain separate”: push source, tag, and GitHub Release only after gates; verify “Public assets are independently readable” by public HTTP and exact SHA-256, then install those downloaded assets in the test Vault.
- [ ] 7.4 Apply “Community Plugins submission follows official metadata rules”; submit only when absent, then report source pushed, tag, release, public assets, registry listing, and staff review independently.
