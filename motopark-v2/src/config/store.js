/**
 * Store facts — REAL business details, sourced from the live V1 site
 * (Contact/Footer). Single source for Trust band, Footer, and the static
 * Contact/policy pages. Update here if the business details change.
 */
export const STORE = {
  name: 'MotoPark',
  established: 2020,
  city: 'Visakhapatnam',
  area: 'Seethammapeta',
  addressLines: ['Seethammapeta Main Rd', 'near Swagath Grand Hotel', 'Visakhapatnam – 530016'],

  ridersServed: '5,000+',
  brandsCount: '25+',
  freeShipThreshold: 2000,
  shippingFlat: 150, // charged below the free-shipping threshold (matches V1)
  returnWindowDays: 7,
  deliveryEstimate: '2–3 business days',

  phone: '083280 31179',
  phoneHref: 'tel:08328031179',
  whatsapp: 'https://wa.me/918328031179',
  email: 'support.motoparkvizag@gmail.com',
  mapsUrl: 'https://maps.app.goo.gl/YSRdTuZ4wKAbdG2P9',

  hours: [
    { days: 'Mon – Sat', time: '10:00 AM – 9:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],

  // Real handles from V1; icons render only when a URL is present (no dead links).
  social: {
    instagram: 'https://www.instagram.com/motopark_official',
    youtube: 'https://youtube.com/@motoparkvizag',
    facebook: '',
  },
};
