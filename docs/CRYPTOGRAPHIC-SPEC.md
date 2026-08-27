# Cryptographic Specification

**版本：** 1.0.0 LOCKED  
**禁止實作者自行更改參數。**

---

# 1. Primitives

| Purpose | Primitive | Parameters |
|---|---|---|
| Passphrase KDF | scrypt | N=131072, r=8, p=1, dkLen=32, maxmem=256 MiB |
| Root/data encryption | AES-256-GCM | 32-byte key, 12-byte IV, 16-byte tag |
| Domain key derivation | HKDF-SHA-256 | 32-byte output |
| Token authentication | HMAC-SHA-256 | truncate first 12 bytes |
| Canonical fingerprint | HMAC-SHA-256 | full 32 bytes inside encrypted Mapping |
| File hash | SHA-256 | lowercase hex |
| Random | OS CSPRNG | Node `randomBytes` equivalent |

---

# 2. Key Hierarchy

```text
Client Passphrase
  └─ scrypt(salt) → KEK
       └─ AES-GCM unwrap → CRK
            ├─ HKDF(client-profile) → client profile key
            ├─ HKDF(dictionary) → dictionary key
            ├─ HKDF(client-audit) → client audit key
            └─ HKDF(job-wrap + jobId) → Job Wrap Key
                  └─ AES-GCM unwrap → JRK
                       ├─ HKDF(job-data) → Job Data Key
                       ├─ HKDF(token-auth) → Token Auth Key
                       ├─ HKDF(audit-chain) → Job Audit Key
                       ├─ HKDF(package-auth) → Package Auth Key
                       └─ HKDF(canonical-fingerprint) → Fingerprint Key
```

固定 HKDF Info：

```text
PB/v1/client-profile
PB/v1/dictionary
PB/v1/client-audit
PB/v1/job-wrap
PB/v1/job-data
PB/v1/token-auth
PB/v1/audit-chain
PB/v1/package-auth
PB/v1/canonical-fingerprint
```

Client-level HKDF Salt：

```text
SHA-256("PrivacyBridge|1|" + storeId + "|" + clientId)
```

Job-level HKDF Salt：

```text
SHA-256("PrivacyBridge|1|" + clientId + "|" + jobId)
```

---

# 3. Envelope

Base64url 無 padding。

```json
{
  "envelopeVersion": "PBENC1",
  "contentSchema": "...",
  "contentVersion": "1.0.0",
  "keyId": "...",
  "recordType": "ENTITY_MAP",
  "cipher": {
    "algorithm": "AES-256-GCM",
    "iv": "...",
    "ciphertext": "...",
    "authTag": "..."
  },
  "aad": {
    "storeId": "...",
    "clientId": "...",
    "jobId": "...",
    "recordType": "ENTITY_MAP",
    "canonical": "..."
  },
  "createdAt": "..."
}
```

Canonical AAD bytes：

```text
PBENC1\0<storeId>\0<clientId>\0<jobId-or-empty>\0<contentSchema>\0<contentVersion>\0<recordType>
```

讀取時必須重新計算 canonical AAD，不信任 envelope 內的 `canonical` 字串。

---

# 4. Token

```text
⟦PB:<TYPE>:<ID>:<TAG>⟧
```

```text
ID = CrockfordBase32(randomBytes(10))      // 16 chars
payload = "PB|1|" + jobId + "|" + TYPE + "|" + ID
TAG = CrockfordBase32(HMAC-SHA256(tokenKey, payload)[0:12]) // 20 chars
```

驗證順序：

1. Grammar
2. Type enum
3. HMAC constant-time compare
4. Mapping lookup
5. Handling policy

錯誤訊息不區分 HMAC 失敗與 Mapping 不存在。

---

# 5. Passphrase Handling

- 不 normalize。
- 轉 UTF-8 後交給 scrypt。
- UI 隱藏輸入。
- 不 trim；前後空格是 Passphrase 的一部分，UI 必須提示。
- 建立時輸入兩次。
- 不提供 hint。
- 不送 Clipboard。
- 派生完成後 best-effort overwrite Buffer。
- JavaScript immutable string 無法保證清除；Threat Model 明確列為 residual risk。

---

# 6. IV Policy

每次 AES-GCM encrypt 都呼叫 CSPRNG 產生新 12-byte IV。不得：

- 使用 timestamp
- 使用 counter 代替 random
- 從 record ID Hash
- 重用 test vector IV
- 在 retry 中重用 prior IV

測試使用固定 IV 只能出現在 `crypto-test-vectors.json` 與 test code。

---

# 7. Constant-time Operations

Token tag、Hash chain與 key verification 使用 constant-time compare。不得以普通字串 `===` 比較秘密 MAC。

---

# 8. Key Rotation

v1 只支援：

- Passphrase rewrap CRK
- Backup passphrase rewrap JRK

不提供自動 CRK／JRK rotation。若未來輪替 JRK，必須視為 major migration，因為 Token 與已匯出資料會受影響。

---

# 9. Test Vector

`examples/crypto-test-vectors.json` 鎖定：

- scrypt KEK
- CRK wrap ciphertext／tag
- Job wrap key
- JRK wrap ciphertext／tag
- Job data／token keys
- Token ID／tag／完整 Token
- Data envelope ciphertext／tag

所有平台必須完全一致。
