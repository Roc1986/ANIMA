import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../theme';

const DAILY_MESSAGE =
  'Hoy es un día para reconectar con tu intuición. Los astros sugieren reflexión y calma. Confía en el proceso del universo.';

const DAILY_CARD = {
  name: 'La Sacerdotisa',
  number: 'II',
  meaning: 'Intuición · Misterio · Sabiduría interior',
};

export default function HomeScreen() {
  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>ANIMA</Text>
            <Text style={styles.subtitle}>Tu guía espiritual personal</Text>
          </View>

          {/* Daily Card */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>✨ Carta del Día</Text>
            <LinearGradient colors={GRADIENTS.card} style={styles.tarotCard}>
              <Text style={styles.cardNumber}>{DAILY_CARD.number}</Text>
              <Text style={styles.cardEmoji}>✨</Text>
              <Text style={styles.cardName}>{DAILY_CARD.name}</Text>
              <Text style={styles.cardMeaning}>{DAILY_CARD.meaning}</Text>
            </LinearGradient>
          </View>

          {/* Daily Message */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🌙 Mensaje del Día</Text>
            <LinearGradient colors={GRADIENTS.card} style={styles.messageCard}>
              <Text style={styles.messageText}>{DAILY_MESSAGE}</Text>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>⚡ Acceso Rápido</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickBtn}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.quickBtnGradient}>
                  <Text style={styles.quickBtnIcon}>🔮</Text>
                  <Text style={styles.quickBtnText}>Tirada de Tarot</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn}>
                <LinearGradient colors={GRADIENTS.card} style={styles.quickBtnGradient}>
                  <Text style={styles.quickBtnIcon}>🪐</Text>
                  <Text style={styles.quickBtnText}>Carta Astral</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tarotCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardNumber: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  cardEmoji: { fontSize: 48, marginBottom: 12 },
  cardName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardMeaning: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  messageCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  quickBtnGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnIcon: { fontSize: 28, marginBottom: 8 },
  quickBtnText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
