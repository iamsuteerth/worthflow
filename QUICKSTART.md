# ⚡ Worth Flow — Local Dev Quickstart

Get the app running on your machine in a couple of minutes — **no AWS account, no cloud
credentials**. Local development runs in **mock mode**: authentication is emulated in your
browser's storage, and the forecasting engine (which does all the real work) runs entirely
client-side.

For the production/cloud setup (Cognito + S3 + Terraform), see **[INFRA.md](./INFRA.md)**.

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (required by Vite 8)
- **npm** (ships with Node)
- **Docker** — *optional*, only needed to test cloud-save (S3) flows locally via LocalStack

Check your versions:

```bash
node --version
npm --version
```

## 1. Install dependencies

```bash
npm install
```

## 2. Run the app (mock mode — no AWS)

```bash
npm run dev:mock
```

Open the printed URL (default **http://localhost:5173**). That's it — you're running.

`npm run dev:mock` is `vite --mode mock`, which loads the committed **[`.env.mock`](./.env.mock)**
file. It sets `VITE_AUTH_MODE=mock`, so:

- **No secrets and no AWS are required** — your real Cognito `.env` is never touched.
- Sign-up / sign-in are emulated in `localStorage`.

### Signing in under mock mode

1. Choose **Create account**, enter any email + a password (8+ chars, one upper, one lower, one number).
2. On the verification screen, enter **any 6-digit code** — mock mode doesn't check it.
3. Sign in with the email/password you just created.

> Plain `npm run dev` (without `:mock`) uses `.env`, which is configured for **cognito** mode and
> needs live AWS. Use `dev:mock` for everyday local work.

> **AI assistant in mock mode.** `.env.mock` sets `VITE_AI_ENABLED=true`, and mock mode auto-selects a
> deterministic offline AI provider — so you can exercise the whole assistant flow (key setup,
> passphrase unlock, chat, compaction) with **no real Gemini key and no network**. Use any
> `AIza…`-prefixed string as the key.

## 3. (Optional) Test cloud saves locally with LocalStack

Mock auth and the whole UI work without this. You only need it to exercise the **save/load to
cloud** code paths, which talk to S3.

```bash
npm run localstack:up      # starts LocalStack S3 (Docker); auto-creates the bucket + CORS
npm run dev:mock
# ... use the app, save/load plans ...
npm run localstack:down    # stop it when done
```

`.env.mock` already points `VITE_S3_ENDPOINT` at `http://localhost:4566`. If LocalStack isn't
running, the app still works — only save/load will surface an error. See
[INFRA.md → Local development with LocalStack](./INFRA.md#local-development-with-localstack) for details.

## Running the tests

A fast, dev-only [Vitest](https://vitest.dev) suite (no browser, no AWS):

```bash
npm test            # run once
npm run test:watch  # re-run on change while developing
```

Coverage spans two areas:

- [`src/engine/__tests__`](./src/engine/__tests__) — the calculation engine end to end (cashflow, FD/RD, XIRR, accounts, import/export, scenario building).
- [`src/ai/__tests__`](./src/ai/__tests__) — the AI bundle: the zero-knowledge key vault (WebCrypto round-trips, wrong-passphrase failure), the context pack (grounding, redaction, long-horizon scaling), error redaction, compaction, and the store flows (setup, send, the localStorage allow-list, cross-device merge).

## All the scripts

| Script | What it does |
| --- | --- |
| `npm run dev:mock` | **Local dev** — mock auth, no AWS (loads `.env.mock`) |
| `npm run dev` | Dev server in **cognito** mode (needs live AWS — see [INFRA.md](./INFRA.md)) |
| `npm run localstack:up` / `:down` | Start/stop local LocalStack S3 for cloud-save testing |
| `npm test` / `npm run test:watch` | Run the engine test suite |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Auth modes at a glance

| | `mock` (local dev) | `cognito` (production) |
| --- | --- | --- |
| Command | `npm run dev:mock` | `npm run dev` / deployed build |
| Env file | `.env.mock` (committed, no secrets) | `.env` / `.env.production` (gitignored) |
| AWS needed | No | Yes (Cognito + S3) |
| Auth | Emulated in `localStorage` | Real email + password, OTP verification |
| Cloud saves | Optional, via LocalStack S3 | Real S3, per-user isolation |

Full details of the cognito path — Terraform, env variables, deployment — are in
**[INFRA.md](./INFRA.md)**.

## Troubleshooting

- **Port 5173 already in use** — stop the other process, or run `npm run dev:mock -- --port 5174`.
- **Saving a plan errors in mock mode** — LocalStack isn't running. Start it with
  `npm run localstack:up` (requires Docker), or just ignore it if you're not testing saves.
- **`npm run dev` shows a blank/erroring login** — that's cognito mode without valid AWS config.
  Use `npm run dev:mock` for local work.

## Related docs

- 📖 [README.md](./README.md) — product overview and features
- 📘 [MANUAL.md](./MANUAL.md) — end-user guide
- 🏗️ [INFRA.md](./INFRA.md) — cloud infrastructure, Terraform, and deployment
