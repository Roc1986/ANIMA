import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, GRADIENTS } from '../theme';
import { t } from '../../../../packages/shared/src/i18n';

export function AstrologyScreen() {
  const [activeTab, setActiveTab] = useState<'natal' | 'transits'>('natal');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<string | null>(null);

  async function handleGenerateReading() {
    if (!birthDate || !birthPlace) return;
    setLoading(true);
    // TODO: call calculateNatalChart + buildNatalChartPrompt + Claude API
    await new Promise((r) => setTimeout(r, 2000));
    setReading(
      'Your natal chart reveals a soul built for transformation and deep perception. With your Sun in a fire sign, you carry the spark of initiative and creative vision — you are meant to lead, to inspire, to create. Yet your Moon speaks of deep emotional waters, a rich inner world that requires regular tending. The tension between these two energies is not a flaw but your greatest gift: the ability to feel deeply and act boldly.',
    );
    setLoading(false);
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Astrology</Text>

          {/* Tab Selector */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'natal' && styles.tabActive]}
              onPress={() => setActiveTab('natal')}
            >
              <Text style={[styles.tabText, activeTab === 'natal' && styles.tabTextActive]}>
                {t('astrology.natalChart')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transits' && styles.tabActive]}
              onPress={() => setActiveTab('transits')}
            >
              <Text style={[styles.tabText, activeTab === 'transits' && styles.tabTextActive]}>
                {t('astrology.transits')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input Form */}
          {!reading && (
            <View style={styles.form}>
              <Text style={styles.formHint}>{t('astrology.enterBirthData')}</Text>

              <Text style={styles.label}>{t('astrology.birthDate')} (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="1990-06-21"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.label}>{t('astrology.birthTime')} (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={birthTime}
                onChangeText={setBirthTime}
                placeholder="14:30"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.label}>{t('astrology.birthPlace')}</Text>
              <TextInput
                style={styles.input}
                value={birthPlace}
                onChangeText={setBirthPlace}
                placeholder="Paris, France"
                placeholderTextColor={COLORS.textMuted}
              />

              <TouchableOpacity
                style={[styles.button, (!birthDate || !birthPlace) && styles.buttonDisabled]}
                onPress={handleGenerateReading}
                disabled={!birthDate || !birthPlace || loading}
              >
                <Text style={styles.buttonText}>Generate Reading</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Calculating your chart…</Text>
            </View>
          )}

          {reading && !loading && (
            <View style={styles.readingContainer}>
              <Text style={styles.readingTitle}>{t('astrology.reading')}</Text>
              <Text style={styles.readingText}>{reading}</Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setReading(null)}
              >
                <Text style={styles.resetButtonText}>New Reading</Text>
              </TouchableOpacity>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.secondary },
  tabText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.fontWeight.medium },
  tabTextActive: { color: COLORS.textPrimary },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  formHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accent,
    marginBottom: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  loadingContainer: { alignItems: 'center', marginVertical: SPACING.xl },
  loadingText: { color: COLORS.textSecondary, marginTop: SPACING.sm },
  readingContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
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
  resetButton: {
    marginTop: SPACING.lg,
    alignSelf: 'center',
    padding: SPACING.sm,
  },
  resetButtonText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm },
});
