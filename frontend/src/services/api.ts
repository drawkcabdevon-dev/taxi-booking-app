// Backend API client for the Waymaker taxi booking app.

const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';

export interface Service {
  id: string;
  name: string;
  description: string;
  pricing_basis: string;
  price_bbd: number | null;
  rate_tbd: boolean;
  max_passengers: number;
  extras: string[];
}

export interface BookingRequest {
  service_id: string;
  pickup_location: string;
  dropoff_location: string;
  trip_date: string; // YYYY-MM-DD
  trip_time: string; // HH:MM
  passengers: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes?: string;
  return_trip?: boolean;
}

export interface BookingResponse {
  booking_id: string;
  service_id: string;
  trip_date: string;
  trip_time: string;
  passengers: number;
  // Legacy field kept for compatibility with older responses. Rates are
  // quoted on review, so a new request never carries a fixed price.
  total_bbd: number | null;
  status?: string;
  email_sent: boolean;
}

export interface BookingRequestResponse {
  booking_id: string;
  service_id: string;
  trip_date: string;
  trip_time: string;
  passengers: number;
  status: string;
  rate: string;
  email_sent: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ?? `Request failed: ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export function getServices(): Promise<{ services: Service[] }> {
  return request('/services');
}

/** Create a booking request. No price is sent or calculated here — Bryan &
 * Marcia quote the rate when they review the request. */
export function createBookingRequest(
  booking: BookingRequest,
): Promise<BookingRequestResponse> {
  return request('/booking-requests', {
    method: 'POST',
    body: JSON.stringify(booking),
  });
}

/** Backwards-compatible alias; the backend treats it as a request too. */
export function createBooking(
  booking: BookingRequest,
): Promise<BookingResponse> {
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  });
}

export function getBookings(adminKey: string): Promise<{ bookings: string[][] }> {
  return request('/bookings', {
    headers: { 'x-admin-key': adminKey },
  });
}

export function getProfiles(
  adminKey: string,
  email?: string,
): Promise<{ profiles: string[][] }> {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return request(`/profiles${query}`, {
    headers: { 'x-admin-key': adminKey },
  });
}
