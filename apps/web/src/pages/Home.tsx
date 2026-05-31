import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../App';
import { t } from '@anima/shared';

export function Home() {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroGlow} />
        <h1 style={styles.heroTitle}>ANIMA</h1>
        <p style={styles.heroTagline}>{t('app.tagline')}</p>
        <p style={styles.heroSubtitle}>
          Tarot readings, astrology, therapeutic AI chat, and family constellation
          — your complete spiritual companion.
        </p>
        <div style={styles.heroCtas}>
          <button style={styles.primaryCta}>{t('subscription.subscribe_cta')}</button>
          <Link to="/tarot" style={styles.secondaryCta}>Try a Free Reading →</Link>
        </div>
      </section>

      {/* Features */}
      <section style={styles.features}>
        <h2 style={styles.sectionTitle}>What ANIMA Offers</h2>
        <div style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy section */}
      <section style={styles.privacy}>
        <h2 style={styles.sectionTitle}>{t('privacy.title')}</h2>
        <p style={styles.privacyText}>{t('privacy.encryptionNote')}</p>
        <p style={styles.privacyText}>{t('privacy.gdprNote')}</p>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🃏',
    title: 'Tarot Readings',
    desc: 'Daily card, Yes/No, Past-Present-Future, and Celtic Cross spreads with AI interpretation and voice narration.',
  },
  {
    icon: '⭐',
    title: 'Astrology',
    desc: 'Natal chart interpretation and daily transit readings personalized to your birth data.',
  },
  {
    icon: '💬',
    title: 'AI Companion',
    desc: 'Therapeutic chat with an AI that learns your story subtly and holds space for your inner journey.',
  },
  {
    icon: '🌀',
    title: 'Constellation',
    desc: 'Family and systemic constellation work: place figures on a canvas and receive deep relational insight.',
  },
];

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  hero: {
    textAlign: 'center',
    padding: '100px 32px 80px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 600,
    height: 300,
    background: `radial-gradient(ellipse, ${COLORS.primary}66, transparent 70%)`,
    pointerEvents: 'none',
  },
  heroTitle: {
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: 16,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  heroTagline: {
    fontSize: 22,
    color: COLORS.accent,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    maxWidth: 540,
    margin: '0 auto 48px',
    lineHeight: 1.7,
  },
  heroCtas: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  primaryCta: {
    backgroundColor: COLORS.secondary,
    color: COLORS.textPrimary,
    border: 'none',
    borderRadius: 32,
    padding: '14px 36px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
  secondaryCta: {
    color: COLORS.accent,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 500,
  },
  features: { paddingBottom: 80 },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.primary,
  },
  featureIcon: { fontSize: 36, display: 'block', marginBottom: 12 },
  featureTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 1.6,
  },
  privacy: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 40,
    marginBottom: 80,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.primary,
    textAlign: 'center',
  },
  privacyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
    lineHeight: 1.6,
  },
};
