import { useEffect, useState, type MouseEvent } from 'react';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import ChatWidget from './components/ChatWidget';
import { SERVICE_IMAGES } from './components/serviceImages';
import LandingPage from './pages/LandingPage';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AdminDashboard from './pages/AdminDashboard';
import {
  createBooking,
  getServices,
  type BookingRequest,
  type BookingResponse,
  type Service,
} from './services/api';

type View = 'landing' | 'booking' | 'terms' | 'privacy' | 'admin';

const STEPS = ['Service', 'Trip Details', 'Passengers', 'Your Info', 'Review', 'Confirmed'];

// Fallback service list if the backend is unreachable (e.g. local dev
// without the API running). Prices stay TBD — never invent them.
const FALLBACK_SERVICES: Service[] = [
  {
    id: 'airport-transfer',
    name: 'Airport Pick-up Transfer',
    description: 'Pick-up from Grantley Adams International Airport (or drop-off to the airport) anywhere on the island.',
    pricing_basis: 'per trip',
    price_bbd: null,
    rate_tbd: true,
    max_passengers: 13,
    extras: [],
  },
  {
    id: 'island-tour',
    name: 'Island Tour',
    description: 'Guided island tour with Bryan: historic Bridgetown, Rihanna Drive, Mount Gay rum tour, the north coast, Sandy Lane, Speightstown, Animal Flower Cave and the east coast. Good Time snacks and Marcia\'s rum punch included.',
    pricing_basis: 'per tour',
    price_bbd: null,
    rate_tbd: true,
    max_passengers: 13,
    extras: ['Guided tour', 'Local snacks', 'Rum punch'],
  },
  {
    id: 'other-function',
    name: 'Other Function',
    description: 'Private hire for weddings, events, group outings and other functions.',
    pricing_basis: 'per trip',
    price_bbd: null,
    rate_tbd: true,
    max_passengers: 13,
    extras: [],
  },
];

const EMPTY_FORM: BookingRequest = {
  service_id: '',
  pickup_location: '',
  dropoff_location: '',
  trip_date: '',
  trip_time: '09:00',
  passengers: 2,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  notes: '',
  return_trip: false,
};

function priceLabel(service: Service | undefined): string {
  if (!service) return '';
  if (service.rate_tbd || service.price_bbd === null) return 'Price on request';
  return `Bds$${service.price_bbd.toFixed(2)} ${service.pricing_basis}`;
}

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [services, setServices] = useState<Service[]>(FALLBACK_SERVICES);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BookingRequest>(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState<BookingResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    getServices()
      .then((res) => setServices(res.services))
      .catch(() => {
        // Backend unreachable — keep the fallback list.
      });
  }, []);

  const selectedService = services.find((s) => s.id === form.service_id);
  const set = <K extends keyof BookingRequest>(key: K, value: BookingRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canContinue = (): boolean => {
    switch (step) {
      case 0:
        return form.service_id !== '';
      case 1:
        return (
          form.pickup_location.trim().length >= 2 &&
          form.dropoff_location.trim().length >= 2 &&
          form.trip_date !== '' &&
          form.trip_time !== ''
        );
      case 2:
        return form.passengers >= 1 && form.passengers <= 13;
      case 3:
        return (
          form.customer_name.trim().length >= 2 &&
          form.customer_email.includes('@') &&
          form.customer_phone.trim().length >= 7
        );
      case 4:
        return termsAccepted;
      default:
        return false;
    }
  };

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await createBooking(form);
      setConfirmed(res);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startBooking = () => {
    setView('booking');
    setStep(0);
    setConfirmed(null);
    setError('');
  };

  if (view === 'terms') {
    return (
      <>
        <TermsAndConditions />
        <Footer setView={setView} onBookNow={startBooking} />
      </>
    );
  }
  if (view === 'privacy') {
    return (
      <>
        <PrivacyPolicy />
        <Footer setView={setView} onBookNow={startBooking} />
      </>
    );
  }
  if (view === 'admin') {
    return (
      <>
        <AdminDashboard />
        <Footer setView={setView} onBookNow={startBooking} />
      </>
    );
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage services={services} onBookNow={startBooking} />
        <ChatWidget services={services} />
        <Footer setView={setView} onBookNow={startBooking} />
      </>
    );
  }

  return (
    <div className="container">
      <h1>Book Your Ride</h1>
      <div className="steps">
        {STEPS.map((label, i) => (
          <span key={label} className={i === step ? 'active' : undefined}>
            {i + 1}. {label}
            {i < STEPS.length - 1 ? '  ›' : ''}
          </span>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {step === 0 && (
        <div className="grid">
          {services.map((service) => (
            <div
              key={service.id}
              className={`card service-card${form.service_id === service.id ? ' selected' : ''}`}
              onClick={() => set('service_id', service.id)}
            >
              {SERVICE_IMAGES[service.id] && (
                <img
                  src={SERVICE_IMAGES[service.id].src}
                  alt={SERVICE_IMAGES[service.id].alt}
                />
              )}
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p>
                <strong>{priceLabel(service)}</strong>
              </p>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="field">
            <label htmlFor="pickup">Pickup location</label>
            <input
              id="pickup"
              value={form.pickup_location}
              onChange={(e) => set('pickup_location', e.target.value)}
              placeholder="e.g. Grantley Adams International Airport"
            />
          </div>
          <div className="field">
            <label htmlFor="dropoff">Drop-off location</label>
            <input
              id="dropoff"
              value={form.dropoff_location}
              onChange={(e) => set('dropoff_location', e.target.value)}
              placeholder="e.g. Your hotel or address"
            />
          </div>
          <div className="field">
            <label>Trip date</label>
            <AvailabilityCalendar
              selectedDate={form.trip_date}
              onSelect={(d) => set('trip_date', d)}
            />
          </div>
          <div className="field">
            <label htmlFor="time">Pickup time</label>
            <input
              id="time"
              type="time"
              value={form.trip_time}
              onChange={(e) => set('trip_time', e.target.value)}
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                style={{ width: 'auto', marginRight: '0.5rem' }}
                checked={form.return_trip}
                onChange={(e) => set('return_trip', e.target.checked)}
              />
              Return trip as well
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="field">
            <label htmlFor="passengers">How many passengers? (max 13)</label>
            <input
              id="passengers"
              type="number"
              min={1}
              max={13}
              value={form.passengers}
              onChange={(e) => set('passengers', Number(e.target.value))}
            />
          </div>
          <p className="muted">
            The van seats 13. For larger groups, email us and we will arrange
            a second vehicle.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={form.customer_name}
              onChange={(e) => set('customer_name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.customer_email}
              onChange={(e) => set('customer_email', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={form.customer_phone}
              onChange={(e) => set('customer_phone', e.target.value)}
              placeholder="+1 (246) ..."
            />
          </div>
          <div className="field">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Luggage, flight number, accessibility needs…"
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h3>Review your booking</h3>
          <p>
            <strong>Service:</strong> {selectedService?.name} —{' '}
            {priceLabel(selectedService)}
          </p>
          <p>
            <strong>Trip:</strong> {form.pickup_location} → {form.dropoff_location}
          </p>
          <p>
            <strong>When:</strong> {form.trip_date} at {form.trip_time}
            {form.return_trip ? ' (return trip included)' : ''}
          </p>
          <p>
            <strong>Passengers:</strong> {form.passengers}
          </p>
          <p>
            <strong>Name:</strong> {form.customer_name} · {form.customer_email} ·{' '}
            {form.customer_phone}
          </p>
          {form.notes && (
            <p>
              <strong>Notes:</strong> {form.notes}
            </p>
          )}
          <div className="field">
            <label>
              <input
                type="checkbox"
                style={{ width: 'auto', marginRight: '0.5rem' }}
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              I accept the{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setView('terms');
                }}
              >
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setView('privacy');
                }}
              >
                Privacy Policy
              </a>
            </label>
          </div>
        </div>
      )}

      {step === 5 && confirmed && (
        <div className="card">
          <h2>Booking confirmed</h2>
          <p>
            Reference: <strong>{confirmed.booking_id}</strong>
          </p>
          <p>
            {selectedService?.name} — {confirmed.trip_date} at {confirmed.trip_time},{' '}
            {confirmed.passengers} passenger(s).
          </p>
          <p>
            Total: <strong>Bds${confirmed.total_bbd.toFixed(2)}</strong>
          </p>
          <p className="muted">
            {confirmed.email_sent
              ? 'A confirmation email is on its way.'
              : 'Email confirmation is not set up yet — the business will confirm with you directly.'}
          </p>
          <button onClick={() => setView('landing')}>Back to home</button>
        </div>
      )}

      {step < 5 && (
        <div className="nav">
          <button
            type="button"
            className="secondary"
            onClick={() => (step === 0 ? setView('landing') : setStep(step - 1))}
          >
            Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
            >
              Next
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!canContinue() || submitting}>
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          )}
        </div>
      )}

      <Footer setView={setView} onBookNow={startBooking} />
    </div>
  );
}

function Footer({
  setView,
  onBookNow,
}: {
  setView: (v: View) => void;
  onBookNow: () => void;
}) {
  const goToSection =
    (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setView('landing');
      // The landing view needs a beat to render before the section exists.
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };
  const goToView = (v: View) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setView(v);
  };
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <p className="footer-brand-name">
            Waymaker Taxi Services <span className="footer-plate">ZM 995</span>
          </p>
          <p>
            Friendly, reliable family taxi and island tour service personally
            hosted by Bryan &amp; Marcia. Welcoming you to experience the
            authentic warmth and stunning beauty of Barbados.
          </p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <a href="#services" onClick={goToSection('services')}>
            Services &amp; Transfers
          </a>
          <a href="#tour" onClick={goToSection('tour')}>
            Island Tour
          </a>
          <a href="#how-it-works" onClick={goToSection('how-it-works')}>
            How It Works
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onBookNow();
            }}
          >
            Book a Ride
          </a>
        </div>
        <div className="footer-col">
          <h4>Contact &amp; Connect</h4>
          <a href="mailto:waymakertaxiservices@gmail.com">
            waymakertaxiservices@gmail.com
          </a>
          <a href="https://www.instagram.com/waymakertaxiservice_995">
            @waymakertaxiservice_995
          </a>
          <span>Authorized Plate: ZM 995</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © 2026 Waymaker Taxi Services. All rights reserved. Barbados Island
          Hospitality.
        </span>
        <span>
          <a href="#" onClick={goToView('privacy')}>
            Privacy Policy
          </a>
          <a href="#" onClick={goToView('terms')}>
            Terms of Service
          </a>
          <a href="#" onClick={goToView('admin')}>
            Owner Dashboard
          </a>
        </span>
      </div>
    </footer>
  );
}
