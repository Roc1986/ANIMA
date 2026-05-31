import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOW } from '../theme';
import type { TarotCard as TarotCardType } from '../types/tarot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CardSize = 'small' | 'medium' | 'large';

const CARD_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
  small:  { width: 72,  height: 120 },
  medium: { width: 110, height: 184 },
  large:  { width: 160, height: 267 },
};

interface TarotCardProps {
  card: TarotCardType;
  isRevealed: boolean;
  isReversed: boolean;
  onPress?: () => void;
  size?: CardSize;
}

/**
 * Animated flip card component.
 * Face-down: deep purple card back with mystic pattern.
 * Face-up: card name, number, arcana (and reversed indicator if applicable).
 */
export function TarotCard({
  card,
  isRevealed,
  isReversed,
  onPress,
  size = 'medium',
}: TarotCardProps) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const dimensions = CARD_DIMENSIONS[size];

  useEffect(() => {
    if (isRevealed) {
      Animated.spring(flipAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      flipAnim.setValue(0);
    }
  }, [isRevealed]);

  // Front card rotation (0 → 180)
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Back card rotation (-180 → 0)
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0.4, 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0.4, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      onPress={!isRevealed ? onPress : undefined}
      activeOpacity={isRevealed ? 1 : 0.8}
      style={[styles.container, { width: dimensions.width, height: dimensions.height }]}
    >
      {/* Card Back */}
      <Animated.View
        style={[
          styles.card,
          { width: dimensions.width, height: dimensions.height },
          { transform: [{ rotateY: frontRotate }], opacity: backOpacity },
        ]}
      >
        <LinearGradient
          colors={['#1E1145', '#2D1B69', '#1A0E3D']}
          style={styles.cardFace}
        >
          <Text style={[styles.backSymbol, { fontSize: dimensions.width * 0.35 }]}>✦</Text>
          <View style={[styles.backBorder, {
            width: dimensions.width - 12,
            height: dimensions.height - 12,
          }]} />
        </LinearGradient>
      </Animated.View>

      {/* Card Front */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFront,
          { width: dimensions.width, height: dimensions.height },
          { transform: [{ rotateY: backRotate }, { rotate: isReversed ? '180deg' : '0deg' }], opacity: frontOpacity },
        ]}
      >
        <LinearGradient
          colors={['#231548', '#1A1035']}
          style={styles.cardFace}
        >
          {/* Card number */}
          <View style={styles.numberBadge}>
            <Text style={[styles.number, { fontSize: Math.max(TYPOGRAPHY.fontSize.xs, dimensions.width * 0.1) }]}>
              {card.arcana === 'major'
                ? toRoman(card.number)
                : `${card.number}`}
            </Text>
          </View>

          {/* Arcana symbol */}
          <Text style={[styles.arcanaSymbol, { fontSize: dimensions.width * 0.25 }]}>
            {getArcanaSymbol(card)}
          </Text>

          {/* Card name */}
          <Text
            style={[styles.cardName, { fontSize: Math.max(TYPOGRAPHY.fontSize.xs, dimensions.width * 0.1) }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {card.name}
          </Text>

          {/* Reversed indicator */}
          {isReversed && (
            <View style={styles.reversedBadge}>
              <Text style={styles.reversedText}>↓</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

function toRoman(num: number): string {
  const romanNumerals = [
    [21, 'XXI'], [20, 'XX'], [19, 'XIX'], [18, 'XVIII'], [17, 'XVII'],
    [16, 'XVI'], [15, 'XV'], [14, 'XIV'], [13, 'XIII'], [12, 'XII'],
    [11, 'XI'], [10, 'X'], [9, 'IX'], [8, 'VIII'], [7, 'VII'],
    [6, 'VI'], [5, 'V'], [4, 'IV'], [3, 'III'], [2, 'II'], [1, 'I'], [0, '0'],
  ] as const;
  return romanNumerals.find(([n]) => n === num)?.[1] ?? String(num);
}

function getArcanaSymbol(card: TarotCardType): string {
  if (card.arcana === 'major') return '☽';
  const suitSymbols: Record<string, string> = {
    wands: '🌿',
    cups: '🌊',
    swords: '⚡',
    pentacles: '⭐',
  };
  return card.suit ? suitSymbols[card.suit] ?? '✦' : '✦';
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    ...SHADOW.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardFront: {
    // positioned on top when revealed
  },
  cardFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  backSymbol: {
    color: COLORS.accent,
    opacity: 0.6,
  },
  backBorder: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.md - 2,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  numberBadge: {
    position: 'absolute',
    top: 4,
    left: 6,
  },
  number: {
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  arcanaSymbol: {
    marginBottom: 4,
  },
  cardName: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 16,
  },
  reversedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  reversedText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
