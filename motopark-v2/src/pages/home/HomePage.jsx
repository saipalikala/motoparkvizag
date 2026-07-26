import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from './sections/Hero.jsx';
import CategoryGrid from './sections/CategoryGrid.jsx';
import Bestsellers from './sections/Bestsellers.jsx';
import TrustBand from './sections/TrustBand.jsx';
import CinematicVideoShowcase from '@/components/commerce/CinematicVideoShowcase.jsx';
import StoryBand from './sections/StoryBand.jsx';
import NewArrivals from './sections/NewArrivals.jsx';
import BrandRow from './sections/BrandRow.jsx';
import { getHomepage } from '@/services/products.js';
import { getCategories } from '@/services/categories.js';
import { getHeroSlides } from '@/services/heroCarousel.js';
import { useSmoothScroll } from '@/hooks/useSmoothScroll.js';
import Reveal from '@/components/ui/Reveal.jsx';

/**
 * HomePage — Design System V2 (docs/09): Hero → Categories → Cinematic video
 * showcase → Bestsellers → Trust → Story → New arrivals → Brands → Footer.
 * Every section sits on the same near-black surface, so there's no more
 * light/dark seam to bridge between sections (the old arc-divider device is
 * retired along with it — see docs/09-design-system.md §0).
 * Page-level owns the ONE home-data fetch and feeds each section; sections are
 * presentational. Currently mounted: Hero. Others land as they're built.
 */
export default function HomePage() {
  // Home only, desktop only, and torn down by this component's unmount.
  useSmoothScroll();

  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // Fire all homepage network requests (homepage data, categories, hero slides)
    // concurrently in a single parallel batch at initial mount.
    Promise.allSettled([getHomepage(), getCategories(), getHeroSlides()]).then(([home, cats]) => {
      if (!alive) return;
      setData(home.status === 'fulfilled' ? home.value : { featured: [], trending: [], newArrivals: [] });
      setCategories(cats.status === 'fulfilled' ? cats.value : []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>MotoPark — Genuine Motorcycle Gear, Helmets &amp; Parts | Vizag</title>
        <meta
          name="description"
          content="Shop genuine motorcycle helmets, riding gear, protection, luggage and parts at MotoPark. Trusted riders' shop from Visakhapatnam, shipping across India since 2020."
        />
        <link rel="canonical" href="https://motoparkvizag.in/" />
      </Helmet>

      {/* Hero is deliberately NOT wrapped: it holds the LCP image, and an
          opacity transition on the LCP element delays the metric it is judged
          by. Sections already on screen at first paint self-disable inside
          useReveal, so the reveal only ever applies below the fold.
          No products/loading props anymore — the product ticker that used to
          live here was removed (Campaigns now own promotional content); Hero
          fetches its own CMS slide data internally via useHeroSlides(). */}
      <Hero />
      <Reveal>
        <CategoryGrid categories={categories} loading={loading} />
      </Reveal>
      <Reveal>
        <CinematicVideoShowcase />
      </Reveal>
      <Reveal>
        <Bestsellers products={data?.trending ?? []} loading={loading} />
      </Reveal>
      <Reveal>
        <TrustBand />
      </Reveal>
      {/* The one 400ms reveal doctrine allows — the story moment. */}
      <Reveal duration={400}>
        <StoryBand />
      </Reveal>
      <Reveal>
        <NewArrivals products={data?.newArrivals ?? []} loading={loading} />
      </Reveal>
      <Reveal>
        <BrandRow />
      </Reveal>
      {/* Footer is global chrome (app/App.jsx). Featured reviews deferred —
          no review backend in V1 (PRD feature); won't fabricate testimonials. */}
    </>
  );
}
