# 🏗️ Worth Flow — Infrastructure & Deployment

This document describes the cloud infrastructure behind Worth Flow's accounts and cloud
saves: its architecture, how to provision it with Terraform, and how to deploy. To simply
run the app locally without AWS, start with **[QUICKSTART.md](./QUICKSTART.md)** — this doc
covers the cloud side, plus the optional LocalStack setup for exercising cloud-save code
paths locally.

> The application code never contains secrets. Everything sensitive lives in AWS, in
> gitignored env files, or in Terraform state — never in the bundle. The `VITE_*` values
> shipped to the browser are all public identifiers (see [Environment Variables](#environment-variables)).

## Architecture at a glance

```
                    ┌─────────────────────────────────────────────┐
   Browser (SPA)    │                    AWS (ap-south-1)         │
   ─────────────    │                                             │
   aws-amplify  ───────►  Cognito User Pool   ────┐               │
   (email + pwd)    │     (email/password,        │ PostConfirm.  │
                    │      OTP verification)      ▼               │
                    │                          Lambda (sets       │
                    │                        custom:member_since) │
                    │                                             │
   @aws-sdk/s3  ───────►  Cognito Identity Pool ──► temporary IAM │
   (cloud saves)    │     (JWT → AWS creds)        credentials    │
                    │                                  │          │
                    │                                  ▼          │
                    │                     S3 bucket (worth-flow-  │
                    │                     saves), per-user prefix │
                    │                                             │
   verification  ◄──────  Amazon SES (sends Cognito emails)       │
   emails           │                                             │
                    └─────────────────────────────────────────────┘
```

**Flow:**
1. A user signs up / signs in with email + password via **Cognito User Pool** (handled by `aws-amplify`).
2. On first confirmation, a **PostConfirmation Lambda** stamps a `custom:member_since` attribute.
3. Cognito emails (verification codes, password resets) are delivered through **Amazon SES**.
4. After sign-in, the **Cognito Identity Pool** exchanges the user's JWT for short-lived IAM
   credentials scoped to *that user's* S3 prefix.
5. The browser reads/writes save files directly to **S3** using those credentials — there is
   no application server.

## AWS resources (Terraform-managed)

All infrastructure lives in [`/terraform`](./terraform), split into five modules. Region is
`ap-south-1`; the AWS CLI profile is `worth-flow`; the app name prefix is `worth-flow`.

| Module | Resources | Notes |
| --- | --- | --- |
| `ses` | `aws_ses_email_identity` | Sender `worthflow.app@gmail.com`, display name "Worth Flow". |
| `cognito` | User Pool, User Pool Client, Lambda invoke permission | Email login, password policy (8+ chars, upper/lower/number), `custom:member_since` attribute, HTML verification email template, `prevent_user_existence_errors = ENABLED`, no client secret, SRP auth. |
| `post_confirmation` | Lambda, IAM role + policies, CloudWatch log group | Node.js 22 function that sets `custom:member_since`; logs retained 14 days. |
| `storage` | S3 bucket + public-access block, versioning, lifecycle, SSE, CORS | Bucket `worth-flow-saves`. Versioning on; non-current versions expire after 90 days; SSE-S3 (AES256); CORS limited to the app origins. |
| `identity_pool` | Identity Pool, authenticated IAM role + S3 policy, roles attachment | Authenticated users get S3 access scoped to `users/${cognito-identity.amazonaws.com:sub}/*` only. |

### Per-user data isolation

The authenticated IAM role's S3 policy uses the caller's own Cognito identity ID as the key
prefix, so a user can only ever touch their own objects:

```
arn:aws:s3:::worth-flow-saves/users/${cognito-identity.amazonaws.com:sub}/*
```

### S3 object layout

```
worth-flow-saves/
  users/
    <identityId>/
      manifest.json          # list of saves + precomputed stats (label, net worth, months, createdAt)
      1718700000000-a1b2c3d4.wfplan
      1718800000000-e5f6g7h8.wfplan
      ...
```

`manifest.json` is a lightweight index so the profile screen can list saves without
downloading every `.wfplan`. Save files are capped at **5 per user** (enforced in the UI).

## Provisioning from scratch

### Prerequisites

- Terraform ≥ 1.6
- AWS CLI configured with a profile named `worth-flow` (an IAM user/role with rights to create
  the resources above)
- A dedicated sender mailbox you control (currently `worthflow.app@gmail.com`)

### 1. Bootstrap the Terraform state backend (one time)

Terraform stores its state in S3 with native S3 locking (`use_lockfile`). The state bucket has
to exist before `terraform init`, so create it with the AWS CLI:

```bash
aws s3api create-bucket \
  --bucket worth-flow-tf-state --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1 --profile worth-flow

aws s3api put-bucket-versioning \
  --bucket worth-flow-tf-state \
  --versioning-configuration Status=Enabled --profile worth-flow

aws s3api put-public-access-block \
  --bucket worth-flow-tf-state \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile worth-flow

aws s3api put-bucket-encryption \
  --bucket worth-flow-tf-state \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --profile worth-flow
```

> No DynamoDB table is needed — locking uses the S3 backend's `use_lockfile` option.

### 2. Configure variables

Create `terraform/terraform.tfvars` (gitignored):

```hcl
sender_email = "worthflow.app@gmail.com"
```

Other variables (`aws_region`, `app_name`) have sensible defaults in
[`terraform/variables.tf`](./terraform/variables.tf).

### 3. Init & apply

```bash
cd terraform
terraform init       # connects to the S3 backend
terraform plan        # review — expect creates only, 0 to destroy
terraform apply
```

### 4. Verify the SES sender (manual, one time)

After apply, SES sends a verification email to the sender address. **Click the link** —
Cognito cannot send any emails until the sender identity is verified.

### 5. Lift the SES sandbox (for real users)

A new SES account is in **sandbox mode** and can only email verified recipients. To let any
user sign up, request production access:

> AWS Console → SES → Account dashboard → **Request production access**

While in the sandbox, add each test recipient under SES → Verified identities.

### 6. Wire the app to the new infrastructure

Grab the outputs and put them in `.env.production` (gitignored) and in your Vercel project
settings — see [Environment Variables](#environment-variables).

```bash
terraform output
# aws_region, cognito_client_id, cognito_identity_pool_id,
# cognito_user_pool_id, s3_bucket_name
```

## Environment variables

Two modes, selected by `VITE_AUTH_MODE`.

### Production (`cognito`)

All values are **public identifiers** — safe to expose in the client bundle. There are no
secrets (the Cognito client has no secret; there are no static AWS keys).

| Variable | Source | Example |
| --- | --- | --- |
| `VITE_AUTH_MODE` | fixed | `cognito` |
| `VITE_AWS_REGION` | `terraform output aws_region` | `ap-south-1` |
| `VITE_COGNITO_USER_POOL_ID` | `terraform output cognito_user_pool_id` | `ap-south-1_xxxxxxxxx` |
| `VITE_COGNITO_CLIENT_ID` | `terraform output cognito_client_id` | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `VITE_COGNITO_IDENTITY_POOL_ID` | `terraform output cognito_identity_pool_id` | `ap-south-1:xxxxxxxx-...` |
| `VITE_S3_BUCKET_NAME` | `terraform output s3_bucket_name` | `worth-flow-saves` |

> ⚠️ **User Pool ID vs Identity Pool ID** are easy to swap. The **User Pool** ID looks like
> `region_ShortCode`; the **Identity Pool** ID looks like `region:UUID`. Mixing them up causes
> "Sign up failed" with no useful client error.

A committed template lives at [`.env.production.example`](./.env.production.example).

### Local development (`mock`)

No AWS account required. Auth is emulated in `localStorage`; cloud saves can optionally hit a
local [LocalStack](#local-development-with-localstack) S3.

These values are **public, non-secret**, so they're committed in [`.env.mock`](./.env.mock) and
loaded automatically by `npm run dev:mock` (`vite --mode mock`) — your real `.env` (cognito) is
never touched:

```
VITE_AUTH_MODE=mock
VITE_AWS_REGION=ap-south-1
VITE_S3_BUCKET_NAME=worth-flow-saves
VITE_S3_ENDPOINT=http://localhost:4566
```

> New to the repo? Start with **[QUICKSTART.md](./QUICKSTART.md)** — it covers mock sign-in and the
> day-to-day local workflow.

## Deploying the frontend (Vercel)

1. Set the six production `VITE_*` variables in **Project → Settings → Environment Variables**
   (Production scope).
2. **Redeploy** — Vercel only picks up env-var changes on a new deployment.
3. The production origin (`https://worthflow.vercel.app`) must be in the S3 bucket's CORS
   `allowed_origins` (it is, via the `storage` module's `allowed_origins` input).

Build locally to sanity-check before pushing:

```bash
npm run build
```

## Local development with LocalStack

For exercising the cloud-save code paths without AWS, the repo includes a LocalStack S3 setup
(`docker-compose-local.yml` and `scripts/localstack-init.sh`, both committed):

- `docker-compose-local.yml` — runs `localstack/localstack:3` (v4+ requires a paid license, so
  the image is pinned to v3).
- `scripts/localstack-init.sh` — creates the `worth-flow-saves` bucket with CORS for
  `http://localhost:5173`. It's mounted into the container's `init/ready.d`, so LocalStack runs
  it **automatically** on startup — no manual step needed.

```bash
npm run localstack:up    # = docker compose -f docker-compose-local.yml up -d
npm run dev:mock         # loads .env.mock (VITE_AUTH_MODE=mock, VITE_S3_ENDPOINT set)
# ...
npm run localstack:down  # stop it when finished
```

Auth and the rest of the UI work without LocalStack — only save/load needs the S3 endpoint. In
mock mode, each emulated user gets an S3 prefix derived from their email, mirroring the per-user
isolation of the real Identity Pool.

## Operations notes

- **Destroying infra:** `terraform destroy` deletes the SES *email identity* (you'd re-click a
  verification email on the next apply) but **not** your SES production access, which is an
  account-level setting that persists. The `worth-flow-saves` bucket has `force_destroy = false`,
  so a destroy will fail until the bucket is manually emptied — an intentional guard against
  deleting user data.
- **Lambda logs:** retained 14 days in `/aws/lambda/worth-flow-post-confirmation`.
- **`member_since` is best-effort:** the PostConfirmation Lambda swallows its own errors and
  always returns, so a transient failure can never block a user from confirming their account.
- **Bucket recovery:** S3 versioning is enabled, so an accidental overwrite/delete of a save can
  be recovered from a prior version (non-current versions are pruned after 90 days).

## Related docs

- [QUICKSTART.md](./QUICKSTART.md) — run the app locally in mock mode (no AWS)
- [README.md](./README.md) — product overview and features
- [MANUAL.md](./MANUAL.md) — end-user guide (accounts, cloud saves, forecasting)
