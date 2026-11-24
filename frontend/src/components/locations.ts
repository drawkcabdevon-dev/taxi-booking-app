/**
 * Popular Barbados locations for the booking form's pickup and
 * drop-off fields. These are suggestions only — the customer can
 * always type any address. Kept to well-known places a visitor is
 * likely to be picked up from or dropped at: the airport, the cruise
 * terminal, major hotels, and popular areas and attractions.
 */

export type LocationCategory =
  | 'Airport & Port'
  | 'Hotels'
  | 'Areas & Attractions';

export interface SuggestedLocation {
  name: string;
  area: string;
  category: LocationCategory;
}

export const SUGGESTED_LOCATIONS: SuggestedLocation[] = [
  // Airport & Port
  { name: 'Grantley Adams International Airport (BGI)', area: 'Christ Church', category: 'Airport & Port' },
  { name: 'Bridgetown Cruise Terminal', area: 'Bridgetown', category: 'Airport & Port' },

  // Hotels — south coast
  { name: 'Sandals Barbados', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'Sandals Royal Barbados', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'Turtle Beach by Elegant Hotels', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'Waves Hotel & Spa', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'O2 Beach Club & Spa', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'Sea Breeze Beach House', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'Divi Southwinds Beach Resort', area: 'St. Lawrence Gap', category: 'Hotels' },
  { name: 'Accra Beach Hotel & Spa', area: 'Rockley', category: 'Hotels' },
  { name: 'Hilton Barbados Resort', area: "Needham's Point", category: 'Hotels' },
  { name: 'Radisson Aquatica Resort', area: "Needham's Point", category: 'Hotels' },
  { name: 'Courtyard by Marriott Bridgetown', area: 'Bridgetown', category: 'Hotels' },
  { name: 'Bougainvillea Barbados', area: 'Oistins', category: 'Hotels' },
  { name: 'The Crane Resort', area: 'St. Philip', category: 'Hotels' },
  { name: 'Little Arches Boutique Hotel', area: 'Enterprise', category: 'Hotels' },

  // Hotels — west coast
  { name: 'Sugar Bay Barbados', area: 'Holetown', category: 'Hotels' },
  { name: 'Colony Club by Elegant Hotels', area: 'Holetown', category: 'Hotels' },
  { name: 'Fairmont Royal Pavilion', area: 'Holetown', category: 'Hotels' },
  { name: 'Coral Reef Club', area: 'Holetown', category: 'Hotels' },
  { name: 'Mango Bay', area: 'Holetown', category: 'Hotels' },
  { name: 'The House by Elegant Hotels', area: 'Paynes Bay', category: 'Hotels' },
  { name: 'Cobblers Cove', area: 'Speightstown', category: 'Hotels' },

  // Areas & Attractions
  { name: 'St. Lawrence Gap', area: 'Christ Church', category: 'Areas & Attractions' },
  { name: 'Holetown', area: 'St. James', category: 'Areas & Attractions' },
  { name: 'Speightstown', area: 'St. Peter', category: 'Areas & Attractions' },
  { name: 'Bridgetown (Downtown)', area: 'St. Michael', category: 'Areas & Attractions' },
  { name: 'Oistins', area: 'Christ Church', category: 'Areas & Attractions' },
  { name: 'Bathsheba', area: 'St. Joseph', category: 'Areas & Attractions' },
  { name: 'Carlisle Bay', area: 'Bridgetown', category: 'Areas & Attractions' },
  { name: 'Animal Flower Cave', area: 'St. Lucy', category: 'Areas & Attractions' },
  { name: "Harrison's Cave", area: 'St. Thomas', category: 'Areas & Attractions' },
  { name: 'Mount Gay Distillery', area: 'Bridgetown', category: 'Areas & Attractions' },
  { name: 'Rihanna Drive', area: 'Bridgetown', category: 'Areas & Attractions' },
];

/** The short list shown before the customer types anything. */
const POPULAR_NAMES = [
  'Grantley Adams International Airport (BGI)',
  'Bridgetown Cruise Terminal',
  'Sandals Barbados',
  'Hilton Barbados Resort',
  'The Crane Resort',
  'St. Lawrence Gap',
  'Holetown',
  'Speightstown',
];

export const POPULAR_LOCATIONS: SuggestedLocation[] = POPULAR_NAMES.map(
  (name) =>
    SUGGESTED_LOCATIONS.find((loc) => loc.name === name) as SuggestedLocation,
);

const MAX_SUGGESTIONS = 8;

/**
 * Matches a query against name and area. Empty query returns the
 * popular shortlist. Name matches rank before area matches.
 */
export function matchLocations(query: string): SuggestedLocation[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return POPULAR_LOCATIONS;
  const nameHits: SuggestedLocation[] = [];
  const areaHits: SuggestedLocation[] = [];
  for (const loc of SUGGESTED_LOCATIONS) {
    if (loc.name.toLowerCase().includes(q)) nameHits.push(loc);
    else if (loc.area.toLowerCase().includes(q)) areaHits.push(loc);
  }
  return [...nameHits, ...areaHits].slice(0, MAX_SUGGESTIONS);
}
