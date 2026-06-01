import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const planets = [
  { name: 'Sol', sign: 'Géminis', degree: '10°' },
  { name: 'Luna', sign: 'Escorpio', degree: '23°' },
  { name: 'Mercurio', sign: 'Géminis', degree: '5°' },
  { name: 'Venus', sign: 'Tauro', degree: '18°' },
  { name: 'Marte', sign: 'Aries', degree: '2°' },
  { name: 'Júpiter', sign: 'Géminis', degree: '29°' },
  { name: 'Saturno', sign: 'Piscis', degree: '15°' },
];

const transits = [
  { planet: 'Júpiter', transit: 'Trígono con tu Sol', effect: 'Expansión y oportunidades' },
  { planet: 'Saturno', transit: 'Cuadratura con tu Luna', effect: 'Reflexión y disciplina' },
  { planet: 'Venus', transit: 'Conjunción con tu Ascendente', effect: 'Magnetismo personal' },
  { planet: 'Marte', transit: 'Sextil con Mercurio', effect: 'Energía mental elevada' },
];

export default function AstrologyScreen() {
  const [activeTab, setActiveTab] = useState<'natal' | 'transits'>('natal');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');

  return (
    <LinearGradient
      colors={['#0F0A1E', '#1A1035', '#2D1B69']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Carta Astral</Text>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'natal' && styles.tabActive]}
              onPress={() => setActiveTab('natal')}
            >
              <Text style={[styles.tabText, activeTab === 'natal' && styles.tabTextActive]}>
                Carta Natal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transits' && styles.tabActive]}
              onPress={() => setActiveTab('transits')}
            >
              <Text style={[styles.tabText, activeTab === 'transits' && styles.tabTextActive]}>
                Tránsitos
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'natal' ? (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Fecha de nacimiento (DD/MM/AAAA)"
                placeholderTextColor="#6D6D8A"
                value={fecha}
                onChangeText={setFecha}
              />
              <TextInput
                style={styles.input}
                placeholder="Hora de nacimiento (HH:MM)"
                placeholderTextColor="#6D6D8A"
                value={hora}
                onChangeText={setHora}
              />
              <TextInput
                style={styles.input}
                placeholder="Lugar de nacimiento"
                placeholderTextColor="#6D6D8A"
                value={lugar}
                onChangeText={setLugar}
              />
              <TouchableOpacity style={styles.calcButton}>
                <Text style={styles.calcButtonText}>Calcular</Text>
              </TouchableOpacity>

              <Text style={styles.sectionLabel}>Posiciones Planetarias</Text>
              {planets.map((p, i) => (
                <View key={i} style={styles.planetRow}>
                  <Text style={styles.planetName}>{p.name}</Text>
                  <Text style={styles.planetSign}>{p.sign}</Text>
                  <Text style={styles.planetDegree}>{p.degree}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLabel}>Tránsitos Actuales</Text>
              {transits.map((t, i) => (
                <View key={i} style={styles.transitCard}>
                  <Text style={styles.transitPlanet}>{t.planet}</Text>
                  <Text style={styles.transitDescription}>{t.transit}</Text>
                  <Text style={styles.transitEffect}>{t.effect}</Text>
                </View>
              ))}
            </View>
          )}
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
    marginBottom: 24,
    letterSpacing: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1035',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    color: '#6D6D8A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1A1035',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D1B69',
    fontSize: 14,
  },
  calcButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  calcButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 16,
    color: '#C4B5FD',
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  planetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1A1035',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  planetName: {
    color: '#F5F3FF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  planetSign: {
    color: '#A78BFA',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  planetDegree: {
    color: '#C4B5FD',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  transitCard: {
    backgroundColor: '#1A1035',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  transitPlanet: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transitDescription: {
    color: '#F5F3FF',
    fontSize: 13,
    marginBottom: 4,
  },
  transitEffect: {
    color: '#A78BFA',
    fontSize: 12,
  },
});
