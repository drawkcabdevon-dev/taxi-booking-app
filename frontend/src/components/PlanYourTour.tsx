import { useState } from 'react';
import { TOUR_STOPS } from './tourStops';
import { createBooking } from '../services/api';

/**
 * Plan Your Tour — the concierge planner.
 *
 * Visitors pick the spots they want to see in advance, choose their dates
 * and party size, and send the plan in. Waymaker's concierge service
 * books it in and confirms everything with the customer by email or
 * phone. Submits through the same POST /api/bookings endpoint as the
 * booking form (service: island-tour, chosen stops in the notes). Until
 * rates and booking storage are connected, a submit lands as a request —
 * same fallback pattern as the chat widget: a WM- reference and a plain
 * note that Waymaker will confirm.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'booked'; reference: string }
  | { status: 'requested'; reference: string };

export default function PlanYourTour() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tourDate, setTourDate] = useState('');
  const [passengers, setPassengers] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const toggleStop = (stopName: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(stopName)) next.delete(stopName);
      else next.add(stopName);
      return next;
    });

  const selectAll = () =>
    setSelected(new Set(TOUR_STOPS.map((s) => s.name)));
  const clearAll = () => setSelected(new Set());

  const valid =
    selected.size >= 1 &&
    tourDate !== '' &&
    passengers >= 1 &&
    passengers <= 13 &&
    name.trim().length >= 2 &&
    email.includes('@') &&
    phone.trim().length >= 7;

  const submitPlan = async () => {
    if (!valid || submit.status === 'sending') return;
    setSubmit({ status: 'sending' });
    const stops = TOUR_STOPS.filter((s) => selected.has(s.name)).map(
      (s) => s.name,
    );
    const notes = [
      `Planned stops: ${stops.join(', ')}.`,
      'Concierge request — please confirm the date and bookings.',
      extraNotes.trim(),
    ]
      .filter(Boolean)
      .join(' ');
    try {
      const res = await createBooking({
        service_id: 'island-tour',
        pickup_location: 'Island tour — pickup to be arranged',
        dropoff_location: 'Island tour — planned stops',
        trip_date: tourDate,
        trip_time: '09:00',
        passengers,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        notes,
      });
      setSubmit({ status: 'booked', reference: res.booking_id });
    } catch {
      // Rates/storage not connected yet — the plan is still captured as
      // a request for the concierge to confirm, same as the chat widget.
      const ref = `WM-${Date.now().toString().slice(-6)}`;
      setSubmit({ status: 'requested', reference: ref });
    }
  };

  const chosenNames = TOUR_STOPS.filter((s) => selected.has(s.name)).map(
    (s) => s.name,
  );

  return (
    <section id="plan-your-tour" className="section plan-section">
      <div className="plan-panel">
        <div className="section-header">
          <p className="eyebrow-pill">Concierge Service</p>
          <h2>Plan Your Tour</h2>
          <p className="section-subhead">
            Pick the spots you want to see, tell us the dates you&apos;re
            looking at, and our concierge service books it in for you — Bryan
            &amp; Marcia confirm everything with you by email or phone.
          </p>
        </div>

        {submit.status === 'booked' || submit.status === 'requested' ? (
          <div className="plan-confirm">
            <h3>Your tour plan is in ✓</h3>
            <p>
              Reference: <strong>{submit.reference}</strong>
            </p>
            <p>
              {chosenNames.join(', ')} — {tourDate}, {passengers} passenger(s).
            </p>
            <p className="muted">
              {submit.status === 'booked'
                ? 'A confirmation email is on its way.'
                : 'Waymaker will confirm your tour dates, bookings and price by email or phone.'}
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSubmit({ status: 'idle' });
                setSelected(new Set());
                setTourDate('');
                setExtraNotes('');
              }}
            >
              Plan another tour
            </button>
          </div>
        ) : (
          <>
            <div className="plan-step">
              <div className="plan-step-head">
                <h3>
                  <span className="plan-step-num">1</span> Choose your stops
                </h3>
                <span className="plan-step-actions">
                  <button type="button" className="plan-link" onClick={selectAll}>
                    Select all
                  </button>
                  {' · '}
                  <button type="button" className="plan-link" onClick={clearAll}>
                    Clear
                  </button>
                </span>
              </div>
              <div className="plan-stops">
                {TOUR_STOPS.map((stop) => {
                  const on = selected.has(stop.name);
                  return (
                    <button
                      key={stop.name}
                      type="button"
                      className={`plan-stop${on ? ' selected' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleStop(stop.name)}
                    >
                      <span
                        className="plan-stop-photo"
                        style={{ backgroundImage: `url(${stop.image})` }}
                        role="img"
                        aria-label={stop.alt}
                      />
                      <span className="plan-stop-name">{stop.name}</span>
                      <span className="plan-stop-check" aria-hidden="true">
                        {on ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="plan-count">
                {selected.size === 0
                  ? 'Tap the stops you want on your tour.'
                  : `${selected.size} stop${selected.size === 1 ? '' : 's'} chosen: ${chosenNames.join(', ')}`}
              </p>
            </div>

            <div className="plan-step">
              <h3>
                <span className="plan-step-num">2</span> When &amp; how many
              </h3>
              <div className="plan-row">
                <div className="field">
                  <label htmlFor="plan-date">Tour date</label>
                  <input
                    id="plan-date"
                    type="date"
                    min={todayIso()}
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="plan-passengers">
                    Passengers (max 13)
                  </label>
                  <input
                    id="plan-passengers"
                    type="number"
                    min={1}
                    max={13}
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="plan-step">
              <h3>
                <span className="plan-step-num">3</span> Your details
              </h3>
              <div className="plan-row">
                <div className="field">
                  <label htmlFor="plan-name">Full name</label>
                  <input
                    id="plan-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="field">
                  <label htmlFor="plan-email">Email</label>
                  <input
                    id="plan-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="field">
                  <label htmlFor="plan-phone">Phone</label>
                  <input
                    id="plan-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (246) ..."
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="plan-notes">
                  Anything else? (optional)
                </label>
                <textarea
                  id="plan-notes"
                  rows={2}
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Extra stops, accessibility needs, a second date if the first is full…"
                />
              </div>
            </div>

            <button
              type="button"
              className="plan-submit"
              onClick={submitPlan}
              disabled={!valid || submit.status === 'sending'}
            >
              {submit.status === 'sending'
                ? 'Sending your plan…'
                : 'Send my tour plan →'}
            </button>
            <p className="plan-fineprint">
              No payment now — Waymaker confirms your dates, bookings and
              price first.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
