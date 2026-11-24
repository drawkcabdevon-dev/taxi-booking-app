import type { Service } from '../services/api';
import vanFront from '../assets/van-front.jpg';
import waymakerCollage from '../assets/waymaker-collage.jpg';

interface Props {
  services: Service[];
  onBookNow: () => void;
}

// PLACEHOLDER COPY: Waymaker has not supplied brand wording yet. The tour
// route and service list come from their Instagram presence.
const TOUR_STOPS = [
  'Historic Bridgetown',
  'Rihanna Drive',
  'Mount Gay Rum Tour',
  'North coast',
  'Sandy Lane',
  'Speightstown',
  'Animal Flower Cave',
  'East coast',
];

function priceLabel(service: Service): string {
  if (service.rate_tbd || service.price_bbd === null) return 'Price on request';
  return `Bds$${service.price_bbd.toFixed(2)} ${service.pricing_basis}`;
}

export default function LandingPage({ services, onBookNow }: Props) {
  return (
    <>
      <section className="hero">
        <h1>Waymaker Taxi Services</h1>
        <p>
          Island tours, airport transfers and private hire across Barbados —
          in one comfortable 13-seat air-conditioned van. Book online in
          minutes, no phone calls needed.
        </p>
        <button onClick={onBookNow}>Book Now</button>
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

        <h2>Our Services</h2>
        <div className="grid">
          {services.map((service) => (
            <div key={service.id} className="card">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p>
                <strong>{priceLabel(service)}</strong>
              </p>
              {service.extras.length > 0 && (
                <p className="muted">Includes: {service.extras.join(' · ')}</p>
              )}
            </div>
          ))}
        </div>

        <h2>The Island Tour</h2>
        <div className="card">
          <p>
            A guided day around Barbados with Bryan — local snacks and rum
            punch included.
          </p>
          <ul>
            {TOUR_STOPS.map((stop) => (
              <li key={stop}>{stop}</li>
            ))}
          </ul>
        </div>

        <h2>How It Works</h2>
        <div className="grid">
          <div className="card">
            <h3>1. Pick a service</h3>
            <p>Airport transfer, island tour, or hire for your function.</p>
          </div>
          <div className="card">
            <h3>2. Tell us the trip</h3>
            <p>Pickup, drop-off, date, time and how many are travelling.</p>
          </div>
          <div className="card">
            <h3>3. Confirm</h3>
            <p>Review the details, confirm, and get an email confirmation.</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={onBookNow}>Book Your Ride</button>
          <p className="muted">
            Questions? Email{' '}
            <a href="mailto:waymakertaxiservices@gmail.com">
              waymakertaxiservices@gmail.com
            </a>{' '}
            or find us on Instagram{' '}
            <a href="https://www.instagram.com/waymakertaxiservice_995">
              @waymakertaxiservice_995
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
