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

const spreads = [
  {
    title: 'Carta del Día',
    description: 'Una carta para guiar tu jornada',
    badge: 'GRATIS',
    badgeColor: '#10B981',
    icon: '🌟',
  },
  {
    title: 'Sí o No',
    description: 'Respuesta directa a tu pregunta',
    badge: 'PRO',
    badgeColor: '#7C3AED',
    icon: '⚖️',
  },
  {
    title: 'Pasado · Presente · Futuro',
    description: 'Comprende tu camino en el tiempo',
    badge: 'PRO',
    badgeColor: '#7C3AED',
    icon: '🔮',
  },
  {
    title: 'Cruz Celta',
    description: 'Lectura completa de 10 cartas',
    badge: 'PREMIUM',
    badgeColor: '#F59E0B',
    icon: '✨',
  },
];

export default function TarotScreen() {
  return (
    <LinearGradient
      colors={['#0F0A1E', '#1A1035', '#2D1B69']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Tarot</Text>
          <Text style={styles.subtitle}>Elige tu tirada</Text>

          {spreads.map((spread, index) => (
            <TouchableOpacity key={index} style={styles.card} activeOpacity={0.8}>
              <View style={styles.cardRow}>
                <Text style={styles.cardIcon}>{spread.icon}</Text>
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{spread.title}</Text>
                    <View style={[styles.badge, { backgroundColor: spread.badgeColor }]}>
                      <Text style={styles.badgeText}>{spread.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDescription}>{spread.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#C4B5FD',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#2D1B69',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: '#F5F3FF',
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 13,
    color: '#A78BFA',
  },
});
