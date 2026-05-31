import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';

interface DailyMessageProps {
  message: string | null;
  loading?: boolean;
  name?: string;
}

export function DailyMessage({ message, loading = false, name }: DailyMessageProps) {
  return (
    <LinearGradient
      colors={['#2D1B69', '#1A1035']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.header}>✦ Daily Guidance</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} size="small" style={styles.loader} />
      ) : message ? (
        <Text style={styles.message}>{message}</Text>
      ) : (
        <Text style={styles.placeholder}>
          Complete your profile to receive a personalized daily message.
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  header: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.fontSize.base * 1.7,
    fontStyle: 'italic',
  },
  placeholder: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    lineHeight: TYPOGRAPHY.fontSize.sm * 1.6,
    fontStyle: 'italic',
  },
  loader: {
    marginVertical: SPACING.md,
  },
});
