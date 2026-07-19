import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './AssistantWidget.module.css';

/**
 * ⇩ CHANGE THIS LINE TO SWAP THE LAUNCHER ICON. ⇩
 *
 * Drop your image in `motopark-v2/public/` and reference it with a leading
 * slash — files in public/ are served from the site root and are NOT processed
 * by the bundler, so the path is literal and stable across builds.
 *
 *   motopark-v2/public/motobuddy-icon.png   →   '/motobuddy-icon.png'
 *
 * Square artwork works best (it renders at 30x30 inside a 56px button). PNG or
 * SVG with transparency sits correctly on the navy launcher. Keep it small —
 * this loads on every page.
 */
const ICON_SRC = '/motobuddy-icon.png';

// V1 stores prices in whole rupees (NOT paise), so format directly.
const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n) => (n == null ? '' : `₹${rupees.format(n)}`);

/**
 * MotoBuddy — floating grounded shopping assistant.
 * Talks to the V1 backend AI module (POST /api/ai/chat). Every answer is
 * grounded in real DB calls; the tool chips under each reply make that visible.
 * Motion doctrine: simple open/close + message fade only. No parallax.
 */

const GREETING = {
  role: 'assistant',
  text: "Hi! I'm MotoBuddy. Ask me to find parts or gear, check stock, or track an order.",
};

const SUGGESTIONS = [
  'Find me a helmet for city riding',
  'Riding gloves under ₹1500',
  'Is my order delivered?',
];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // True once ICON_SRC has failed to load. Falls back to the emoji rather than
  // leaving a broken-image glyph on every page while custom artwork is pending.
  const [iconFailed, setIconFailed] = useState(false);
  const sessionId = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setMessages((m) => [...m, { role: 'user', text: message }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        message,
        sessionId: sessionId.current,
      });
      sessionId.current = data.sessionId;
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.reply,
          tools: data.toolsFired ?? [],
          products: data.products ?? [],
        },
      ]);
    } catch (err) {
      const text =
        err.code === 503
          ? 'The assistant isn’t switched on yet (no API key configured).'
          : err.code === 429
            ? 'MotoBuddy is getting a lot of requests right now — please try again in a few seconds.'
            : (err.message ?? 'Something went wrong. Please try again.');
      setMessages((m) => [...m, { role: 'system', text }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        aria-expanded={open}
        aria-label={open ? 'Close assistant' : 'Open MotoBuddy assistant'}
        onClick={() => setOpen((o) => !o)}
      >
        {open || iconFailed ? (
          open ? '✕' : '💬'
        ) : (
          <img
            src={ICON_SRC}
            alt=""
            className={styles.launcherIcon}
            width="30"
            height="30"
            onError={() => setIconFailed(true)}
          />
        )}
      </button>

      {open && (
        <section className={styles.panel} role="dialog" aria-label="MotoBuddy shopping assistant">
          <header className={styles.header}>
            <span className={styles.brandDot} aria-hidden="true" />
            <div>
              <p className={styles.title}>MotoBuddy</p>
              <p className={styles.subtitle}>Grounded in live catalogue &amp; orders</p>
            </div>
          </header>

          <div className={styles.messages} ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.row} ${styles[m.role]}`}>
                <div className={styles.msgCol}>
                  <div className={styles.bubble}>
                    {m.text}
                    {m.tools?.length > 0 && (
                      <div className={styles.tools}>
                        {m.tools.map((t, j) => (
                          <span key={j} className={styles.toolChip}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {m.products?.length > 0 && (
                    <div className={styles.cards}>
                      {m.products.map((p) => (
                        <Link key={p.id} to={p.url} className={styles.card}>
                          {p.image ? (
                            <img
                              className={styles.cardImg}
                              src={cloudinaryUrl(p.image, { w: 160 })}
                              alt={p.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.cardImgFallback} aria-hidden="true">
                              🏍️
                            </div>
                          )}
                          <div className={styles.cardBody}>
                            <span className={styles.cardName}>{p.name}</span>
                            <span className={styles.cardBrand}>{p.brand}</span>
                            <span className={styles.cardPrice}>{formatINR(p.priceINR)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.row} ${styles.assistant}`}>
                <div className={`${styles.bubble} ${styles.typing}`}>
                  <span /> <span /> <span />
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className={styles.suggestion} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className={styles.composer}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about parts, stock, or an order…"
              aria-label="Message MotoBuddy"
              maxLength={1000}
            />
            <button
              type="button"
              className={styles.send}
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </section>
      )}
    </>
  );
}
