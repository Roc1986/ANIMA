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

interface ZodiacInfo {
  sign: string;
  symbol: string;
  element: string;
  modality: string;
  description: string;
  transits: string;
}

const zodiacData: Record<string, ZodiacInfo> = {
  Aries: {
    sign: 'Aries',
    symbol: '♈',
    element: 'Fuego',
    modality: 'Cardinal',
    description:
      'Aries es el pionero del zodiaco, dotado de una energía desbordante y un espíritu competitivo que inspira a quienes le rodean. Su valentía innata le lleva a asumir desafíos que otros evitan, con una determinación que rara vez flaquea. Impulsivo y apasionado, vive el presente con intensidad y raramente guarda rencores. Su mayor don es la capacidad de comenzar proyectos con entusiasmo arrollador.',
    transits:
      'Marte, tu planeta regente, activa sectores de ambición profesional este mes. Es un período ideal para tomar la iniciativa en proyectos que llevan tiempo postergados. Venus trae armonía a tus relaciones más cercanas, suavizando tu ímpetu natural.',
  },
  Tauro: {
    sign: 'Tauro',
    symbol: '♉',
    element: 'Tierra',
    modality: 'Fijo',
    description:
      'Tauro posee una solidez interior que sirve de ancla para todos a su alrededor, combinando sensualidad y practicidad en proporciones perfectas. Su amor por la belleza, el confort y las cosas duraderas le convierte en un creador nato de ambientes armoniosos. Paciente y perseverante, una vez fija una meta no se detiene hasta alcanzarla. Su lealtad en las relaciones es legendaria, aunque puede caer en la terquedad cuando siente amenazada su seguridad.',
    transits:
      'Venus, tu regente, transita por un sector de abundancia material, favoreciendo ingresos inesperados y reconocimiento profesional. Júpiter amplifica tus talentos creativos durante las próximas semanas. Es un momento propicio para invertir en tu bienestar y en proyectos de largo plazo.',
  },
  Géminis: {
    sign: 'Géminis',
    symbol: '♊',
    element: 'Aire',
    modality: 'Mutable',
    description:
      'Géminis encarna la dualidad del pensamiento humano, navegando con agilidad entre ideas, personas y mundos diferentes. Su mente curiosa y veloz procesa información de múltiples fuentes simultáneamente, convirtiéndole en un comunicador brillante y versátil. Adaptable por naturaleza, encuentra oportunidades donde otros ven obstáculos. Su talón de Aquiles es la dispersión, pues la abundancia de intereses puede dificultar la profundización.',
    transits:
      'Mercurio, tu planeta rector, favorece la comunicación y los contratos este ciclo. Es un período excepcionalmente bueno para negociaciones, estudios y viajes cortos. La luna llena ilumina tu sector de relaciones, trayendo claridad sobre vínculos que requieren atención.',
  },
  Cáncer: {
    sign: 'Cáncer',
    symbol: '♋',
    element: 'Agua',
    modality: 'Cardinal',
    description:
      'Cáncer es el guardián del alma del zodiaco, con una capacidad empática que le permite sentir las emociones ajenas como propias. Su intuición es casi sobrenatural, captando corrientes emocionales invisibles para otros signos. Profundamente apegado a sus raíces y familia, crea hogares que son santuarios de amor y protección. Bajo su caparazón protector late un corazón de una ternura extraordinaria.',
    transits:
      'La Luna, tu regente, cicla hacia un sector de transformación personal, invitándote a soltar patrones emocionales obsoletos. Plutón trabaja en las profundidades de tu psique, facilitando una renovación poderosa. Es un momento ideal para la introspección y el trabajo terapéutico.',
  },
  Leo: {
    sign: 'Leo',
    symbol: '♌',
    element: 'Fuego',
    modality: 'Fijo',
    description:
      'Leo irradia una presencia magnética que ilumina cualquier espacio que habita, con una generosidad de espíritu que contagia alegría y entusiasmo. Su creatividad es exuberante y su necesidad de expresión auténtica es fundamental para su bienestar. Líder nato, inspira a otros con su confianza y visión. Su lealtad hacia quienes ama es absoluta, y espera la misma devoción a cambio.',
    transits:
      'El Sol, tu regente, enfatiza tu sector de carrera y reputación pública, haciéndote visible y reconocido en tu entorno profesional. Es el momento de brillar y mostrar tus talentos. Júpiter en trígono amplifica tus posibilidades de éxito en proyectos creativos y de liderazgo.',
  },
  Virgo: {
    sign: 'Virgo',
    symbol: '♍',
    element: 'Tierra',
    modality: 'Mutable',
    description:
      'Virgo posee una mente analítica de extraordinaria precisión, capaz de detectar patrones y soluciones que escapan a ojos menos atentos. Su dedicación al servicio y la mejora continua le convierte en un colaborador invaluable en cualquier proyecto. Meticuloso y disciplinado, eleva la calidad de todo lo que toca. Su camino espiritual implica aprender a extenderse a sí mismo la misma compasión que ofrece tan generosamente a otros.',
    transits:
      'Mercurio, tu regente, activa tu sector de salud y rutinas, ideal para implementar nuevos hábitos de bienestar. Quirón transita en aspecto favorable, facilitando la sanación de viejas heridas relacionadas con la autocrítica. Es tiempo de cultivar la gentileza contigo mismo.',
  },
  Libra: {
    sign: 'Libra',
    symbol: '♎',
    element: 'Aire',
    modality: 'Cardinal',
    description:
      'Libra encarna el ideal de la armonía y la justicia, con una capacidad innata para ver todos los ángulos de una situación y buscar el equilibrio perfecto. Su encanto natural y diplomacia le permiten navegar conflictos con elegancia, encontrando soluciones que satisfacen a todas las partes. Profundamente estético, necesita belleza y orden en su entorno para florecer. Su desafío es aprender a tomar decisiones sin perder de vista sus propias necesidades.',
    transits:
      'Venus, tu planeta regente, transita por tu casa de asociaciones, iluminando relaciones importantes tanto personales como profesionales. Es un período excelente para formalizar compromisos y colaboraciones. Saturno te invita a establecer límites saludables en tus vínculos más cercanos.',
  },
  Escorpio: {
    sign: 'Escorpio',
    symbol: '♏',
    element: 'Agua',
    modality: 'Fijo',
    description:
      'Escorpio es el alquimista del zodiaco, con una capacidad única para transformar las experiencias más intensas en sabiduría profunda. Su percepción penetra más allá de las superficies, captando verdades que otros prefieren ignorar. Apasionado y magnético, crea vínculos de una intensidad y profundidad inigualables. Su viaje es la continua muerte y renacimiento, soltando lo que ya no sirve para emerger renovado.',
    transits:
      'Plutón, tu co-regente, intensifica procesos de transformación en tu sector financiero y de recursos compartidos. Es un período de regeneración poderosa, aunque el camino pueda parecer turbulento. Marte te da la energía para atravesar cambios profundos con valentía y determinación.',
  },
  Sagitario: {
    sign: 'Sagitario',
    symbol: '♐',
    element: 'Fuego',
    modality: 'Mutable',
    description:
      'Sagitario es el eterno explorador del zodiaco, animado por una búsqueda incansable de verdad, significado y horizontes más amplios. Su optimismo irredimible y su filosofía expansiva le permiten encontrar aventura y aprendizaje en cada experiencia. Generoso y honesto hasta la franqueza, inspira a otros a pensar en grande y a creer en sus sueños. Su libertad es sagrada y cualquier intento de limitarla despierta su resistencia más vehemente.',
    transits:
      'Júpiter, tu regente, transita por un sector de expansión espiritual y aprendizaje superior, abriendo puertas hacia estudios, viajes y experiencias que ensanchan tu visión del mundo. Es un momento excepcional para la educación y el crecimiento filosófico. El universo te llama a expandir tus horizontes.',
  },
  Capricornio: {
    sign: 'Capricornio',
    symbol: '♑',
    element: 'Tierra',
    modality: 'Cardinal',
    description:
      'Capricornio es el arquitecto del zodiaco, dotado de una disciplina y perseverancia que construyen imperios desde la nada. Su visión a largo plazo y su sentido de la responsabilidad le hacen un líder respetado y un compañero confiable. Detrás de su aparente seriedad late un humor seco y una lealtad inquebrantable hacia quienes ganan su confianza. Su aprendizaje vital es descubrir que el éxito verdadero incluye el corazón junto con los logros.',
    transits:
      'Saturno, tu regente, consolida estructuras en tu vida personal y profesional, recompensando el esfuerzo sostenido con reconocimiento y estabilidad. Es un período de cosecha para quienes han trabajado con constancia. Plutón continúa su transformación de tus valores más fundamentales.',
  },
  Acuario: {
    sign: 'Acuario',
    symbol: '♒',
    element: 'Aire',
    modality: 'Fijo',
    description:
      'Acuario es el visionario del zodiaco, cuya mente opera décadas por delante de su tiempo, percibiendo posibilidades que el colectivo aún no puede imaginar. Su profundo humanitarismo le impulsa a trabajar por causas que trascienden el interés personal. Independiente y original, desafía convenciones con una tranquilidad que desconcierta. Su paradoja es necesitar profundamente a la humanidad mientras mantiene una distancia emocional que protege su libertad interior.',
    transits:
      'Urano, tu regente, sacude sectores de rutina y salud, invitándote a innovar en tus hábitos diarios con enfoques disruptivos. Los cambios inesperados que surgen ahora son catalizadores de evolución, no obstáculos. Saturno estructura tu energía creativa para que tus ideas visionarias encuentren forma concreta.',
  },
  Piscis: {
    sign: 'Piscis',
    symbol: '♓',
    element: 'Agua',
    modality: 'Mutable',
    description:
      'Piscis es el místico del zodiaco, con una conexión directa con los reinos invisibles del espíritu, la imaginación y la compasión universal. Su sensibilidad extraordinaria le permite captar el sufrimiento ajeno y responder con una empatía que sana. Artista nato, traduce lo inefable en formas de belleza que tocan el alma. Su desafío es mantener sus límites mientras permanece abierto al mundo, sin perderse en el océano de las emociones ajenas.',
    transits:
      'Neptuno, tu regente, profundiza tu intuición y creatividad en este ciclo, haciendo del arte, la meditación y la espiritualidad fuentes de gran nutrir. Júpiter trae expansión a tu sector de identidad, animándote a mostrar al mundo tus dones más auténticos con mayor confianza.',
  },
};

function getZodiacSign(day: number, month: number): string {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Tauro';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Géminis';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cáncer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitario';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricornio';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Acuario';
  return 'Piscis';
}

const formatDate = (text: string) => {
  const clean = text.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return clean.slice(0, 2) + '/' + clean.slice(2);
  return clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4, 8);
};

const formatTime = (text: string) => {
  const clean = text.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  return clean.slice(0, 2) + ':' + clean.slice(2, 4);
};

export default function AstrologyScreen() {
  const [activeTab, setActiveTab] = useState<'natal' | 'transits'>('natal');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [zodiacInfo, setZodiacInfo] = useState<ZodiacInfo | null>(null);

  const handleCalcular = () => {
    const parts = fecha.split('/');
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(day) && !isNaN(month)) {
        const sign = getZodiacSign(day, month);
        setZodiacInfo(zodiacData[sign] || null);
      }
    }
  };

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
                onChangeText={(text) => setFecha(formatDate(text))}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Hora de nacimiento (HH:MM)"
                placeholderTextColor="#6D6D8A"
                value={hora}
                onChangeText={(text) => setHora(formatTime(text))}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={styles.input}
                placeholder="Lugar de nacimiento"
                placeholderTextColor="#6D6D8A"
                value={lugar}
                onChangeText={setLugar}
              />
              <TouchableOpacity style={styles.calcButton} onPress={handleCalcular}>
                <Text style={styles.calcButtonText}>Calcular</Text>
              </TouchableOpacity>

              {zodiacInfo && (
                <View style={styles.zodiacCard}>
                  <Text style={styles.zodiacSymbol}>{zodiacInfo.symbol}</Text>
                  <Text style={styles.zodiacSign}>{zodiacInfo.sign}</Text>
                  <View style={styles.zodiacMeta}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>🔥 {zodiacInfo.element}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>⚙️ {zodiacInfo.modality}</Text>
                    </View>
                  </View>
                  <Text style={styles.zodiacSectionTitle}>Personalidad</Text>
                  <Text style={styles.zodiacDescription}>{zodiacInfo.description}</Text>
                  <Text style={styles.zodiacSectionTitle}>Tránsitos Actuales</Text>
                  <Text style={styles.zodiacDescription}>{zodiacInfo.transits}</Text>
                </View>
              )}

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
  zodiacCard: {
    backgroundColor: '#1A1035',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#7C3AED',
    alignItems: 'center',
  },
  zodiacSymbol: {
    fontSize: 56,
    marginBottom: 8,
  },
  zodiacSign: {
    fontSize: 26,
    color: '#F5F3FF',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  zodiacMeta: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metaBadge: {
    backgroundColor: '#2D1B69',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  metaBadgeText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: 'bold',
  },
  zodiacSectionTitle: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: 'bold',
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 8,
  },
  zodiacDescription: {
    fontSize: 14,
    color: '#A78BFA',
    lineHeight: 22,
    textAlign: 'left',
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
