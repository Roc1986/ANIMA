import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  return (
    <LinearGradient
      colors={['#0F0A1E', '#1A1035', '#2D1B69']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>ANIMA</Text>
          <Text style={styles.subtitle}>Tu guía espiritual</Text>

          {/* Card del Día */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✨ Carta del Día</Text>
            <View style={styles.cardInner}>
              <Text style={styles.cardSymbol}>✦</Text>
              <Text style={styles.cardName}>La Estrella</Text>
            </View>
            <Text style={styles.readingText}>
              La Estrella te invita a confiar en el universo. Es un momento de renovación y esperanza. Permite que la luz guíe tus pasos hacia tu destino más elevado.
            </Text>
            <TouchableOpacity style={styles.listenButton}>
              <Text style={styles.listenButtonText}>Escuchar lectura 🔊</Text>
            </TouchableOpacity>
          </View>

          {/* Mensaje del Día */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌙 Mensaje del Día</Text>
            <Text style={styles.messageText}>
              "El cosmos susurra secretos a quienes saben escuchar. Hoy, abre tu corazón a las señales que el universo tiene para ti. Cada momento es una oportunidad de crecimiento espiritual."
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    color: '#FFFFFF',
    letterSpacing: 8,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#C4B5FD',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#2D1B69',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardInner: {
    backgroundColor: '#0F0A1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardSymbol: {
    fontSize: 48,
    color: '#C4B5FD',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 20,
    color: '#F5F3FF',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  readingText: {
    fontSize: 14,
    color: '#A78BFA',
    lineHeight: 22,
    marginBottom: 16,
  },
  listenButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  listenButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 15,
    color: '#C4B5FD',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
