"""Waymaker Taxi Services — ADK booking-request agent.

The agent drives the taxi flow: service -> trip -> passengers -> contact ->
confirm. Its final action is a booking REQUEST for Bryan & Marcia to review;
rates are quoted on review, never by the agent or the frontend.

Taxi-only. There is no vehicle selection, per-day cost, availability calendar
or rental-style tool anywhere in this module.

When google-adk and credentials are available, run_agent_turn uses the ADK
runner. Otherwise the same turn contract is produced locally so the API and
the static preview can be exercised without GCP access.
"""

from __future__ import annotations

import json
import os
import re
from datetime import date, datetime, timedelta
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.environ.get("TAXI_API_BASE", "http://localhost:8000/api")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "waymakertaxiservices@gmail.com")
WHATSAPP_DISPLAY = "(246) 239-7278"
WHATSAPP_PHONE = "12462397278"

STAGES = ("service", "trip", "passengers", "contact", "confirm", "done")

LOCAL_SERVICES: list[dict[str, Any]] = [
    {
        "id": "airport-transfer",
        "name": "Airport Pick-up Transfer",
        "rate_tbd": True,
    },
    {"id": "island-tour", "name": "Island Tour", "rate_tbd": True},
    {"id": "other-function", "name": "Other Function", "rate_tbd": True},
]

EMPTY_DRAFT: dict[str, Any] = {
    "service_id": "",
    "pickup_location": "",
    "dropoff_location": "",
    "trip_date": "",
    "trip_time": "",
    "passengers": 2,
    "customer_name": "",
    "customer_email": "",
    "customer_phone": "",
    "notes": "",
    "return_trip": False,
}

SYSTEM_PROMPT = """You are the Waymaker Taxi Services booking-request assistant
for Barbados. You must help a customer through this exact flow:

1. service — airport pick-up transfer, island tour, or private hire/function.
2. trip — pickup, drop-off (not needed for the island tour), date and time.
3. passengers — a number from 1 to 13 (one 13-seat van).
4. contact — name, email, phone, then optional notes.
5. confirm — repeat every detail and ask whether to send the request.

Rules (never break these):
- This is a BOOKING REQUEST, not a confirmed booking. Never say a ride is
  booked or confirmed. Bryan & Marcia review every request.
- Never invent, quote or calculate a price. Say the rate is quoted on review.
- Never offer vehicle choices, day rates or availability checks.
- For anything you cannot answer, point to waymakertaxiservices@gmail.com.
- After the customer says yes, set submit=true. The backend writes the
  request; you must not claim it is confirmed.

Always finish with a JSON object and nothing else, shaped like:
{"reply": "...", "stage": "trip", "draft": {...}, "chips": [], "submit": false}
The draft must include every field from the current draft, updated with what
the customer just said. Keep reply short and friendly."""


def get_services() -> str:
    """ADK tool: list taxi services. Rates are always 'price on request'."""
    try:
        res = requests.get(f"{API_BASE}/services", timeout=10)
        res.raise_for_status()
        services = res.json()["services"]
    except Exception:  # noqa: BLE001
        services = LOCAL_SERVICES
    lines = []
    for service in services:
        price = (
            "price on request"
            if service.get("rate_tbd") or service.get("price_bbd") is None
            else f"Bds${service['price_bbd']:.2f} {service.get('pricing_basis', '')}"
        )
        lines.append(f"- {service['name']}: {price}")
    return "\n".join(lines)


def whatsapp_link(reference: str, draft: dict[str, Any]) -> str:
    """Prefilled WhatsApp message to Marcia for a booking request."""
    text = "\n".join(
        [
            f"New Waymaker booking request {reference}",
            f"Service: {draft.get('service_id', '')}",
            f"Trip: {draft.get('pickup_location', '')} -> "
            f"{draft.get('dropoff_location') or 'to be arranged'}",
            f"When: {draft.get('trip_date', '')} at {draft.get('trip_time', '')}",
            f"Passengers: {draft.get('passengers', 2)}",
            "Contact: "
            f"{draft.get('customer_name', '')} | {draft.get('customer_email', '')} | "
            f"{draft.get('customer_phone', '')}",
            "Please quote the rate and confirm directly with the customer.",
        ]
    )
    from urllib.parse import quote

    return f"https://wa.me/{WHATSAPP_PHONE}?text={quote(text)}"


# --- ADK wiring (optional at import time) -----------------------------------

try:
    from google.adk.agents import Agent

    root_agent = Agent(
        name="waymaker_taxi_agent",
        model=os.environ.get("AGENT_MODEL", "gemini-2.5-flash"),
        description="Waymaker Taxi Services booking-request assistant for Barbados.",
        instruction=SYSTEM_PROMPT,
        tools=[get_services],
    )
except ImportError:
    root_agent = None


def agent_available() -> bool:
    """True only when ADK is installed and credentials are configured."""
    creds = bool(
        os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        or os.environ.get("VERTEXAI_PROJECT")
    )
    return root_agent is not None and creds


# --- Local agent (same turn contract, no credentials needed) ----------------


def _local_date(d: datetime) -> str:
    return d.strftime("%Y-%m-%d")


def _parse_date(text: str) -> str | None:
    t = text.strip().lower()
    now = datetime.now()
    if t == "today":
        return _local_date(now)
    if t == "tomorrow":
        return _local_date(now + timedelta(days=1))
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", t):
        return None
    try:
        parsed = datetime.strptime(t, "%Y-%m-%d").date()
    except ValueError:
        return None
    if parsed < date.today():
        return None
    return t


def _parse_time(text: str) -> str | None:
    if re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", text.strip()):
        return text.strip()
    m = re.fullmatch(r"(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?", text.strip().lower())
    if not m:
        return None
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    if not 1 <= hour <= 12 or minute > 59:
        return None
    if m.group(3) == "p" and hour != 12:
        hour += 12
    if m.group(3) == "a" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute:02d}"


def _match_service(text: str) -> str | None:
    t = text.lower()
    if re.search(r"airport|flight|plane|pick.?up|arrivals|bgi|grantley", t):
        return "airport-transfer"
    if re.search(r"tour|sightsee|island", t):
        return "island-tour"
    if re.search(r"wedding|funeral|event|function|party|hire|charter", t):
        return "other-function"
    return None


def _service_name(service_id: str) -> str:
    return next(
        (s["name"] for s in LOCAL_SERVICES if s["id"] == service_id),
        service_id or "your ride",
    )


def _summary(draft: dict[str, Any]) -> str:
    return "\n".join(
        [
            "Here's your booking request — nothing is confirmed yet:",
            f"- {_service_name(draft.get('service_id', ''))}",
            f"- {draft.get('pickup_location', '')} -> "
            f"{draft.get('dropoff_location') or 'to be arranged'}",
            f"- {draft.get('trip_date', '')} at {draft.get('trip_time', '')}",
            f"- {draft.get('passengers', 2)} passenger(s)",
            f"- {draft.get('customer_name', '')} | {draft.get('customer_email', '')} "
            f"| {draft.get('customer_phone', '')}",
            "",
            "Bryan & Marcia review the request and quote your rate. Shall I send it?",
        ]
    )


def _turn(
    reply: str,
    stage: str,
    draft: dict[str, Any],
    chips: list[str] | None = None,
    submit: bool = False,
) -> dict[str, Any]:
    return {
        "reply": reply,
        "stage": stage,
        "draft": draft,
        "chips": chips or [],
        "submit": submit,
    }


def offline_turn(
    message: str,
    stage: str,
    draft: dict[str, Any],
    services: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Deterministic agent for preview/backends without ADK credentials."""
    text = message.strip()
    draft = dict(draft or EMPTY_DRAFT)
    services = services or LOCAL_SERVICES
    service_chips = [s.get("name", s.get("id", "")) for s in services]

    if re.fullmatch(r"start over|restart|new booking", text, re.I):
        return _turn(
            "Of course — let's start again. Which service do you need?",
            "service",
            dict(EMPTY_DRAFT),
            service_chips,
        )
    if stage not in STAGES:
        stage = "service"

    if stage == "service":
        service_id = _match_service(text)
        if not service_id:
            return _turn(
                "I can help with an airport pick-up, an island tour or private "
                "hire — tap one below or tell me which you need.",
                stage,
                draft,
                service_chips,
            )
        draft["service_id"] = service_id
        return _turn(
            f"Got it — {_service_name(service_id)}. Where should we pick you up?",
            "trip",
            draft,
        )

    if stage == "trip":
        is_tour = draft.get("service_id") == "island-tour"
        if not str(draft.get("pickup_location", "")).strip():
            if len(text) < 2:
                return _turn("Where should we pick you up?", stage, draft)
            draft["pickup_location"] = text
            if is_tour:
                draft["dropoff_location"] = "Island tour — full route"
                return _turn("What date is the tour? (YYYY-MM-DD, or tomorrow)", stage, draft)
            return _turn("And where are you heading?", stage, draft)
        if not is_tour and not str(draft.get("dropoff_location", "")).strip():
            if len(text) < 2:
                return _turn("Where are you heading?", stage, draft)
            draft["dropoff_location"] = text
            return _turn("What date? (YYYY-MM-DD, or tomorrow)", stage, draft)
        if not draft.get("trip_date"):
            parsed = _parse_date(text)
            if not parsed:
                return _turn("I need a date — try YYYY-MM-DD, today or tomorrow.", stage, draft)
            draft["trip_date"] = parsed
            return _turn("What time should we pick you up? (e.g. 3pm)", stage, draft)
        if not draft.get("trip_time"):
            parsed = _parse_time(re.sub(r"return|round trip", "", text, flags=re.I).strip())
            if not parsed:
                return _turn("What time? Try 3pm or 15:30.", stage, draft)
            draft["trip_time"] = parsed
            if re.search(r"return|round trip|both ways", text, re.I):
                draft["return_trip"] = True
            return _turn("How many passengers? The van seats up to 13.", "passengers", draft)
        return _turn("How many passengers? The van seats up to 13.", "passengers", draft)

    if stage == "passengers":
        try:
            count = int(text)
        except ValueError:
            count = 0
        if not 1 <= count <= 13:
            return _turn("How many passengers? A number from 1 to 13.", stage, draft)
        draft["passengers"] = count
        return _turn("Almost there — what name is the booking under?", "contact", draft)

    if stage == "contact":
        if not str(draft.get("customer_name", "")).strip():
            if len(text) < 2:
                return _turn("What name is the booking under?", stage, draft)
            draft["customer_name"] = text
            return _turn("And your email, so they can send the quote?", stage, draft)
        if not str(draft.get("customer_email", "")).strip():
            if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", text):
                return _turn("That email doesn't look right — what email should we use?", stage, draft)
            draft["customer_email"] = text
            return _turn("And a phone number, in case they need to reach you?", stage, draft)
        if not str(draft.get("customer_phone", "")).strip():
            if len(re.sub(r"\D", "", text)) < 7:
                return _turn("What phone number can we reach you on?", stage, draft)
            draft["customer_phone"] = text
            return _turn(
                'Anything else they should know? Type "none" to skip.', stage, draft
            )
        if text and not re.fullmatch(r"none|no|nope|skip", text, re.I):
            draft["notes"] = text
        return _turn(
            _summary(draft),
            "confirm",
            draft,
            ["Yes, send request", "Change something", "Start over"],
        )

    if stage == "confirm":
        if re.match(r"yes|yeah|yep|send it|confirm|ok|okay|sure", text, re.I):
            return _turn("Sending your booking request now…", "done", draft, submit=True)
        return _turn(
            "Shall I send the request as shown?",
            stage,
            draft,
            ["Yes, send request", "Change something", "Start over"],
        )

    return _turn(
        'That request is already with Waymaker. Type "start over" for another.',
        stage,
        draft,
        ["Start over"],
    )


async def run_agent_turn(
    message: str,
    stage: str,
    draft: dict[str, Any],
    services: list[dict[str, Any]] | None = None,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Return one agent turn using the ADK agent, or the local fallback."""
    if agent_available():
        try:
            return await _adk_turn(message, stage, draft, services, history)
        except Exception:  # noqa: BLE001 — fall back, never break the chat
            pass
    return offline_turn(message, stage, draft, services)


async def _adk_turn(
    message: str,
    stage: str,
    draft: dict[str, Any],
    services: list[dict[str, Any]] | None,
    history: list[dict[str, str]] | None,
) -> dict[str, Any]:
    from google.adk.runners import InMemoryRunner
    from google.genai import types

    runner = InMemoryRunner(agent=root_agent, app_name="waymaker_taxi")
    session = await runner.session_service.create_session(
        app_name="waymaker_taxi",
        user_id="web-visitor",
        state={
            "stage": stage,
            "draft": draft,
            "services": services or LOCAL_SERVICES,
            "history": history or [],
        },
    )
    prompt = json.dumps(
        {
            "current_state": {"stage": stage, "draft": draft},
            "customer_message": message,
        }
    )
    final_text = ""
    async for event in runner.run_async(
        user_id="web-visitor",
        session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part(text=prompt)]),
    ):
        if getattr(event, "is_final_response", lambda: False)() and event.content:
            final_text = "".join(
                part.text or "" for part in event.content.parts if getattr(part, "text", None)
            )
    cleaned = final_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
    parsed = json.loads(cleaned.strip())
    parsed.setdefault("stage", stage)
    parsed.setdefault("draft", draft)
    parsed.setdefault("chips", [])
    parsed.setdefault("submit", False)
    return parsed


if __name__ == "__main__":
    print(get_services())
