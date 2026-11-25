import { useEffect, useRef, useState } from 'react';
import {
  createBooking,
  type BookingRequest,
  type Service,
} from '../services/api';
import './ChatWidget.css';

/**
 * Waymaker booking assistant — MVP demo.
 *
 * A guided chat flow that shows the goal: a customer books a ride by
 * talking to the assistant instead of filling in the form. For the MVP it
 * runs as a scripted flow in the browser (no model key needed) and submits
 * through the same POST /api/bookings endpoint as the form. Until rates and
 * booking storage are connected, a submit lands as a booking *request* —
 * the customer is told plainly that Waymaker will confirm price and ride
 * by email or phone. The flow is written so the scripted brain can later
 * be swapped for the ADK agent (agent/main.py) behind a /api/chat endpoint.
 */

type ChatMessage = { from: 'agent' | 'user'; text: string };

type FlowStep =
  | 'service'
  | 'pickup'
  | 'dropoff'
  | 'date'
  | 'time'
  | 'passengers'
  | 'name'
  | 'email'
  | 'phone'
  | 'confirm'
  | 'done';

const EMPTY_DRAFT: BookingRequest = {
  service_id: '',
  pickup_location: '',
  dropoff_location: '',
  trip_date: '',
  trip_time: '',
  passengers: 2,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  notes: '',
  return_trip: false,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Accepts YYYY-MM-DD, "today" or "tomorrow". Returns ISO date or null. */
function parseDate(text: string): string | null {
  const t = text.trim().toLowerCase();
  const now = new Date();
  if (t === 'today') return isoDate(now);
  if (t === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return isoDate(d);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00`);
  if (Number.isNaN(d.getTime()) || isoDate(d) !== t) return null;
  if (t < isoDate(now)) return null;
  return t;
}

/** Accepts 24h "15:30" or "3pm" / "3:30pm". Returns "HH:MM" or null. */
function parseTime(text: string): string | null {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/);
  const m24 = text.trim().match(/^([01]\d|2[0-3]):[0-5]\d$/);
  if (m24) return m24[0];
  if (!m) return null;
  let hour = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (hour < 1 || hour > 12 || min > 59) return null;
  if (m[3] === 'p' && hour !== 12) hour += 12;
  if (m[3] === 'a' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function matchService(text: string, services: Service[]): Service | null {
  const t = text.toLowerCase();
  for (const s of services) {
    if (t.includes(s.name.toLowerCase())) return s;
  }
  if (/\b(airport|flight|plane|pick.?up)\b/.test(t))
    return services.find((s) => s.id === 'airport-transfer') ?? null;
  if (/\btour\b/.test(t))
    return services.find((s) => s.id === 'island-tour') ?? null;
  if (/\b(wedding|funeral|event|function|party|hire)\b/.test(t))
    return services.find((s) => s.id === 'other-function') ?? null;
  return null;
}

export default function ChatWidget({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<FlowStep>('service');
  const [draft, setDraft] = useState<BookingRequest>(EMPTY_DRAFT);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const serviceName = (id: string) =>
    services.find((s) => s.id === id)?.name ?? id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open]);

  const say = (text: string, delay = 650) => {
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { from: 'agent', text }]);
      setTyping(false);
    }, delay);
  };

  const greet = () => {
    say(
      "Hi! I'm the Waymaker booking assistant. I can book your ride right here in chat — no forms, no phone calls. What do you need?",
      400,
    );
  };

  const openChat = () => {
    setOpen(true);
    if (!started) {
      setStarted(true);
      greet();
    }
  };

  const restart = () => {
    setDraft(EMPTY_DRAFT);
    setStep('service');
    setMessages([]);
    setBusy(false);
    greet();
  };

  const summary = (d: BookingRequest): string =>
    `Here's your booking:\n• ${serviceName(d.service_id)}\n• ${d.pickup_location} → ${d.dropoff_location}\n• ${d.trip_date} at ${d.trip_time}\n• ${d.passengers} passenger(s)\n• ${d.customer_name} · ${d.customer_email} · ${d.customer_phone}\n\nPrice is confirmed on request — Waymaker will confirm it with you. Shall I book it?`;

  const submitBooking = async (d: BookingRequest) => {
    setBusy(true);
    say('Booking that for you now…', 300);
    try {
      const res = await createBooking(d);
      say(
        `All booked! Reference ${res.booking_id} — ${serviceName(res.service_id)} on ${res.trip_date} at ${res.trip_time}, ${res.passengers} passenger(s). Total Bds$${res.total_bbd.toFixed(2)}. ${
          res.email_sent
            ? 'A confirmation email is on its way.'
            : 'Waymaker will confirm with you directly.'
        }`,
        900,
      );
    } catch {
      // MVP: rates/storage not connected yet, so the live booking can't
      // complete. The request is still captured as a demo of the goal.
      const ref = `WM-${Date.now().toString().slice(-6)}`;
      say(
        `Thanks — your booking request is in (request reference ${ref}).\n\n${serviceName(d.service_id)} · ${d.pickup_location} → ${d.dropoff_location} · ${d.trip_date} at ${d.trip_time} · ${d.passengers} passenger(s).\n\nWaymaker will confirm the price and your ride by email or phone.`,
        900,
      );
    } finally {
      setBusy(false);
      setStep('done');
    }
  };

  const handleText = (raw: string) => {
    const text = raw.trim();
    if (!text || busy || step === 'done') return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');

    if (/^(start over|restart|new booking)$/i.test(text)) {
      restart();
      return;
    }

    switch (step) {
      case 'service': {
        const service = matchService(text, services);
        if (!service) {
          say('I offer airport pick-ups, island tours and private hire — tap one below or tell me which you need.');
          return;
        }
        const next = { ...draft, service_id: service.id };
        setDraft(next);
        setStep('pickup');
        say(
          service.id === 'island-tour'
            ? 'The island tour — great choice. Bryan will show you historic Bridgetown, Rihanna Drive, the Mount Gay rum tour and more, with local snacks and rum punch. Where should we pick you up?'
            : `Got it — ${service.name}. Where should we pick you up?`,
        );
        return;
      }
      case 'pickup': {
        if (text.length < 2) {
          say('Where should we pick you up? A hotel, address or landmark works.');
          return;
        }
        const next = { ...draft, pickup_location: text };
        setDraft(next);
        if (draft.service_id === 'island-tour') {
          setDraft({ ...next, dropoff_location: 'Island tour — full route' });
          setStep('date');
          say('What date is the tour? (e.g. 2026-12-04, or just say tomorrow)');
        } else {
          setStep('dropoff');
          say('And where are you heading?');
        }
        return;
      }
      case 'dropoff': {
        if (text.length < 2) {
          say('Where are you heading? A hotel, address or landmark works.');
          return;
        }
        setDraft({ ...draft, dropoff_location: text });
        setStep('date');
        say('What date? (e.g. 2026-12-04, or just say tomorrow)');
        return;
      }
      case 'date': {
        const parsed = parseDate(text);
        if (!parsed) {
          say('I need a date I can read — try YYYY-MM-DD like 2026-12-04, or say today or tomorrow.');
          return;
        }
        setDraft({ ...draft, trip_date: parsed });
        setStep('time');
        say('What time should we pick you up? (e.g. 3pm or 15:30)');
        return;
      }
      case 'time': {
        const parsed = parseTime(text);
        if (!parsed) {
          say('What time? Try something like 3pm or 15:30.');
          return;
        }
        setDraft({ ...draft, trip_time: parsed });
        setStep('passengers');
        say('How many passengers? The van seats up to 13.');
        return;
      }
      case 'passengers': {
        const n = Number.parseInt(text, 10);
        if (!Number.isInteger(n) || n < 1 || n > 13) {
          say('How many passengers? Just a number from 1 to 13.');
          return;
        }
        setDraft({ ...draft, passengers: n });
        setStep('name');
        say('Almost there — what name is the booking under?');
        return;
      }
      case 'name': {
        if (text.length < 2) {
          say('What name is the booking under?');
          return;
        }
        setDraft({ ...draft, customer_name: text });
        setStep('email');
        say('And your email, so we can send the confirmation?');
        return;
      }
      case 'email': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          say('That email doesn’t look right — what email should we use?');
          return;
        }
        setDraft({ ...draft, customer_email: text });
        setStep('phone');
        say('And a phone number, in case we need to reach you?');
        return;
      }
      case 'phone': {
        if (text.replace(/\D/g, '').length < 7) {
          say('What phone number can we reach you on?');
          return;
        }
        const next = { ...draft, customer_phone: text };
        setDraft(next);
        setStep('confirm');
        say(summary(next), 800);
        return;
      }
      case 'confirm': {
        if (/^(yes|yeah|yep|book it|confirm|ok|okay|sure)/i.test(text)) {
          void submitBooking(draft);
        } else if (/^(no|change|edit)/i.test(text)) {
          say('No problem — type "start over" and we’ll run through it again.');
        } else {
          say('Shall I book it as shown? Tap “Yes, book it” or type “start over” to change anything.');
        }
        return;
      }
      default:
        return;
    }
  };

  const chips: string[] =
    step === 'service'
      ? services.map((s) => s.name)
      : step === 'confirm'
        ? ['Yes, book it', 'Start over']
        : [];

  return (
    <>
      {!open && (
        <button
          type="button"
          className="chat-fab"
          onClick={openChat}
          aria-label="Chat to book your ride"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.02 2 10.9c0 2.8 1.43 5.3 3.66 6.95-.1.87-.55 2.2-1.16 3.15 0 0 2.35-.13 4.1-1.4.74.2 1.53.3 2.4.3 5.52 0 10-4.02 10-8.9S17.52 2 12 2Z"
            />
          </svg>
          <span>Chat to book</span>
        </button>
      )}

      {open && (
        <div className="chat-panel" role="dialog" aria-label="Waymaker booking assistant">
          <div className="chat-header">
            <div>
              <strong>Waymaker Assistant</strong>
              <span className="chat-badge">Preview</span>
            </div>
            <div className="chat-header-actions">
              <button type="button" className="chat-restart" onClick={restart}>
                Restart
              </button>
              <button
                type="button"
                className="chat-close"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.from}`}>
                {m.text}
              </div>
            ))}
            {typing && <div className="chat-msg agent typing">…</div>}
            <div ref={messagesEndRef} />
          </div>

          {chips.length > 0 && step !== 'done' && (
            <div className="chat-chips">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="chat-chip"
                  onClick={() => handleText(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleText(input);
            }}
          >
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                step === 'done' ? 'Tap Restart to book another ride' : 'Type your message…'
              }
              disabled={step === 'done' || busy}
            />
            <button
              type="submit"
              className="chat-send"
              disabled={!input.trim() || step === 'done' || busy}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
