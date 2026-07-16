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

/**
 * HomePage — Concept C, built section by section (docs/10 §C-4 hierarchy):
 *   Hero → Categories → Cinematic video showcase → Bestsellers → Trust → Story
 *   → New arrivals → Brands → Footer.
 * Page-level owns the ONE home-data fetch and feeds each section; sections are
 * presentational. Currently mounted: Hero. Others land as they're built.
 */
export default function HomePage() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([getHomepage(), getCategories()]).then(([home, cats]) => {
      if (!alive) return;
      setData(home.status === 'fulfilled' ? home.value : { featured: [], trending: [], newArrivals: [] });
      setCategories(cats.status === 'fulfilled' ? cats.value : []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Ticker: prefer curated featured, fall back to trending.
  const featured = data?.featured?.length ? data.featured : data?.trending ?? [];

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

      <Hero products={featured} loading={loading} />
      <CategoryGrid categories={categories} loading={loading} />
      <CinematicVideoShowcase />
      <Bestsellers products={data?.trending ?? []} loading={loading} />
      <TrustBand />
      <StoryBand />
      <NewArrivals products={data?.newArrivals ?? []} loading={loading} />
      <BrandRow />
      {/* Footer is global chrome (app/App.jsx). Featured reviews deferred —
          no review backend in V1 (PRD feature); won't fabricate testimonials. */}
    </>
  );
}
