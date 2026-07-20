import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
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
  // Refs for focus management: launcher receives focus on close; panel hosts the focus trap.
  const launcherRef = useRef(null);
  const panelRef = useRef(null);

  const { pathname } = useLocation();

  /** Close the panel and return keyboard focus to the launcher button. */
  function closePanel() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  /**
   * Focus trap — keeps Tab / Shift+Tab inside the open panel.
   * DS §12 blocking requirement: every dialog must trap focus.
   */
  function handlePanelKeyDown(e) {
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Focus the input whenever the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Scroll to the latest message / loading indicator.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Close the panel on route change — matches the Navbar drawer pattern (Navbar.jsx:42–45).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll-lock — prevents the page scrolling under the open panel (Navbar.jsx:58–64).
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape key — close the panel and return focus to the launcher (Navbar.jsx:47–56).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // closePanel is defined in render scope; setOpen + launcherRef are both stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        aria-expanded={open}
        aria-label={open ? 'Close assistant' : 'Open MotoBuddy assistant'}
        onClick={() => (open ? closePanel() : setOpen(true))}
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
        <section
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="MotoBuddy shopping assistant"
          aria-modal="true"
          onKeyDown={handlePanelKeyDown}
        >
          <header className={styles.header}>
            <span className={styles.brandDot} aria-hidden="true" />
            <div>
              <p className={styles.title}>MotoBuddy</p>
              <p className={styles.subtitle}>Grounded in live catalogue &amp; orders</p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closePanel}
              aria-label="Close assistant"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
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
