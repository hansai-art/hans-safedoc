## Context

Hans SafeDoc 1.1 has production MD/TXT/CSV workflows and isolated DOCX/XLSX adapters. The Office adapters already provide OOXML preflight, hash-bound locators, selective ZIP entry replacement, disk readback, residual hooks, and graph conservation. The host currently rejects `.docx` and `.xlsx` before reading, mandatory non-text review items are not represented in the common review state, and Office artifact verification is not wired to the staged atomic publisher.

The release source is `/Users/jugang11/src/privacy-bridge-cleanroom`; the original dirty repository remains untouched. The plugin is Desktop-only for native file I/O. All test documents are synthetic and the only allowed runtime Vault is `/Users/jugang11/Documents/Hans SafeDoc Test Vault`.

## Goals / Non-Goals

**Goals:**

- Release a narrow, deterministic, fail-closed DOCX profile and formula-free XLSX profile.
- Reuse one host workflow while retaining typed format locators and adapter-local rewrite rules.
- Propagate every mandatory review item through the UI and export guard.
- Prove source immutability, staged disk readback, independent package traversal, decision-aware residual checks, graph conservation, collision-safe atomic publication, and failure cleanup.
- Publish exact, publicly readable release assets from a clean, traceable source commit.

**Non-Goals:**

- Legacy `.doc`/`.xls`, macros, encrypted packages, tracked revisions, OLE/ActiveX, arbitrary OOXML extensions, formulas, formula caches, charts, drawings, XLSX comments, external data, Power Query, pivots, or direct PDF processing.
- Pixel-identical Word pagination or Excel rendering.
- OCR or semantic inspection of embedded images. DOCX images are preserved only after explicit per-image acknowledgement that image contents were not scanned.
- Automatic decisions for names, organizations, metadata, links, media, or other mandatory review records.
- Local or remote NER models, model installation/import, ONNX runtime, telemetry, or document-content networking.

## Decisions

### One discriminated Office review document model

Extend `ExternalReviewDocument` from text-only units to a discriminated union. Text candidates retain candidate IDs and local spans; mandatory records use stable IDs derived from format, typed locator, source-surface hash, and map hash. The host stores no plaintext review state after lock, close, unload, or document switch.

Alternative rejected: flatten Office XML into one preview string and reconstruct the package from it. That loses package provenance and can change unrelated structure.

### Machine allowlist before extraction

`preflightOoxmlSnapshot` remains the only entry to DOCX/XLSX extraction. The adapter MUST reject every unclassified part, content type, relationship, namespace, QName, attribute, active-content construct, cardinality violation, ZIP ambiguity, and resource-limit breach before candidate detection.

Alternative rejected: accept unknown structures and scan known text. Unknown structures can contain unscanned sensitive data.

### Narrow DOCX release profile

The release profile scans `w:t` logical text across runs in document body, tables, headers, footers, footnotes, endnotes, and comments. Metadata, comment author, external hyperlink target, theme/name surfaces, and each PNG/JPEG media item are mandatory review records. Tracked revisions, fields/instruction text, AlternateContent, unsupported drawing text, macros, signatures, OLE, ActiveX, embeddings, unknown parts, and unknown XML structures block the file.

Media acknowledgement means only “preserve this unscanned image”; it never means image content is safe. Any pending media record blocks export.

### Formula-free XLSX release profile

The release profile scans visible, hidden, and veryHidden sheets; shared strings; inline strings; raw values; approved deterministic display values; sheet names; defined names; table names; metadata; and hyperlinks. Rewriting a shared-string cell converts only that cell to `inlineStr`, preventing changes to other cells sharing the source string.

Any formula element or cache, calcChain, comments/VML, chart, drawing, media, macro, external link/data, connection, query, pivot, slicer, unsupported relationship, unknown part, or unsupported XML structure blocks before review.

### Rewrite only candidate text in v1.2

Automated candidate decisions produce rewrite operations only for `docx-text` and XLSX cell/raw/display locators. Mandatory metadata, hyperlink, name, theme, and media records require an explicit `RETAIN_ACKNOWLEDGED` decision in v1.2; they are not silently rewritten. The completion state prominently reports retained mandatory surfaces.

Alternative rejected: release generic XML attribute/property rewriting in the same version. The current adapters do not yet provide symmetric typed rewrite and independent residual producers for every metadata locator.

### Distinct disk verification manifest

Before staging, adapters generate expected changed-entry sets, source graph digest, source surface hashes, replacement needles, token bytes, and retained mandatory record IDs. After writing staging bytes, verification reads a fresh buffer from disk, reruns OOXML preflight and extraction, checks exact allowed changed entries, graph conservation, token presence, replacement-needle absence across all promised surfaces, and retained-record traceability.

The independent path can reuse hardened ZIP/XML primitives but MUST NOT reuse pre-rewrite extraction objects or serializer state.

### Atomic publish and cleanup

The publisher rechecks source bytes after extraction, before rewrite, before staging write, and before publish. It writes a mode-0600 hidden staging file under the output directory, reads it back, verifies it, creates a collision-safe opaque final name without source basename, publishes without overwrite, and removes staging on success, cancellation, or failure.

### Release truth states remain separate

Source push, tag push, GitHub Release creation, public HTTP asset availability, Community Plugins registry inclusion, and Obsidian staff review are independent facts. Only verified facts are reported as complete.

## Risks / Trade-offs

- [Narrow profiles reject many normal Office files] → Show exact blocker and a local remediation such as “save a copy without formulas/comments”; never bypass the guard.
- [Long tokens change layout] → Preserve structure/styles but disclose that pagination, column display, and line wrapping can change; native Word/Excel inspection remains required.
- [Images can contain unscanned sensitive data] → Per-image mandatory acknowledgement, hash/MIME/dimensions/location display, no batch acceptance, and a completion warning.
- [Regex-based XML extraction can miss namespace/context distinctions] → All admitted XML remains behind strict namespace/QName/attribute allowlists and mutation tests; any unsupported construct blocks.
- [Shared strings can affect multiple cells] → Convert only the selected cell to inline string and assert all unrelated logical cells remain unchanged.
- [External registry review cannot be completed locally] → Publish public release and submit the official PR; report registry/review pending until upstream evidence exists.

## Migration Plan

1. Keep DOCX/XLSX blocked while adding union types, mandatory review state, and Host tests.
2. Wire adapters behind explicit per-format release flags; enable DOCX and XLSX only after their complete focused and mutation suites pass.
3. Bump all canonical versions together to `1.2.0`, build an exact artifact, and install it into the test Vault.
4. Validate fresh install and upgrade from 1.1.0; rollback by reinstalling the immutable 1.1.0 release assets. Existing plugin ID and data path remain unchanged.
5. Commit clean source, push branch/main as appropriate, tag `1.2.0`, create non-draft public release with exact assets, verify HTTP and hashes, then submit Community Plugins if not already listed.

## Open Questions

None. External Community Plugins indexing and staff review remain observable post-submission states, not implementation questions.
