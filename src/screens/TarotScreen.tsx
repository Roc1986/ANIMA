import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
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
    type: 'daily',
  },
  {
    title: 'Sí o No',
    description: 'Respuesta directa a tu pregunta',
    badge: 'DEMO',
    badgeColor: '#7C3AED',
    icon: '⚖️',
    type: 'yesno',
  },
  {
    title: 'Pasado · Presente · Futuro',
    description: 'Comprende tu camino en el tiempo',
    badge: 'DEMO',
    badgeColor: '#7C3AED',
    icon: '🔮',
    type: 'past-present-future',
  },
  {
    title: 'Cruz Celta',
    description: 'Lectura completa de 10 cartas',
    badge: 'DEMO',
    badgeColor: '#F59E0B',
    icon: '✨',
    type: 'celtic',
  },
];

const cardPool = [
  {
    name: 'El Loco',
    keywords: 'Nuevos comienzos, aventura, espontaneidad',
    reading:
      'El Loco te invita a dar el salto de fe que has estado posponiendo. La energía de este arcano habla de libertad y potencial ilimitado. Es hora de confiar en el universo y aventurarte hacia lo desconocido con el corazón abierto.',
  },
  {
    name: 'La Emperatriz',
    keywords: 'Abundancia, fertilidad, creatividad',
    reading:
      'La Emperatriz trae consigo una energía de abundancia y florecimiento. Este arcano te habla de creatividad desbordante y conexión con tu naturaleza más fértil. Es un momento propicio para nutrir tus proyectos y relaciones más importantes.',
  },
  {
    name: 'La Torre',
    keywords: 'Cambio repentino, revelación, liberación',
    reading:
      'La Torre anuncia una transformación necesaria aunque pueda sentirse disruptiva. Lo que se derrumba ya no servía a tu crecimiento. Desde los cimientos renovados construirás algo mucho más auténtico y poderoso.',
  },
  {
    name: 'La Estrella',
    keywords: 'Esperanza, renovación, inspiración',
    reading:
      'La Estrella ilumina tu camino con esperanza y renovación profunda. Después de períodos oscuros, este arcano trae el recordatorio de que eres guiado y protegido. Confía en el proceso y deja que la luz interior te oriente.',
  },
  {
    name: 'El Sol',
    keywords: 'Éxito, alegría, vitalidad',
    reading:
      'El Sol irradia éxito, claridad y vitalidad sobre tu situación. Es uno de los arcanos más positivos del mazo, prometiendo alegría genuina y logros merecidos. Tu autenticidad es tu mayor fortaleza en este momento.',
  },
  {
    name: 'La Luna',
    keywords: 'Intuición, sueños, lo oculto',
    reading:
      'La Luna te invita a explorar las profundidades de tu mundo interior. Las ilusiones pueden estar nublando tu percepción, pero tu intuición sabe la verdad. Escucha esa voz suave que habla desde lo más profundo de tu ser.',
  },
  {
    name: 'El Mundo',
    keywords: 'Completitud, logro, integración',
    reading:
      'El Mundo celebra un ciclo completado con plenitud y gratitud. Has integrado lecciones importantes y mereces reconocer el camino recorrido. Un nuevo ciclo de posibilidades infinitas se abre ante ti.',
  },
  {
    name: 'Los Enamorados',
    keywords: 'Amor, elección, alineación',
    reading:
      'Los Enamorados hablan de una elección importante que se alinea con tus valores más profundos. Puede referirse a relaciones amorosas o a cualquier decisión que requiera escuchar el corazón. La autenticidad es la brújula correcta.',
  },
];

function pickCards(count: number) {
  const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface ReadingResult {
  type: string;
  title: string;
  cards?: Array<{ name: string; position: string; reading: string }>;
  yesNo?: 'SÍ' | 'NO';
  yesNoExplanation?: string;
  dailyCard?: { name: string; keywords: string; reading: string };
}

function buildReading(spread: typeof spreads[0]): ReadingResult {
  if (spread.type === 'daily') {
    const card = pickCards(1)[0];
    return {
      type: 'daily',
      title: spread.title,
      dailyCard: card,
    };
  }

  if (spread.type === 'yesno') {
    const answer: 'SÍ' | 'NO' = Math.random() > 0.5 ? 'SÍ' : 'NO';
    const card = pickCards(1)[0];
    return {
      type: 'yesno',
      title: spread.title,
      yesNo: answer,
      yesNoExplanation: card.reading,
    };
  }

  if (spread.type === 'past-present-future') {
    const [past, present, future] = pickCards(3);
    return {
      type: 'past-present-future',
      title: spread.title,
      cards: [
        { name: past.name, position: 'Pasado', reading: past.reading },
        { name: present.name, position: 'Presente', reading: present.reading },
        { name: future.name, position: 'Futuro', reading: future.reading },
      ],
    };
  }

  // celtic cross — simplified 5-card version for demo
  const drawn = pickCards(5);
  const positions = ['Situación central', 'Cruce / Desafío', 'Base', 'Pasado reciente', 'Resultado potencial'];
  return {
    type: 'celtic',
    title: spread.title,
    cards: drawn.map((c, i) => ({ name: c.name, position: positions[i], reading: c.reading })),
  };
}

export default function TarotScreen() {
  const [reading, setReading] = useState<ReadingResult | null>(null);

  const handleSpreadPress = (spread: typeof spreads[0]) => {
    setReading(buildReading(spread));
  };

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
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleSpreadPress(spread)}
            >
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

        {/* Reading Modal */}
        <Modal
          visible={reading !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setReading(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{reading?.title}</Text>

                {reading?.type === 'daily' && reading.dailyCard && (
                  <View style={styles.modalSection}>
                    <Text style={styles.cardNameLarge}>{reading.dailyCard.name}</Text>
                    <Text style={styles.keywordsText}>{reading.dailyCard.keywords}</Text>
                    <Text style={styles.readingParagraph}>{reading.dailyCard.reading}</Text>
                  </View>
                )}

                {reading?.type === 'yesno' && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.yesNoAnswer, reading.yesNo === 'SÍ' ? styles.yesColor : styles.noColor]}>
                      {reading.yesNo}
                    </Text>
                    <Text style={styles.readingParagraph}>{reading.yesNoExplanation}</Text>
                  </View>
                )}

                {(reading?.type === 'past-present-future' || reading?.type === 'celtic') &&
                  reading.cards?.map((c, i) => (
                    <View key={i} style={styles.cardReadingBlock}>
                      <Text style={styles.positionLabel}>{c.position}</Text>
                      <Text style={styles.cardNameMedium}>{c.name}</Text>
                      <Text style={styles.readingParagraph}>{c.reading}</Text>
                    </View>
                  ))}
              </ScrollView>

              <TouchableOpacity style={styles.closeButton} onPress={() => setReading(null)}>
                <Text style={styles.closeButtonText}>Cerrar lectura</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
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
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { fontSize: 32, marginRight: 16 },
  cardContent: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, color: '#F5F3FF', fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  cardDescription: { fontSize: 13, color: '#A78BFA' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1A1035',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: '#7C3AED',
  },
  modalTitle: {
    fontSize: 22,
    color: '#F59E0B',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  modalSection: { alignItems: 'center', marginBottom: 16 },
  cardNameLarge: {
    fontSize: 28,
    color: '#F5F3FF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  keywordsText: {
    fontSize: 13,
    color: '#C4B5FD',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 14,
  },
  readingParagraph: {
    fontSize: 15,
    color: '#A78BFA',
    lineHeight: 24,
    textAlign: 'left',
  },
  yesNoAnswer: {
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  yesColor: { color: '#10B981' },
  noColor: { color: '#EF4444' },
  cardReadingBlock: {
    backgroundColor: '#0F0A1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  positionLabel: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardNameMedium: {
    fontSize: 18,
    color: '#F5F3FF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
