import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../theme';

const MOCK_CHART = [
  { planet: '☀️ Sol', sign: 'Sagitario', degree: '15°22\'', house: 'Casa IX' },
  { planet: '🌙 Luna', sign: 'Piscis', degree: '28°44\'', house: 'Casa XII' },
  { planet: '☿ Mercurio', sign: 'Sagitario', degree: '02°10\'', house: 'Casa VIII' },
  { planet: '♀ Venus', sign: 'Escorpio', degree: '19°33\'', house: 'Casa VII' },
  { planet: '♂ Marte', sign: 'Capricornio', degree: '07°55\'', house: 'Casa X' },
  { planet: '♃ Júpiter', sign: 'Virgo', degree: '22°01\'', house: 'Casa VI' },
  { planet: '♄ Saturno', sign: 'Acuario', degree: '11°18\'', house: 'Casa XI' },
  { planet: '⬆ Ascendente', sign: 'Aries', degree: '04°45\'', house: 'Casa I' },
];

export default function AstrologyScreen() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [showChart, setShowChart] = useState(false);

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Carta Astral</Text>
            <Text style={styles.subtitle}>Descubre tu mapa del cielo</Text>
          </View>

          <LinearGradient colors={GRADIENTS.card} style={styles.formCard}>
            <Text style={styles.formTitle}>🪐 Tus Datos de Nacimiento</Text>

            <Text style={styles.label}>Fecha de nacimiento</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.textMuted}
              value={birthDate}
              onChangeText={setBirthDate}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Hora de nacimiento</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (24h)"
              placeholderTextColor={COLORS.textMuted}
              value={birthTime}
              onChangeText={setBirthTime}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Lugar de nacimiento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ciudad, País"
              placeholderTextColor={COLORS.textMuted}
              value={birthPlace}
              onChangeText={setBirthPlace}
            />

            <TouchableOpacity onPress={() => setShowChart(true)} activeOpacity={0.8}>
              <LinearGradient colors={GRADIENTS.primary} style={styles.calcBtn}>
                <Text style={styles.calcBtnText}>Calcular Carta ✨</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {showChart && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>🌟 Posiciones Planetarias</Text>
              <Text style={styles.chartNote}>
                Ejemplo: {birthPlace || 'Madrid, España'} · {birthDate || '15/12/1990'} · {birthTime || '14:30'}
              </Text>
              {MOCK_CHART.map((item, i) => (
                <LinearGradient key={i} colors={GRADIENTS.card} style={styles.planetRow}>
                  <Text style={styles.planetName}>{item.planet}</Text>
                  <View style={styles.planetDetails}>
                    <Text style={styles.planetSign}>{item.sign}</Text>
                    <Text style={styles.planetDegree}>{item.degree}</Text>
                    <Text style={styles.planetHouse}>{item.house}</Text>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, marginTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calcBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  calcBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  chartSection: { marginBottom: 24 },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  chartNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  planetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planetName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    width: 110,
  },
  planetDetails: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  planetSign: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  planetDegree: { fontSize: 13, color: COLORS.textSecondary },
  planetHouse: { fontSize: 13, color: COLORS.textMuted },
});
