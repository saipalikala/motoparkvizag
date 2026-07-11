import { STORE } from '@/config/store.js';

/**
 * Static page content. About/FAQ are final marketing copy. The policy pages
 * (shipping/returns/privacy/terms) are drafted from the store's REAL, stated
 * terms (7-day returns, 2–3 day delivery, free shipping ≥ ₹2,000, Razorpay,
 * Vizag) — the owner should have them reviewed before relying on them legally.
 * `contact` is rendered specially (StaticPage) from config/store.js.
 */
const rupees = `₹${STORE.freeShipThreshold.toLocaleString('en-IN')}`;

export const STATIC_CONTENT = {
  about: {
    title: 'About MotoPark',
    intro:
      'MotoPark is a rider-run motorcycle gear shop from Visakhapatnam, serving riders across India since 2020.',
    sections: [
      {
        h: 'Our story',
        body: [
          'MotoPark started with a simple idea: riders deserve genuine gear and honest advice, not upsells. What began as a single showroom in Vizag has grown into a shop trusted by thousands of riders across the country.',
          'We ride too — so we stock what we would put on ourselves and the people we ride with.',
        ],
      },
      {
        h: 'What we stand for',
        body: [
          'Genuine, always — every product is sourced direct from the brand or an authorised distributor. No fakes, ever.',
          'Safety before style, and the right gear for your ride — from the daily commute to the weekend escape to the cross-country adventure.',
        ],
      },
      {
        h: 'From Vizag, for all of India',
        body: [
          `We carry ${STORE.brandsCount} trusted brands and have served ${STORE.ridersServed} riders, shipping Pan-India from our Visakhapatnam store. Visit us in person, or shop online — the gear is the same, and so is the promise.`,
        ],
      },
    ],
  },

  faq: {
    title: 'Frequently asked questions',
    intro: 'Quick answers about orders, delivery, payments and returns.',
    faqs: [
      {
        q: 'Are your products genuine?',
        a: 'Yes — every product is sourced directly from the brand or an authorised distributor. We only sell genuine gear.',
      },
      {
        q: 'How long does delivery take?',
        a: `Most orders are delivered within ${STORE.deliveryEstimate}. Tracking details are shared via SMS and email once your order ships.`,
      },
      {
        q: 'How much is shipping?',
        a: `Shipping is free on orders above ${rupees}, Pan-India. Below that, a small shipping fee is calculated at checkout.`,
      },
      {
        q: 'Do you offer cash on delivery?',
        a: 'Cash on Delivery is available in select areas and for certain products. Available payment options are shown at checkout.',
      },
      {
        q: 'Are payments secure?',
        a: 'Yes. Payments are processed securely through Razorpay — UPI, cards, net banking and wallets are supported. We never store your card details.',
      },
      {
        q: 'What is your return policy?',
        a: `We accept returns within ${STORE.returnWindowDays} days of delivery, provided items are unused and in their original packaging. Return shipping is the customer's responsibility.`,
      },
    ],
  },

  'shipping-policy': {
    title: 'Shipping Policy',
    updated: 'July 2026',
    intro: 'How and when we deliver your order.',
    sections: [
      {
        h: 'Delivery time',
        body: [
          `Most orders are dispatched within 1–2 business days and delivered within ${STORE.deliveryEstimate}, depending on your location. You'll receive tracking details via SMS and email once your order ships.`,
        ],
      },
      {
        h: 'Shipping charges',
        body: [
          `Shipping is free on orders above ${rupees}. For orders below this value, a shipping fee is calculated and shown at checkout before payment.`,
        ],
      },
      {
        h: 'Coverage',
        body: [
          'We ship across India from our Visakhapatnam store. Some remote pin codes may take longer or be served by a limited set of couriers.',
        ],
      },
      {
        h: 'Cash on Delivery',
        body: [
          'Cash on Delivery is available in select areas and for certain products. Eligibility is shown at checkout.',
        ],
      },
    ],
  },

  'returns-policy': {
    title: 'Returns & Refunds',
    updated: 'July 2026',
    intro: 'Our return window and how refunds work.',
    sections: [
      {
        h: 'Return window',
        body: [
          `Returns are accepted within ${STORE.returnWindowDays} days of delivery. Items must be unused, unwashed and in their original packaging with all tags intact.`,
        ],
      },
      {
        h: 'Return shipping',
        body: [
          'Return shipping charges are the responsibility of the customer, unless the item was received damaged, defective or incorrect.',
        ],
      },
      {
        h: 'Refunds',
        body: [
          'Once we receive and inspect your return, approved refunds are processed to your original payment method. Please allow a few business days for the amount to reflect, depending on your bank.',
        ],
      },
      {
        h: 'Non-returnable items',
        body: [
          'For safety and hygiene reasons, certain items (e.g. innerwear, used helmets, or items marked non-returnable) may not be eligible. Any exceptions are noted on the product page.',
        ],
      },
      {
        h: 'How to start a return',
        body: [
          `Contact us at ${STORE.email} or ${STORE.phone} with your order details and reason for return, and we'll guide you through the next steps.`,
        ],
      },
    ],
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    updated: 'July 2026',
    intro: 'How we handle your information.',
    sections: [
      {
        h: 'Information we collect',
        body: [
          'We collect the details you provide to place and fulfil an order — your name, contact number, email and shipping address — along with order history and basic device/usage data needed to run the site.',
        ],
      },
      {
        h: 'How we use it',
        body: [
          'Your information is used to process orders, arrange delivery, provide support, and improve our products and service. We may send order updates via SMS and email.',
        ],
      },
      {
        h: 'Payments',
        body: [
          'Payments are processed by Razorpay. Card and banking details are handled by the payment gateway over a secure connection — we do not store your full card details on our servers.',
        ],
      },
      {
        h: 'Sharing',
        body: [
          'We share information only as needed to fulfil your order (e.g. with couriers and the payment gateway) or where required by law. We do not sell your personal data.',
        ],
      },
      {
        h: 'Your choices',
        body: [
          `You can request access to, correction of, or deletion of your personal data by contacting us at ${STORE.email}.`,
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    updated: 'July 2026',
    intro: 'The terms under which we sell and you shop.',
    sections: [
      {
        h: 'Acceptance',
        body: [
          'By using this website and placing an order, you agree to these terms. If you do not agree, please do not use the site.',
        ],
      },
      {
        h: 'Products & pricing',
        body: [
          'We aim to describe and price products accurately. Prices and availability may change, and occasional errors may occur — we reserve the right to correct them and to cancel an affected order with a full refund.',
        ],
      },
      {
        h: 'Orders & payment',
        body: [
          'An order is confirmed once payment is successfully authorised through Razorpay. We may refuse or cancel orders in cases of suspected fraud, stock issues or pricing errors.',
        ],
      },
      {
        h: 'Shipping & returns',
        body: [
          'Delivery and returns are governed by our Shipping Policy and Returns & Refunds policy, which form part of these terms.',
        ],
      },
      {
        h: 'Governing law',
        body: [
          'These terms are governed by the laws of India, with jurisdiction in the courts of Visakhapatnam, Andhra Pradesh.',
        ],
      },
      {
        h: 'Contact',
        body: [`Questions about these terms? Reach us at ${STORE.email}.`],
      },
    ],
  },
};
