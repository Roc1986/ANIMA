import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { TAROT_CARDS, TarotCard, shuffleCards } from '../constants/cards';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.6;

const SPREADS = [
  { id: 'one', label: '1 Carta', count: 1, description: 'Respuesta directa del universo' },
  { id: 'three', label: '3 Cartas', count: 3, description: 'Pasado · Presente · Futuro' },
  { id: 'cross', label: 'Cruz Celta', count: 5, description: 'Situación · Desafío · Base · Potencial · Resultado' },
  { id: 'horseshoe', label: 'Herradura', count: 7, description: 'Visión completa de tu camino' },
];

const CARD_IMAGES: Record<string, any> = {
  'el-loco': require('../../assets/cards/el-loco.png'),
  'el-mago': require('../../assets/cards/el-mago.png'),
  'la-sacerdotisa': require('../../assets/cards/la-sacerdotisa.png'),
  'la-emperatriz': require('../../assets/cards/la-emperatriz.png'),
  'el-emperador': require('../../assets/cards/el-emperador.png'),
  'el-hierofante': require('../../assets/cards/el-hierofante.png'),
  'los-enamorados': require('../../assets/cards/los-enamorados.png'),
  'el-carro': require('../../assets/cards/el-carro.png'),
  'la-fuerza': require('../../assets/cards/la-fuerza.png'),
  'el-ermitano': require('../../assets/cards/el-ermitano.png'),
  'la-rueda': require('../../assets/cards/la-rueda.png'),
  'la-justicia': require('../../assets/cards/la-justicia.png'),
  'el-colgado': require('../../assets/cards/el-colgado.png'),
  'la-muerte': require('../../assets/cards/la-muerte.png'),
  'la-templanza': require('../../assets/cards/la-templanza.png'),
  'el-diablo': require('../../assets/cards/el-diablo.png'),
  'la-torre': require('../../assets/cards/la-torre.png'),
  'la-estrella': require('../../assets/cards/la-estrella.png'),
  'la-luna': require('../../assets/cards/la-luna.png'),
  'el-sol': require('../../assets/cards/el-sol.png'),
  'el-juicio': require('../../assets/cards/el-juicio.png'),
  'el-mundo': require('../../assets/cards/el-mundo.png'),
  'as-de-bastos': require('../../assets/cards/as-de-bastos.png'),
  'dos-de-bastos': require('../../assets/cards/dos-de-bastos.png'),
  'tres-de-bastos': require('../../assets/cards/tres-de-bastos.png'),
  'cuatro-de-bastos': require('../../assets/cards/cuatro-de-bastos.png'),
  'cinco-de-bastos': require('../../assets/cards/cinco-de-bastos.png'),
  'seis-de-bastos': require('../../assets/cards/seis-de-bastos.png'),
  'siete-de-bastos': require('../../assets/cards/siete-de-bastos.png'),
  'ocho-de-bastos': require('../../assets/cards/ocho-de-bastos.png'),
  'nueve-de-bastos': require('../../assets/cards/nueve-de-bastos.png'),
  'diez-de-bastos': require('../../assets/cards/diez-de-bastos.png'),
  'sota-de-bastos': require('../../assets/cards/sota-de-bastos.png'),
  'caballero-de-bastos': require('../../assets/cards/caballero-de-bastos.png'),
  'reina-de-bastos': require('../../assets/cards/reina-de-bastos.png'),
  'rey-de-bastos': require('../../assets/cards/rey-de-bastos.png'),
  'as-de-copas': require('../../assets/cards/as-de-copas.png'),
  'dos-de-copas': require('../../assets/cards/dos-de-copas.png'),
  'tres-de-copas': require('../../assets/cards/tres-de-copas.png'),
  'cuatro-de-copas': require('../../assets/cards/cuatro-de-copas.png'),
  'cinco-de-copas': require('../../assets/cards/cinco-de-copas.png'),
  'seis-de-copas': require('../../assets/cards/seis-de-copas.png'),
  'siete-de-copas': require('../../assets/cards/siete-de-copas.png'),
  'ocho-de-copas': require('../../assets/cards/ocho-de-copas.png'),
  'nueve-de-copas': require('../../assets/cards/nueve-de-copas.png'),
  'diez-de-copas': require('../../assets/cards/diez-de-copas.png'),
  'sota-de-copas': require('../../assets/cards/sota-de-copas.png'),
  'caballero-de-copas': require('../../assets/cards/caballero-de-copas.png'),
  'reina-de-copas': require('../../assets/cards/reina-de-copas.png'),
  'rey-de-copas': require('../../assets/cards/rey-de-copas.png'),
  'as-de-espadas': require('../../assets/cards/as-de-espadas.png'),
  'dos-de-espadas': require('../../assets/cards/dos-de-espadas.png'),
  'tres-de-espadas': require('../../assets/cards/tres-de-espadas.png'),
  'cuatro-de-espadas': require('../../assets/cards/cuatro-de-espadas.png'),
  'cinco-de-espadas': require('../../assets/cards/cinco-de-espadas.png'),
  'seis-de-espadas': require('../../assets/cards/seis-de-espadas.png'),
  'siete-de-espadas': require('../../assets/cards/siete-de-espadas.png'),
  'ocho-de-espadas': require('../../assets/cards/ocho-de-espadas.png'),
  'nueve-de-espadas': require('../../assets/cards/nueve-de-espadas.png'),
  'diez-de-espadas': require('../../assets/cards/diez-de-espadas.png'),
  'sota-de-espadas': require('../../assets/cards/sota-de-espadas.png'),
  'caballero-de-espadas': require('../../assets/cards/caballero-de-espadas.png'),
  'reina-de-espadas': require('../../assets/cards/reina-de-espadas.png'),
  'rey-de-espadas': require('../../assets/cards/rey-de-espadas.png'),
  'as-de-oros': require('../../assets/cards/as-de-oros.png'),
  'dos-de-oros': require('../../assets/cards/dos-de-oros.png'),
  'tres-de-oros': require('../../assets/cards/tres-de-oros.png'),
  'cuatro-de-oros': require('../../assets/cards/cuatro-de-oros.png'),
  'cinco-de-oros': require('../../assets/cards/cinco-de-oros.png'),
  'seis-de-oros': require('../../assets/cards/seis-de-oros.png'),
  'siete-de-oros': require('../../assets/cards/siete-de-oros.png'),
  'ocho-de-oros': require('../../assets/cards/ocho-de-oros.png'),
  'nueve-de-oros': require('../../assets/cards/nueve-de-oros.png'),
  'diez-de-oros': require('../../assets/cards/diez-de-oros.png'),
  'sota-de-oros': require('../../assets/cards/sota-de-oros.png'),
  'caballero-de-oros': require('../../assets/cards/caballero-de-oros.png'),
  'reina-de-oros': require('../../assets/cards/reina-de-oros.png'),
  'rey-de-oros': require('../../assets/cards/rey-de-oros.png'),
};

interface FlipCardProps {
  card: TarotCard;
  index: number;
  isFlipped: boolean;
  onFlip: (index: number, card: TarotCard) => void;
  positionLabel?: string;
}

function FlipCard({ card, index, isFlipped, onFlip, positionLabel }: FlipCardProps) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showFront, setShowFront] = useState(false);

  const handleFlip = () => {
    if (isFlipped) return;
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setShowFront(true);
      onFlip(index, card);
    });
  };

  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  const img = CARD_IMAGES[card.fileName];

  return (
    <View style={styles.flipContainer}>
      {positionLabel ? <Text style={styles.posLabel}>{positionLabel}</Text> : null}
      <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} disabled={isFlipped}>
        {showFront ? (
          <Animated.View style={[styles.cardFace, { transform: [{ rotateY: frontRotate }] }]}>
            {img ? (
              <Image source={img} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImage, styles.cardImageFallback]}>
                <Text style={styles.cardFallbackText}>{card.name}</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.cardFace, { transform: [{ rotateY: backRotate }] }]}>
            <LinearGradient colors={['#2D1B69', '#1A1035', '#0F0A1E']} style={styles.cardBack}>
              <Text style={styles.cardBackSymbol}>✦</Text>
              <Text style={styles.cardBackText}>ANIMA</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </TouchableOpacity>
      {isFlipped
        ? <Text style={styles.cardName} numberOfLines={2}>{card.name}</Text>
        : <Text style={styles.cardHint}>Toca para revelar</Text>
      }
    </View>
  );
}

export default function TarotScreen() {
  const [selectedSpread, setSelectedSpread] = useState<typeof SPREADS[0] | null>(null);
  const [drawnCards, setDrawnCards] = useState<TarotCard[]>([]);
  const [flippedIndexes, setFlippedIndexes] = useState<Set<number>>(new Set());
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const POSITION_LABELS: Record<string, string[]> = {
    three: ['Pasado', 'Presente', 'Futuro'],
    cross: ['Situación', 'Desafío', 'Base', 'Potencial', 'Resultado'],
    horseshoe: ['Pasado', 'Presente', 'Futuro cercano', 'Consejo', 'Influencias', 'Esperanzas', 'Resultado'],
  };

  const startSpread = (spread: typeof SPREADS[0]) => {
    setIsShuffling(true);
    setFlippedIndexes(new Set());
    setSelectedCard(null);
    setTimeout(() => {
      setSelectedSpread(spread);
      setDrawnCards(shuffleCards(spread.count));
      setIsShuffling(false);
    }, 800);
  };

  const handleFlip = (index: number, card: TarotCard) => {
    setFlippedIndexes(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setSelectedCard(card);
  };

  const speakReading = (card: TarotCard) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    const text = `${card.name}. Palabras clave: ${card.keywords.join(', ')}. ${card.reading}`;
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'es-ES',
      pitch: 0.95,
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const closeModal = () => {
    Speech.stop();
    setIsSpeaking(false);
    setSelectedCard(null);
  };

  const reset = () => {
    Speech.stop();
    setIsSpeaking(false);
    setSelectedSpread(null);
    setDrawnCards([]);
    setFlippedIndexes(new Set());
    setSelectedCard(null);
  };

  const labels = selectedSpread ? POSITION_LABELS[selectedSpread.id] || [] : [];

  return (
    <LinearGradient colors={['#0F0A1E', '#1A1035', '#2D1B69']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>🔮 Tarot</Text>
          <Text style={styles.subtitle}>Deja que las cartas hablen</Text>

          {!selectedSpread ? (
            <>
              <Text style={styles.sectionLabel}>Elige tu tirada</Text>
              {SPREADS.map(spread => (
                <TouchableOpacity
                  key={spread.id}
                  style={styles.spreadCard}
                  onPress={() => startSpread(spread)}
                  activeOpacity={0.8}
                >
                  <View style={styles.spreadRow}>
                    <View style={styles.spreadBadge}>
                      <Text style={styles.spreadBadgeText}>{spread.count}</Text>
                    </View>
                    <View style={styles.spreadInfo}>
                      <Text style={styles.spreadLabel}>{spread.label}</Text>
                      <Text style={styles.spreadDesc}>{spread.description}</Text>
                    </View>
                    <Text style={styles.spreadArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={styles.sectionLabel}>Galería de cartas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TAROT_CARDS.map(card => {
                  const img = CARD_IMAGES[card.fileName];
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={styles.miniCardWrap}
                      onPress={() => setSelectedCard(card)}
                    >
                      {img ? (
                        <Image source={img} style={styles.miniCard} resizeMode="cover" />
                      ) : (
                        <View style={[styles.miniCard, styles.cardImageFallback]}>
                          <Text style={{ color: '#C4B5FD', fontSize: 8, textAlign: 'center' }}>{card.name}</Text>
                        </View>
                      )}
                      <Text style={styles.miniCardName} numberOfLines={2}>{card.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.spreadHeader}>
                <Text style={styles.activeSpreadTitle}>{selectedSpread.label}</Text>
                <TouchableOpacity onPress={reset} style={styles.resetBtn}>
                  <Text style={styles.resetBtnText}>↩ Nueva tirada</Text>
                </TouchableOpacity>
              </View>

              {isShuffling ? (
                <View style={styles.shufflingWrap}>
                  <Text style={styles.shufflingText}>🔀 Barajando las cartas...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.instructionText}>
                    {flippedIndexes.size === 0
                      ? 'Concéntrate en tu pregunta y toca una carta'
                      : flippedIndexes.size < drawnCards.length
                      ? `${drawnCards.length - flippedIndexes.size} carta${drawnCards.length - flippedIndexes.size > 1 ? 's' : ''} por revelar`
                      : '✨ Todas las cartas reveladas — toca cualquiera para leer'}
                  </Text>

                  <View style={styles.cardsGrid}>
                    {drawnCards.map((card, i) => (
                      <FlipCard
                        key={card.id + i}
                        card={card}
                        index={i}
                        isFlipped={flippedIndexes.has(i)}
                        onFlip={handleFlip}
                        positionLabel={labels[i]}
                      />
                    ))}
                  </View>

                  {flippedIndexes.size === drawnCards.length && drawnCards.length > 1 && (
                    <View style={styles.revealedList}>
                      <Text style={styles.revealedTitle}>Tus cartas</Text>
                      {drawnCards.map((card, i) => (
                        <TouchableOpacity
                          key={card.id}
                          style={styles.revealedItem}
                          onPress={() => setSelectedCard(card)}
                        >
                          <Text style={styles.revealedPos}>{labels[i] || `Carta ${i + 1}`}</Text>
                          <Text style={styles.revealedName}>{card.name}</Text>
                          <Text style={styles.revealedArrow}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={!!selectedCard} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCard && (() => {
                const img = CARD_IMAGES[selectedCard.fileName];
                return (
                  <>
                    <View style={styles.modalImageWrap}>
                      {img ? (
                        <Image source={img} style={styles.modalCardImage} resizeMode="contain" />
                      ) : (
                        <View style={[styles.modalCardImage, styles.cardImageFallback]}>
                          <Text style={styles.cardFallbackText}>{selectedCard.name}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.modalCardName}>{selectedCard.name}</Text>
                    <Text style={styles.modalArcana}>
                      {selectedCard.arcana === 'mayor' ? '✦ Arcano Mayor' : `✦ Arcano Menor · ${selectedCard.suit}`}
                    </Text>

                    <View style={styles.keywordsRow}>
                      {selectedCard.keywords.map(kw => (
                        <View key={kw} style={styles.keyword}>
                          <Text style={styles.keywordText}>{kw}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.modalReading}>{selectedCard.reading}</Text>

                    <TouchableOpacity
                      style={[styles.speakBtn, isSpeaking && styles.speakBtnActive]}
                      onPress={() => speakReading(selectedCard)}
                    >
                      <Text style={styles.speakBtnText}>
                        {isSpeaking ? '⏹ Detener audio' : '🔊 Escuchar lectura'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                      <Text style={styles.closeBtnText}>Cerrar</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#C4B5FD', textAlign: 'center', marginBottom: 24, letterSpacing: 1 },
  sectionLabel: { fontSize: 16, color: '#C4B5FD', fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },

  spreadCard: {
    backgroundColor: '#1A1035', borderWidth: 1, borderColor: '#2D1B69',
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  spreadRow: { flexDirection: 'row', alignItems: 'center' },
  spreadBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  spreadBadgeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  spreadInfo: { flex: 1 },
  spreadLabel: { color: '#F5F3FF', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  spreadDesc: { color: '#8B7DB8', fontSize: 12 },
  spreadArrow: { color: '#7C3AED', fontSize: 24 },

  miniCardWrap: { width: 70, marginRight: 10, alignItems: 'center', marginBottom: 16 },
  miniCard: { width: 60, height: 96, borderRadius: 6, backgroundColor: '#2D1B69' },
  miniCardName: { color: '#C4B5FD', fontSize: 9, textAlign: 'center', marginTop: 4 },

  spreadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  activeSpreadTitle: { fontSize: 20, color: '#F5F3FF', fontWeight: 'bold' },
  resetBtn: { backgroundColor: '#2D1B69', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  resetBtnText: { color: '#C4B5FD', fontSize: 13 },
  shufflingWrap: { alignItems: 'center', paddingVertical: 60 },
  shufflingText: { color: '#C4B5FD', fontSize: 18 },
  instructionText: { color: '#8B7DB8', fontSize: 13, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },

  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  flipContainer: { width: CARD_WIDTH, alignItems: 'center', marginBottom: 8 },
  posLabel: { color: '#F59E0B', fontSize: 10, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  cardFace: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 10, overflow: 'hidden' },
  cardBack: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#7C3AED' },
  cardBackSymbol: { fontSize: 32, color: '#C4B5FD', marginBottom: 4 },
  cardBackText: { color: '#7C3AED', fontSize: 10, letterSpacing: 3 },
  cardImage: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 10 },
  cardImageFallback: { backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center' },
  cardFallbackText: { color: '#C4B5FD', fontSize: 11, textAlign: 'center', padding: 6 },
  cardName: { color: '#C4B5FD', fontSize: 10, textAlign: 'center', marginTop: 6, fontWeight: 'bold' },
  cardHint: { color: '#4A3F6B', fontSize: 9, textAlign: 'center', marginTop: 4 },

  revealedList: { marginTop: 24 },
  revealedTitle: { color: '#F59E0B', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  revealedItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1035',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2D1B69',
  },
  revealedPos: { color: '#8B7DB8', fontSize: 12, width: 90 },
  revealedName: { color: '#F5F3FF', fontSize: 14, fontWeight: 'bold', flex: 1 },
  revealedArrow: { color: '#7C3AED', fontSize: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#1A1035', borderRadius: 20, padding: 24, width: '100%', maxHeight: '90%', borderWidth: 1, borderColor: '#2D1B69' },
  modalImageWrap: { alignItems: 'center', marginBottom: 16 },
  modalCardImage: { width: 140, height: 224, borderRadius: 12 },
  modalCardName: { fontSize: 22, color: '#F5F3FF', fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  modalArcana: { color: '#F59E0B', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  keywordsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16 },
  keyword: { backgroundColor: '#2D1B69', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  keywordText: { color: '#C4B5FD', fontSize: 12 },
  modalReading: { color: '#A78BFA', fontSize: 15, lineHeight: 24, marginBottom: 20, textAlign: 'center' },
  speakBtn: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  speakBtnActive: { backgroundColor: '#DC2626' },
  speakBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { borderWidth: 1, borderColor: '#2D1B69', borderRadius: 12, padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#8B7DB8', fontSize: 14 },
});
