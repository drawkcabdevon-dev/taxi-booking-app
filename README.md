# Waymaker Taxi Services — Taxi Booking System

A self-service taxi booking system for Barbados. Built by
[OnlineEverywhere](https://onlineverywhere.com) for
**Waymaker Taxi Services** — island tours, airport pick-up transfers and
other functions, in one 13-seat air-conditioned van.

Contact the business at waymakertaxiservices@gmail.com or on Instagram
[@waymakertaxiservice_995](https://www.instagram.com/waymakertaxiservice_995).

> **Status: preview.** Bookings are submitted as REQUESTS for Bryan & Marcia
> to review and price. No rate is quoted or calculated in the app, and no
> booking is ever confirmed automatically. See [Placeholders](#placeholders).

## Architecture

```
frontend/       ← React 19 + Vite + TypeScript SPA (landing + booking flow + chat)
backend/        ← FastAPI service: /api/chat, /api/booking-requests, /api/services
agent/          ← ADK booking-request agent (tools: get_services)
Google Sheets   ← Services, Bookings (requests), Profiles tabs
Gmail API       ← Owner notification on every new request
WhatsApp        ← Requests handed to Marcia on (246) 239-7278
```

Only the booking-scaffolding pattern comes from DonsRental. This app is
taxi-only: **no vehicle selection, no per-day cost, no availability calendar,
no rental-style tools** and no driver's-license step.

## How it works

1. Customer uses "Chat to book" or the booking form
2. The ADK agent collects: service → trip → passengers → contact → confirm
3. The customer sees a summary and agrees to send a **booking request**
4. The request is written to the **Bookings** sheet with status
   `request_received` and no price
5. The owner is emailed, and the request is handed to Marcia's WhatsApp
6. Bryan & Marcia review, quote the rate, and confirm directly with the customer

## Booking flow

Service → Trip → Passengers → Contact → Confirm (booking request, not confirmation)

## Live site

- **Preview:** https://drawkcabdevon-dev.github.io/taxi-booking-app/ (branch
  `preview`; add a cache-buster like `?v=12` when checking a new build)
- **Production URL:** TBD — subdomain choice pending
- **Backend:** Cloud Run (europe-west1) once credentials/domain are wired
- **Agent:** ADK agent behind `/api/chat`; static preview uses the same turn
  contract locally so it can be reviewed without GCP credentials

## Quick start (local)

```bash
# 1. Set up .env (copy from .env.example and fill in values)
cp .env.example .env

# 2. Install backend dependencies
(cd backend && pip install -r requirements.txt)

# 3. Install frontend dependencies
(cd frontend && npm install)

# 4. Run backend (from repository root)
(cd backend && uvicorn main:app --reload --port 8000)

# 5. Run frontend in separate terminal (from repository root)
(cd frontend && npm run dev)
```

Without Google credentials the backend still starts: `/api/services` falls
back to the local service list and `/api/chat` uses the local agent turn;
request writes return a clear "not configured" error instead of claiming
success. See `backend/services_config.py` for the service list.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SPREADSHEET_ID` | Yes | Google Sheet ID (Services, Bookings, Profiles tabs) |
| `GOOGLE_SHEETS_CREDENTIALS` | Yes | Service account JSON (full, one line) |
| `OWNER_EMAIL` | Yes | Request notification emails (waymakertaxiservices@gmail.com) |
| `GOOGLE_API_KEY` / `GOOGLE_APPLICATION_CREDENTIALS` | For live ADK | Enables the ADK runner; without it `/api/chat` uses the local turn |
| `ADMIN_KEY` | Yes | API key for admin endpoints (stored in Secret Manager) |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | Google Sign-In OAuth client ID |
| `VITE_API_BASE` | No | Backend API URL; when unset the static preview uses the local agent adapter |

**Critical:** `GOOGLE_SHEETS_CREDENTIALS` must be the **entire service account
JSON** as a single-line string, not just the key ID.

## Features

- **Landing page** — Services, island tour route, how-it-works, book-now CTA
- **Booking request flow** — Service → Trip → Passengers → Contact → Confirm;
  rates are quoted on review, never in the app
- **ADK chat agent** — Drives the same flow in natural language via `/api/chat`;
  the static preview uses an offline adapter with the same contract
- **WhatsApp handoff** — Prefilled request to Marcia on (246) 239-7278
- **Concierge** — "Plan Your Tour" collects planned stops as a request
- **Welcome sign designer** — Carries the airport sign design into the request
- **Google Sign-In** — Profile auto-fill (scaffolded; wire the OAuth client ID)
- **Terms & Privacy** — Legal pages with acceptance checkbox
- **Admin dashboard** — Owner view of requests (admin key required)
- **SEO** — Meta tags, Open Graph, JSON-LD

## Security

- Cloudflare Turnstile CAPTCHA on the request endpoint (wire the site key in
  the frontend; verify server-side before enabling in production)
- Rate limiting on requests (10/min per IP, in-memory; see `backend/main.py`)
- `GET /api/bookings` and `GET /api/profiles` require the admin key
  (protects customer PII)
- CORS restricted to local dev + the GitHub Pages preview + the production domain
- No PII logged to files
- Input validation via Pydantic

## Placeholders

Deliberately left blank until Waymaker confirms them — do not guess:

- **Rates** — intentionally absent. Bryan & Marcia quote each request on
  review; do not add fixed rates to the backend or the chat.
- **Branding** — colours in `frontend/src/index.css` and the landing page
  copy are placeholders; Waymaker has not supplied a logo or palette yet.
- **Domain** — subdomain undecided; CORS allow-list and deploy scripts use
  placeholder values.
- **Booking rules** — advance-notice window, cancellation terms and payment
  method are still to be confirmed.

## Files

| Path | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app: `/api/chat`, `/api/booking-requests`, Sheets, profiles |
| `backend/services_config.py` | Service list (no pricing) |
| `agent/main.py` | ADK booking-request agent (`get_services` only) + local turn fallback |
| `agent/deploy.py` | Deploy agent to Vertex AI Agent Engine |
| `frontend/src/App.tsx` | Main booking app (request flow) |
| `frontend/src/components/ChatWidget.tsx` | ADK-driven chat UI |
| `frontend/src/services/bookingAgent.ts` | Agent turn client + offline adapter |
| `frontend/src/pages/LandingPage.tsx` | Landing page with Waymaker services + tour route |
| `frontend/src/services/api.ts` | Backend API integration |
| `frontend/src/pages/TermsAndConditions.tsx` | Terms & Conditions page |
| `frontend/src/pages/PrivacyPolicy.tsx` | Privacy Policy page |
| `frontend/src/pages/AdminDashboard.tsx` | Owner dashboard (stub) |
| `deploy-cloudrun.sh` | Deploy backend to Cloud Run |
| `cloudbuild.yaml` | Cloud Build config (auto-deploys on push) |
| `docs/waymaker-setup.md` | Condensed setup notes + open gaps |
| `.env` | Secrets (DO NOT COMMIT) |
