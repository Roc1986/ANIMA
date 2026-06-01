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
  'El universo te invita a confiar en tu intuición hoy. Las estrellas alinean energías de transformación y crecimiento personal a tu alrededor.';

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>ANIMA</Text>
            <Text style={styles.subtitle}>Tu guía espiritual personal</Text>
            <Text style={styles.date}>{today}</Text>
          </View>

          {/* Daily Card */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>✨ Carta del Día</Text>
            <LinearGradient colors={GRADIENTS.card} style={styles.tarotCard}>
              <Text style={styles.cardEmoji}>✨</Text>
              <Text style={styles.cardName}>La Estrella</Text>
              <Text style={styles.cardNumber}>XVII</Text>
              <Text style={styles.cardKeyword}>Esperanza · Renovación · Inspiración</Text>
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
            <Text style={styles.sectionLabel}>Explorar</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickBtn}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.quickBtnGrad}>
                  <Text style={styles.quickBtnIcon}>🔮</Text>
                  <Text style={styles.quickBtnText}>Tirada{'\n'}de Tarot</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn}>
                <LinearGradient colors={['#1A1035', '#2D1B69']} style={styles.quickBtnGrad}>
                  <Text style={styles.quickBtnIcon}>⭐</Text>
                  <Text style={styles.quickBtnText}>Carta{'\n'}Astral</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn}>
                <LinearGradient colors={['#1A1035', '#2D1B69']} style={styles.quickBtnGrad}>
                  <Text style={styles.quickBtnIcon}>💬</Text>
                  <Text style={styles.quickBtnText}>Chat{'\n'}ANIMA</Text>
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
  header: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  title: {
    fontSize: 42,
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
  date: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tarotCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardEmoji: { fontSize: 48, marginBottom: 12 },
  cardName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cardKeyword: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  messageCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: { flex: 1 },
  quickBtnGrad: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnIcon: { fontSize: 28, marginBottom: 8 },
  quickBtnText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
});
