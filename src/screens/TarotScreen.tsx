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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';

const SPREADS = [
  {
    id: 'daily',
    icon: '🌟',
    name: 'Carta del Día',
    description: 'Una carta para guiar tu jornada',
    free: true,
  },
  {
    id: 'yesno',
    icon: '⚖️',
    name: 'Sí o No',
    description: 'Respuesta directa a tu pregunta',
    free: false,
  },
  {
    id: 'ppp',
    icon: '🔮',
    name: 'Pasado · Presente · Futuro',
    description: 'El flujo del tiempo revelado',
    free: false,
  },
  {
    id: 'celtic',
    icon: '✨',
    name: 'Cruz Celta',
    description: 'Tirada completa de 10 cartas',
    free: false,
  },
];

const MOCK_CARDS = [
  { name: 'El Mago', meaning: 'Voluntad, habilidad, acción consciente' },
  { name: 'La Sacerdotisa', meaning: 'Intuición, misterio, sabiduría interior' },
  { name: 'La Emperatriz', meaning: 'Fertilidad, abundancia, naturaleza' },
  { name: 'El Ermitaño', meaning: 'Introspección, soledad, búsqueda espiritual' },
  { name: 'La Rueda de la Fortuna', meaning: 'Cambio, ciclos, destino' },
  { name: 'La Estrella', meaning: 'Esperanza, inspiración, renovación' },
  { name: 'La Luna', meaning: 'Ilusión, miedo, el subconsciente' },
  { name: 'El Sol', meaning: 'Alegría, éxito, vitalidad' },
];

export default function TarotScreen() {
  const [flipped, setFlipped] = useState(false);
  const [drawnCard, setDrawnCard] = useState(MOCK_CARDS[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const drawCard = () => {
    const card = MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)];
    setDrawnCard(card);
    setFlipped(false);
    flipAnim.setValue(0);
    setModalVisible(true);
    setTimeout(() => {
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => setFlipped(true));
    }, 300);
  };

  const cardFront = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

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
              activeOpacity={spread.free ? 0.7 : 1}
            >
              <LinearGradient
                colors={spread.free ? GRADIENTS.primary : GRADIENTS.card}
                style={styles.spreadCard}
              >
                <Text style={styles.spreadIcon}>{spread.icon}</Text>
                <View style={styles.spreadInfo}>
                  <Text style={styles.spreadName}>{spread.name}</Text>
                  <Text style={styles.spreadDesc}>{spread.description}</Text>
                </View>
                {!spread.free && (
                  <View style={styles.badge}>
                    <Ionicons name="lock-closed" size={10} color={COLORS.textMuted} />
                    <Text style={styles.badgeText}>Premium</Text>
                  </View>
                )}
                {spread.free && (
                  <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={GRADIENTS.card} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tu Carta del Día</Text>
            <Animated.View style={[styles.tarotCardContainer, { transform: [{ rotateY: cardFront }] }]}>
              {flipped ? (
                <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.tarotCardFace}>
                  <Text style={styles.tarotCardName}>{drawnCard.name}</Text>
                  <Text style={styles.tarotCardMeaning}>{drawnCard.meaning}</Text>
                </LinearGradient>
              ) : (
                <LinearGradient colors={['#1A1035', '#2D1B69']} style={styles.tarotCardBack}>
                  <Text style={styles.tarotCardBackText}>✨</Text>
                </LinearGradient>
              )}
            </Animated.View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </LinearGradient>
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spreadIcon: { fontSize: 32, marginRight: 14 },
  spreadInfo: { flex: 1 },
  spreadName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  spreadDesc: { fontSize: 13, color: COLORS.textSecondary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107,114,128,0.2)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
    letterSpacing: 1,
  },
  tarotCardContainer: { width: 180, height: 280, marginBottom: 24 },
  tarotCardFace: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  tarotCardBack: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tarotCardBackText: { fontSize: 64 },
  tarotCardName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  tarotCardMeaning: {
    fontSize: 13,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  closeBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
});
