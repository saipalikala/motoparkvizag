import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X,
  Send,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Bot,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api.js';
import { cloudinaryUrl } from '@/lib/image.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import styles from './AssistantWidget.module.css';

const ICON_SRC = '/motobuddy-icon.png';

const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n) => (n == null ? '' : `₹${rupees.format(n)}`);

/** Lightweight event logger hook for analytics telemetry */
function trackAssistantEvent(eventName, payload = {}) {
  try {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({ event: `motobuddy_${eventName}`, ...payload });
    }
  } catch (_err) {
    // Ignore analytics errors
  }
}

/** Simple Markdown Formatter for Assistant Text */
function FormattedMessageText({ text }) {
  if (!text) return null;

  // Split into lines to format lists & code snippets cleanly
  const lines = text.split('\n');

  return (
    <div className={styles.formattedContent}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const itemText = trimmed.replace(/^[-•]\s*/, '');
          return (
            <div key={idx} className={styles.bulletRow}>
              <span className={styles.bulletDot} />
              <span>{parseBold(itemText)}</span>
            </div>
          );
        }

        // Heading (e.g. ### Title or ## Title)
        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className={styles.messageHeading}>
              {parseBold(headingText)}
            </h4>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className={styles.lineSpacer} />;
        }

        // Regular paragraph line
        return (
          <p key={idx} className={styles.messageParagraph}>
            {parseBold(line)}
          </p>
        );
      })}
    </div>
  );
}

/** Helper to parse **bold** and `code` inline spans */
function parseBold(str) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className={styles.inlineCode}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

/** Memoized Message Item Component */
const MessageRow = memo(function MessageRow({ msg, onRetry, onCopy }) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState(null); // 'like' | 'dislike' | null

  const handleCopy = () => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    if (onCopy) onCopy(msg.text);
    trackAssistantEvent('copy_clicked', { role: msg.role });
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const isAssistant = msg.role === 'assistant';

  return (
    <div className={`${styles.row} ${styles[msg.role]}`}>
      {!isUser && (
        <div className={styles.avatarWrap} aria-hidden="true">
          <Bot size={16} className={styles.avatarIcon} />
        </div>
      )}

      <div className={styles.msgCol}>
        <div className={styles.bubble}>
          {isUser ? (
            <span className={styles.userText}>{msg.text}</span>
          ) : isSystem ? (
            <div className={styles.systemBox}>
              <p>{msg.text}</p>
              {onRetry && (
                <button type="button" className={styles.retryBtn} onClick={onRetry}>
                  <RotateCcw size={13} />
                  <span>Retry message</span>
                </button>
              )}
            </div>
          ) : (
            <FormattedMessageText text={msg.text} />
          )}

          {msg.tools?.length > 0 && (
            <div className={styles.tools}>
              {msg.tools.map((t, j) => (
                <span key={j} className={styles.toolChip}>
                  <ShieldCheck size={11} className={styles.toolChipIcon} />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        {msg.products?.length > 0 && (
          <div className={styles.cardsGrid}>
            {msg.products.map((p) => (
              <Link key={p.id} to={p.url} className={styles.cardItem}>
                <div className={styles.cardImgFrame}>
                  {p.image ? (
                    <img
                      className={styles.cardImg}
                      src={cloudinaryUrl(p.image, { w: 220 })}
                      alt={p.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.cardImgFallback} aria-hidden="true">
                      🏍️
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.cardBrand}>{p.brand}</span>
                  <span className={styles.cardName}>{p.name}</span>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>{formatINR(p.priceINR)}</span>
                    <span className={styles.cardCta}>
                      View <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Assistant Action Bar (Copy, Like, Dislike) */}
        {isAssistant && msg.text && (
          <div className={styles.actionBar}>
            <button
              type="button"
              className={`${styles.actionBtn} ${copied ? styles.actionActive : ''}`}
              onClick={handleCopy}
              title="Copy message text"
              aria-label="Copy message"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${reaction === 'like' ? styles.actionActive : ''}`}
              onClick={() => {
                const next = reaction === 'like' ? null : 'like';
                setReaction(next);
                trackAssistantEvent('feedback', { reaction: next });
              }}
              title="Helpful response"
              aria-label="Mark response as helpful"
            >
              <ThumbsUp size={13} />
            </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${reaction === 'dislike' ? styles.actionActive : ''}`}
              onClick={() => {
                const next = reaction === 'dislike' ? null : 'dislike';
                setReaction(next);
                trackAssistantEvent('feedback', { reaction: next });
              }}
              title="Not helpful response"
              aria-label="Mark response as not helpful"
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const sessionId = useRef(null);

  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const launcherRef = useRef(null);
  const panelRef = useRef(null);
  const lastSentText = useRef('');

  const { pathname } = useLocation();
  const { cartCount = 0 } = useCart() ?? {};
  const { wishlistCount = 0 } = useWishlist() ?? {};
  const { user } = useAuth() ?? {};

  // Context Awareness Detection
  const pageContext = useMemo(() => {
    if (pathname.startsWith('/products/')) {
      return {
        label: 'Viewing Product Details',
        badge: 'Product Context Active',
        suggestions: [
          'Is this item available in my size?',
          'Compare with similar helmets & gear',
          'Check estimated delivery time for my pincode',
        ],
      };
    }
    if (pathname === '/cart') {
      return {
        label: `Cart (${cartCount} item${cartCount === 1 ? '' : 's'})`,
        badge: 'Cart Context Active',
        suggestions: [
          'Do I qualify for free shipping?',
          'Suggest complementary accessories for my cart',
          'Help me verify helmet sizes before checkout',
        ],
      };
    }
    if (pathname === '/wishlist') {
      return {
        label: `Wishlist (${wishlistCount} saved)`,
        badge: 'Wishlist Active',
        suggestions: [
          'Which item in my wishlist has the best value?',
          'Are any of my wishlist items on sale?',
          'Compare items in my wishlist',
        ],
      };
    }
    if (pathname.startsWith('/category/') || pathname === '/bikes') {
      return {
        label: 'Browsing Category',
        badge: 'Catalogue Context Active',
        suggestions: [
          'What are the top-rated items in this category?',
          'Show me riding gear under ₹3,000',
          'Help me choose between touring vs city gear',
        ],
      };
    }
    return {
      label: 'Storefront Assistant',
      badge: 'Live Catalogue Active',
      suggestions: [
        'Find me a helmet for city riding',
        'Riding gloves under ₹1,500',
        'Check stock or track an order',
      ],
    };
  }, [pathname, cartCount, wishlistCount]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          text: `Hi${user?.name ? ` ${user.name}` : ''}! I'm **MotoBuddy**, your expert riding assistant.\n\nI can help you find certified helmets, riding gear, compare specs, check stock, or track orders.`,
        },
      ]);
    }
  }, [user, messages.length]);

  /** Auto-adjust textarea height dynamically */
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  function closePanel() {
    setOpen(false);
    launcherRef.current?.focus();
    trackAssistantEvent('closed');
  }

  function openPanel() {
    setOpen(true);
    trackAssistantEvent('opened', { path: pathname });
  }

  /** Focus trap */
  function handlePanelKeyDown(e) {
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll(
      'a[href], button:not(:disabled), textarea:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll-lock for mobile sheet
  useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    };
  }, [open]);

  // Swipe-down dismissal on mobile
  const touchStartY = useRef(null);
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      closePanel();
    }
    touchStartY.current = null;
  };

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    lastSentText.current = message;
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setInput('');
    setLoading(true);
    trackAssistantEvent('message_sent', { queryLength: message.length });

    try {
      const { data } = await api.post('/ai/chat', {
        message,
        sessionId: sessionId.current,
        context: {
          path: pathname,
          cartCount,
          wishlistCount,
        },
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
            ? 'MotoBuddy is receiving many requests right now — please try again in a few seconds.'
            : (err.message ?? 'Something went wrong while reaching MotoBuddy. Please try again.');
      setMessages((m) => [...m, { role: 'system', text }]);
    } finally {
      setLoading(false);
    }
  }

  const handleRetry = () => {
    if (lastSentText.current) {
      send(lastSentText.current);
    }
  };

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
        aria-label={open ? 'Close assistant' : 'Open MotoBuddy AI assistant'}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        {open || iconFailed ? (
          open ? (
            <X size={24} />
          ) : (
            <span className={styles.launcherEmoji}>💬</span>
          )
        ) : (
          <img
            src={ICON_SRC}
            alt="MotoBuddy"
            className={styles.launcherIcon}
            width="32"
            height="32"
            onError={() => setIconFailed(true)}
          />
        )}
        <span className={styles.pulseDot} />
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={closePanel} aria-hidden="true" />
          <section
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-label="MotoBuddy AI Assistant"
            aria-modal="true"
            onKeyDown={handlePanelKeyDown}
          >
            {/* Header */}
            <header className={styles.header} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div className={styles.dragHandle} aria-hidden="true" />
              <div className={styles.headerContent}>
                <div className={styles.avatarBadge}>
                  <Bot size={20} className={styles.headerBotIcon} />
                  <span className={styles.onlineDot} />
                </div>
                <div className={styles.headerTitles}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.title}>MotoBuddy AI</h3>
                    <span className={styles.contextTag}>{pageContext.badge}</span>
                  </div>
                  <p className={styles.subtitle}>Grounded in live catalogue &amp; orders</p>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={closePanel}
                  aria-label="Close assistant"
                >
                  <X size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* Conversation Messages */}
            <div className={styles.messages} ref={listRef} aria-live="polite">
              {messages.map((m, i) => (
                <MessageRow
                  key={i}
                  msg={m}
                  onRetry={m.role === 'system' ? handleRetry : null}
                  onCopy={() => trackAssistantEvent('copy_clicked')}
                />
              ))}

              {loading && (
                <div className={`${styles.row} ${styles.assistant}`}>
                  <div className={styles.avatarWrap} aria-hidden="true">
                    <Bot size={16} className={styles.avatarIcon} />
                  </div>
                  <div className={`${styles.bubble} ${styles.typing}`}>
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                </div>
              )}
            </div>

            {/* Contextual Suggestions (Empty or Early Conversation) */}
            {messages.length <= 2 && (
              <div className={styles.suggestionsWrapper}>
                <div className={styles.suggestionsHeader}>
                  <Sparkles size={13} className={styles.sparkleIcon} />
                  <span>Suggested Prompts</span>
                </div>
                <div className={styles.suggestions}>
                  {pageContext.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={styles.suggestionBtn}
                      onClick={() => {
                        trackAssistantEvent('prompt_selected', { prompt: s });
                        send(s);
                      }}
                    >
                      <span>{s}</span>
                      <ChevronRight size={13} className={styles.sugArrow} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Composer Input Area */}
            <div className={styles.composer}>
              <textarea
                ref={textareaRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about parts, stock, sizing, or an order…"
                aria-label="Message MotoBuddy"
                rows={1}
                maxLength={1000}
              />
              <button
                type="button"
                className={styles.send}
                onClick={() => send()}
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                <Send size={16} strokeWidth={2.4} />
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}
