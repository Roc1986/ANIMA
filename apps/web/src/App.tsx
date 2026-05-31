import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Tarot } from './pages/Tarot';
import { Astrology } from './pages/Astrology';
import { t } from '@anima/shared';

// ── Shared CSS-in-JS constants ───────────────────────────────
export const COLORS = {
  background: '#0F0A1E',
  surface: '#1A1035',
  primary: '#2D1B69',
  secondary: '#7C3AED',
  accent: '#C4B5FD',
  textPrimary: '#F5F3FF',
  textSecondary: '#A78BFA',
  textMuted: '#6B7280',
  gold: '#F59E0B',
};

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.app}>
        <Nav />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tarot" element={<Tarot />} />
            <Route path="/astrology" element={<Astrology />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

function Nav() {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/tarot', label: t('nav.tarot') },
    { to: '/astrology', label: t('nav.astrology') },
  ];

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>ANIMA</Link>
      <div style={styles.navLinks}>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              ...styles.navLink,
              ...(location.pathname === link.to ? styles.navLinkActive : {}),
            }}
          >
            {link.label}
          </Link>
        ))}
        <button style={styles.ctaButton}>Get the App</button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={styles.footer}>
      <p style={styles.footerText}>
        © 2026 ANIMA · {t('privacy.yourDataIsYours')} ·{' '}
        <a href="/privacy" style={styles.footerLink}>{t('privacy.policyLink')}</a>
      </p>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
  },
  main: {
    flex: 1,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: `1px solid ${COLORS.primary}`,
    backgroundColor: COLORS.surface,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(8px)',
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  navLink: {
    color: COLORS.textSecondary,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  navLinkActive: {
    color: COLORS.accent,
  },
  ctaButton: {
    backgroundColor: COLORS.secondary,
    color: COLORS.textPrimary,
    border: 'none',
    borderRadius: 24,
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
  footer: {
    padding: '24px 32px',
    borderTop: `1px solid ${COLORS.primary}`,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  footerLink: {
    color: COLORS.accent,
    textDecoration: 'none',
  },
};
