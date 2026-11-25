"""Waymaker Taxi Services — ADK chat agent.

Answers questions about tours, services and availability, and can create
bookings through the FastAPI backend. Deployed to Vertex AI Agent Engine
(see deploy.py).

The tools below are plain functions that call the backend API, so they can
be tested without the ADK runtime. They are wired into an ADK Agent when
google-adk is installed; otherwise the module still imports and the tools
can be called directly.
"""

from __future__ import annotations

import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.environ.get("TAXI_API_BASE", "http://localhost:8000/api")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "waymakertaxiservices@gmail.com")

SYSTEM_PROMPT = """You are the Waymaker Taxi Services booking assistant for
Barbados. You help customers with island tours, airport pick-up transfers
and private hire in one 13-seat air-conditioned van.

Rules:
- Never invent prices. If a service rate is marked TBD, say the price is
  confirmed on request and offer to take the booking details anyway.
- The van seats at most 13 passengers.
- Confirm pickup, drop-off, date, time and passenger count before booking.
- For anything you cannot answer, point the customer to
  waymakertaxiservices@gmail.com.
"""


def get_services() -> str:
    """List the taxi services Waymaker offers, with prices where confirmed."""
    try:
        res = requests.get(f"{API_BASE}/services", timeout=10)
        res.raise_for_status()
        services = res.json()["services"]
    except Exception as exc:  # noqa: BLE001
        return f"Could not load the service list: {exc}"
    lines = []
    for service in services:
        price = (
            "price on request"
            if service["rate_tbd"] or service["price_bbd"] is None
            else f"Bds${service['price_bbd']:.2f} {service['pricing_basis']}"
        )
        lines.append(f"- {service['name']}: {service['description']} ({price})")
    return "\n".join(lines)


def check_availability(trip_date: str) -> str:
    """Check which time slots are already booked on a date (YYYY-MM-DD).

    The van is a single vehicle, so a booked slot means that time is taken.
    """
    try:
        res = requests.get(
            f"{API_BASE}/availability", params={"trip_date": trip_date}, timeout=10
        )
        if res.status_code == 503:
            return (
                "Live availability is not connected yet — take the customer's "
                "preferred date and time and tell them we will confirm by email."
            )
        res.raise_for_status()
        booked = res.json()["booked_slots"]
    except Exception as exc:  # noqa: BLE001
        return f"Could not check availability: {exc}"
    if not booked:
        return f"{trip_date}: the van is free all day."
    slots = ", ".join(
        f"{s['start']}–{s['end']}" for s in booked if s["start"] or s["end"]
    )
    return f"{trip_date}: already booked at {slots}."


def create_booking(
    service_id: str,
    pickup_location: str,
    dropoff_location: str,
    trip_date: str,
    trip_time: str,
    passengers: int,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    notes: str = "",
    return_trip: bool = False,
) -> str:
    """Create a taxi booking. Price is calculated server-side.

    Only call this once the customer has confirmed every detail.
    """
    payload = {
        "service_id": service_id,
        "pickup_location": pickup_location,
        "dropoff_location": dropoff_location,
        "trip_date": trip_date,
        "trip_time": trip_time,
        "passengers": passengers,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone,
        "notes": notes,
        "return_trip": return_trip,
    }
    try:
        res = requests.post(f"{API_BASE}/bookings", json=payload, timeout=15)
    except Exception as exc:  # noqa: BLE001
        return f"Could not reach the booking service: {exc}"
    if res.status_code == 201:
        data = res.json()
        return (
            f"Booking confirmed! Reference {data['booking_id']}, "
            f"{data['service_id']} on {data['trip_date']} at {data['trip_time']}, "
            f"{data['passengers']} passenger(s). "
            f"Total Bds${data['total_bbd']:.2f}."
        )
    try:
        detail = res.json().get("detail", res.text)
    except json.JSONDecodeError:
        detail = res.text
    return f"Booking could not be completed: {detail}"


# --- ADK wiring (optional at import time) -----------------------------------

try:
    from google.adk.agents import Agent

    root_agent = Agent(
        name="waymaker_taxi_agent",
        model="gemini-2.5-flash",
        description="Waymaker Taxi Services booking assistant for Barbados.",
        instruction=SYSTEM_PROMPT,
        tools=[get_services, check_availability, create_booking],
    )
except ImportError:
    # google-adk not installed (e.g. local tool testing). The functions above
    # still work standalone.
    root_agent = None


if __name__ == "__main__":
    print(get_services())
