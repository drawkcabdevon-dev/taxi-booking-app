"""Waymaker Taxi Services — service catalogue.

Rates are quoted by Bryan & Marcia when they review a booking request. There
is no rate calculation in this app: `price_bbd` stays null and `rate_tbd`
stays true so the UI can say "price on request". Do not invent prices.
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
