// Waymaker taxi booking agent — client adapter.
//
// The chat UI is driven entirely by an agent turn result, not by hard-coded
// step components. When a backend is configured (VITE_API_BASE), turns go to
// the FastAPI /api/chat endpoint, where the ADK agent runs. The static GitHub
// Pages preview has no backend, so it uses the same turn contract locally —
// the UI behaves identically and no credentials are needed to preview it.
//
// Taxi-only: service -> trip -> passengers -> contact -> confirm. The final
// action is a BOOKING REQUEST for Bryan & Marcia to review. There are no
// vehicle choices, day rates, availability calendars or fixed prices here.

import {
  createBookingRequest,
  type BookingRequest,
  type Service,
} from './api';

export type AgentStage =
  | 'service'
  | 'trip'
  | 'passengers'
  | 'contact'
  | 'confirm'
  | 'done';

export type BookingDraft = BookingRequest;

export interface AgentTurnResult {
  reply: string;
  stage: AgentStage;
  draft: BookingDraft;
  chips: string[];
  reference?: string;
  whatsappUrl?: string;
  submitted: boolean;
  mode: 'adk' | 'offline';
}

export interface AgentTurnArgs {
  message: string;
  stage: AgentStage;
  draft: BookingDraft;
  services: Service[];
  history?: { from: 'agent' | 'user'; text: string }[];
}

export const EMPTY_DRAFT: BookingDraft = {
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

// Marcia's WhatsApp — booking requests are handed to her here for review.
export const WHATSAPP_DISPLAY = '(246) 239-7278';
const WHATSAPP_PHONE = '12462397278';

const API_BASE = import.meta.env.VITE_API_BASE?.trim();
export const agentMode: 'adk' | 'offline' = API_BASE ? 'adk' : 'offline';

export function serviceName(id: string, services: Service[]): string {
  return (services.find((s) => s.id === id)?.name ?? id) || 'your ride';
}

export function buildWhatsappUrl(
  reference: string,
  draft: BookingDraft,
  services: Service[],
): string {
  const text = [
    `New Waymaker booking request ${reference}`,
    `Service: ${serviceName(draft.service_id, services)}`,
    `Trip: ${draft.pickup_location} → ${draft.dropoff_location || 'to be arranged'}`,
    `When: ${draft.trip_date} at ${draft.trip_time}${draft.return_trip ? ' (return trip)' : ''}`,
    `Passengers: ${draft.passengers}`,
    `Contact: ${draft.customer_name} · ${draft.customer_email} · ${draft.customer_phone}`,
    draft.notes ? `Notes: ${draft.notes}` : '',
    'Please quote the rate and confirm directly with the customer.',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Accepts YYYY-MM-DD, "today" or "tomorrow". */
function parseDate(text: string): string | null {
  const t = text.trim().toLowerCase();
  const now = new Date();
  if (t === 'today') return localDate(now);
  if (t === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return localDate(d);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, day] = t.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== m - 1 ||
    d.getDate() !== day ||
    t < localDate(now)
  ) {
    return null;
  }
  return t;
}

/** Accepts 24h "15:30" or "3pm" / "3:30pm". */
function parseTime(text: string): string | null {
  const m24 = text.trim().match(/^([01]\d|2[0-3]):[0-5]\d$/);
  if (m24) return m24[0];
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/);
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
  if (/\b(airport|flight|plane|pick.?up|arrivals|bgi|grantley)\b/.test(t))
    return services.find((s) => s.id === 'airport-transfer') ?? null;
  if (/\btour|sightsee|island\b/.test(t))
    return services.find((s) => s.id === 'island-tour') ?? null;
  if (/\b(wedding|funeral|event|function|party|hire|charter)\b/.test(t))
    return services.find((s) => s.id === 'other-function') ?? null;
  return null;
}

function summary(draft: BookingDraft, services: Service[]): string {
  return [
    "Here's your booking request — nothing is confirmed yet:",
    `• ${serviceName(draft.service_id, services)}`,
    `• ${draft.pickup_location} → ${draft.dropoff_location || 'to be arranged'}`,
    `• ${draft.trip_date} at ${draft.trip_time}${draft.return_trip ? ' (return trip)' : ''}`,
    `• ${draft.passengers} passenger(s)`,
    `• ${draft.customer_name} · ${draft.customer_email} · ${draft.customer_phone}`,
    draft.notes ? `• Notes: ${draft.notes}` : '',
    '',
    'Bryan & Marcia review the request and quote your rate — there is no fixed price to pay now. Shall I send it to them?',
  ]
    .filter(Boolean)
    .join('\n');
}

function result(
  reply: string,
  stage: AgentStage,
  draft: BookingDraft,
  chips: string[] = [],
  extra: Partial<AgentTurnResult> = {},
): AgentTurnResult {
  return {
    reply,
    stage,
    draft,
    chips,
    submitted: false,
    mode: 'offline',
    ...extra,
  };
}

function serviceChips(services: Service[]): string[] {
  return services.map((s) => s.name);
}

/** Deterministic agent used by the static preview and as a backend fallback.
 * The UI never knows which transport answered — the contract is identical. */
export async function localAgentTurn(args: AgentTurnArgs): Promise<AgentTurnResult> {
  const text = args.message.trim();
  const services = args.services;
  const draft: BookingDraft = { ...args.draft };
  let stage = args.stage;

  if (/^(start over|restart|new booking)$/i.test(text)) {
    return result(
      "Of course — let's start again. Which service do you need?",
      'service',
      { ...EMPTY_DRAFT },
      serviceChips(services),
    );
  }
  if (/^(help|what can you do)$/i.test(text)) {
    return result(
      'I can take a booking request for an airport transfer, an island tour or private hire: service, trip, passengers, then your contact details. Bryan & Marcia review it and quote the rate — I never take payment or invent a price. Which service do you need?',
      stage,
      draft,
      stage === 'service' ? serviceChips(services) : [],
    );
  }

  switch (stage) {
    case 'service': {
      const service = matchService(text, services);
      if (!service) {
        return result(
          'I can help with an airport pick-up, an island tour or private hire — tap one below or tell me which you need.',
          stage,
          draft,
          serviceChips(services),
        );
      }
      draft.service_id = service.id;
      return result(
        service.id === 'island-tour'
          ? 'The island tour — great choice. Bryan shows you Bridgetown, Rihanna Drive, Mount Gay, the north coast and more, with snacks and rum punch. Where should we pick you up?'
          : `Got it — ${service.name}. Where should we pick you up?`,
        'trip',
        draft,
      );
    }

    case 'trip': {
      const isTour = draft.service_id === 'island-tour';
      if (!draft.pickup_location.trim()) {
        if (text.length < 2) {
          return result('Where should we pick you up? A hotel, address or landmark works.', stage, draft);
        }
        draft.pickup_location = text;
        if (isTour) {
          draft.dropoff_location = 'Island tour — full route';
          return result('What date is the tour? (e.g. 2026-12-04, or just say tomorrow)', stage, draft);
        }
        return result('And where are you heading?', stage, draft);
      }
      if (!isTour && !draft.dropoff_location.trim()) {
        if (text.length < 2) {
          return result('Where are you heading? A hotel, address or landmark works.', stage, draft);
        }
        draft.dropoff_location = text;
        return result('What date? (e.g. 2026-12-04, or just say tomorrow)', stage, draft);
      }
      if (!draft.trip_date) {
        const parsed = parseDate(text);
        if (!parsed) {
          return result("I need a date I can read — try YYYY-MM-DD like 2026-12-04, or say today or tomorrow.", stage, draft);
        }
        draft.trip_date = parsed;
        return result('What time should we pick you up? (e.g. 3pm or 15:30)', stage, draft);
      }
      if (!draft.trip_time) {
        const parsed = parseTime(text.replace(/\b(return|round trip)\b/gi, '').trim());
        if (!parsed) {
          return result('What time? Try something like 3pm or 15:30.', stage, draft);
        }
        draft.trip_time = parsed;
        if (/\b(return|round trip|both ways)\b/i.test(text)) draft.return_trip = true;
        return result('How many passengers? The van seats up to 13.', 'passengers', draft);
      }
      return result('How many passengers? The van seats up to 13.', 'passengers', draft);
    }

    case 'passengers': {
      const n = Number.parseInt(text, 10);
      if (!Number.isInteger(n) || n < 1 || n > 13) {
        return result('How many passengers? Just a number from 1 to 13.', stage, draft);
      }
      draft.passengers = n;
      return result('Almost there — what name is the booking under?', 'contact', draft);
    }

    case 'contact': {
      if (!draft.customer_name.trim()) {
        if (text.length < 2) return result('What name is the booking under?', stage, draft);
        draft.customer_name = text;
        return result('And your email, so Bryan & Marcia can send the quote?', stage, draft);
      }
      if (!draft.customer_email.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          return result('That email doesn’t look right — what email should we use?', stage, draft);
        }
        draft.customer_email = text;
        return result('And a phone number, in case they need to reach you?', stage, draft);
      }
      if (!draft.customer_phone.trim()) {
        if (text.replace(/\D/g, '').length < 7) {
          return result('What phone number can we reach you on?', stage, draft);
        }
        draft.customer_phone = text;
        return result(
          'Anything else they should know — luggage, flight number, accessibility needs? Type "none" to skip.',
          stage,
          draft,
        );
      }
      if (text && !/^(none|no|nope|skip)$/i.test(text)) draft.notes = text;
      return result(summary(draft, services), 'confirm', draft, [
        'Yes, send request',
        'Change something',
        'Start over',
      ]);
    }

    case 'confirm': {
      if (/^(yes|yeah|yep|book it|send it|confirm|ok|okay|sure)/i.test(text)) {
        const reference = await submitRequest(draft);
        const whatsappUrl = buildWhatsappUrl(reference, draft, services);
        return result(
          [
            `Request ${reference} is in. This is NOT a confirmed booking — Bryan & Marcia review it and quote your rate, usually by email or phone.`,
            '',
            `${serviceName(draft.service_id, services)} · ${draft.trip_date} at ${draft.trip_time} · ${draft.passengers} passenger(s).`,
            '',
            `Prefer WhatsApp? Send the request straight to Marcia on ${WHATSAPP_DISPLAY}:`,
            whatsappUrl,
          ].join('\n'),
          'done',
          draft,
          ['Start over'],
          { reference, whatsappUrl, submitted: true },
        );
      }
      if (/^(no|change|edit|back)/i.test(text)) {
        if (/date|when/i.test(text)) {
          draft.trip_date = '';
          draft.trip_time = '';
          return result('What date? (e.g. 2026-12-04, or tomorrow)', 'trip', draft);
        }
        if (/time/i.test(text)) {
          draft.trip_time = '';
          return result('What time should we pick you up?', 'trip', draft);
        }
        if (/pickup|pick up|where/i.test(text)) {
          draft.pickup_location = '';
          return result('Where should we pick you up?', 'trip', draft);
        }
        if (/drop|destination|heading/i.test(text)) {
          draft.dropoff_location = '';
          return result('Where are you heading?', 'trip', draft);
        }
        if (/passenger|people|party/i.test(text)) {
          return result('How many passengers? 1 to 13.', 'passengers', draft);
        }
        if (/name|email|phone|contact/i.test(text)) {
          draft.customer_name = '';
          draft.customer_email = '';
          draft.customer_phone = '';
          return result('What name is the booking under?', 'contact', draft);
        }
        if (/service|ride|tour|transfer/i.test(text)) {
          draft.service_id = '';
          draft.pickup_location = '';
          draft.dropoff_location = '';
          return result('Which service do you need?', 'service', draft, serviceChips(services));
        }
        return result(
          'No problem — tell me what to change (date, time, pickup, passengers, contact or service), or type "start over".',
          stage,
          draft,
        );
      }
      return result('Shall I send the request as shown?', stage, draft, [
        'Yes, send request',
        'Change something',
        'Start over',
      ]);
    }

    case 'done':
      return result(
        `That request is already with Waymaker. Type "start over" to make another one.`,
        stage,
        draft,
        ['Start over'],
      );
  }
}

async function submitRequest(draft: BookingDraft): Promise<string> {
  // The live backend owns the request record. On the static preview there is
  // no backend, so a local reference is issued and the WhatsApp handoff is
  // shown to the customer. No price is ever computed in either path.
  if (API_BASE) {
    try {
      const res = await createBookingRequest(draft);
      return res.booking_id;
    } catch {
      // Backend unreachable — still let the customer complete the preview.
    }
  }
  return `WM-REQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/** Send one turn to the ADK agent when a backend is configured; otherwise
 * use the same contract locally so the preview works without credentials. */
export async function sendAgentTurn(args: AgentTurnArgs): Promise<AgentTurnResult> {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, '')}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: args.message,
          stage: args.stage,
          draft: args.draft,
          history: args.history ?? [],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as Omit<AgentTurnResult, 'mode'>;
        return { ...data, mode: 'adk' };
      }
    } catch {
      // Fall through to the offline agent so the chat stays usable.
    }
  }
  return localAgentTurn(args);
}
