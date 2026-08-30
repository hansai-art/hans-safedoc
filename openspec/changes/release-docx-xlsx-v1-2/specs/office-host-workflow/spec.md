## ADDED Requirements

### Requirement: File support is generated from one matrix
The picker, first-run flow, Help view, error guidance, and README SHALL derive DOCX/XLSX support wording from one release matrix. DOCX and XLSX MUST remain blocked until all format and Host gates pass.

#### Scenario: Release flags disabled
- **WHEN** either Office release flag is disabled
- **THEN** that extension is not accepted by the picker or workflow and all user-facing surfaces identify it as blocked

### Requirement: Office documents use the common review workflow
The Obsidian Desktop plugin SHALL process admitted DOCX and XLSX through choose, preflight, inventory, detection, mandatory review, per-item decisions, simplified preview, staged verification, and atomic output without taking over native Office preview extensions.

#### Scenario: Successful DOCX workflow
- **WHEN** a user chooses an admitted synthetic DOCX, decides every candidate and mandatory record, previews the changes, and requests output
- **THEN** the plugin creates a verified `.docx` safe copy outside the Vault and reports that the source was not modified

#### Scenario: Successful XLSX workflow
- **WHEN** a user chooses an admitted formula-free synthetic XLSX, decides every candidate and mandatory record, previews the changes, and requests output
- **THEN** the plugin creates a verified `.xlsx` safe copy outside the Vault and reports that the source was not modified

### Requirement: Office preview states the fidelity boundary
The preview MUST identify the source format and logical location of each candidate, MUST state that it is not a Word/Excel layout preview, and MUST direct the user to inspect the verified safe copy in the native application.

#### Scenario: XLSX hidden sheet candidate
- **WHEN** a candidate comes from a hidden or veryHidden worksheet
- **THEN** the preview names the worksheet state and cell reference without hiding the candidate

### Requirement: Office blockers are actionable and non-sensitive
The plugin MUST translate adapter blocker codes into a concise explanation of what happened, whether output was created, and one local remediation step. Errors MUST NOT expose document plaintext, full paths, keys, or full security tokens.

#### Scenario: Formula workbook selected
- **WHEN** a user selects an XLSX containing formulas
- **THEN** the plugin explains that formulas are not supported, confirms no copy was created, and instructs the user to save a values-only copy

### Requirement: Completion is a separate UI state
After successful publication, the plugin SHALL put the verified safe copy and primary open/reveal actions at the top, collapse review controls, disclose retained mandatory surfaces prominently, and preserve at least 44-pixel targets and keyboard focus order.

#### Scenario: Retained unscanned image
- **WHEN** a DOCX safe copy preserves an acknowledged image
- **THEN** completion reports that unscanned image content remains and does not use an unconditional “all sensitive content removed” claim

### Requirement: Sensitive state is ephemeral
The plugin MUST clear raw source text, extracted surfaces, preview state, typed locators, and decisions on lock, close, unload, cancellation, or document switch. It MUST NOT persist Office plaintext or full paths in plugin data or logs.

#### Scenario: Plugin unload during Office review
- **WHEN** the plugin unloads while an Office document is under review
- **THEN** in-memory sensitive state and temporary artifacts are cleared and no plaintext is written into the Vault
