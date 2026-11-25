import cateringMeal from '../assets/catering-meal.webp';
import cateringSnacks from '../assets/catering-snacks.webp';

/**
 * CateringMenu — the tour catering section.
 *
 * Simple Bajan menu built from Waymaker's own photos of their plated
 * meals and snack boxes (backgrounds removed). No prices — catering is
 * arranged with the tour booking, so the call to action points at the
 * Plan Your Tour section, where the customer can mention it in their
 * plan. Menu items are only what's actually in the photos.
 */

const MENU_ITEMS: { name: string; note: string }[] = [
  { name: 'Macaroni Pie', note: 'Baked golden, the Bajan classic' },
  { name: 'Rice & Peas', note: 'Seasoned and served hot' },
  { name: 'Stewed Chicken', note: 'Slow-cooked, rich and tender' },
  { name: 'Fried Plantain', note: 'Sweet, golden slices' },
  { name: 'Sweet Corn', note: 'Buttered corn on the cob' },
  { name: 'Garden Salad', note: 'Fresh greens, tomato & cucumber' },
  { name: 'Snack Boxes', note: 'Sandwiches, cake & fresh fruit' },
];

export default function CateringMenu() {
  return (
    <section id="catering" className="section cater-section">
      <div className="cater-panel">
        <div className="section-header">
          <p className="eyebrow-pill">Tour Catering</p>
          <h2>Bajan Food, On the Tour</h2>
          <p className="section-subhead">
            Proper Bajan cooking, plated and ready along the way. Add
            catering to your island tour when you book — no stopping to
            hunt for lunch.
          </p>
        </div>

        <div className="cater-grid">
          <div className="cater-photos">
            <img
              src={cateringMeal}
              alt="Plated Bajan meals — rice, macaroni pie, stewed chicken, plantain, corn and salad"
              className="cater-photo cater-photo-meal"
            />
            <img
              src={cateringSnacks}
              alt="Waymaker snack boxes with sandwiches, cake and fresh fruit"
              className="cater-photo cater-photo-snacks"
            />
          </div>

          <div className="cater-menu">
            <h3>The menu</h3>
            <ul>
              {MENU_ITEMS.map((item) => (
                <li key={item.name}>
                  <span className="cater-item-name">{item.name}</span>
                  <span className="cater-item-note">{item.note}</span>
                </li>
              ))}
            </ul>
            <a href="#plan-your-tour" className="cater-cta">
              Add catering to my tour →
            </a>
            <p className="plan-fineprint">
              Mention catering in your tour plan and Waymaker confirms it
              with your booking.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
