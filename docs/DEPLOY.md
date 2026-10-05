# Deploying Kept (≈15 minutes)

This is the exact sequence to get the hosted demo live with **real PayPal sandbox** payments and **Claude** as the referee. Everything here is free except the AI key (Anthropic), and Gemini's free tier works as an alternative.

## 1. PayPal sandbox app (5 min)

1. Sign in at <https://developer.paypal.com> → **Apps & Credentials** → make sure the toggle says **Sandbox**.
2. **Create App** → name `Kept`, type **Merchant** → Create.
3. Copy the **Client ID** and **Secret** (click *Show*).
4. On the same app page, scroll to **Features** and make sure these are ticked, then **Save**:
   - Accept payments (default)
   - **Payouts**
   - **Log in with PayPal** *(optional — see step 6)*
   - **Disputes** *(optional — enables the chargeback shield)*
5. **Testing Tools → Sandbox Accounts**: note the default **Personal** account email (`sb-…@personal.example.com`). Click ⋯ → *View/Edit account* to see its password. This account:
   - is the **buyer** you log in with in the PayPal popup during the demo, and
   - is the **payout receiver** for demo freelancers (`PAYPAL_DEMO_PAYOUT_EMAIL`).

   > Tip: you can also create a second personal account for the receiver so the buyer and the freelancer are different people.

## 2. AI key (2 min)

- **Claude (recommended):** <https://console.anthropic.com> → *API Keys* → *Create Key*. Add a few dollars of credit; each review costs a few cents.
- **or Gemini (free):** <https://aistudio.google.com/apikey> → *Create API key*.

## 3. Database (optional, 3 min)

Render's free web service has an ephemeral disk, so the default SQLite file resets on each deploy/restart. That's fine for a demo (every visitor gets a fresh demo world), but for persistence create a free **Turso** database:

```bash
# https://turso.tech → sign in with GitHub → Create database "kept"
turso db show kept --url          # libsql://kept-<you>.turso.io
turso db tokens create kept       # DATABASE_AUTH_TOKEN
```

## 4. Render (5 min)

1. Sign in at <https://render.com> with GitHub and allow access to `shi1720/paypal-ai`.
2. **New → Blueprint** → select the repo → branch `claude/compassionate-wright-0no9vb` (or `main` once merged). Render reads [`render.yaml`](../render.yaml).
3. Fill in the prompted environment variables:

| Variable | Value |
|---|---|
| `APP_URL` | optional on Render: Kept falls back to the `RENDER_EXTERNAL_URL` Render provides. Set it only if you add a custom domain |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | from step 1 |
| `PAYPAL_DEMO_PAYOUT_EMAIL` | the sandbox personal account email |
| `ANTHROPIC_API_KEY` *or* `GEMINI_API_KEY` | from step 2 |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | Turso values, or `file:./data/kept.db` and blank |
| `ADMIN_EMAILS` | your email, if you want the full ops console (it applies once you've verified that address) |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional, for email verification and password-reset emails (see step 8) |

`SESSION_SECRET` and `CRON_SECRET` are generated automatically.

4. Deploy. The public URL is used for PayPal return URLs, invite links and the MCP snippet.

## 5. PayPal webhooks (2 min)

1. Back in your PayPal app → **Webhooks** → *Add Webhook*.
2. URL: `https://<your-app>.onrender.com/api/webhooks/paypal`, events: **All events** (or at least `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.*`, `PAYMENT.PAYOUTS-ITEM.*`, `PAYMENT.PAYOUTSBATCH.*`, `CUSTOMER.DISPUTE.*`).
3. Copy the **Webhook ID** into Render as `PAYPAL_WEBHOOK_ID` and redeploy. Kept verifies every delivery with PayPal and rejects (401) anything it can't verify, so without the ID webhooks are ignored. The app still works, because captures and payouts are also confirmed synchronously and the sweeper reconciles statuses.

## 6. Log in with PayPal (optional, 2 min)

In the PayPal app → *Log in with PayPal* → **Advanced settings**:
- Return URL: `https://<your-app>.onrender.com/api/auth/paypal/callback`
- Tick **Full name**, **Email**, **Account verification status**, **PayPal account ID (payer ID)**
- Add a privacy policy and user agreement URL (your landing page URL is fine for the sandbox)

Then set `PAYPAL_LOGIN_ENABLED=true` in Render.

## 7. Verify

Open `https://<your-app>.onrender.com/api/doctor`. You should see:

```json
{ "checks": [
  { "name": "database", "status": "ok" },
  { "name": "paypal.oauth", "status": "ok" },
  { "name": "paypal.orders", "status": "ok" },
  { "name": "paypal.payouts", "status": "ok" },
  { "name": "paypal.webhooks", "status": "ok" },
  { "name": "ai", "status": "ok" }
] }
```

Then click **Try as Maya** on the landing page and walk the tour. In the PayPal popup either log in with the sandbox personal account, or choose **Debit or Credit Card** and use `4012 0000 3333 0026` (any future expiry, any CVV).

## 8. Emails (optional, 3 min)

Kept sends two kinds of email: "confirm your email" after sign-up, and "reset your password". Without a provider the app still works (the links are written to the server log), but real users need one:

1. Create a free account at <https://resend.com> (3,000 emails a month) → **API Keys** → *Create API key*.
2. In Render, set `RESEND_API_KEY` to that key.
3. To email anyone, verify a domain you own in Resend (**Domains** → *Add domain*, then add the DNS records it shows) and set `EMAIL_FROM` to something like `Kept <hello@yourdomain.com>`. Until you do, Resend only delivers to the email address you signed up to Resend with, which is enough to try the flow yourself.

`ADMIN_EMAILS` only takes effect for an address that has been verified, so sign up, open the verification email (or check the server log for the link), and you'll have the full ops console.

## Scheduled sweeper

The server runs the sweeper (auto-release, mediation on timeout, payout and refund retries, PayPal reconciliation) every minute while it's awake. A free Render instance sleeps when idle, so the repo also ships a GitHub Actions schedule, [`.github/workflows/sweep.yml`](../.github/workflows/sweep.yml), that calls `/api/cron/sweep` every 15 minutes. To turn it on, open the GitHub repo → **Settings → Secrets and variables → Actions** and add:

- `KEPT_URL`: your Render URL
- `CRON_SECRET`: the value Render generated (Render → your service → **Environment**)

Until both are set, the workflow does nothing.

## Keep it warm for judging

Render's free instances sleep after 15 minutes idle and take ~30–60 s to wake. During judging, add a free uptime monitor (e.g. UptimeRobot, 5-minute interval) on `/api/health`, or upgrade the instance to *Starter*.
