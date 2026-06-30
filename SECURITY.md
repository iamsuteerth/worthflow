# 🔒 Worth Flow — Security

How Worth Flow protects accounts, cloud saves, and the optional AI key. This is the
engineering reference; the end-user summary lives at
[worthflow.in/security](https://worthflow.in/security).

> **To report a vulnerability:** use GitHub **private** vulnerability reporting —
> *Security → Report a vulnerability*. Please don't open a public issue for security
> bugs. Acknowledged within 48 hours.

## Principles

- **No application server.** All forecasting runs in the browser. There is no backend
  that can read your plan; the only persistence is encrypted-in-transit writes the
  browser makes straight to S3 with your own short-lived credentials.
- **No secrets in the bundle.** Only public identifiers ship to the client (region,
  pool IDs). There is no Cognito client secret and no static AWS key anywhere.
- **Least authority.** Each signed-in user holds temporary IAM credentials scoped to
  their own S3 prefix — enforced by AWS, not by the app.
- **Zero-knowledge for the AI key.** The optional Gemini key and chat are encrypted in
  the browser under a passphrase the server never sees.

---

## 1. Authentication (Amazon Cognito)

Accounts are email + password, managed entirely by a Cognito User Pool
([`terraform/modules/cognito`](./terraform/modules/cognito)). Worth Flow never receives,
processes, or stores a raw password.

### Account creation (email + OTP verification)

1. Sign-up takes an email and password. Email is the username (case-insensitive).
2. Cognito emails a **6-digit verification code** from `noreply@worthflow.in`, delivered
   via Amazon SES with **DKIM + SPF**. The code **expires in 24 hours**.
3. The user enters the code (`confirmSignUp`) to activate the account.
4. A best-effort **PostConfirmation Lambda** stamps a `custom:member_since` attribute. It
   swallows its own errors and always returns, so it can never block confirmation.

### Sign-in (SRP — password never transmitted)

Sign-in uses **Secure Remote Password (`ALLOW_USER_SRP_AUTH`)**: the password is proven
to Cognito without ever being sent over the wire. Sessions renew via refresh tokens
(`ALLOW_REFRESH_TOKEN_AUTH`). The app client has **no secret** (`generate_secret = false`),
as is correct for a browser SPA.

### Password reset

Forgot-password issues an emailed code (`resetPassword`), then
`confirmResetPassword(code, newPassword)` sets a new password — same SES delivery path as
sign-up. The app never sees the old or new password in transit to Cognito (SRP/secure flows).

### Password policy

Enforced **server-side by Cognito**, mirrored client-side in
[`src/lib/validation.ts`](./src/lib/validation.ts) purely for instant UX feedback:

| Rule | Value |
| --- | --- |
| Minimum length | 8 |
| Uppercase / lowercase / number | required |
| Symbol | not required |

### Account-enumeration resistance

`prevent_user_existence_errors = ENABLED` returns uniform errors, so sign-in / reset
responses don't reveal whether an email is registered.

### Tokens at rest

`aws-amplify` holds short-lived Cognito JWTs in browser storage to authenticate S3
requests. They are **cleared on sign-out**, which also wipes the local plan and AI session
(see §4).

---

## 2. Authorization & per-user cloud isolation

After sign-in, the **Cognito Identity Pool** exchanges the user's JWT for **short-lived IAM
credentials** (STS) bound to an authenticated role. That role's S3 policy
([`terraform/modules/identity_pool`](./terraform/modules/identity_pool)) scopes every
object operation to the caller's **own** identity prefix:

```
arn:aws:s3:::worth-flow-saves/users/${cognito-identity.amazonaws.com:sub}/*
```

`ListBucket` is likewise constrained by an `s3:prefix` condition to that path. The browser
builds its key prefix from the same `identityId`
([`src/lib/storage.ts`](./src/lib/storage.ts)), but **isolation does not depend on the
client** — a request for any other user's prefix is denied by AWS at the IAM layer. The app
cannot override it.

**Bucket hardening** ([`terraform/modules/storage`](./terraform/modules/storage)):

| Control | Setting |
| --- | --- |
| Public access | fully blocked (ACLs + policy) |
| Encryption at rest | SSE-S3 (AES-256) |
| Encryption in transit | TLS |
| Versioning | enabled (recover overwritten/deleted saves) |
| Lifecycle | non-current plan versions expire 90 days; AI objects 30 days |
| CORS | limited to app origins; exposes `ETag` (for concurrency) |

---

## 3. Cloud saves

A saved plan is a `.wfplan` envelope:

```jsonc
{ "app": "wealth-forecast", "version": 3, "exportedAt": "…",
  "payload": "<base64(JSON of baseConfig + overrides + savedScenarios + undo/redo history)>",
  "checksum": "<SHA-256 of payload>" }
```

- **Integrity:** the SHA-256 checksum detects corruption/accidental tampering. It is *not*
  an authentication control (anyone can recompute it) — the real gate is schema validation.
- **Validation on load** ([`src/engine/importPlan.ts`](./src/engine/importPlan.ts)): file
  extension → checksum → base64 decode → **Zod schema**. Every field is typed and bounded;
  unknown or malformed input is rejected as *Invalid Plan File*. Deserialization is a plain
  `JSON.parse` into a validated shape — no `eval`, no dynamic code.
- **Manifest concurrency:** `manifest.json` indexes saves (≤ **5** per user). Writes use S3
  **optimistic concurrency** (`If-Match` / `If-None-Match`) with bounded retry; a lost race
  re-reads and retries. Delete commits the manifest before removing the object; a failed new
  upload cleans up its orphaned object.
- **AI objects** (`ai/keyblob.json`, `ai/conversation.json`) live under the same per-user
  prefix, outside the manifest (they don't count toward the 5-save cap), and hold only
  ciphertext (see §4).

---

## 4. AI assistant API key (BYOK, zero-knowledge)

The assistant is **optional, off by default**, and uses **your own** Google Gemini key.
There is **no Worth Flow proxy and no house API key** — requests go **browser-direct to
Google**. The key and chat are protected by a zero-knowledge vault
([`src/ai/keyVault`](./src/ai/keyVault)).

### Cryptography

| Step | Detail |
| --- | --- |
| Key derivation | `PBKDF2(passphrase, salt, 600 000, SHA-256)` |
| Salt | random 16 bytes, per key (stored, non-secret) |
| Wrapping key (KEK) | `AES-GCM-256`, **non-extractable** |
| Encryption | `AES-GCM` with a fresh random 12-byte IV per message (authenticated) |
| Epoch | `keyEpoch` (UUID) binds the key + chat generations |

### What the passphrase does

The passphrase is the **only** input that derives the KEK (via PBKDF2 + salt), and the KEK
encrypts both the API key and the chat. **The passphrase is never stored or transmitted** —
only the salt is. Decryption therefore requires re-entering the passphrase, or being on a
device that has cached the KEK. Forgetting it mints a new `keyEpoch`, which silently and
permanently abandons the old key and chat (they're unrecoverable by design).

### Where things live

| Item | Location | Form |
| --- | --- | --- |
| API key | S3 `ai/keyblob.json` | ciphertext + non-secret salt/iv/epoch |
| Chat history | S3 `ai/conversation.json` | ciphertext (same KEK) |
| KEK | IndexedDB (per device) + in-memory session | **non-extractable** `CryptoKey` handle |
| Plaintext key | memory only, during a single Gemini call | never persisted |
| Settings | `localStorage` | non-secret only (test-locked allow-list) |

`deriveKek` reads each blob's **own** stored iteration count, so the PBKDF2 cost can be
raised for new keys without orphaning existing ones. Sign-out aborts in-flight requests,
cancels pending writes, and clears the session + cached KEK; S3 stays encrypted.

### Egress

CSP `connect-src` allow-lists **only** `generativelanguage.googleapis.com` (alongside AWS
and Cognito). Only forecast figures and plan summaries are sent — never credentials,
account email, or internal record IDs (asserted by a redaction test).

### Honest threat model / limits

- **In use, the key is exposed to Google** (by design — it's their API) and to any
  script executing on the origin. Encryption-at-rest protects the *stored* key, not the
  *in-use* key. "Zero-knowledge" describes the Worth Flow/S3 backend, not Google.
- **XSS is the ceiling.** A script on the origin could use the cached (non-extractable) KEK
  to decrypt the blob, or read the plaintext key in memory. Non-extractability prevents
  raw-key *exfiltration*, not in-page *use* — so the client hardening in §5 matters.
- **Passphrase strength caps offline attacks.** Since PBKDF2 runs client-side there's no
  server-side throttle; if a blob ever leaked, resistance to an offline dictionary attack is
  set by 600k iterations × passphrase entropy. Choose a strong passphrase.

---

## 5. Client-side hardening

- **Security headers** ([`vercel.json`](./vercel.json), every response):
  `Content-Security-Policy` (script/style/connect/img/font sources, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`), HSTS (2-year, preload), `X-Frame-Options:
  DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a `Permissions-Policy`
  disabling camera/mic/geolocation.
- **No HTML injection sinks.** No `dangerouslySetInnerHTML`, `innerHTML`, or `eval` anywhere;
  React auto-escapes all user/imported/AI text.
- **AI markdown is rendered safely** via `react-markdown` **without `rehype-raw`** (raw HTML
  is treated as text), and links pass through an explicit allow-list
  ([`src/components/ai/markdownUrl.ts`](./src/components/ai/markdownUrl.ts)) that drops
  `javascript:`/`data:` and other non-http(s) schemes.

---

## Supported versions

Worth Flow is a continuously-deployed single application; only the current production
deployment at `worthflow.in` is supported. Fixes ship forward.

## Related docs

- [INFRA.md](./INFRA.md) — cloud architecture & Terraform
- [worthflow.in/security](https://worthflow.in/security) · [/privacy](https://worthflow.in/privacy)
