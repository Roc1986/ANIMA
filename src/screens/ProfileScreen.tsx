import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';

const LANGUAGES = ['ES', 'EN', 'FR'];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [language, setLanguage] = useState('ES');

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>✨</Text>
            </View>
            <Text style={styles.title}>Mi Perfil</Text>
          </View>

          {/* Profile Section */}
          <LinearGradient colors={GRADIENTS.card} style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Información Personal</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Fecha de nacimiento</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.textMuted}
              value={birthDate}
              onChangeText={setBirthDate}
              keyboardType="numeric"
            />
          </LinearGradient>

          {/* Language Selector */}
          <LinearGradient colors={GRADIENTS.card} style={styles.section}>
            <Text style={styles.sectionTitle}>🌐 Idioma</Text>
            <View style={styles.langRow}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langBtn, language === lang && styles.langBtnActive]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>

          {/* Subscription */}
          <LinearGradient colors={GRADIENTS.card} style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Suscripción</Text>
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planName}>Plan Gratuito</Text>
                <Text style={styles.planDesc}>1 carta del día · Chat limitado</Text>
              </View>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.8} style={{ marginTop: 14 }}>
              <LinearGradient colors={GRADIENTS.primary} style={styles.premiumBtn}>
                <Text style={styles.premiumBtnText}>🚀 Actualizar a Premium</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {/* Privacy */}
          <LinearGradient colors={GRADIENTS.card} style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Privacidad y Datos</Text>
            <TouchableOpacity
              style={styles.privacyRow}
              onPress={() => Alert.alert('Exportar datos', 'Recibirás un email con tus datos en 24h.')}
            >
              <Ionicons name="download-outline" size={18} color={COLORS.accent} />
              <Text style={styles.privacyText}>Exportar mis datos</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.privacyRow}
              onPress={() =>
                Alert.alert(
                  'Eliminar cuenta',
                  '¿Estás seguro? Esta acción es irreversible.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive' },
                  ]
                )
              }
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={[styles.privacyText, { color: COLORS.error }]}>Eliminar mi cuenta</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  avatarText: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
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
    padding: 13,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700' },
  langTextActive: { color: COLORS.text },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  planDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  freeBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  freeBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: '800' },
  premiumBtn: { borderRadius: 14, padding: 14, alignItems: 'center' },
  premiumBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  privacyText: { flex: 1, fontSize: 15, color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
});
