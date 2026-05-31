import React, { useState } from 'react';
import { COLORS } from '../App';
import { calculateNatalChart, interpretTransits, getCurrentTransits } from '@anima/shared';
import { t } from '@anima/shared';
import type { BirthData, NatalChart } from '@anima/shared';

export function Astrology() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('12:00');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'natal' | 'transits'>('natal');

  async function handleGenerate() {
    if (!birthDate || !lat || !lng) return;
    setLoading(true);
    try {
      const birthData: BirthData = {
        birthdate: birthDate,
        birthtime: birthTime,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        timezone,
      };
      const natalChart = calculateNatalChart(birthData);
      setChart(natalChart);

      if (activeTab === 'transits') {
        const transits = getCurrentTransits(new Date());
        const summary = interpretTransits(natalChart, transits);
        setReading(summary);
      } else {
        // TODO: call AI for full reading
        await new Promise((r) => setTimeout(r, 1500));
        setReading(
          `Your natal chart reveals ${natalChart.ascendant} rising, with Sun in ${natalChart.planets.find((p) => p.planet === 'Sun')?.sign ?? 'unknown'}. This combination speaks of a soul with deep reserves of inner strength and a natural orientation toward meaning and growth.`,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Astrology</h1>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['natal', 'transits'] as const).map((tab) => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'natal' ? t('astrology.natalChart') : t('astrology.transits')}
          </button>
        ))}
      </div>

      {/* Form */}
      {!chart && (
        <div style={styles.form}>
          <p style={styles.formHint}>{t('astrology.enterBirthData')}</p>

          <label style={styles.label}>{t('astrology.birthDate')} (YYYY-MM-DD)</label>
          <input style={styles.input} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="1990-06-21" />

          <label style={styles.label}>{t('astrology.birthTime')} (HH:MM)</label>
          <input style={styles.input} value={birthTime} onChange={(e) => setBirthTime(e.target.value)} placeholder="14:30" />

          <label style={styles.label}>Latitude</label>
          <input style={styles.input} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="48.8566" type="number" />

          <label style={styles.label}>Longitude</label>
          <input style={styles.input} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="2.3522" type="number" />

          <label style={styles.label}>Timezone (IANA)</label>
          <input style={styles.input} value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Paris" />

          <button
            style={{ ...styles.button, ...(!birthDate || !lat ? styles.buttonDisabled : {}) }}
            onClick={handleGenerate}
            disabled={!birthDate || !lat || loading}
          >
            {loading ? 'Calculating…' : 'Generate Reading'}
          </button>
        </div>
      )}

      {/* Chart Summary */}
      {chart && (
        <div style={styles.chartSummary}>
          <h2 style={styles.chartTitle}>Chart Overview</h2>
          <div style={styles.pillRow}>
            <Pill label="Ascendant" value={chart.ascendant} />
            <Pill label="Midheaven" value={chart.midheaven} />
            {['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].map((planet) => {
              const pos = chart.planets.find((p) => p.planet === planet);
              return pos ? <Pill key={planet} label={planet} value={`${pos.sign} H${pos.house}`} /> : null;
            })}
          </div>
          <button style={styles.resetButton} onClick={() => { setChart(null); setReading(null); }}>
            New Chart
          </button>
        </div>
      )}

      {/* Reading */}
      {reading && (
        <div style={styles.reading}>
          <h2 style={styles.readingTitle}>{t('astrology.reading')}</h2>
          <p style={styles.readingText}>{reading}</p>
        </div>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={pillStyles.pill}>
      <span style={pillStyles.label}>{label}</span>
      <span style={pillStyles.value}>{value}</span>
    </div>
  );
}

const pillStyles: Record<string, React.CSSProperties> = {
  pill: {
    backgroundColor: '#2D1B69',
    borderRadius: 8,
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginTop: 2 },
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 800, margin: '0 auto', padding: '48px 24px' },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  tabs: {
    display: 'flex',
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    padding: 4,
    marginBottom: 32,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 16px',
    borderRadius: 28,
    border: 'none',
    backgroundColor: 'transparent',
    color: COLORS.textMuted,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  tabActive: { backgroundColor: COLORS.secondary, color: COLORS.textPrimary },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    border: `1px solid ${COLORS.primary}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  formHint: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.accent, fontWeight: 500 },
  input: {
    backgroundColor: COLORS.background,
    border: `1px solid ${COLORS.primary}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: COLORS.textPrimary,
    fontSize: 15,
    outline: 'none',
    marginBottom: 8,
  },
  button: {
    backgroundColor: COLORS.secondary,
    color: COLORS.textPrimary,
    border: 'none',
    borderRadius: 32,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  chartSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    border: `1px solid ${COLORS.primary}`,
    marginBottom: 24,
  },
  chartTitle: { fontSize: 20, fontWeight: 600, color: COLORS.accent, marginBottom: 16 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  resetButton: {
    marginTop: 20,
    background: 'none',
    border: 'none',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontSize: 13,
  },
  reading: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    border: `1px solid ${COLORS.primary}`,
  },
  readingTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: COLORS.accent,
    marginBottom: 16,
    textAlign: 'center',
  },
  readingText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 1.8,
  },
};
