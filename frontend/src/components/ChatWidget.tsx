import { useEffect, useRef, useState } from 'react';
import type { Service } from '../services/api';
import {
  agentMode,
  sendAgentTurn,
  WHATSAPP_DISPLAY,
  type AgentStage,
  type AgentTurnResult,
  type BookingDraft,
} from '../services/bookingAgent';
import './ChatWidget.css';

/**
 * Waymaker booking assistant — ADK-agent driven chat.
 *
 * Every reply, stage and collected field comes from an agent turn result;
 * the widget only renders that result. Turns are sent to the FastAPI
 * /api/chat endpoint (ADK agent) when a backend is configured. The static
 * Pages preview uses the local adapter with the same contract, so the taxi
 * flow can be reviewed without GCP credentials.
 *
 * The flow is service -> trip -> passengers -> contact -> confirm, and the
 * final action is a BOOKING REQUEST for Bryan & Marcia to review and price.
 */

type ChatMessage = { from: 'agent' | 'user'; text: string };

type Props = { services: Service[] };

const GREETING =
  "Hi! I'm the Waymaker booking assistant. I can take a booking request for an airport transfer, an island tour or private hire — right here in chat. Bryan & Marcia will review it and quote the rate. What do you need?";

export default function ChatWidget({ services }: Props) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stage, setStage] = useState<AgentStage>('service');
  const [draft, setDraft] = useState<BookingDraft>({
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
  });
  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [mode, setMode] = useState<'adk' | 'offline'>(agentMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open, whatsappUrl]);

  const greet = () => {
    setMessages([{ from: 'agent', text: GREETING }]);
    setChips(services.map((s) => s.name));
    setStage('service');
    setReference('');
    setWhatsappUrl('');
    setTyping(false);
  };

  const openChat = () => {
    setOpen(true);
    if (!started) {
      setStarted(true);
      setTyping(true);
      window.setTimeout(() => {
        greet();
        setTyping(false);
      }, 350);
    }
  };

  const restart = () => {
    setDraft({
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
    });
    setBusy(false);
    setTyping(true);
    window.setTimeout(() => {
      greet();
      setTyping(false);
    }, 300);
  };

  const applyTurn = (result: AgentTurnResult) => {
    setDraft(result.draft);
    setStage(result.stage);
    setChips(result.chips ?? []);
    setMessages((m) => [...m, { from: 'agent', text: result.reply }]);
    setMode(result.mode);
    if (result.submitted && result.reference) {
      setReference(result.reference);
      setWhatsappUrl(result.whatsappUrl ?? '');
    }
  };

  const handleText = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy || stage === 'done') return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setChips([]);
    setBusy(true);
    setTyping(true);
    try {
      const result = await sendAgentTurn({
        message: text,
        stage,
        draft,
        services,
        history: messages,
      });
      applyTurn(result);
    } catch {
      setMessages((m) => [
        ...m,
        {
          from: 'agent',
          text: 'Sorry — I lost that reply. Please try again, or email waymakertaxiservices@gmail.com.',
        },
      ]);
    } finally {
      setTyping(false);
      setBusy(false);
    }
  };

  const stageLabel: Record<AgentStage, string> = {
    service: 'Service',
    trip: 'Trip',
    passengers: 'Passengers',
    contact: 'Contact',
    confirm: 'Confirm request',
    done: 'Request sent',
  };

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
              <strong>Waymaker Agent</strong>
              <span className="chat-badge">
                {mode === 'adk' ? 'ADK connected' : 'Preview mode'}
              </span>
              <span className="chat-stage">{stageLabel[stage]}</span>
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
            {whatsappUrl && (
              <div className="chat-request">
                <p>
                  Request <strong>{reference}</strong> — rate quoted on review by
                  Bryan &amp; Marcia. Send it to Marcia on {WHATSAPP_DISPLAY}:
                </p>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  Open WhatsApp request
                </a>
              </div>
            )}
            {typing && <div className="chat-msg agent typing">…</div>}
            <div ref={messagesEndRef} />
          </div>

          {chips.length > 0 && stage !== 'done' && (
            <div className="chat-chips">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="chat-chip"
                  disabled={busy}
                  onClick={() => void handleText(chip)}
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
              void handleText(input);
            }}
          >
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                stage === 'done' ? 'Tap Restart to send another request' : 'Type your message…'
              }
              disabled={stage === 'done' || busy}
              aria-label="Your message"
            />
            <button
              type="submit"
              className="chat-send"
              disabled={!input.trim() || stage === 'done' || busy}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
