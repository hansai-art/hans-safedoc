## ADDED Requirements

### Requirement: OOXML packages are admitted by exact profile
The system MUST classify every ZIP entry, content type, relationship, namespace, QName, attribute, and cardinality against the release profile before extracting document content. Any unknown, ambiguous, active, external, or over-limit construct MUST block processing without creating an artifact.

#### Scenario: Unknown package surface
- **WHEN** a DOCX or XLSX contains an entry, relationship, element, attribute, duplicate ZIP name, case-colliding name, traversal path, external target, or resource condition outside the exact profile
- **THEN** the system reports a non-sensitive recovery message, preserves the source SHA-256, and creates no output or staging residue

### Requirement: DOCX supported surfaces are complete
The system SHALL extract logical `w:t` text across runs from document body, tables, headers, footers, footnotes, endnotes, and comments. It SHALL create mandatory review records for metadata, comment authors, hyperlink targets, admitted theme/name surfaces, and every admitted PNG/JPEG media item.

#### Scenario: Split sensitive value
- **WHEN** a synthetic phone or email spans multiple Word runs in any admitted text part
- **THEN** the system emits one logical candidate with a hash-bound locator and rewrites only the approved logical span while preserving unrelated runs and parts

#### Scenario: Media remains unscanned
- **WHEN** a DOCX contains admitted PNG or JPEG media
- **THEN** every media item has hash, MIME, dimensions when available, relationship location, and an individual pending acknowledgement that blocks export

### Requirement: DOCX unsafe structures fail closed
The system MUST reject tracked revisions, deleted text, fields or instruction text, AlternateContent, unsupported DrawingML text, macros, signatures, OLE, ActiveX, embedded objects, encryption, and every unclassified package or XML structure.

#### Scenario: Tracked revision
- **WHEN** a DOCX contains inserted, deleted, moved, or revision-tracked content
- **THEN** processing stops before review and no artifact is created

### Requirement: XLSX supported surfaces are complete
The system SHALL extract logical values from visible, hidden, and veryHidden sheets, shared strings, inline strings, permitted raw and deterministic display values, sheet names, defined names, table names, metadata, hyperlinks, and merged-cell inventory.

#### Scenario: Shared string used by multiple cells
- **WHEN** one reviewed cell shares a string-table entry with an unrelated cell
- **THEN** rewriting converts only the reviewed cell to `inlineStr` and the unrelated cell retains its original logical value

#### Scenario: Formatted identifier
- **WHEN** a formula-free numeric cell has an admitted deterministic number format producing a phone-like identifier
- **THEN** the system exposes raw and display evidence, applies the formatted-identifier detector policy, and discloses conversion to text before rewrite

### Requirement: XLSX unsafe structures fail closed
The system MUST reject formulas of every kind, cached formula results, calcChain, comments/VML, charts, drawings, media, macros, external links or data, connections, queries, pivots, slicers, and all unclassified package or XML structures.

#### Scenario: Formula with zero candidates
- **WHEN** an XLSX contains any formula even when detection finds no sensitive value
- **THEN** preflight blocks the workbook, emits formula-context evidence without formula plaintext, and creates no artifact

### Requirement: Rewrite is locator-bound
Every rewrite operation MUST be bound to the source bytes, adapter version, typed locator, source-surface SHA-256, and map SHA-256. Overlapping, stale, forged, out-of-range, or unsupported locator operations MUST fail without artifact publication.

#### Scenario: Source changes after review
- **WHEN** source bytes change after extraction or a locator hash no longer matches
- **THEN** all affected decisions are invalidated and no staging or final artifact remains

### Requirement: Mandatory review records reach the export guard
The host MUST represent every mandatory metadata, link, name, theme, and media record in review state. It MUST require an explicit per-item decision, MUST NOT batch-accept unscanned media, and MUST block export while any required record is pending or blocked.

#### Scenario: Adapter emits pending media
- **WHEN** the DOCX adapter emits one or more pending media records
- **THEN** the UI exposes each record, announces the pending count, and export remains disabled until each record is explicitly acknowledged

### Requirement: Office artifacts are independently verified
The system MUST write a hidden staging artifact, read fresh bytes from disk, rerun package preflight and extraction, verify exact changed-entry scope, relationship and content-type graph conservation, approved token presence, replacement-needle absence across all promised surfaces, retained-record traceability, and source SHA-256 equality before atomic publication.

#### Scenario: Residual remains in hidden surface
- **WHEN** an approved original value remains in any admitted hidden sheet, header, footer, note, comment body, metadata, link, or shared-string-derived logical surface
- **THEN** disk verification fails, staging is deleted, and no final output is created

### Requirement: Output publication is private, opaque, and non-overwriting
The system SHALL create mode-restricted staging and final files outside the Vault, use an opaque random name that excludes the source basename, publish without overwrite, and remove staging on success, cancellation, or failure.

#### Scenario: Output name collision
- **WHEN** the generated final name already exists
- **THEN** the existing file remains unchanged and the system retries with a new opaque name or fails cleanly without overwrite
