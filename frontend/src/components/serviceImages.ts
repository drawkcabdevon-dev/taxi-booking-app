import airportImg from '../assets/service-airport.jpg';
import tourImg from '../assets/service-tour.jpg';
import functionImg from '../assets/service-function.jpg';

/**
 * Stock photos for the service cards (landing page + booking step 1).
 * Deliberately different from the Waymaker Instagram photos used in the
 * hero and gallery. Keyed by service id; services without an entry render
 * no image.
 */
export const SERVICE_IMAGES: Record<string, { src: string; alt: string }> = {
  'airport-transfer': {
    src: airportImg,
    alt: 'Airplane taking off from the runway',
  },
  'island-tour': {
    src: tourImg,
    alt: 'Barbados beach with palm trees and turquoise sea',
  },
  'other-function': {
    src: functionImg,
    alt: 'Wedding couple on the beach at sunset',
  },
};
