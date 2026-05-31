import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, GRADIENTS, SHADOW } from '../theme';
import { TarotCard as TarotCardComponent } from '../components/TarotCard';
import { VoicePlayer } from '../components/VoicePlayer';
import { TAROT_DECK } from '../tarot/deck';
import { getSpreadCards } from '../tarot/readings';
import { buildTarotPrompt } from '../tarot/prompts';
import { t } from '../i18n';
import type { SpreadType, DrawnCard } from '../types/tarot';

interface SpreadOption {
  type: SpreadType;
  labelKey: string;
  description: string;
  cardCount: number;
  requiresSubscription: boolean;
  icon: string;
}

const SPREAD_OPTIONS: SpreadOption[] = [
  {
    type: 'daily',
    labelKey: 'tarot.daily',
    description: 'One card to guide your day',
    cardCount: 1,
    requiresSubscription: false,
    icon: '☀️',
  },
  {
    type: 'yesno',
    labelKey: 'tarot.yesno',
    description: 'A clear answer to a burning question',
    cardCount: 1,
    requiresSubscription: false,
    icon: '🔮',
  },
  {
    type: 'past-present-future',
    labelKey: 'tarot.pastPresentFuture',
    description: 'Understand where you have been, are, and are going',
    cardCount: 3,
    requiresSubscription: true,
    icon: '🌊',
  },
  {
    type: 'celtic-cross',
    labelKey: 'tarot.celticCross',
    description: 'A deep, comprehensive 10-card reading',
    cardCount: 10,
    requiresSubscription: true,
    icon: '✨',
  },
];

export function TarotScreen() {
  const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [reading, setReading] = useState<string | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  // In production, derive from auth + subscription state
  const isSubscribed = false;

  function handleSpreadSelect(spread: SpreadOption) {
    if (spread.requiresSubscription && !isSubscribed) {
      // TODO: Navigate to subscription screen
      return;
    }
    setSelectedSpread(spread.type);
    const cards = getSpreadCards(spread.type, TAROT_DECK);
    setDrawnCards(cards);
    setRevealedCards(new Set());
    setReading(null);
  }

  function handleCardReveal(index: number) {
    const next = new Set(revealedCards);
    next.add(index);
    setRevealedCards(next);

    // When all cards revealed, fetch reading
    if (next.size === drawnCards.length && !reading) {
      fetchReading(drawnCards, selectedSpread!);
    }
  }

  async function fetchReading(cards: DrawnCard[], spreadType: SpreadType) {
    setLoadingReading(true);
    try {
      // Build prompt and call Claude (via backend edge function in production)
      const prompt = buildTarotPrompt(cards, spreadType);
      // TODO: Call /api/tarot-reading edge function
      // const result = await fetch('/api/tarot-reading', { method: 'POST', body: JSON.stringify({ prompt }) });
      // Simulated response for scaffold:
      await new Promise((r) => setTimeout(r, 1500));
      setReading(
        'The cards speak of transformation and forward movement. Trust the path unfolding before you — what feels uncertain is simply new. Your inner wisdom already knows the way; these cards simply reflect it back to you with clarity and grace.',
      );
    } finally {
      setLoadingReading(false);
    }
  }

  function handleReset() {
    setSelectedSpread(null);
    setDrawnCards([]);
    setRevealedCards(new Set());
    setReading(null);
    setVoiceUrl(null);
  }

  if (!selectedSpread) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{t('tarot.selectSpread')}</Text>
            {SPREAD_OPTIONS.map((spread) => (
              <TouchableOpacity
                key={spread.type}
                style={[
                  styles.spreadOption,
                  spread.requiresSubscription && !isSubscribed && styles.spreadLocked,
                ]}
                onPress={() => handleSpreadSelect(spread)}
                activeOpacity={0.75}
              >
                <Text style={styles.spreadIcon}>{spread.icon}</Text>
                <View style={styles.spreadInfo}>
                  <View style={styles.spreadTitleRow}>
                    <Text style={styles.spreadName}>{t(spread.labelKey)}</Text>
                    {spread.requiresSubscription && !isSubscribed && (
                      <View style={styles.lockBadge}>
                        <Text style={styles.lockText}>✦ PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.spreadDesc}>{spread.description}</Text>
                  <Text style={styles.spreadCardCount}>{spread.cardCount} card{spread.cardCount !== 1 ? 's' : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.spreadHeader}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.backLink}>← Choose another spread</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t(`tarot.${selectedSpread === 'past-present-future' ? 'pastPresentFuture' : selectedSpread === 'celtic-cross' ? 'celticCross' : selectedSpread === 'yesno' ? 'yesno' : 'daily'}`)}</Text>
          </View>

          {/* Cards */}
          <View style={styles.cardsGrid}>
            {drawnCards.map((drawn, idx) => (
              <View key={idx} style={styles.cardSlot}>
                <Text style={styles.positionLabel}>{drawn.position}</Text>
                <TarotCardComponent
                  card={drawn.card}
                  isRevealed={revealedCards.has(idx)}
                  isReversed={drawn.isReversed}
                  onPress={() => handleCardReveal(idx)}
                  size={drawnCards.length > 3 ? 'small' : 'medium'}
                />
                {revealedCards.has(idx) && (
                  <Text style={styles.cardNameLabel}>
                    {drawn.card.name}
                    {drawn.isReversed ? ' ↓' : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Reading */}
          {loadingReading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Reading the cards…</Text>
            </View>
          )}

          {reading && (
            <View style={styles.readingContainer}>
              <Text style={styles.readingTitle}>{t('tarot.yourReading')}</Text>
              <Text style={styles.readingText}>{reading}</Text>
              <TouchableOpacity style={styles.voiceButton}>
                <Text style={styles.voiceButtonText}>🔊 {t('tarot.getVoiceReading')}</Text>
              </TouchableOpacity>
              {voiceUrl && <VoicePlayer url={voiceUrl} />}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginVertical: SPACING.lg,
    letterSpacing: 1,
  },
  spreadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOW.card,
  },
  spreadLocked: {
    opacity: 0.7,
    borderColor: COLORS.gold,
  },
  spreadIcon: { fontSize: 36, marginRight: SPACING.md },
  spreadInfo: { flex: 1 },
  spreadTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  spreadName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  lockBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: { fontSize: TYPOGRAPHY.fontSize.xs, color: '#000', fontWeight: TYPOGRAPHY.fontWeight.bold },
  spreadDesc: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textSecondary, marginBottom: 4 },
  spreadCardCount: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.textMuted },
  spreadHeader: { marginBottom: SPACING.md },
  backLink: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  cardSlot: { alignItems: 'center', width: '30%', minWidth: 90 },
  positionLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardNameLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.accent,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: { alignItems: 'center', marginVertical: SPACING.xl },
  loadingText: { color: COLORS.textSecondary, marginTop: SPACING.sm },
  readingContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  readingTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.accent,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  readingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.fontSize.base * 1.7,
  },
  voiceButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignSelf: 'center',
  },
  voiceButtonText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.sm },
});
