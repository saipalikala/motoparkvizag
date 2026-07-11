import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { BIKE_MENU } from '@/config/nav.js';
import styles from './ShopByBike.module.css';

/**
 * Shop-by-bike — Concept C §10 second discovery axis ("will it fit?" anxiety).
 * V1 has NO structured bike-model data, so this is an honest make picker →
 * /bikes/:make (not a fake make+model fitment engine). Model-level filtering
 * arrives when a compatibleModels backfill exists (see docs/12 limitations).
 */
export default function ShopByBike() {
  const [make, setMake] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (make) navigate(`/bikes/${make}`);
  };

  return (
    <section className={`container section ${styles.wrap}`} aria-labelledby="bike-title">
      <div className={styles.card}>
        <div className={styles.copy}>
          <span className={styles.iconWrap} aria-hidden="true">
            <Bike size={24} strokeWidth={1.7} />
          </span>
          <div>
            <p className={styles.eyebrow}>Made for your machine</p>
            <h2 id="bike-title" className={styles.title}>
              Shop gear for your bike
            </h2>
            <p className={styles.sub}>
              Pick your make to browse gear and parts riders choose for it.
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
            value={make}
            onChange={(e) => setMake(e.target.value)}
          >
            <option value="">Select your bike make…</option>
            {BIKE_MENU.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary" disabled={!make}>
            Show my gear
          </Button>
        </form>
      </div>
    </section>
  );
}
