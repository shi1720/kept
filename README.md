# Kept

Clear agreements. Shared evidence. PayPal payments.

Kept turns freelance conversations into milestone agreements, helps both sides review delivered work, and carries out agreed settlements through PayPal.

**[Open the app](https://kept-pacts.web.app)** · **[Watch the 2:28 demo](https://youtu.be/VjomrcUw4qQ)**

## Try it

1. Choose **Explore the demo**, then Maya (client) or Ana (freelancer).
2. Follow the first-visit guide. Switch personas in the header to see both sides.
3. Open a pact to inspect the signed terms, milestones, and evidence.
4. As Ana, submit work on the landing-page pact. The sample picker includes complete, incomplete, and hidden-instruction examples.
5. As Maya, review the criterion-level findings, approve, request a revision, or raise an issue. Vague revision feedback is clarified privately before you confirm the exact instruction sent to Ana. Extra work stays outside included revisions.
6. Add both parties' statements in mediation. Both must accept the current proposal before it can settle.
7. Open **Settings > AI providers** for the five-request allowance and personal provider settings.

This is a **sandbox test release**. No real money moves. Seeded demo payments and verdicts are explicitly marked simulations or examples. New funding uses PayPal sandbox when credentials are configured. The app records captured funds as a held balance and later uses Payouts and refunds. It is not a licensed escrow service or a PayPal escrow product. Real-money launch requires an approved payment and operational model.

## What works

- Durable background AI jobs with saved results and refresh recovery on Firebase.
- AI chat-to-contract drafting, ambiguity checks, scam-pattern warnings, and editable milestones.
- Signed scope, review guidance, creative references, revision limits, and acceptance criteria.
- PayPal Orders creation and capture, Payouts, partial refunds, verified webhooks, and a balanced ledger.
- Evidence extraction for text, documents, images, URLs, and GitHub repositories, with hidden-instruction screening.
- AI referee findings with confidence, evidence, and reasoning. Dimensions and keyword matches cannot establish creative quality.
- Mediation proposals based on the signed agreement and both statements. Changed statements invalidate earlier acceptances. Rejected proposals remain frozen for operator review.
- Review-window sweeping. Automatic release requires a confident, evidenced pass from an online provider with no injection flag. Uncertain or offline reviews do not auto-release.
- Email signup, verification, password reset, invitations, session revocation, and encrypted personal AI keys.
- REST and MCP interfaces for agents, and an AG Grid operations console.

## AI providers

The hosted app defaults to Gemini 3.1 Pro Preview through Vertex AI. Each account includes five successful requests. Failed online calls refund that allowance. Users can configure their own Gemini, OpenAI, or Anthropic key and model in Settings. Provider keys are encrypted at rest and never sent back to the browser.

Model names can be changed to an ID available to the user's provider account. When an online provider fails, the interface identifies the deterministic fallback. Offline creative judgments remain uncertain; an offline mediation split is only a starting point, not a valuation.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no PayPal or AI credentials, the app runs its labelled simulator and deterministic checks. SQLite data is stored under `data/`.

For live sandbox integrations, set PayPal sandbox credentials, a webhook ID, and either a Gemini key or `GOOGLE_CLOUD_PROJECT_FOR_AI` with Application Default Credentials. Configure SMTP or Resend for delivery of account emails. Never commit credentials.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Unit tests cover state transitions, balanced accounting, idempotency, webhook verification, payment retries, concurrent allowance reservations, creative-review safeguards, and stale mediation proposals. Browser tests cover account recovery and the two-person contract and settlement flows. Automated local payment tests use the simulator; they do not establish that real PayPal transfers succeeded.

`GET /api/health` checks database availability. `GET /api/doctor` reports integration configuration without spending credits. Operator-only `POST /api/doctor`, authorized with the cron secret, performs sandbox connectivity checks.

## Deploy

See [Firebase deployment](docs/FIREBASE.md) for Hosting, Cloud Run, persistent libSQL, scoped secrets, Vertex AI, and the scheduled review sweep. `scripts/deploy-firebase.sh` runs checks and deploys the application to the clean Firebase URL.

## Agents

Create a key in **Agents & API**. Connect an MCP client to `/api/mcp` with `Authorization: Bearer kept_sk_...`. The in-app reference documents the available tools. Payment approval and settlement still follow the pact's authorization rules.

## License

[MIT](LICENSE).
