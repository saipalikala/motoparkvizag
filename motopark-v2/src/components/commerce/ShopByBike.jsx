import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { useNav } from '@/contexts/NavContext.jsx';
import styles from './ShopByBike.module.css';

/**
 * Shop-by-bike — Concept C §10 second discovery axis ("will it fit?" anxiety).
 * Reads the live fitment catalog from NavContext (Milestone 10), which replaced
 * the static make stub. Now that models carry real fitment, this is a genuine
 * make → model picker rather than a make-only guess.
 *
 * The model select is optional and only appears once the chosen make has models,
 * so a make with no models yet still routes to its make page instead of dead-ending.
 *
 * Mounted on the catalogue (StorePage), not the homepage: the cinematic video
 * showcase took its old home slot, and "will it fit?" is a question shoppers ask
 * while browsing gear rather than on arrival. It renders nothing until the
 * fitment catalog loads, so it never occupies space it can't use.
 */
export default function ShopByBike() {
  const { bikes } = useNav();
  const [makeSlug, setMakeSlug] = useState('');
  const [modelSlug, setModelSlug] = useState('');
  const navigate = useNavigate();

  const models = useMemo(
    () => bikes.find((g) => g.makeSlug === makeSlug)?.models ?? [],
    [bikes, makeSlug],
  );

  const onMakeChange = (slug) => {
    setMakeSlug(slug);
    setModelSlug(''); // last make's model must not leak into the new make's URL
  };

  // No fitment catalog (still loading, or none configured) ⇒ render nothing
  // rather than an empty picker the shopper can't use.
  if (!bikes.length) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!makeSlug) return;
    navigate(modelSlug ? `/bikes/${makeSlug}/${modelSlug}` : `/bikes/${makeSlug}`);
  };

  return (
    <section className={`container section ${styles.wrap}`} aria-labelledby="bike-title">
      <div className={styles.card}>
        <div className={styles.copy}>
          <span className={styles.iconWrap} aria-hidden="true">
            <Bike size={24} strokeWidth={1.8} />
          </span>
          <div>
            <p className={styles.eyebrow}>Made for your machine</p>
            <h2 id="bike-title" className={styles.title}>
              Shop gear for your bike
            </h2>
            <p className={styles.sub}>
              Pick your bike to browse gear and parts that fit it.
            </p>
          </div>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="bike-make" className="visually-hidden">
            Choose your bike make
          </label>
          <select
            id="bike-make"
            className={styles.select}
            value={makeSlug}
            onChange={(e) => onMakeChange(e.target.value)}
          >
            <option value="">Select your bike make…</option>
            {bikes.map((g) => (
              <option key={g.makeSlug} value={g.makeSlug}>
                {g.make}
              </option>
            ))}
          </select>

          {models.length > 0 && (
            <>
              <label htmlFor="bike-model" className="visually-hidden">
                Choose your bike model
              </label>
              <select
                id="bike-model"
                className={styles.select}
                value={modelSlug}
                onChange={(e) => setModelSlug(e.target.value)}
              >
                <option value="">All {bikes.find((g) => g.makeSlug === makeSlug)?.make} models</option>
                {models.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <Button type="submit" variant="primary" disabled={!makeSlug}>
            Show my gear
          </Button>
        </form>
      </div>
    </section>
  );
}
