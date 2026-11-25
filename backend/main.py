"""Waymaker Taxi Services — booking API (FastAPI).

Mirrors the DonsRental backend layout, adapted for taxi bookings:
Google Sheets is the data store (Services / Bookings / Profiles tabs),
Google Calendar tracks single-van availability, and Gmail sends
confirmation + owner notification emails.

Graceful degradation: the app starts and serves /api/health and
/api/services (from the local config fallback) with no Google credentials
at all. Booking and availability endpoints return clear 503 errors when
their backing service is not configured, instead of crashing.

No driver's-license handling: passengers don't drive.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from collections import defaultdict, deque
from datetime import date, datetime
from email.message import EmailMessage
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from services_config import (
    RateNotSetError,
    calculate_price,
    get_service,
    service_to_dict,
    SERVICES,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("waymaker-taxi")

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "waymakertaxiservices@gmail.com")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID", "")
GOOGLE_CALENDAR_ID = os.environ.get("GOOGLE_CALENDAR_ID", "")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")
MAX_PASSENGERS = 13  # single 13-seat van

# CORS: production domains only. Add the chosen subdomain here once the
# domain is confirmed (e.g. https://taxis.onlineverywhere.com).
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # local dev
    "http://localhost:8000",
    # "https://taxis.onlineverywhere.com",  # TODO: uncomment once domain is chosen
]

app = FastAPI(title="Waymaker Taxi Services — Booking API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Rate limiting (in-memory, per instance). 10 bookings/min per IP.
# For multi-instance production, move this to Redis or Cloud Armor.
# ---------------------------------------------------------------------------

_BOOKING_HITS: defaultdict[str, deque] = defaultdict(deque)
BOOKING_RATE_LIMIT = 10
BOOKING_RATE_WINDOW_SECONDS = 60


def _check_booking_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = _BOOKING_HITS[client_ip]
    while hits and hits[0] <= now - BOOKING_RATE_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= BOOKING_RATE_LIMIT:
        raise HTTPException(
            status_code=429, detail="Too many booking attempts. Try again in a minute."
        )
    hits.append(now)


# ---------------------------------------------------------------------------
# Google clients (lazy — the app must import and start without credentials)
# ---------------------------------------------------------------------------

_google_clients: dict = {}


def _service_account_info() -> dict | None:
    raw = os.environ.get("GOOGLE_SHEETS_CREDENTIALS", "")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log.error("GOOGLE_SHEETS_CREDENTIALS is not valid JSON")
        return None


def _get_google_service(name: str, version: str):
    """Build a Google API client, or return None when not configured."""
    if name in _google_clients:
        return _google_clients[name]
    info = _service_account_info()
    if info is None:
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        scopes = {
            "sheets": ["https://www.googleapis.com/auth/spreadsheets"],
            "calendar": ["https://www.googleapis.com/auth/calendar"],
            "gmail": ["https://www.googleapis.com/auth/gmail.send"],
        }[name]
        creds = service_account.Credentials.from_service_account_info(
            info, scopes=scopes
        )
        service = build(name, version, credentials=creds, cache_discovery=False)
    except Exception:  # noqa: BLE001 — Google client failures must not crash the app
        log.exception("Failed to build Google %s client", name)
        return None
    _google_clients[name] = service
    return service


def _sheets_configured() -> bool:
    return bool(SPREADSHEET_ID) and _service_account_info() is not None


def _calendar_configured() -> bool:
    return bool(GOOGLE_CALENDAR_ID) and _service_account_info() is not None


def _gmail_configured() -> bool:
    return _service_account_info() is not None


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class BookingRequest(BaseModel):
    service_id: str
    pickup_location: str = Field(min_length=2, max_length=200)
    dropoff_location: str = Field(min_length=2, max_length=200)
    trip_date: date
    trip_time: str = Field(
        pattern=r"^([01]\d|2[0-3]):[0-5]\d$",
        description="24h time, HH:MM",
    )
    passengers: int = Field(ge=1, le=MAX_PASSENGERS)
    customer_name: str = Field(min_length=2, max_length=100)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=7, max_length=25)
    notes: str = Field(default="", max_length=500)
    return_trip: bool = False
    # Cloudflare Turnstile token (verified server-side once enabled).
    turnstile_token: str | None = None


class BookingResponse(BaseModel):
    booking_id: str
    service_id: str
    trip_date: date
    trip_time: str
    passengers: int
    total_bbd: float
    email_sent: bool


# ---------------------------------------------------------------------------
# Helpers — Sheets / Calendar / Gmail
# ---------------------------------------------------------------------------


def _append_sheet_row(tab: str, values: list[str]) -> bool:
    """Append a row to a Sheets tab. Returns False when Sheets is unavailable."""
    service = _get_google_service("sheets", "v4")
    if service is None or not SPREADSHEET_ID:
        return False
    try:
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{tab}!A1",
            valueInputOption="RAW",
            body={"values": [values]},
        ).execute()
        return True
    except Exception:  # noqa: BLE001
        log.exception("Failed to write to Sheets tab %s", tab)
        return False


def _read_sheet_rows(tab: str) -> list[list[str]]:
    service = _get_google_service("sheets", "v4")
    if service is None or not SPREADSHEET_ID:
        return []
    try:
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range=f"{tab}!A1:Z")
            .execute()
        )
        return result.get("values", [])
    except Exception:  # noqa: BLE001
        log.exception("Failed to read Sheets tab %s", tab)
        return []


def _create_calendar_event(booking: BookingRequest, total_bbd: float) -> bool:
    """Create a private availability event. False when Calendar is unavailable."""
    service = _get_google_service("calendar", "v3")
    if service is None or not GOOGLE_CALENDAR_ID:
        return False
    start = datetime.combine(
        booking.trip_date, datetime.strptime(booking.trip_time, "%H:%M").time()
    )
    # Taxi bookings block the van in 2-hour slots by default; refine once
    # booking rules (tour durations etc.) are confirmed with Waymaker.
    from datetime import timedelta

    end = start + timedelta(hours=2)
    body = {
        "summary": f"Taxi booking — {booking.service_id}",
        "description": (
            f"{booking.pickup_location} → {booking.dropoff_location}, "
            f"{booking.passengers} passenger(s). Booking total Bds${total_bbd:.2f}."
        ),
        "start": {"dateTime": start.isoformat(), "timeZone": "America/Barbados"},
        "end": {"dateTime": end.isoformat(), "timeZone": "America/Barbados"},
        "visibility": "private",
    }
    try:
        service.events().insert(
            calendarId=GOOGLE_CALENDAR_ID, body=body
        ).execute()
        return True
    except Exception:  # noqa: BLE001
        log.exception("Failed to create calendar event")
        return False


def _send_email(to: str, subject: str, body: str) -> bool:
    """Send via Gmail API. False when Gmail is unavailable."""
    service = _get_google_service("gmail", "v1")
    if service is None:
        return False
    message = EmailMessage()
    message["To"] = to
    message["From"] = OWNER_EMAIL
    message["Subject"] = subject
    message.set_content(body)
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    try:
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return True
    except Exception:  # noqa: BLE001
        log.exception("Failed to send email to %s", to)
        return False


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def _require_admin_key(x_admin_key: Annotated[str | None, Header()] = None) -> None:
    if not ADMIN_KEY:
        raise HTTPException(status_code=503, detail="Admin access not configured")
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict:
    """Liveness + which backing services are configured (no secrets)."""
    return {
        "status": "ok",
        "service": "waymaker-taxi-backend",
        "sheets_configured": _sheets_configured(),
        "calendar_configured": _calendar_configured(),
        "gmail_configured": _gmail_configured(),
    }


@app.get("/api/services")
def list_services() -> dict:
    """Service catalogue. Sheet rows override the local config when present;
    otherwise the local config in services_config.py is the fallback."""
    services = [service_to_dict(s) for s in SERVICES]
    if _sheets_configured():
        rows = _read_sheet_rows("Services")
        # Sheet shape: id | name | description | pricing_basis | price_bbd
        # A row with an empty price keeps the local TBD entry.
        for row in rows[1:]:  # skip header
            if len(row) < 2:
                continue
            for service in services:
                if service["id"] == row[0]:
                    service["name"] = row[1]
                    if len(row) > 2 and row[2]:
                        service["description"] = row[2]
                    if len(row) > 3 and row[3]:
                        service["pricing_basis"] = row[3]
                    if len(row) > 4 and row[4]:
                        try:
                            service["price_bbd"] = float(row[4])
                            service["rate_tbd"] = False
                        except ValueError:
                            pass
    return {"services": services}


@app.get("/api/availability")
def availability(trip_date: date) -> dict:
    """Booked time slots for a date (single van). 503 when Calendar is
    not configured — the frontend degrades to date-only picking."""
    if not _calendar_configured():
        raise HTTPException(
            status_code=503,
            detail="Availability calendar is not configured yet.",
        )
    service = _get_google_service("calendar", "v3")
    if service is None:
        raise HTTPException(
            status_code=503, detail="Availability calendar is unavailable."
        )
    day_start = datetime.combine(trip_date, datetime.min.time()).isoformat() + "Z"
    day_end = datetime.combine(trip_date, datetime.max.time()).isoformat() + "Z"
    try:
        events = (
            service.events()
            .list(
                calendarId=GOOGLE_CALENDAR_ID,
                timeMin=day_start,
                timeMax=day_end,
                singleEvents=True,
            )
            .execute()
            .get("items", [])
        )
    except Exception:  # noqa: BLE001
        log.exception("Failed to read calendar")
        raise HTTPException(
            status_code=503, detail="Availability calendar is unavailable."
        )
    booked = [
        {
            "start": e["start"].get("dateTime"),
            "end": e["end"].get("dateTime"),
        }
        for e in events
    ]
    return {"date": trip_date.isoformat(), "booked_slots": booked}


@app.post("/api/bookings", status_code=201)
def create_booking(booking: BookingRequest, request: Request) -> BookingResponse:
    """Create a booking. Price is calculated server-side — the client never
    supplies it. Refuses services whose rate is still TBD."""
    _check_booking_rate_limit(request)

    # TODO: verify booking.turnstile_token against the Turnstile API with
    # TURNSTILE_SECRET_KEY before enabling in production.
    if booking.trip_date < date.today():
        raise HTTPException(status_code=400, detail="Trip date is in the past.")

    service = get_service(booking.service_id)
    if service is None:
        raise HTTPException(status_code=400, detail="Unknown service.")

    try:
        total = calculate_price(booking.service_id, booking.passengers)
    except RateNotSetError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if booking.return_trip:
        total *= 2

    booking_id = f"WM-{int(time.time())}"

    if not _sheets_configured():
        raise HTTPException(
            status_code=503,
            detail="Booking storage is not configured yet.",
        )
    saved = _append_sheet_row(
        "Bookings",
        [
            booking_id,
            booking.service_id,
            booking.pickup_location,
            booking.dropoff_location,
            booking.trip_date.isoformat(),
            booking.trip_time,
            str(booking.passengers),
            booking.customer_name,
            booking.customer_email,
            booking.customer_phone,
            booking.notes,
            "return" if booking.return_trip else "one-way",
            f"{total:.2f}",
            datetime.now().isoformat(),
        ],
    )
    if not saved:
        raise HTTPException(
            status_code=503, detail="Could not save the booking. Try again."
        )

    _create_calendar_event(booking, total)
    _append_sheet_row(
        "Profiles",
        [
            booking.customer_email,
            booking.customer_name,
            booking.customer_phone,
            datetime.now().isoformat(),
        ],
    )

    # Emails are best-effort: a booking is not failed because email is down,
    # but the response says so plainly.
    customer_sent = _send_email(
        booking.customer_email,
        f"Waymaker Taxi Services — booking {booking_id} confirmed",
        (
            f"Hi {booking.customer_name},\n\n"
            f"Your Waymaker Taxi Services booking is confirmed:\n"
            f"  Service: {service.name}\n"
            f"  Trip: {booking.pickup_location} → {booking.dropoff_location}\n"
            f"  Date: {booking.trip_date.isoformat()} at {booking.trip_time}\n"
            f"  Passengers: {booking.passengers}\n"
            f"  Total: Bds${total:.2f}\n\n"
            f"Booking reference: {booking_id}\n"
            f"Questions? Email {OWNER_EMAIL}.\n"
        ),
    )
    owner_sent = _send_email(
        OWNER_EMAIL,
        f"New taxi booking {booking_id} — {service.name}",
        (
            f"New booking {booking_id}:\n"
            f"  Service: {service.name}\n"
            f"  Trip: {booking.pickup_location} → {booking.dropoff_location}\n"
            f"  Date: {booking.trip_date.isoformat()} at {booking.trip_time}\n"
            f"  Passengers: {booking.passengers}\n"
            f"  Customer: {booking.customer_name} "
            f"({booking.customer_email}, {booking.customer_phone})\n"
            f"  Notes: {booking.notes or '-'}\n"
            f"  Total: Bds${total:.2f}\n"
        ),
    )

    return BookingResponse(
        booking_id=booking_id,
        service_id=booking.service_id,
        trip_date=booking.trip_date,
        trip_time=booking.trip_time,
        passengers=booking.passengers,
        total_bbd=total,
        email_sent=customer_sent and owner_sent,
    )


@app.get("/api/bookings")
def list_bookings(_admin: None = Depends(_require_admin_key)) -> dict:
    """All bookings (admin only — protects customer PII)."""
    if not _sheets_configured():
        raise HTTPException(
            status_code=503, detail="Booking storage is not configured yet."
        )
    return {"bookings": _read_sheet_rows("Bookings")}


@app.get("/api/profiles")
def list_profiles(
    email: str | None = None, _admin: None = Depends(_require_admin_key)
) -> dict:
    """Saved customer profiles (admin only). Filter by email for auto-fill."""
    if not _sheets_configured():
        raise HTTPException(
            status_code=503, detail="Booking storage is not configured yet."
        )
    rows = _read_sheet_rows("Profiles")
    if email:
        rows = [r for r in rows if r and r[0].lower() == email.lower()]
    return {"profiles": rows}
