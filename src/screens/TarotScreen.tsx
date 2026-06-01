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
    name: 'Carta del Día',
    description: 'Una carta para orientar tu jornada',
    icon: '🌟',
    free: true,
  },
  {
    id: 'yesno',
    name: 'Sí o No',
    description: 'Respuesta directa a tu pregunta',
    icon: '⚖️',
    free: false,
  },
  {
    id: 'past',
    name: 'Pasado · Presente · Futuro',
    description: 'Tres cartas para ver tu camino completo',
    icon: '🔮',
    free: false,
  },
  {
    id: 'celtic',
    name: 'Cruz Celta',
    description: 'Tirada profunda de 10 cartas',
    icon: '✨',
    free: false,
  },
];

const MOCK_CARDS = [
  { name: 'El Mago', number: 'I', meaning: 'Voluntad, habilidad, concentración. Tienes todo lo necesario para manifestar tus deseos.' },
  { name: 'La Sacerdotisa', number: 'II', meaning: 'Intuición, misterio, sabiduría interior. Escucha tu voz interior.' },
  { name: 'La Emperatriz', number: 'III', meaning: 'Abundancia, fertilidad, naturaleza. El mundo te ofrece sus dones.' },
  { name: 'El Loco', number: '0', meaning: 'Nuevos comienzos, inocencia, aventura. Un viaje transformador te espera.' },
  { name: 'La Estrella', number: 'XVII', meaning: 'Esperanza, inspiración, serenidad. La luz guía tu camino.' },
  { name: 'La Luna', number: 'XVIII', meaning: 'Ilusión, miedo, el subconsciente. Confía en lo que no ves.' },
  { name: 'El Sol', number: 'XIX', meaning: 'Alegría, éxito, vitalidad. Un período brillante se avecina.' },
];

export default function TarotScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(MOCK_CARDS[0]);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const handleDailyCard = () => {
    const card = MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)];
    setSelectedCard(card);
    setFlipped(false);
    flipAnim.setValue(0);
    setModalVisible(true);
  };

  const doFlip = () => {
    if (flipped) return;
    setFlipped(true);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['90deg', '90deg', '0deg'],
  });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5], outputRange: [1, 1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0.49, 0.5, 1], outputRange: [0, 1, 1] });

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Tiradas de Tarot</Text>
          <Text style={styles.subtitle}>Elige tu tirada</Text>

          {SPREADS.map((spread) => (
            <TouchableOpacity
              key={spread.id}
              onPress={spread.free ? handleDailyCard : undefined}
              activeOpacity={spread.free ? 0.7 : 1}
            >
              <LinearGradient
                colors={spread.free ? GRADIENTS.card : ['#0F0A1E', '#1A1035']}
                style={[styles.spreadCard, !spread.free && styles.spreadCardLocked]}
              >
                <View style={styles.spreadLeft}>
                  <Text style={styles.spreadIcon}>{spread.icon}</Text>
                </View>
                <View style={styles.spreadInfo}>
                  <Text style={[styles.spreadName, !spread.free && styles.textLocked]}>
                    {spread.name}
                  </Text>
                  <Text style={[styles.spreadDesc, !spread.free && styles.descLocked]}>
                    {spread.description}
                  </Text>
                </View>
                <View style={styles.spreadRight}>
                  {spread.free ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>GRATIS</Text>
                    </View>
                  ) : (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
                      <Text style={styles.lockBadgeText}>Premium</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1A1035', '#2D1B69']} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tu Carta del Día</Text>
            <TouchableOpacity onPress={doFlip} style={styles.cardContainer}>
              {/* Back of card */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
                ]}
              >
                <LinearGradient colors={GRADIENTS.primary} style={styles.cardInner}>
                  <Text style={styles.cardBackText}>✨</Text>
                  <Text style={styles.tapHint}>Toca para revelar</Text>
                </LinearGradient>
              </Animated.View>
              {/* Front of card */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardFront,
                  { transform: [{ rotateY: backRotate }], opacity: backOpacity },
                ]}
              >
                <LinearGradient colors={GRADIENTS.card} style={styles.cardInner}>
                  <Text style={styles.cardFaceEmoji}>🌟</Text>
                  <Text style={styles.cardFaceName}>{selectedCard.name}</Text>
                  <Text style={styles.cardFaceNumber}>{selectedCard.number}</Text>
                  <Text style={styles.cardFaceMeaning}>{selectedCard.meaning}</Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  spreadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spreadCardLocked: { opacity: 0.7 },
  spreadLeft: { marginRight: 14 },
  spreadIcon: { fontSize: 32 },
  spreadInfo: { flex: 1 },
  spreadName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  textLocked: { color: COLORS.textMuted },
  spreadDesc: { fontSize: 12, color: COLORS.textSecondary },
  descLocked: { color: COLORS.textMuted },
  spreadRight: { marginLeft: 8 },
  freeBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freeBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lockBadgeText: { fontSize: 10, color: COLORS.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  cardContainer: { width: 220, height: 300, marginBottom: 20 },
  card: { position: 'absolute', width: '100%', height: '100%' },
  cardBack: {},
  cardFront: {},
  cardInner: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardBackText: { fontSize: 64 },
  tapHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 12 },
  cardFaceEmoji: { fontSize: 48, marginBottom: 8 },
  cardFaceName: { fontSize: 20, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  cardFaceNumber: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  cardFaceMeaning: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  closeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
