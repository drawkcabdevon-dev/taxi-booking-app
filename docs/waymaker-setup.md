# Waymaker Taxi Services — setup notes

Condensed setup info for this repo. Full brief lives in the OnLineEverywhere
workspace; this file keeps what a developer needs to finish and deploy the app.

## Client

- **Waymaker Taxi Services**, Barbados
- Instagram: [@waymakertaxiservice_995](https://www.instagram.com/waymakertaxiservice_995)
- Business email: waymakertaxiservices@gmail.com
- Services: island tours, airport pick-up transfers, other functions
- Vehicle: one 13-seat air-conditioned van
- Island tour route: historic Bridgetown, Rihanna Drive, Mount Gay rum tour,
  north coast, Sandy Lane, Speightstown, Animal Flower Cave, east coast.
  Guided by Bryan; local snacks and rum punch included.
- No website today — Instagram is their only online presence.

## Architecture (booking scaffolding only — taxi content)

React 19 + Vite + TypeScript frontend, FastAPI backend (`/api/chat`,
`/api/booking-requests`, `/api/services`), Google Sheets as the data store
(tabs: Services, Bookings, Profiles), Gmail API for owner notifications,
ADK booking-request agent behind `/api/chat`. Requests are also handed to
Marcia on WhatsApp: (246) 239-7278.

Booking flow: Service → Trip → Passengers (max 13) → Contact → Confirm.
Every submission is a **booking request** with status `request_received`;
Bryan & Marcia quote the rate on review. No vehicle selection, per-day cost,
availability calendar or rental-style tools. No license step — passengers
don't drive.

## Gaps — needed before deploy

1. **Rates** — quoted per request by Bryan & Marcia. Deliberately not stored
   or calculated in the app; do not add fixed prices to the backend.
2. **Coverage** — pickup zones / areas served.
3. **Branding** — logo file and colours. Frontend colours and copy are
   placeholders.
4. **Domain** — subdomain choice (e.g. taxis.onlineverywhere.com or
   waymaker.onlineverywhere.com). CORS allow-list, deploy scripts and
   frontend hosting all wait on this.
5. **Booking rules** — advance-notice window, cancellation terms, payment
   method (cash / deposit / card?).
6. **Tour options** — set routes vs custom, durations, what's included.
7. **Google credentials** — Sheet id + service account for request storage
   and owner notification. Until then `/api/chat` works locally and writes
   return a clear 503.

## Before launch checklist

- [ ] Rate-quoting process agreed with Bryan & Marcia (no fixed rates in app)
- [ ] Branding supplied and applied (colours, logo, landing copy)
- [ ] Domain chosen; CORS allow-list updated; frontend hosting wired
- [ ] Google Sheet created (Services / Bookings / Profiles tabs)
- [ ] Service account credentials in Secret Manager / Cloud Run env vars
- [ ] ADK credentials configured so `/api/chat` uses the live agent
- [ ] WhatsApp handoff confirmed with Marcia (246) 239-7278
- [ ] Turnstile site key + secret wired (frontend + backend verification)
- [ ] Booking rules confirmed and reflected in Terms page
- [ ] Owner walkthrough of the admin dashboard
