import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../theme';

const SPREADS = [
  {
    id: 'daily',
    icon: '✦',
    name: 'Carta del Día',
    description: 'Una carta que guía tu jornada',
    badge: 'GRATIS',
    badgeColor: COLORS.success,
    badgeBg: 'rgba(16,185,129,0.15)',
    free: true,
  },
  {
    id: 'yesno',
    icon: '⚖',
    name: 'Sí o No',
    description: 'Respuesta directa a tu pregunta',
    badge: 'PRO',
    badgeColor: COLORS.accent,
    badgeBg: 'rgba(124,58,237,0.2)',
    free: false,
  },
  {
    id: 'ppp',
    icon: '◈',
    name: 'Pasado · Presente · Futuro',
    description: 'El hilo de tu historia',
    badge: 'PRO',
    badgeColor: COLORS.accent,
    badgeBg: 'rgba(124,58,237,0.2)',
    free: false,
  },
  {
    id: 'celtic',
    icon: '✤',
    name: 'Cruz Celta',
    description: 'Lectura profunda de 10 cartas',
    badge: 'PREMIUM',
    badgeColor: COLORS.gold,
    badgeBg: 'rgba(245,158,11,0.15)',
    free: false,
  },
];

const MOCK_CARDS = [
  { name: 'La Estrella', meaning: 'La esperanza brilla. Renovación y fe se acercan a tu vida.' },
  { name: 'El Mago', meaning: 'Tienes el poder y la voluntad para manifestar tu realidad.' },
  { name: 'La Sacerdotisa', meaning: 'Confía en tu intuición. El misterio revela sus secretos.' },
  { name: 'La Emperatriz', meaning: 'Abundancia, creatividad y conexión con la naturaleza.' },
  { name: 'El Ermitaño', meaning: 'La introspección y la soledad traen sabiduría profunda.' },
  { name: 'La Luna', meaning: 'Explora tus sombras con valentía. El subconsciente habla.' },
  { name: 'El Sol', meaning: 'Alegría, vitalidad y éxito iluminan tu camino.' },
  { name: 'La Rueda de la Fortuna', meaning: 'Los ciclos cambian. El destino está en movimiento.' },
];

export default function TarotScreen() {
  const [drawnCard, setDrawnCard] = useState(MOCK_CARDS[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const drawCard = () => {
    const card = MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)];
    setDrawnCard(card);
    fadeAnim.setValue(0);
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.title}>Tiradas de Tarot</Text>
            <Text style={styles.subtitle}>Elige tu lectura</Text>
          </View>

          {SPREADS.map((spread) => (
            <TouchableOpacity
              key={spread.id}
              onPress={spread.free ? drawCard : undefined}
              activeOpacity={spread.free ? 0.75 : 0.9}
            >
              <LinearGradient
                colors={spread.free ? GRADIENTS.primary : GRADIENTS.card}
                style={styles.spreadCard}
              >
                <View style={styles.spreadIconWrap}>
                  <Text style={styles.spreadIcon}>{spread.icon}</Text>
                </View>
                <View style={styles.spreadInfo}>
                  <Text style={styles.spreadName}>{spread.name}</Text>
                  <Text style={styles.spreadDesc}>{spread.description}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: spread.badgeBg, borderColor: spread.badgeColor + '60' }]}>
                  <Text style={[styles.badgeText, { color: spread.badgeColor }]}>{spread.badge}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <LinearGradient colors={GRADIENTS.card} style={styles.modalCard}>
              <Text style={styles.modalTitle}>✦ Tu Carta del Día ✦</Text>
              <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.cardFace}>
                <Text style={styles.cardFaceSymbol}>✦</Text>
                <Text style={styles.cardFaceName}>{drawnCard.name}</Text>
                <View style={styles.cardDivider} />
                <Text style={styles.cardFaceMeaning}>{drawnCard.meaning}</Text>
              </LinearGradient>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cerrar lectura</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 28, marginTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  spreadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spreadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  spreadIcon: { fontSize: 22, color: COLORS.accent },
  spreadInfo: { flex: 1 },
  spreadName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  spreadDesc: { fontSize: 13, color: COLORS.textSecondary },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 24,
    letterSpacing: 2,
  },
  cardFace: {
    width: 200,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  cardFaceSymbol: { fontSize: 48, color: COLORS.accent, marginBottom: 12 },
  cardFaceName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  cardDivider: {
    width: 60,
    height: 1,
    backgroundColor: COLORS.accent,
    marginBottom: 14,
    opacity: 0.5,
  },
  cardFaceMeaning: {
    fontSize: 13,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  closeBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
