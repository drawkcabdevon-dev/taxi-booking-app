import { useState } from 'react';

/**
 * Welcome Sign Designer — a small interactive designer for Waymaker's
 * custom airport welcome signs.
 *
 * The visitor types the name for the sign, picks an occasion (which
 * suggests a greeting they can edit), and chooses a style — and sees the
 * sign live as they design it. "Book airport pickup with this sign"
 * starts the booking flow with the airport transfer preselected and the
 * sign design carried into the booking, so Waymaker knows exactly what
 * to hold up at arrivals. The preview is a mock of the finished sign;
 * Waymaker makes the real one.
 */

type SignStyle = 'classic' | 'tropical' | 'celebration';

const STYLES: { id: SignStyle; label: string; hint: string }[] = [
  { id: 'classic', label: 'Classic', hint: 'White board, green lettering' },
  { id: 'tropical', label: 'Tropical', hint: 'Sunny yellow board' },
  { id: 'celebration', label: 'Celebration', hint: 'Deep green board, gold lettering' },
];

const OCCASIONS: { label: string; greeting: string }[] = [
  { label: 'First visit', greeting: 'Welcome to Barbados' },
  { label: 'Honeymoon', greeting: 'Welcome to Barbados, honeymooners' },
  { label: 'Family trip', greeting: 'Welcome to Barbados, family' },
  { label: 'Coming home', greeting: 'Welcome home' },
];

export default function WelcomeSignDesigner({
  onBookWithSign,
}: {
  onBookWithSign: (sign: string) => void;
}) {
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('Welcome to Barbados');
  const [style, setStyle] = useState<SignStyle>('classic');
  const [occasion, setOccasion] = useState('First visit');

  const pickOccasion = (label: string, g: string) => {
    setOccasion(label);
    setGreeting(g);
  };

  const styleLabel = STYLES.find((s) => s.id === style)?.label ?? 'Classic';
  const signLine =
    name.trim().length >= 2 ? `${greeting}, ${name.trim()}!` : greeting;
  const signText = `${signLine} (${styleLabel} style)`;

  return (
    <section id="welcome-sign" className="section sign-section">
      <div className="sign-panel">
        <div className="section-header">
          <p className="eyebrow-pill">Airport Pick-up</p>
          <h2>Design Your Welcome Sign</h2>
          <p className="section-subhead">
            Landing at Grantley Adams? We&apos;ll meet you at arrivals holding
            a custom welcome sign with your name on it. Design yours here —
            it takes a minute — and we&apos;ll have it ready when you land.
          </p>
        </div>

        <div className="sign-designer">
          <div className="sign-controls">
            <div className="field">
              <label htmlFor="sign-name">Name for the sign</label>
              <input
                id="sign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex & Sam"
              />
            </div>

            <div className="field">
              <label>What&apos;s the occasion?</label>
              <div className="sign-chips">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    className={`sign-chip${occasion === o.label ? ' selected' : ''}`}
                    aria-pressed={occasion === o.label}
                    onClick={() => pickOccasion(o.label, o.greeting)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="sign-greeting">Greeting (edit it your way)</label>
              <input
                id="sign-greeting"
                value={greeting}
                onChange={(e) => {
                  setGreeting(e.target.value);
                  setOccasion('');
                }}
              />
            </div>

            <div className="field">
              <label>Sign style</label>
              <div className="sign-styles">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sign-style${style === s.id ? ' selected' : ''}`}
                    aria-pressed={style === s.id}
                    onClick={() => setStyle(s.id)}
                  >
                    <span
                      className={`sign-swatch sign-swatch-${s.id}`}
                      aria-hidden="true"
                    />
                    <span className="sign-style-label">{s.label}</span>
                    <span className="sign-style-hint">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="sign-cta"
              disabled={name.trim().length < 2}
              onClick={() => onBookWithSign(signText)}
            >
              Book airport pickup with this sign →
            </button>
            <p className="plan-fineprint">
              Your sign design goes straight into the booking — no need to
              type it again.
            </p>
          </div>

          <div className="sign-preview-wrap">
            <p className="sign-preview-label">Your sign, live</p>
            <div
              className={`sign-preview sign-preview-${style}`}
              role="img"
              aria-label={`Welcome sign preview: ${signLine}`}
            >
              <span className="sign-preview-plane" aria-hidden="true">
                ✈
              </span>
              <span className="sign-preview-text">{signLine}</span>
              <span className="sign-preview-foot">
                Waymaker Taxi Services · ZM 995
              </span>
            </div>
            <p className="sign-preview-note">
              A mock of your finished sign — Bryan &amp; Marcia make the real
              one for your arrival.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
