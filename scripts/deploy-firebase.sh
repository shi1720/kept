#!/usr/bin/env bash
set -euo pipefail
# Provision the persistent database and Secret Manager values first. See docs/FIREBASE.md.
PROJECT="${GCP_PROJECT:-gen-lang-client-0444960702}"
REGION="${GCP_REGION:-us-central1}"
TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
: "${KEPT_ENV_FILE:?Set KEPT_ENV_FILE to a non-committed Cloud Run environment YAML/JSON file}"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/kept/app:$TAG"
npm ci
npm run typecheck
npm run lint
npm test
npm run build
gcloud builds submit --project="$PROJECT" --tag="$IMAGE"
gcloud run deploy kept --project="$PROJECT" --region="$REGION" --image="$IMAGE" \
 --service-account="kept-runtime@$PROJECT.iam.gserviceaccount.com" --allow-unauthenticated \
 --port=3000 --memory=1Gi --cpu=1 --min-instances=0 --max-instances=3 --concurrency=20 --timeout=300 \
 --network=default --subnet=kept-run --vpc-egress=private-ranges-only \
 --env-vars-file="$KEPT_ENV_FILE" \
 --set-secrets=SMTP_PASSWORD=kept-smtp-password:latest,SESSION_SECRET=kept-session-secret:latest,CRON_SECRET=kept-cron-secret:latest,GEMINI_API_KEY=kept-gemini-api-key:latest,PAYPAL_CLIENT_ID=kept-paypal-client-id:latest,PAYPAL_CLIENT_SECRET=kept-paypal-client-secret:latest
npx firebase-tools deploy --only hosting --project="$PROJECT"
curl --fail --silent https://kept-pacts.web.app/api/health
