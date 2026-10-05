# Firebase deployment

The public endpoint is https://kept-pacts.web.app. Firebase Hosting rewrites application requests to the `kept` Cloud Run service in `us-central1`.

## Infrastructure

- Google Cloud project: `gen-lang-client-0444960702`.
- Dedicated runtime service account: `kept-runtime`.
- Artifact Registry repository: `kept`.
- Persistent libSQL server: GCE instance `kept-db`, internal port 8080. Its data directory is mounted from the persistent boot disk. Cloud Run connects over the `kept-run` subnet with private egress.
- Session, cron, SMTP, and PayPal secrets are stored in Secret Manager. The runtime receives access to the dedicated secrets only.
- Vertex AI is used with the runtime service account; no browser receives cloud credentials.
- Firebase forwards the `__session` cookie. Authenticated responses must never be publicly cached.

## Release

Create a non-committed environment file containing APP_URL, DATABASE_URL, AI_PROVIDER, GEMINI_MODEL, GOOGLE_CLOUD_PROJECT_FOR_AI, PAYPAL_ENV, PAYPAL_WEBHOOK_ID, PAYPAL_DEMO_PAYOUT_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, and EMAIL_FROM. Use sandbox PayPal credentials for this release.

```sh
GCP_PROJECT=gen-lang-client-0444960702 \
KEPT_ENV_FILE=/absolute/path/to/private/run-env.json \
IMAGE_TAG=release-unique-tag \
bash scripts/deploy-firebase.sh
```

The script runs type checking, lint, unit tests, and a production build before deployment. Run browser tests separately against the resulting release. Database migrations are additive and run on startup requests. Back up the database before schema changes.

The application uses a single writable libSQL primary. Cloud Run instances share that database, so redeploying or scaling the web service does not erase user data. This is a prototype availability configuration, not a multi-region database cluster.

## Scheduled work

Configure Cloud Scheduler to POST `/api/cron/sweep` every five minutes with `Authorization: Bearer <CRON_SECRET>`. The sweep reconciles payments and review windows. Keep the secret out of source control and command logs.

## Operational checks

- `/api/health`: database connectivity and configured integration modes.
- `/api/doctor`: public configuration status only.
- `POST /api/doctor`: operator-authorized sandbox integration checks.
- `/admin`: access-controlled ledger, payment, dispute, and AI audit views.

Keep sandbox and real-money environments separate. A demo receipt marked simulator is not a PayPal API receipt. Payouts may be pending or denied by PayPal; show and reconcile their actual status.

The hosted test environment has a `kept-review-sweep` job scheduled every five minutes and a `kept-daily-backup` disk snapshot schedule with seven-day retention. Disk snapshots are crash-consistent; periodically exercise database restoration before relying on them for production recovery.


## Durable AI requests

Firebase Hosting limits each request to 60 seconds. AI draft, review, and mediation jobs are persisted in `ai_jobs` and dispatched through a Cloud Tasks queue directly to Cloud Run. Configure `AI_TASK_QUEUE` as the full queue resource and `AI_WORKER_URL` as the direct Cloud Run `/api/internal/ai-worker` URL. Grant the runtime service account `roles/cloudtasks.enqueuer`. The worker uses a dedicated HMAC credential derived from `CRON_SECRET`; never expose it to clients.

The browser receives a job ID and polls an owner-protected endpoint. Reloading and retrying the same brief resumes the saved job through session storage. Active requests are deduplicated; task redelivery does not repeat an operation. The scheduled sweep re-dispatches queued jobs and marks interrupted workers for explicit recovery. A claimed job is not blindly retried after a crash, because provider consumption may already have occurred. Completed job data expires after seven days. Payments, payout approvals, and arbitration are excluded from this queue.
