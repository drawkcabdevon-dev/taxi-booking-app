"""Waymaker Taxi Services — service catalogue and server-side pricing.

IMPORTANT: All rates are PLACEHOLDER / TBD. Waymaker has not confirmed their
prices yet. Do NOT invent prices — a booking for a service without a confirmed
rate is refused with a clear error until the real rate is entered here (or in
the Services tab of the Google Sheet, which overrides this file).

When rates arrive, fill in `price_bbd` and set `rate_tbd` to False for each
service. Pricing basis is per trip unless noted otherwise.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Service:
    id: str
    name: str
    description: str
    pricing_basis: str  # e.g. "per trip", "per tour"
    # None while the rate is unconfirmed. Never guess a price.
    price_bbd: float | None = None
    rate_tbd: bool = True
    max_passengers: int = 13  # single 13-seat van
    extras: list[str] = field(default_factory=list)


SERVICES: list[Service] = [
    Service(
        id="airport-transfer",
        name="Airport Pick-up Transfer",
        description=(
            "Pick-up from Grantley Adams International Airport (or drop-off "
            "to the airport) anywhere on the island. Look for your custom "
            "welcome sign with your name on it at arrivals."
        ),
        pricing_basis="per trip",
        # PLACEHOLDER — rate TBD from Waymaker.
        price_bbd=None,
        rate_tbd=True,
        extras=["Custom welcome sign"],
    ),
    Service(
        id="island-tour",
        name="Island Tour",
        description=(
            "Guided island tour with Bryan: historic Bridgetown, Rihanna "
            "Drive, Mount Gay rum tour, the north coast, Sandy Lane, "
            "Speightstown, Animal Flower Cave and the east coast. Good "
            "Time snacks and Marcia's rum punch included."
        ),
        pricing_basis="per tour",
        # PLACEHOLDER — rate TBD from Waymaker (half/full day to confirm).
        price_bbd=None,
        rate_tbd=True,
        extras=["Guided tour", "Local snacks", "Rum punch"],
    ),
    Service(
        id="other-function",
        name="Other Function",
        description=(
            "Private hire for weddings, events, group outings and other "
            "functions — tell us where you need to go."
        ),
        pricing_basis="per trip",
        # PLACEHOLDER — rate TBD from Waymaker (may be hourly; confirm).
        price_bbd=None,
        rate_tbd=True,
    ),
]


def get_service(service_id: str) -> Service | None:
    """Look up a service by id, or None if unknown."""
    for service in SERVICES:
        if service.id == service_id:
            return service
    return None


def service_to_dict(service: Service) -> dict:
    """Public JSON shape for a service. Rates stay TBD until confirmed."""
    return {
        "id": service.id,
        "name": service.name,
        "description": service.description,
        "pricing_basis": service.pricing_basis,
        "price_bbd": service.price_bbd,
        "rate_tbd": service.rate_tbd,
        "max_passengers": service.max_passengers,
        "extras": service.extras,
    }


class RateNotSetError(ValueError):
    """Raised when a service has no confirmed rate yet."""


def calculate_price(service_id: str, passengers: int) -> float:
    """Server-side price for a booking. Never trusts client-supplied prices.

    Raises RateNotSetError when the rate is still TBD, and ValueError for
    unknown services or passenger counts outside 1..13.
    """
    service = get_service(service_id)
    if service is None:
        raise ValueError(f"Unknown service: {service_id}")
    if passengers < 1 or passengers > service.max_passengers:
        raise ValueError(
            f"Passengers must be between 1 and {service.max_passengers}"
        )
    if service.rate_tbd or service.price_bbd is None:
        raise RateNotSetError(
            f"Rate for '{service.name}' is not confirmed yet — "
            "Waymaker has not supplied pricing."
        )
    return float(service.price_bbd)
