# Hans SafeDoc 1.4.0 design

## Address privacy

`AddressPrivacyMode` is one of `FULL_REDACTION`, `KEEP_CITY`, or `KEEP_DISTRICT`. Only values already admitted as `TW_ADDRESS` by the deterministic detector may enter the splitter. The splitter preserves the exact source spelling of the public prefix and never normalizes user-visible text.

The Token identity remains bound to the full canonical address. For partial protection, only the private suffix is replaced and stored as `preferredDisplay`; this prevents two equal street suffixes in different cities from becoming the same entity. If the requested administrative component cannot be identified, the entire address is replaced.

The Safe Package manifest and analysis request record the non-sensitive address policy. They never contain the private suffix, Mapping, passphrase, Dictionary, or Token Key.

## Customer Dictionary Wizard

The existing exact-match engine remains authoritative. The wizard only creates a validated in-memory `Dictionary` from:

- existing strict JSON;
- CSV with required `term` and `type`, optional `aliases` and `caseSensitive`;
- pasted lines assigned to one supported business entity type.

Conflicting duplicate forms are rejected before replacing the current session dictionary. The user sees a preview and warnings for one-character terms and Alias counts. The dictionary remains session-only in 1.4.0.

## Safe handoff

After both files are atomically published, the plugin rereads them and verifies Safe Package structure, checksums, Package Hash, analysis-request pairing, allowed document IDs, privacy policy, and the Result JSON template. Only a successful report may render `SAFE_TO_UPLOAD`.

The native safe copy remains a local layout check. Clipboard APIs and direct cloud integrations remain excluded.

## Result Dry Run

Dry Run validates UTF-8, size and depth limits, Result Schema, Job ID, Package Hash, document IDs, known Token membership, Token HMAC, and a source recheck. It writes nothing. After explicit confirmation, restore reopens and revalidates the Result JSON before creating a new Result Vault.

Error explanations distinguish malformed Schema, Job or Package mismatch, Token verification failure, resource limits, and source changes without revealing whether a specific unknown Token exists.
