"""Waymaker Taxi Services — booking API (FastAPI).

Taxi-only. Google Sheets stores booking REQUESTS; Gmail notifies the owner.
Rates are quoted by Bryan & Marcia on review — there are no fixed prices,
vehicle choices, day rates or availability calendars in this service.

The ADK agent is reached through /api/chat (see ../agent/main.py). When ADK
credentials are absent the same turn contract is produced locally so the
frontend can still be exercised. Booking requests land in the Bookings tab
with status 'request_received' and are handed to Marcia's WhatsApp.

Graceful degradation: /api/health and /api/services work with no Google
credentials; writes return a clear 503 when storage is not configured.
"""

from __future__ import annotations

import base64
import importlib.util
import json
import logging
import os
import sys
import time
from collections import defaultdict, deque
from datetime import date, datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Annotated, Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from services_config import get_service, service_to_dict, SERVICES

# The ADK agent lives beside the backend in the repo. Load it by path under
# a distinct module name: both files are called main.py, so a plain import
# would resolve back to this module when uvicorn runs `main:app`.
_AGENT_PATH = Path(__file__).resolve().parent.parent / "agent" / "main.py"
_AGENT_SPEC = importlib.util.spec_from_file_location("waymaker_taxi_agent", _AGENT_PATH)
taxi_agent = importlib.util.module_from_spec(_AGENT_SPEC)
sys.modules[_AGENT_SPEC.name] = taxi_agent
_AGENT_SPEC.loader.exec_module(taxi_agent)

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("waymaker-taxi")

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "waymakertaxiservices@gmail.com")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID", "")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")
MAX_PASSENGERS = 13  # single 13-seat van
WHATSAPP_DISPLAY = taxi_agent.WHATSAPP_DISPLAY

# CORS: local dev + the GitHub Pages preview used for review.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
    "https://drawkcabdevon-dev.github.io",
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
    total_bbd: float | None = None  # legacy field; requests carry no price
    status: str = "request_received"
    email_sent: bool


class BookingRequestResponse(BaseModel):
    booking_id: str
    service_id: str
    trip_date: date
    trip_time: str
    passengers: int
    status: str = "request_received"
    rate: str = "quoted on review"
    email_sent: bool


class ChatPayload(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    stage: str = "service"
    draft: dict[str, Any] = Field(default_factory=dict)
    history: list[dict[str, str]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers — Sheets / Gmail / booking requests
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


def _create_request_record(booking: BookingRequest) -> BookingRequestResponse:
    """Store a booking REQUEST and notify the owner. No rate is calculated."""
    if booking.trip_date < date.today():
        raise HTTPException(status_code=400, detail="Trip date is in the past.")
    service = get_service(booking.service_id)
    if service is None:
        raise HTTPException(status_code=400, detail="Unknown service.")
    if not _sheets_configured():
        raise HTTPException(
            status_code=503,
            detail="Booking request storage is not configured yet.",
        )

    reference = f"WM-REQ-{int(time.time())}"
    draft = booking.model_dump(mode="json")
    whatsapp = taxi_agent.whatsapp_link(reference, draft)
    saved = _append_sheet_row(
        "Bookings",
        [
            reference,
            "request_received",
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
            "rate quoted on review",
            datetime.now().isoformat(),
            whatsapp,
        ],
    )
    if not saved:
        raise HTTPException(
            status_code=503, detail="Could not save the booking request. Try again."
        )
    _append_sheet_row(
        "Profiles",
        [
            booking.customer_email,
            booking.customer_name,
            booking.customer_phone,
            datetime.now().isoformat(),
        ],
    )

    owner_sent = _send_email(
        OWNER_EMAIL,
        f"New booking request {reference} — {service.name}",
        (
            f"New booking REQUEST {reference} (not yet confirmed):\n"
            f"  Service: {service.name}\n"
            f"  Trip: {booking.pickup_location} -> {booking.dropoff_location}\n"
            f"  Date: {booking.trip_date.isoformat()} at {booking.trip_time}\n"
            f"  Passengers: {booking.passengers}\n"
            f"  Customer: {booking.customer_name} "
            f"({booking.customer_email}, {booking.customer_phone})\n"
            f"  Notes: {booking.notes or '-'}\n\n"
            f"Please quote the rate and confirm with the customer.\n"
            f"Marcia's WhatsApp: {WHATSAPP_DISPLAY}\n"
            f"Prefilled request: {whatsapp}\n"
        ),
    )
    return BookingRequestResponse(
        booking_id=reference,
        service_id=booking.service_id,
        trip_date=booking.trip_date,
        trip_time=booking.trip_time,
        passengers=booking.passengers,
        email_sent=owner_sent,
    )


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
        "gmail_configured": _gmail_configured(),
        "adk_agent": taxi_agent.agent_available(),
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


@app.post("/api/chat")
async def chat(payload: ChatPayload) -> dict:
    """One ADK agent turn. Returns the same contract the chat widget uses.

    When the agent says submit=true, the backend writes the booking request
    and attaches the WhatsApp handoff. The agent never confirms a booking.
    """
    services = [service_to_dict(s) for s in SERVICES]
    result = await taxi_agent.run_agent_turn(
        payload.message,
        payload.stage,
        payload.draft,
        services,
        payload.history,
    )
    result.setdefault("chips", [])
    result.setdefault("stage", payload.stage)
    result.setdefault("draft", payload.draft)
    result.setdefault("submit", False)
    result["mode"] = "adk" if taxi_agent.agent_available() else "offline"

    if result.get("submit"):
        try:
            booking = BookingRequest.model_validate(result["draft"])
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Incomplete request: {exc}")
        record = _create_request_record(booking)
        result["stage"] = "done"
        result["reference"] = record.booking_id
        result["whatsapp_url"] = taxi_agent.whatsapp_link(
            record.booking_id, result["draft"]
        )
        result["submitted"] = True
        result["reply"] = (
            f"Request {record.booking_id} is in. This is NOT a confirmed booking — "
            f"Bryan & Marcia review it and quote your rate, then confirm with you "
            f"by email or phone. Send it to Marcia on {WHATSAPP_DISPLAY} if you "
            f"would like to chase it on WhatsApp."
        )
    else:
        result["submitted"] = False
    return result


@app.post("/api/booking-requests", status_code=201)
def create_booking_request(
    booking: BookingRequest, request: Request
) -> BookingRequestResponse:
    """Create a booking REQUEST. No price is sent or calculated — Bryan &
    Marcia quote the rate when they review it."""
    _check_booking_rate_limit(request)
    return _create_request_record(booking)


@app.post("/api/bookings", status_code=201)
def create_booking(booking: BookingRequest, request: Request) -> BookingResponse:
    """Backwards-compatible alias: this now creates a request, not a
    confirmed booking. Older clients keep working without a price."""
    _check_booking_rate_limit(request)
    record = _create_request_record(booking)
    return BookingResponse(
        booking_id=record.booking_id,
        service_id=record.service_id,
        trip_date=record.trip_date,
        trip_time=record.trip_time,
        passengers=record.passengers,
        total_bbd=None,
        status=record.status,
        email_sent=record.email_sent,
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
