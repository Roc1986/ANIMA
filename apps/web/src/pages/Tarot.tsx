import React, { useState } from 'react';
import { COLORS } from '../App';
import { TAROT_DECK } from '@anima/shared';
import { getSpreadCards } from '@anima/shared';
import { buildTarotPrompt } from '@anima/shared';
import { t } from '@anima/shared';
import type { SpreadType, DrawnCard } from '@anima/shared';

const SPREADS: { type: SpreadType; label: string; desc: string; free: boolean }[] = [
  { type: 'daily', label: t('tarot.daily'), desc: 'One card to guide your day', free: true },
  { type: 'yesno', label: t('tarot.yesno'), desc: 'A clear answer to your question', free: true },
  { type: 'past-present-future', label: t('tarot.pastPresentFuture'), desc: 'Understand your journey', free: false },
  { type: 'celtic-cross', label: t('tarot.celticCross'), desc: 'A deep, comprehensive reading', free: false },
];

export function Tarot() {
  const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSelectSpread(type: SpreadType) {
    const cards = getSpreadCards(type, TAROT_DECK);
    setSelectedSpread(type);
    setDrawnCards(cards);
    setRevealedSet(new Set());
    setReading(null);
  }

  function revealCard(idx: number) {
    const next = new Set(revealedSet);
    next.add(idx);
    setRevealedSet(next);
    if (next.size === drawnCards.length && !reading) {
      fetchReading(drawnCards, selectedSpread!);
    }
  }

  async function fetchReading(cards: DrawnCard[], spreadType: SpreadType) {
    setLoading(true);
    const prompt = buildTarotPrompt(cards, spreadType);
    // TODO: call edge function
    await new Promise((r) => setTimeout(r, 1500));
    setReading(
      'The cards before you weave a story of inner power and transformation. Trust the wisdom that arises from within — these symbols are mirrors of your own deepest knowing.',
    );
    setLoading(false);
  }

  if (!selectedSpread) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>{t('tarot.selectSpread')}</h1>
        <div style={styles.spreadGrid}>
          {SPREADS.map((s) => (
            <button
              key={s.type}
              style={{ ...styles.spreadCard, ...(!s.free ? styles.spreadPro : {}) }}
              onClick={() => handleSelectSpread(s.type)}
            >
              <span style={styles.spreadLabel}>{s.label}</span>
              {!s.free && <span style={styles.proBadge}>✦ PRO</span>}
              <span style={styles.spreadDesc}>{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={() => setSelectedSpread(null)}>
        ← Choose another spread
      </button>
      <h1 style={styles.title}>{SPREADS.find((s) => s.type === selectedSpread)?.label}</h1>

      {/* Cards */}
      <div style={styles.cardsRow}>
        {drawnCards.map((drawn, idx) => {
          const revealed = revealedSet.has(idx);
          return (
            <div key={idx} style={styles.cardSlot}>
              <p style={styles.positionLabel}>{drawn.position}</p>
              <button
                style={{ ...styles.card, ...(revealed ? styles.cardRevealed : styles.cardFaceDown) }}
                onClick={() => !revealed && revealCard(idx)}
              >
                {revealed ? (
                  <>
                    <span style={styles.cardName}>{drawn.card.name}</span>
                    {drawn.isReversed && <span style={styles.reversed}>↓ Reversed</span>}
                  </>
                ) : (
                  <span style={styles.cardBackSymbol}>✦</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Reading */}
      {loading && (
        <p style={styles.loading}>Reading the cards…</p>
      )}
      {reading && !loading && (
        <div style={styles.reading}>
          <h2 style={styles.readingTitle}>{t('tarot.yourReading')}</h2>
          <p style={styles.readingText}>{reading}</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '48px 24px' },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  spreadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 20,
  },
  spreadCard: {
    backgroundColor: COLORS.surface,
    border: `1px solid ${COLORS.primary}`,
    borderRadius: 16,
    padding: '24px 20px',
    color: COLORS.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  spreadPro: { borderColor: COLORS.gold, opacity: 0.85 },
  spreadLabel: { fontSize: 16, fontWeight: 600 },
  spreadDesc: { fontSize: 13, color: COLORS.textSecondary },
  proBadge: {
    fontSize: 11,
    backgroundColor: COLORS.gold,
    color: '#000',
    borderRadius: 4,
    padding: '2px 6px',
    alignSelf: 'flex-start',
    fontWeight: 700,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    marginBottom: 24,
    fontSize: 14,
  },
  cardsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 40,
  },
  cardSlot: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  positionLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  card: {
    width: 100,
    height: 160,
    borderRadius: 10,
    border: `1px solid ${COLORS.secondary}`,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    transition: 'transform 0.2s',
  },
  cardFaceDown: { backgroundColor: COLORS.surface },
  cardRevealed: {
    backgroundColor: '#231548',
    cursor: 'default',
  },
  cardBackSymbol: { fontSize: 32, color: COLORS.accent, opacity: 0.5 },
  cardName: { fontSize: 13, fontWeight: 600, textAlign: 'center', color: COLORS.textPrimary },
  reversed: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  loading: { textAlign: 'center', color: COLORS.textSecondary, fontStyle: 'italic' },
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
