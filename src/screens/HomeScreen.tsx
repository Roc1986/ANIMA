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

export default function HomeScreen() {
  return (
    <LinearGradient colors={['#0F0A1E', '#1A1035', '#2D1B69']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>ANIMA</Text>
            <Text style={styles.subtitle}>Tu guía espiritual</Text>
          </View>

          {/* Daily Card Section */}
          <View style={styles.cardContainer}>
            <Text style={styles.sectionTitle}>✨ Carta del Día</Text>
            <View style={styles.tarotCard}>
              <View style={styles.tarotCardVisual}>
                <Text style={styles.tarotSymbol}>✦</Text>
                <Text style={styles.tarotCardName}>La Estrella</Text>
              </View>
              <Text style={styles.tarotReading}>
                La esperanza brilla en la oscuridad. Un período de renovación y fe se acerca a tu vida.
              </Text>
              <TouchableOpacity activeOpacity={0.8}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.listenBtn}>
                  <Text style={styles.listenBtnText}>Escuchar lectura 🔊</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Message Section */}
          <View style={styles.cardContainer}>
            <Text style={styles.sectionTitle}>🌙 Mensaje del Día</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageDate}>Luna en Cáncer · Energía de introspección</Text>
              <Text style={styles.messageText}>
                Hoy el cosmos te invita a mirar hacia adentro. La energía de la Luna en Cáncer potencia
                tu intuición y tu conexión con el mundo emocional. Es un momento propicio para la
                meditación, la escritura en tu diario espiritual, y para honrar tus ciclos internos.
                Confía en lo que sientes — el universo te habla a través de tu corazón.
              </Text>
              <View style={styles.energyRow}>
                <View style={styles.energyTag}>
                  <Text style={styles.energyTagText}>🌊 Agua</Text>
                </View>
                <View style={styles.energyTag}>
                  <Text style={styles.energyTagText}>🌕 Luna Llena</Text>
                </View>
                <View style={styles.energyTag}>
                  <Text style={styles.energyTagText}>💜 Intuición</Text>
                </View>
              </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.accent,
    marginTop: 6,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  cardContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  tarotCard: {
    backgroundColor: '#1A1035',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  tarotCardVisual: {
    backgroundColor: '#0F0A1E',
    borderRadius: 14,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  tarotSymbol: {
    fontSize: 52,
    color: COLORS.accent,
    marginBottom: 10,
  },
  tarotCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  tarotReading: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 23,
    fontStyle: 'italic',
    marginBottom: 18,
    textAlign: 'center',
  },
  listenBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  listenBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  messageCard: {
    backgroundColor: '#1A1035',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  messageDate: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  energyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  energyTag: {
    backgroundColor: '#2D1B69',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  energyTagText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
