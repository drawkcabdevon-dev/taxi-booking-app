#!/usr/bin/env bash
# Deploy the Waymaker taxi booking backend to Cloud Run.
# Usage: GCP_PROJECT=<project-id> ./deploy-cloudrun.sh
# Requires: gcloud authenticated with a project that has Cloud Run enabled.
# Does NOT create Sheets/Calendar resources — set those env vars via
# Secret Manager / Cloud Run env vars before the first deploy.
set -euo pipefail

PROJECT="${GCP_PROJECT:-}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-waymaker-taxi-backend}"
IMAGE="gcr.io/${PROJECT}/waymaker-taxi-backend:latest"

if [ -z "$PROJECT" ]; then
  echo "Set GCP_PROJECT first: GCP_PROJECT=<project-id> ./deploy-cloudrun.sh" >&2
  exit 1
fi

echo "Building image ${IMAGE}..."
gcloud builds submit --project "$PROJECT" --tag "$IMAGE" .

echo "Deploying ${SERVICE} to Cloud Run (${REGION})..."
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "OWNER_EMAIL=waymakertaxiservices@gmail.com"

echo "Done. Set SPREADSHEET_ID, GOOGLE_SHEETS_CREDENTIALS, GOOGLE_CALENDAR_ID,"
echo "ADMIN_KEY and GOOGLE_OAUTH_CLIENT_ID in Cloud Run env vars / Secret Manager."
