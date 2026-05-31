import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, GRADIENTS, SHADOW } from '../theme';
import { VoicePlayer } from '../components/VoicePlayer';
import { t } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - SPACING.md * 2;

type CharacterType = 'man' | 'woman' | 'child' | 'elder';
type SkinTone = 'light' | 'medium' | 'dark';

interface Character {
  id: string;
  type: CharacterType;
  skinTone: SkinTone;
  label?: string;
  x: number;
  y: number;
}

const CHARACTER_EMOJIS: Record<CharacterType, Record<SkinTone, string>> = {
  man:   { light: '👨🏻', medium: '👨🏽', dark: '👨🏿' },
  woman: { light: '👩🏻', medium: '👩🏽', dark: '👩🏿' },
  child: { light: '🧒🏻', medium: '🧒🏽', dark: '🧒🏿' },
  elder: { light: '🧓🏻', medium: '🧓🏽', dark: '🧓🏿' },
};

const CHARACTER_TYPES: CharacterType[] = ['man', 'woman', 'child', 'elder'];
const SKIN_TONES: SkinTone[] = ['light', 'medium', 'dark'];

export function ConstellationScreen() {
  const [step, setStep] = useState<'select' | 'place' | 'reading'>('select');
  const [selectedType, setSelectedType] = useState<CharacterType | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<SkinTone>('medium');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addCharacter() {
    if (!selectedType) return;
    const newChar: Character = {
      id: Date.now().toString(),
      type: selectedType,
      skinTone: selectedSkin,
      x: 40 + Math.random() * (CANVAS_SIZE - 80),
      y: 40 + Math.random() * (CANVAS_SIZE - 80),
    };
    setCharacters((prev) => [...prev, newChar]);
  }

  async function handleStartReading() {
    if (characters.length === 0) return;
    setStep('reading');
    setLoading(true);
    // TODO: Encrypt character/layout data, send to Claude API
    await new Promise((r) => setTimeout(r, 2000));
    setReading(
      'As I witness the constellation you have created, I see a rich and complex field. The distance between certain figures speaks to a longing for closeness that hasn\'t yet found its bridge. Notice where your body feels tension as you look at this layout — that is wisdom. The figure standing apart on the edge often carries something precious that belongs to the whole system. What would change if that one took one step closer?',
    );
    setLoading(false);
  }

  if (step === 'reading') {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{t('constellation.title')}</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Reading your constellation…</Text>
              </View>
            ) : (
              <View style={styles.readingContainer}>
                <Text style={styles.readingTitle}>The Constellation Speaks</Text>
                <Text style={styles.readingText}>{reading}</Text>
                {voiceUrl && <VoicePlayer url={voiceUrl} />}
                <TouchableOpacity style={styles.resetButton} onPress={() => {
                  setStep('select');
                  setCharacters([]);
                  setReading(null);
                }}>
                  <Text style={styles.resetText}>Begin New Constellation</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>{t('constellation.title')}</Text>

          {step === 'select' && (
            <>
              <Text style={styles.subtitle}>{t('constellation.selectCharacters')}</Text>

              {/* Character type selector */}
              <View style={styles.characterTypes}>
                {CHARACTER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, selectedType === type && styles.typeButtonActive]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={styles.typeEmoji}>{CHARACTER_EMOJIS[type][selectedSkin]}</Text>
                    <Text style={styles.typeLabel}>{t(`constellation.characters.${type}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Skin tone selector */}
              <View style={styles.skinTones}>
                {SKIN_TONES.map((tone) => (
                  <TouchableOpacity
                    key={tone}
                    style={[styles.skinToneButton, selectedSkin === tone && styles.skinToneActive]}
                    onPress={() => setSelectedSkin(tone)}
                  >
                    <Text>{selectedType ? CHARACTER_EMOJIS[selectedType][tone] : '👤'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.addButton, !selectedType && styles.buttonDisabled]}
                onPress={addCharacter}
                disabled={!selectedType}
              >
                <Text style={styles.addButtonText}>+ Add to Constellation</Text>
              </TouchableOpacity>

              {/* Show added characters */}
              {characters.length > 0 && (
                <View style={styles.addedChars}>
                  <Text style={styles.addedTitle}>Added ({characters.length})</Text>
                  <View style={styles.addedRow}>
                    {characters.map((c) => (
                      <Text key={c.id} style={styles.addedEmoji}>
                        {CHARACTER_EMOJIS[c.type][c.skinTone]}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {characters.length >= 2 && (
                <TouchableOpacity style={styles.nextButton} onPress={() => setStep('place')}>
                  <Text style={styles.nextButtonText}>{t('constellation.placeOnCanvas')} →</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {step === 'place' && (
            <>
              <Text style={styles.subtitle}>{t('constellation.placeOnCanvas')}</Text>
              <Text style={styles.hint}>Drag the figures to where they feel right</Text>

              {/* Canvas */}
              <View style={[styles.canvas, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}>
                {/* Subtle grid dots */}
                <View style={styles.canvasBackground} />
                {characters.map((char) => (
                  <View
                    key={char.id}
                    style={[styles.charOnCanvas, { left: char.x - 20, top: char.y - 20 }]}
                  >
                    <Text style={styles.charEmoji}>
                      {CHARACTER_EMOJIS[char.type][char.skinTone]}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.startButton} onPress={handleStartReading}>
                <Text style={styles.startButtonText}>{t('constellation.startReading')}</Text>
              </TouchableOpacity>
            </>
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
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  characterTypes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  typeButton: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    width: 72,
  },
  typeButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.surface },
  typeEmoji: { fontSize: 32 },
  typeLabel: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  skinTones: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  skinToneButton: { padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  skinToneActive: { borderColor: COLORS.accent },
  addButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  buttonDisabled: { opacity: 0.4 },
  addButtonText: { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  addedChars: { marginBottom: SPACING.md, alignItems: 'center' },
  addedTitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textMuted, marginBottom: SPACING.xs },
  addedRow: { flexDirection: 'row', gap: 4 },
  addedEmoji: { fontSize: 28 },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
  },
  nextButtonText: { color: COLORS.accent, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  canvas: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  canvasBackground: { position: 'absolute', width: '100%', height: '100%' },
  charOnCanvas: { position: 'absolute' },
  charEmoji: { fontSize: 36 },
  startButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
  },
  startButtonText: { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.fontWeight.semibold, fontSize: TYPOGRAPHY.fontSize.base },
  loadingContainer: { alignItems: 'center', marginVertical: SPACING['2xl'] },
  loadingText: { color: COLORS.textSecondary, marginTop: SPACING.md },
  readingContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  readingTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
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
  resetButton: { alignSelf: 'center', marginTop: SPACING.xl },
  resetText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm },
});
