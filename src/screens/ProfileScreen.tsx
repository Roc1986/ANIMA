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

export default function ProfileScreen() {
  const [nombre, setNombre] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [horaNac, setHoraNac] = useState('');
  const [lugarNac, setLugarNac] = useState('');
  const [activeLang, setActiveLang] = useState('ES');

  return (
    <LinearGradient
      colors={['#0F0A1E', '#1A1035', '#2D1B69']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Mi Perfil</Text>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarSymbol}>✦</Text>
            </View>
          </View>

          {/* Form Fields */}
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#6D6D8A"
            value={nombre}
            onChangeText={setNombre}
          />
          <TextInput
            style={styles.input}
            placeholder="Fecha de nacimiento (DD/MM/AAAA)"
            placeholderTextColor="#6D6D8A"
            value={fechaNac}
            onChangeText={setFechaNac}
          />
          <TextInput
            style={styles.input}
            placeholder="Hora de nacimiento (HH:MM)"
            placeholderTextColor="#6D6D8A"
            value={horaNac}
            onChangeText={setHoraNac}
          />
          <TextInput
            style={styles.input}
            placeholder="Lugar de nacimiento"
            placeholderTextColor="#6D6D8A"
            value={lugarNac}
            onChangeText={setLugarNac}
          />

          {/* Language */}
          <Text style={styles.sectionLabel}>Idioma</Text>
          <View style={styles.langRow}>
            {['ES', 'EN', 'FR'].map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.langButton, activeLang === lang && styles.langButtonActive]}
                onPress={() => setActiveLang(lang)}
              >
                <Text style={[styles.langText, activeLang === lang && styles.langTextActive]}>
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subscription */}
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>Plan Gratuito</Text>
            <Text style={styles.subDesc}>Acceso a funciones básicas de ANIMA</Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>✨ Actualizar a Premium</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Exportar mis datos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]}>
            <Text style={[styles.actionButtonText, styles.deleteText]}>Eliminar mi cuenta</Text>
          </TouchableOpacity>

          <Text style={styles.version}>ANIMA v1.0.0</Text>
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSymbol: {
    fontSize: 36,
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
  sectionLabel: {
    fontSize: 14,
    color: '#C4B5FD',
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 1,
  },
  langRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  langButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  langButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  langText: {
    color: '#6D6D8A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  subCard: {
    backgroundColor: '#1A1035',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  subLabel: {
    fontSize: 16,
    color: '#F5F3FF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subDesc: {
    fontSize: 13,
    color: '#A78BFA',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#1A1035',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  actionButtonText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  deleteText: {
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    color: '#6D6D8A',
    fontSize: 12,
    marginTop: 16,
  },
});
