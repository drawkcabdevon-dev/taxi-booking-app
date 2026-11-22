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

## Architecture (mirrors DonsRental)

React 19 + Vite + TypeScript frontend, FastAPI backend on Cloud Run,
Google Sheets as the data store (tabs: Services, Bookings, Profiles),
Google Calendar for single-van availability, Gmail API for confirmations,
ADK chat agent on Vertex AI Agent Engine.

Booking flow: Service → Trip Details → Passengers (max 13) → Your Info →
Review → Confirm. No license step — passengers don't drive. Pricing is per
trip / per tour, calculated server-side.

## Gaps — needed before deploy

1. **Rates** — airport transfer (one-way / return), island tour (half / full
   day?), other functions / hourly; per-trip or per-person? All rates in
   `backend/services_config.py` are TBD placeholders. Bookings are refused
   until rates are confirmed.
2. **Coverage** — pickup zones / areas served.
3. **Branding** — logo file and colours. Frontend colours and copy are
   placeholders.
4. **Domain** — subdomain choice (e.g. taxis.onlineverywhere.com or
   waymaker.onlineverywhere.com). CORS allow-list, deploy scripts and
   frontend hosting all wait on this.
5. **Booking rules** — advance-notice window, cancellation terms, payment
   method (cash / deposit / card?).
6. **Tour options** — set routes vs custom, durations, what's included.
7. **Day-to-day owner** — who gets notifications and manages the calendar.

## Before launch checklist

- [ ] Rates confirmed and entered (Services sheet or `services_config.py`)
- [ ] Branding supplied and applied (colours, logo, landing copy)
- [ ] Domain chosen; CORS allow-list updated; frontend hosting wired
- [ ] Google Sheet created (Services / Bookings / Profiles tabs)
- [ ] Google Calendar created and shared with the service account
- [ ] Service account credentials in Secret Manager / Cloud Run env vars
- [ ] Turnstile site key + secret wired (frontend + backend verification)
- [ ] Booking rules confirmed and reflected in Terms page
- [ ] Owner walkthrough of the admin dashboard
