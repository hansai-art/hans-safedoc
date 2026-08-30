## ADDED Requirements

### Requirement: Release source is clean and traceable
A release MUST be built from a clean Git commit containing the exact specification, source, tests, lockfile, and release metadata. The original dirty workspace MUST NOT be modified or represented as the release source.

#### Scenario: Artifact build starts
- **WHEN** the release artifact command runs
- **THEN** it records the exact Git SHA and aborts if tracked or untracked release-relevant files make the source state dirty

### Requirement: Version sources and assets are aligned
Root and plugin package metadata, root and plugin manifests, lockfile, `versions.json`, changelog, tag, and release title MUST use the same immutable version. A public release MUST provide exact assets named `main.js`, `manifest.json`, and `styles.css`, plus checksums and SBOM.

#### Scenario: Version mismatch
- **WHEN** any canonical version source differs
- **THEN** the release job fails before tag or release creation

### Requirement: Release artifact excludes model capability
The production source, dependency graph, bundle, installed plugin, and public assets MUST exclude model files, model catalog/download/import code, ONNX runtime, model URLs, and model packaging scripts.

#### Scenario: Forbidden model marker appears
- **WHEN** a forbidden model dependency, filename, URL, API, or runtime marker appears in source or bundle
- **THEN** automated release scanning fails

### Requirement: Public assets are independently readable
After GitHub Release creation, the system MUST read the release metadata back through GitHub, fetch every required public asset without local credentials, verify HTTP success, byte size, and SHA-256 against the locally verified artifact, and install the exact assets into the test Vault for runtime readback.

#### Scenario: Public asset hash differs
- **WHEN** a downloaded public asset hash differs from the release checksum
- **THEN** the release is reported as invalid and Community Plugins submission does not proceed

### Requirement: Publication states remain distinct
The release report MUST separately state source pushed, tag pushed, GitHub Release created, assets publicly downloadable, Community Plugins registry listed, and staff reviewed. It MUST NOT infer registry inclusion or staff review from a GitHub Release or pull request.

#### Scenario: Community submission awaits review
- **WHEN** the registry pull request is open but not merged
- **THEN** the product is reported as publicly downloadable from GitHub Release and pending Community Plugins listing

### Requirement: Community Plugins submission follows official metadata rules
If the plugin ID is absent from the public registry, the release process SHALL fork or branch the official community plugin repository, add exactly one valid entry referencing the public repository, and create a reviewable pull request after public asset verification. If the plugin ID is already listed, no update PR SHALL be created.

#### Scenario: Plugin already listed
- **WHEN** the official registry already contains the plugin ID
- **THEN** the process skips registry modification and verifies directory indexing separately
