# Security Policy

## Alpha Notice

Privacy Bridge Alpha is for synthetic or test data only. Do not use it with production customer data until the Security Ready and GitHub Alpha gates have been independently verified for the actual release commit.

## Reporting

Do not open a public issue containing:

- customer data
- source note excerpts
- Mapping
- dictionary terms
- Passphrases
- keys
- full filesystem paths
- real tokens tied to a production Job

Use the repository's private security advisory process. Include only safe Error Codes, opaque IDs, version, OS family and reproduction steps using synthetic data.

## Supported Versions

During Alpha, only the latest tagged release receives fixes.

## Security Invariants

- Original Vault is read-only.
- No runtime network path or telemetry.
- Mapping and dictionary remain outside the Vault and encrypted.
- Unknown or cross-job tokens are rejected.
- Secret values are never reversibly tokenized.
