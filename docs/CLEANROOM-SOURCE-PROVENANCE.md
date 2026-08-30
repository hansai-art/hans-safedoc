# Clean-room source provenance

## Identity

- Product: Hans SafeDoc / repository `hansai-art/privacy-bridge`
- Release line: `1.2.0`
- Clean-room assembly date: 2026-08-31
- Clean-room working directory: `/Users/jugang11/src/privacy-bridge-cleanroom`（本機路徑不構成公開source identity）

## Upstream baseline

- Source workspace used for the clean-room copy: `/Users/jugang11/src/privacy-bridge`
- Recorded upstream baseline commit before the copy: `232ff856a4f257ad0e23418e2d1613309ef0f233`
- The upstream workspace already contained tracked and untracked work beyond that commit. The clean-room source is therefore a reviewed derivative assembled from that workspace; it MUST NOT be represented as byte-identical to the baseline commit.
- The original workspace was not reset, stashed, cleaned, or overwritten.

## Deliberate exclusions

The clean-room release excludes research-only or distribution-ineligible assets, including:

- model training environments and caches;
- third-party or self-built NER model packages and weights;
- model catalog, downloader, importer, manager, ONNX runtime and inference wiring;
- research spikes not needed to build or test the released product;
- prior build artifacts, local Vault state and real user documents;
- credentials, signed URLs and network captures containing unrelated host traffic.

Only synthetic format fixtures required by deterministic tests were copied into `tests/fixtures/document-formats/`.

## Release authority

The first clean-room Git commit is the source authority for 1.2.0. Release artifacts must record that exact commit in `artifact-manifest.json`; a dirty tree, mismatched version, mismatched built manifest or missing SBOM blocks artifact creation.

The normative OOXML allowlist remains the three CSV files under `docs/`. `scripts/generate-ooxml-contracts.mjs` deterministically embeds their exact contents and combined SHA-256 into the production bundle. `security/ooxml-contract-bundle.test.ts` blocks a stale generated snapshot.
