# Waymaker Taxi Services — Taxi Booking System

A self-service taxi booking system for Barbados. Built by
[OnlineEverywhere](https://onlineverywhere.com) for
**Waymaker Taxi Services** — island tours, airport pick-up transfers and
other functions, in one 13-seat air-conditioned van.

Contact the business at waymakertaxiservices@gmail.com or on Instagram
[@waymakertaxiservice_995](https://www.instagram.com/waymakertaxiservice_995).

> **Status: scaffold.** The app structure, booking flow and API are in place,
> but rates, branding and the domain are still to be confirmed with Waymaker.
> See [Placeholders](#placeholders) and `docs/waymaker-setup.md`.

## Architecture

```
frontend/       ← React 19 + Vite + TypeScript SPA (landing + booking flow)
backend/        ← FastAPI Cloud Run service (Sheets, Calendar, profiles)
agent/          ← ADK agent deployed to Vertex AI Agent Engine (chat interface)
Google Sheets   ← Services, Bookings, Profiles tabs (persistent data store)
Google Calendar ← Single-van availability tracking (backend)
Gmail API       ← Service account sends confirmation + notification emails
```

This mirrors the DonsRental setup (rentals.onlineverywhere.com), adapted for
taxi bookings: services instead of vehicles, trips instead of multi-day
rentals, and **no driver's-license step** — passengers don't drive.

## How it works

1. Customer opens the booking site → sees the landing page → clicks "Book Now"
2. Picks a service (airport transfer, island tour, other function)
3. Enters trip details — pickup, drop-off, date and time
4. Chooses passenger count (up to 13, the van's capacity)
5. Enters their info → reviews → confirms
6. Backend calculates the price server-side, writes the booking to
   **Google Sheets** (`Bookings` tab)
7. Backend creates a calendar event in **Google Calendar** (availability)
8. Backend sends a confirmation email to the customer + a notification to the
   owner via **Gmail API** (service account)
9. Customer profiles saved to the `Profiles` sheet → auto-fill on next booking

## Booking flow

Service → Trip Details → Passengers → Your Info → Review → Confirmed

## Live site

- **URL:** TBD — subdomain choice pending (e.g. taxis.onlineverywhere.com or
  waymaker.onlineverywhere.com)
- **Backend:** Cloud Run (europe-west1)
- **Agent:** Vertex AI Agent Engine

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
back to the local service list, and booking/availability endpoints return
clear "not configured" errors instead of crashing. See
`backend/services_config.py` for the service list.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SPREADSHEET_ID` | Yes | Google Sheet ID (Services, Bookings, Profiles tabs) |
| `GOOGLE_SHEETS_CREDENTIALS` | Yes | Service account JSON (full, one line) |
| `GOOGLE_CALENDAR_ID` | Yes | Google Calendar for availability tracking |
| `OWNER_EMAIL` | Yes | Booking notification emails (waymakertaxiservices@gmail.com) |
| `AGENT_ENGINE` | Yes | Vertex AI Agent Engine resource |
| `ADMIN_KEY` | Yes | API key for admin endpoints (stored in Secret Manager) |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | Google Sign-In OAuth client ID |
| `VITE_API_BASE` | No | Frontend API URL (default: http://localhost:8000/api) |

**Critical:** `GOOGLE_SHEETS_CREDENTIALS` must be the **entire service account
JSON** as a single-line string, not just the key ID.

## Features

- **Landing page** — Services, island tour route, how-it-works, book-now CTA
- **6-step booking flow** — Service → Trip → Passengers → Info → Review →
  Confirmed
- **Availability calendar** — Days with existing van bookings marked, so
  customers pick a free date
- **Server-side pricing** — Price calculated from the service rate, never
  trusted from the client
- **Google Sign-In** — Auto-fill profile data from previous bookings
  (scaffolded; wire the OAuth client ID to enable)
- **Terms & Privacy** — Legal pages with acceptance checkbox
- **Admin dashboard** — Owner view of bookings (admin key required)
- **Chat agent** — ADK agent answers tour/availability questions and can
  create bookings
- **SEO** — Meta tags, Open Graph, JSON-LD

## Security

- Cloudflare Turnstile CAPTCHA on the booking endpoint (wire the site key in
  the frontend; verify server-side before enabling in production)
- Rate limiting on bookings (10/min per IP, in-memory; see `backend/main.py`)
- `GET /api/bookings` and `GET /api/profiles` require the admin key
  (protects customer PII)
- CORS restricted to production domains
- Calendar events set to private visibility
- No PII logged to files
- Input validation via Pydantic

## Placeholders

Deliberately left blank until Waymaker confirms them — do not guess:

- **Rates** — `backend/services_config.py` marks every rate as TBD. Bookings
  for a service without a confirmed rate are refused with a clear error.
- **Branding** — colours in `frontend/src/index.css` and the landing page
  copy are placeholders; Waymaker has not supplied a logo or palette yet.
- **Domain** — subdomain undecided; CORS allow-list and deploy scripts use
  placeholder values.
- **Booking rules** — advance-notice window, cancellation terms and payment
  method are still to be confirmed.

## Files

| Path | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app, Sheets, Calendar, profiles, booking endpoints |
| `backend/services_config.py` | Service list + server-side pricing (rates TBD) |
| `agent/main.py` | ADK agent + tools (get_services, check_availability, create_booking) |
| `agent/deploy.py` | Deploy agent to Vertex AI Agent Engine |
| `frontend/src/App.tsx` | Main booking app (6 steps, availability calendar) |
| `frontend/src/pages/LandingPage.tsx` | Landing page with Waymaker services + tour route |
| `frontend/src/components/AvailabilityCalendar.tsx` | Calendar component |
| `frontend/src/services/api.ts` | Backend API integration |
| `frontend/src/pages/TermsAndConditions.tsx` | Terms & Conditions page |
| `frontend/src/pages/PrivacyPolicy.tsx` | Privacy Policy page |
| `frontend/src/pages/AdminDashboard.tsx` | Owner dashboard (stub) |
| `deploy-cloudrun.sh` | Deploy backend to Cloud Run |
| `cloudbuild.yaml` | Cloud Build config (auto-deploys on push) |
| `docs/waymaker-setup.md` | Condensed setup notes + open gaps |
| `.env` | Secrets (DO NOT COMMIT) |
