// Shared island-tour stop data — used by the landing page carousel and
// the Plan Your Tour picker, so both always show the same stops, photos
// and links.
//
// Tour route from Waymaker's Instagram presence. Stop descriptions are
// kept short and factual — no invented claims. Each "Learn more" link was
// verified live (HTTP 200, page about that place) on 2026-11-24.
import stopBridgetown from '../assets/stop-bridgetown.jpg';
import stopRihanna from '../assets/stop-rihanna.jpg';
import stopMountGay from '../assets/stop-mountgay.jpg';
import stopNorthCoast from '../assets/stop-northcoast.jpg';
import stopSandyLane from '../assets/stop-sandylane.jpg';
import stopSpeightstown from '../assets/stop-speightstown.jpg';
import stopAnimalFlower from '../assets/stop-animalflower.jpg';
import stopEastCoast from '../assets/stop-eastcoast.jpg';

export interface TourStop {
  name: string;
  blurb: string;
  image: string;
  alt: string;
  link?: string;
}

export const TOUR_STOPS: TourStop[] = [
  {
    name: 'Historic Bridgetown',
    blurb:
      'UNESCO World Heritage colonial architecture, the Careenage & Parliament buildings.',
    image: stopBridgetown,
    alt: 'Boats on the Careenage in Historic Bridgetown, with colourful waterfront buildings',
    link: 'https://www.visitbarbados.org/discover/unesco-world-heritage-site',
  },
  {
    name: 'Rihanna Drive',
    blurb:
      'The colourful childhood home and tribute street of the international music icon.',
    image: stopRihanna,
    alt: 'Chattel houses on Rihanna Drive in Bridgetown',
    link: 'https://www.nme.com/news/music/street-named-after-rihanna-2167407',
  },
  {
    name: 'Mount Gay Rum Tour',
    blurb:
      'The historic birthplace of rum, with heritage tastings dating back to 1703.',
    image: stopMountGay,
    alt: 'Oak rum barrels stacked in the Mount Gay ageing warehouse',
    link: 'https://www.mountgayrum.com/tour/mount-gay-discovery-experience/',
  },
  {
    name: 'North coast',
    blurb: 'Crashing Atlantic rollers and panoramic lookout points.',
    image: stopNorthCoast,
    alt: 'Atlantic waves crashing against the Barbados north coast cliffs',
    link: 'https://barbados.org/north-point-barbados.htm',
  },
  {
    name: 'Sandy Lane',
    blurb: 'The Platinum Coast — calm turquoise coves and luxury beachfronts.',
    image: stopSandyLane,
    alt: 'Calm turquoise water and white sand at Sandy Lane beach',
    link: 'https://evendo.com/locations/barbados/south-coast/attraction/sandy-lane-beach',
  },
  {
    name: 'Speightstown',
    blurb:
      'Charming historic fishing hub with seaside bakeries and colonial arcades.',
    image: stopSpeightstown,
    alt: 'Speightstown waterfront with colourful buildings and turquoise water',
    link: 'https://yeppa.com/destinations/speightstown',
  },
  {
    name: 'Animal Flower Cave',
    blurb:
      'Dramatic north-point sea caves, natural rock pools, and cliffside vistas.',
    image: stopAnimalFlower,
    alt: 'Looking out to the Atlantic from inside Animal Flower Cave',
    link: 'https://www.animalflowercave.com',
  },
  {
    name: 'East coast',
    blurb:
      'Soup Bowl surf break, mushroom rock formations, and breezy coconut groves.',
    image: stopEastCoast,
    alt: 'Bathsheba on the east coast, with mushroom rocks and Atlantic surf',
    link: 'https://www.visitbarbados.org/the-soup-bowl',
  },
];
