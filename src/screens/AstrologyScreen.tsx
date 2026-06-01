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

const NATAL_CHART = [
  { symbol: '☉', name: 'Sol', position: 'Aries', degree: '14°32\'', house: 'Casa I' },
  { symbol: '☽', name: 'Luna', position: 'Cáncer', degree: '28°11\'', house: 'Casa IV' },
  { symbol: '☿', name: 'Mercurio', position: 'Piscis', degree: '03°44\'', house: 'Casa XII' },
  { symbol: '♀', name: 'Venus', position: 'Tauro', degree: '19°20\'', house: 'Casa II' },
  { symbol: '♂', name: 'Marte', position: 'Sagitario', degree: '07°55\'', house: 'Casa IX' },
  { symbol: '♃', name: 'Júpiter', position: 'Libra', degree: '22°01\'', house: 'Casa VII' },
  { symbol: '♄', name: 'Saturno', position: 'Acuario', degree: '11°18\'', house: 'Casa XI' },
  { symbol: '⬆', name: 'Ascendente', position: 'Aries', degree: '00°00\'', house: 'Casa I' },
];

const TRANSITS = [
  { symbol: '☉', name: 'Sol', position: 'Géminis', note: 'Energía de comunicación y curiosidad' },
  { symbol: '☽', name: 'Luna', position: 'Escorpio', note: 'Emociones intensas y transformadoras' },
  { symbol: '♀', name: 'Venus', position: 'Cáncer', note: 'Amor y ternura en el hogar' },
  { symbol: '♂', name: 'Marte', position: 'Leo', note: 'Acción con pasión y liderazgo' },
  { symbol: '♃', name: 'Júpiter', position: 'Tauro', note: 'Expansión en lo material y sensorial' },
  { symbol: '♄', name: 'Saturno', position: 'Piscis', note: 'Lecciones espirituales y límites disueltos' },
];

const TRANSIT_READING =
  'La Luna en Escorpio intensifica tu mundo interior hoy. Con el Sol en Géminis, la mente está activa y receptiva. Es un día poderoso para meditar sobre transformaciones profundas y comunicar verdades desde el alma. Júpiter en Tauro bendice los proyectos que nutren cuerpo y espíritu.';

export default function AstrologyScreen() {
  const [activeTab, setActiveTab] = useState<'natal' | 'transits'>('natal');
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
            <Text style={styles.subtitle}>Tus astros al nacer y hoy</Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'natal' && styles.tabBtnActive]}
              onPress={() => setActiveTab('natal')}
            >
              <Text style={[styles.tabText, activeTab === 'natal' && styles.tabTextActive]}>
                Carta Natal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'transits' && styles.tabBtnActive]}
              onPress={() => setActiveTab('transits')}
            >
              <Text style={[styles.tabText, activeTab === 'transits' && styles.tabTextActive]}>
                Tránsitos Actuales
              </Text>
            </TouchableOpacity>
          </View>

          {/* Carta Natal Tab */}
          {activeTab === 'natal' && (
            <View>
              <LinearGradient colors={GRADIENTS.card} style={styles.formCard}>
                <Text style={styles.formTitle}>🪐 Datos de Nacimiento</Text>

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
                    <Text style={styles.calcBtnText}>Calcular Carta Natal ✨</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>

              {showChart && (
                <View>
                  <Text style={styles.sectionTitle}>🌟 Posiciones Planetarias</Text>
                  <Text style={styles.chartNote}>
                    {birthPlace || 'Madrid, España'} · {birthDate || '15/03/1990'} · {birthTime || '14:30'}
                  </Text>
                  {NATAL_CHART.map((item, i) => (
                    <LinearGradient key={i} colors={GRADIENTS.card} style={styles.planetRow}>
                      <Text style={styles.planetSymbol}>{item.symbol}</Text>
                      <Text style={styles.planetName}>{item.name}</Text>
                      <View style={styles.planetDetails}>
                        <Text style={styles.planetSign}>{item.position}</Text>
                        <Text style={styles.planetDegree}>{item.degree}</Text>
                        <Text style={styles.planetHouse}>{item.house}</Text>
                      </View>
                    </LinearGradient>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Tránsitos Tab */}
          {activeTab === 'transits' && (
            <View>
              <Text style={styles.sectionTitle}>🌍 Posiciones Actuales</Text>
              {TRANSITS.map((item, i) => (
                <LinearGradient key={i} colors={GRADIENTS.card} style={styles.transitRow}>
                  <Text style={styles.transitSymbol}>{item.symbol}</Text>
                  <View style={styles.transitInfo}>
                    <View style={styles.transitHeader}>
                      <Text style={styles.transitName}>{item.name}</Text>
                      <Text style={styles.transitSign}> en {item.position}</Text>
                    </View>
                    <Text style={styles.transitNote}>{item.note}</Text>
                  </View>
                </LinearGradient>
              ))}
              <LinearGradient colors={['#1A1035', '#2D1B69']} style={styles.readingCard}>
                <Text style={styles.readingTitle}>📖 Lectura del Día</Text>
                <Text style={styles.readingText}>{TRANSIT_READING}</Text>
              </LinearGradient>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.white },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  label: {
    fontSize: 12,
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
  calcBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  calcBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
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
  planetSymbol: { fontSize: 18, color: COLORS.gold, width: 28 },
  planetName: { fontSize: 14, color: COLORS.text, fontWeight: '600', width: 80 },
  planetDetails: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  planetSign: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  planetDegree: { fontSize: 13, color: COLORS.textSecondary },
  planetHouse: { fontSize: 13, color: COLORS.textMuted },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transitSymbol: { fontSize: 22, color: COLORS.gold, marginRight: 14, width: 28 },
  transitInfo: { flex: 1 },
  transitHeader: { flexDirection: 'row', marginBottom: 4 },
  transitName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  transitSign: { fontSize: 15, color: COLORS.accent, fontWeight: '600' },
  transitNote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  readingCard: {
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  readingText: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24, fontStyle: 'italic' },
});
