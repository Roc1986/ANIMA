import React, { useState, useEffect } from 'react';
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
import { TarotCard } from '../components/TarotCard';
import { DailyMessage } from '../components/DailyMessage';
import { TAROT_DECK } from '../../../../packages/shared/src/tarot/deck';
import { drawCards } from '../../../../packages/shared/src/tarot/readings';
import { t } from '../../../../packages/shared/src/i18n';

export function HomeScreen() {
  const [dailyCard, setDailyCard] = useState(() => {
    const [card] = drawCards(1, TAROT_DECK);
    return card;
  });
  const [isCardRevealed, setIsCardRevealed] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);

  const greeting = getGreeting();

  useEffect(() => {
    // In production: load personalized daily message from Claude API
    setDailyMessage(
      'Today, the universe invites you to pause and listen to the quiet voice within. What has been waiting for your attention? Trust that the answers you seek are already yours.',
    );
  }, []);

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>ANIMA</Text>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>

          {/* Daily Message */}
          <DailyMessage
            message={dailyMessage}
            loading={messageLoading}
          />

          {/* Daily Card Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('tarot.daily')}</Text>
            <Text style={styles.sectionSubtitle}>
              {isCardRevealed
                ? dailyCard.name
                : 'Tap to reveal your card for today'}
            </Text>

            <View style={styles.cardContainer}>
              <TarotCard
                card={dailyCard}
                isRevealed={isCardRevealed}
                isReversed={false}
                onPress={() => setIsCardRevealed(true)}
                size="medium"
              />
            </View>

            {isCardRevealed && (
              <View style={styles.cardMeaning}>
                <Text style={styles.cardKeywords}>
                  {dailyCard.keywords.slice(0, 3).join('  ·  ')}
                </Text>
                <Text style={styles.cardMeaningText}>
                  {dailyCard.uprightMeaning}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <View style={styles.quickActions}>
              <QuickAction icon="✨" label="Yes or No" />
              <QuickAction icon="🌙" label="Chat" />
              <QuickAction icon="⭐" label="Astrology" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  header: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    letterSpacing: 6,
    marginBottom: SPACING.xs,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  section: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  cardContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  cardMeaning: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cardKeywords: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  cardMeaningText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.relaxed,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOW.card,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textAlign: 'center',
  },
});
