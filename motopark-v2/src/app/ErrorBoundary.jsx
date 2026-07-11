import { Component } from 'react';

/**
 * ErrorBoundary — catches render crashes so one bad component can't white-screen
 * the whole app. Wraps the routed content (chrome stays up). Dependency-light on
 * purpose (plain elements + token styles) so the fallback renders even if a
 * feature module is the thing that broke.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface for logging; wire to an error reporter (Sentry) at launch.
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="container section"
        style={{
          textAlign: 'center',
          display: 'grid',
          gap: 'var(--space-4)',
          placeItems: 'center',
          minHeight: '50vh',
        }}
        role="alert"
      >
        <h1 style={{ fontSize: 'var(--text-h2)' }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
          A part of the page failed to load. Reloading usually fixes it.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: '44px',
              padding: '0 var(--space-5)',
              borderRadius: 'var(--btn-radius)',
              border: 'none',
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-fg)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
          <a
            href="/"
            style={{
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 var(--space-5)',
              borderRadius: 'var(--btn-radius)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back home
          </a>
        </div>
      </div>
    );
  }
}
