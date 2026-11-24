import type { ReactNode } from 'react';
import type { Service } from '../services/api';
import { SERVICE_IMAGES } from '../components/serviceImages';
import vanFront from '../assets/van-front.jpg';
import waymakerCollage from '../assets/waymaker-collage.jpg';
import how1 from '../assets/how-1.jpg';
import how2 from '../assets/how-2.jpg';
import how3 from '../assets/how-3.jpg';

interface Props {
  services: Service[];
  onBookNow: () => void;
}

// Tour route from Waymaker's Instagram presence. Stop descriptions are
// kept short and factual — no invented claims.
const TOUR_STOPS: { name: string; blurb: string }[] = [
  {
    name: 'Historic Bridgetown',
    blurb:
      'UNESCO World Heritage colonial architecture, the Careenage & Parliament buildings.',
  },
  {
    name: 'Rihanna Drive',
    blurb:
      'The colourful childhood home and tribute street of the international music icon.',
  },
  {
    name: 'Mount Gay Rum Tour',
    blurb:
      'The historic birthplace of rum, with heritage tastings dating back to 1703.',
  },
  {
    name: 'North coast',
    blurb: 'Crashing Atlantic rollers and panoramic lookout points.',
  },
  {
    name: 'Sandy Lane',
    blurb: 'The Platinum Coast — calm turquoise coves and luxury beachfronts.',
  },
  {
    name: 'Speightstown',
    blurb:
      'Charming historic fishing hub with seaside bakeries and colonial arcades.',
  },
  {
    name: 'Animal Flower Cave',
    blurb:
      'Dramatic north-point sea caves, natural rock pools, and cliffside vistas.',
  },
  {
    name: 'East coast',
    blurb:
      'Soup Bowl surf break, mushroom rock formations, and breezy coconut groves.',
  },
];

// Per-service presentation for the landing cards. Keyed by service id;
// services without an entry render plainly with a generic link.
const SERVICE_META: Record<
  string,
  { badge: string; popular?: boolean; link: string }
> = {
  'airport-transfer': { badge: 'Grantley Adams (BGI)', link: 'Request Transfer' },
  'island-tour': {
    badge: '★ Most Popular',
    popular: true,
    link: 'View Tour Details',
  },
  'other-function': { badge: 'Private Charter', link: 'Inquire for Events' },
};

function priceLabel(service: Service): string {
  if (service.rate_tbd || service.price_bbd === null) return 'Price on request';
  return `Bds$${service.price_bbd.toFixed(2)} ${service.pricing_basis}`;
}

// Small inline SVG icon (24×24 stroke icons, currentColor).
function Icon({
  children,
  size = 18,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  van: (
    <>
      <path d="M3 17V8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v9" />
      <path d="M18 10h2a2 2 0 0 1 2 2v5" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
      <path d="M3 13h13" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  plane: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  clipboard: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </>
  ),
  checkCircle: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  glass: (
    <>
      <path d="M4 4h16l-8 9-8-9z" />
      <path d="M12 13v6M8 21h8" />
    </>
  ),
  sliders: (
    <>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </>
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
};

const HOW_STEPS = [
  {
    image: how1,
    alt: 'Booking a trip on a smartphone',
    icon: ICONS.van,
    step: 'STEP 01',
    title: 'Pick a service',
    text: 'Airport transfer, guided island tour, or private hire for your family or group.',
    check: 'Rates on request',
  },
  {
    image: how2,
    alt: 'A palm-lined road on the Barbados east coast',
    icon: ICONS.clipboard,
    step: 'STEP 02',
    title: 'Tell us the trip',
    text: 'Pickup, drop-off, date, time and how many are travelling — plus your flight number if you have one.',
    check: 'Book online in minutes',
  },
  {
    image: how3,
    alt: 'Travellers relaxing on lounge chairs at a tropical beach',
    icon: ICONS.checkCircle,
    step: 'STEP 03',
    title: 'Confirm & Relax',
    text: 'Review the details, confirm, and get an email confirmation.',
    check: 'Email confirmation included',
  },
];

export default function LandingPage({ services, onBookNow }: Props) {
  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <a className="topnav-brand" href="#top">
            Waymaker Taxi Services
            <span className="topnav-badge">Barbados</span>
          </a>
          <nav className="topnav-links" aria-label="Sections">
            <a href="#services">Services</a>
            <a href="#tour">Island Tour</a>
            <a href="#how-it-works">How It Works</a>
          </nav>
          <button className="topnav-cta" onClick={onBookNow}>
            Book Now
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <img
          className="hero-image"
          src={vanFront}
          alt="The Waymaker 13-seat air-conditioned van, ZM 995"
        />
        <div className="hero-content">
          <div className="hero-card">
            <p className="hero-pill">
              <span className="hero-pill-dot" aria-hidden="true" />
              ZM 995 · Family owned &amp; operated by Bryan &amp; Marcia
            </p>
            <h1>
              Barbados,
              <br />
              <em>on your schedule.</em>
            </h1>
            <p className="hero-subhead">
              Island tours, airport pick-ups and private hire — book online in
              minutes, no phone calls needed.
            </p>
            <div className="hero-actions">
              <button className="hero-cta" onClick={onBookNow}>
                Book Now →
              </button>
              <a className="hero-secondary" href="#tour">
                <Icon size={16}>{ICONS.pin}</Icon> Explore Island Tour
              </a>
            </div>
            <div className="hero-badges">
              <span>
                <Icon size={16}>{ICONS.van}</Icon> 13-Seat A/C Van
              </span>
              <span>
                <Icon size={16}>{ICONS.sun}</Icon> Island Tours
              </span>
              <span>
                <Icon size={16}>{ICONS.plane}</Icon> Airport Transfers
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="grid gallery">
          <figure>
            <img
              src={vanFront}
              alt="The Waymaker 13-seat air-conditioned van, ZM 995"
            />
            <figcaption>Our 13-seat air-conditioned van — ZM 995</figcaption>
          </figure>
          <figure>
            <img
              src={waymakerCollage}
              alt="WayMaker Taxi Service — logo, Bryan with the van, and business card"
            />
            <figcaption>
              WayMaker Taxi Service — “Our love to Serving You is unfailing”
            </figcaption>
          </figure>
        </div>

        <section id="services" className="section">
          <div className="section-header">
            <p className="eyebrow-pill">What We Offer</p>
            <h2>Friendly, Reliable Island Transportation</h2>
            <p className="section-subhead">
              Experience genuine Bajan hospitality with Bryan behind the wheel
              and Marcia coordinating your seamless journeys across every
              parish.
            </p>
          </div>
          <div className="grid svc-grid">
            {services.map((service) => {
              const image = SERVICE_IMAGES[service.id];
              const meta = SERVICE_META[service.id];
              const note =
                service.extras.length > 0
                  ? service.extras.join(' · ')
                  : 'Up to 13 passengers';
              return (
                <article
                  key={service.id}
                  className={`svc-card${meta?.popular ? ' svc-card-popular' : ''}`}
                >
                  <div className="svc-card-media">
                    {image && <img src={image.src} alt={image.alt} />}
                    {meta && (
                      <span
                        className={`svc-badge${meta.popular ? ' svc-badge-popular' : ''}`}
                      >
                        {meta.badge}
                      </span>
                    )}
                  </div>
                  <div className="svc-card-body">
                    <div className="svc-title-row">
                      <h3>{service.name}</h3>
                      <span className="price-pill">{priceLabel(service)}</span>
                    </div>
                    <p>{service.description}</p>
                    <div className="svc-footer">
                      <span className="svc-note">{note}</span>
                      <button
                        type="button"
                        className="svc-link"
                        onClick={onBookNow}
                      >
                        {meta?.link ?? 'Book Now'} →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="tour" className="section">
          <div className="tour-panel">
            <div className="tour-head">
              <div>
                <p className="eyebrow-pill eyebrow-pill-dark">
                  Island Adventure
                </p>
                <h2>A Day Around Barbados with Bryan</h2>
                <p className="tour-intro">
                  A guided day around Barbados with Bryan, from Historic
                  Bridgetown to the east coast — local snacks and Marcia&apos;s
                  rum punch included.
                </p>
              </div>
              <aside className="tour-callout">
                <div className="tour-callout-icon">
                  <Icon size={22}>{ICONS.glass}</Icon>
                </div>
                <div>
                  <p className="tour-callout-badge">Included On Tour</p>
                  <h3>Local Snacks &amp; Marcia&apos;s Rum Punch</h3>
                  <p>
                    Local snacks and Marcia&apos;s rum punch, served along the
                    way.
                  </p>
                </div>
              </aside>
            </div>
            <h3 className="tour-stops-heading">
              <Icon size={18}>{ICONS.pin}</Icon> Key Highlights Along Your
              Custom Itinerary
            </h3>
            <div className="tour-stops">
              {TOUR_STOPS.map((stop, i) => (
                <div key={stop.name} className="tour-stop">
                  <span className="tour-stop-num">{i + 1}</span>
                  <h4>{stop.name}</h4>
                  <p>{stop.blurb}</p>
                </div>
              ))}
            </div>
            <div className="tour-flex">
              <div className="tour-flex-text">
                <Icon size={22}>{ICONS.sliders}</Icon>
                <div>
                  <strong>100% Flexible &amp; Personalized</strong>
                  <p>
                    Want more beach time or an extra photo stop? Bryan
                    customizes each route for you.
                  </p>
                </div>
              </div>
              <button onClick={onBookNow}>Book This Tour</button>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section">
          <div className="section-header">
            <p className="eyebrow-pill">Simple &amp; Easy</p>
            <h2>How It Works</h2>
            <p className="section-subhead">
              Book your Barbados transport in 3 simple steps.
            </p>
          </div>
          <div className="grid">
            {HOW_STEPS.map((s) => (
              <article key={s.step} className="how-card">
                <img className="how-photo" src={s.image} alt={s.alt} />
                <div className="how-body">
                  <div className="how-icon">
                    <Icon size={22}>{s.icon}</Icon>
                  </div>
                  <p className="how-step">{s.step}</p>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <p className="how-check">
                    <Icon size={16}>{ICONS.check}</Icon> {s.check}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="cta-band">
            <p className="cta-eyebrow">ZM 995 · 13 Passengers</p>
            <h2>Ready to explore Barbados with Bryan &amp; Marcia?</h2>
            <p className="cta-copy">
              Secure your ride in our spacious, air-conditioned 13-seat van
              (ZM 995). Enjoy dependable airport pickups and unforgettable
              tailored tours.
            </p>
            <button className="cta-button" onClick={onBookNow}>
              Book Your Ride
            </button>
            <div className="cta-contacts">
              <div className="cta-contact">
                <span className="cta-contact-icon">
                  <Icon size={18}>{ICONS.mail}</Icon>
                </span>
                <span className="cta-contact-text">
                  <small>Direct Email</small>
                  <a href="mailto:waymakertaxiservices@gmail.com">
                    waymakertaxiservices@gmail.com
                  </a>
                </span>
              </div>
              <div className="cta-contact">
                <span className="cta-contact-icon">
                  <Icon size={18}>{ICONS.instagram}</Icon>
                </span>
                <span className="cta-contact-text">
                  <small>Instagram</small>
                  <a href="https://www.instagram.com/waymakertaxiservice_995">
                    @waymakertaxiservice_995
                  </a>
                </span>
              </div>
              <div className="cta-contact">
                <span className="cta-contact-icon">
                  <Icon size={18}>{ICONS.van}</Icon>
                </span>
                <span className="cta-contact-text">
                  <small>Vehicle Details</small>
                  <span>ZM 995</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
