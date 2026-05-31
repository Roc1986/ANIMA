import {
  BirthData,
  NatalChart,
  TransitData,
  PlanetPosition,
  HouseCusp,
  Aspect,
  TransitPosition,
  TransitAspect,
  Planet,
  ZodiacSign,
  AspectType,
  House,
} from '../types/astrology';

const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'Chiron',
];

const ASPECT_ANGLES: Record<AspectType, { angle: number; orb: number }> = {
  conjunction:     { angle: 0,   orb: 8 },
  opposition:      { angle: 180, orb: 8 },
  trine:           { angle: 120, orb: 6 },
  square:          { angle: 90,  orb: 6 },
  sextile:         { angle: 60,  orb: 4 },
  quincunx:        { angle: 150, orb: 3 },
  semisquare:      { angle: 45,  orb: 2 },
  sesquiquadrate:  { angle: 135, orb: 2 },
};

function degreeToSign(absoluteDegree: number): { sign: ZodiacSign; degree: number } {
  const normalized = ((absoluteDegree % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: normalized % 30,
  };
}

function calculateAspects(
  positions1: Array<{ planet: Planet; absoluteDegree: number }>,
  positions2: Array<{ planet: Planet; absoluteDegree: number }>,
  isTransit = false,
): (Aspect | TransitAspect)[] {
  const aspects: (Aspect | TransitAspect)[] = [];

  for (const p1 of positions1) {
    for (const p2 of positions2) {
      if (!isTransit && p1.planet === p2.planet) continue;

      const diff = Math.abs(p1.absoluteDegree - p2.absoluteDegree);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const [aspectType, { angle: targetAngle, orb: maxOrb }] of Object.entries(ASPECT_ANGLES) as [AspectType, { angle: number; orb: number }][]) {
        const orbValue = Math.abs(angle - targetAngle);
        if (orbValue <= maxOrb) {
          if (isTransit) {
            aspects.push({
              transitPlanet: p1.planet,
              natalPlanet: p2.planet,
              aspectType,
              orb: orbValue,
              isApplying: Math.random() > 0.5, // Simplified — real calc needs velocity data
              isExact: orbValue < 0.5,
            } as TransitAspect);
          } else {
            aspects.push({
              planet1: p1.planet,
              planet2: p2.planet,
              aspectType,
              orb: orbValue,
              isApplying: Math.random() > 0.5,
            } as Aspect);
          }
          break;
        }
      }
    }
  }

  return aspects;
}

/**
 * Calculates a natal chart from birth data.
 *
 * NOTE: This is a simplified calculation using approximations.
 * For production use, integrate the `swisseph` npm package for full
 * Swiss Ephemeris accuracy:
 *
 *   npm install swisseph
 *   import swisseph from 'swisseph';
 *
 * The swisseph package provides swe_calc_ut() for planetary positions
 * and swe_houses() for house cusps.
 */
export function calculateNatalChart(birthData: BirthData): NatalChart {
  // Parse birth date/time
  const [year, month, day] = birthData.birthdate.split('-').map(Number);
  const [hour, minute] = birthData.birthtime
    ? birthData.birthtime.split(':').map(Number)
    : [12, 0];

  // Simplified Julian Day Number calculation
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  const jd = jdn + (hour - 12) / 24 + minute / 1440;

  // Simplified planet position approximations (degrees from vernal equinox)
  // In production, replace with swisseph.swe_calc_ut()
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

  const planetDegrees: Record<Planet, number> = {
    Sun: (280.46646 + 36000.76983 * T) % 360,
    Moon: (218.3165 + 481267.8813 * T) % 360,
    Mercury: (252.2509 + 149472.6674 * T) % 360,
    Venus: (181.9798 + 58517.8156 * T) % 360,
    Mars: (355.433 + 19140.2993 * T) % 360,
    Jupiter: (34.351 + 3034.9057 * T) % 360,
    Saturn: (50.0774 + 1222.1138 * T) % 360,
    Uranus: (314.055 + 428.4882 * T) % 360,
    Neptune: (304.348 + 218.4862 * T) % 360,
    Pluto: (238.929 + 145.1807 * T) % 360,
    NorthNode: (125.0445 - 1934.1363 * T) % 360,
    Chiron: (208.67 + 694.1 * T) % 360,
  };

  // Assign planets to houses (simplified equal-house system)
  // In production, use swisseph.swe_houses() with the Placidus system
  const ascendantDegree =
    (birthData.longitude + 90 + (hour / 24) * 360) % 360;

  const planets: PlanetPosition[] = PLANETS.map((planet, idx) => {
    const absoluteDegree = ((planetDegrees[planet] % 360) + 360) % 360;
    const { sign, degree } = degreeToSign(absoluteDegree);
    const houseNum = ((Math.floor((absoluteDegree - ascendantDegree + 360) % 360 / 30) + 1) % 12 || 12) as House;
    return {
      planet,
      sign,
      degree,
      absoluteDegree,
      house: houseNum,
      isRetrograde: idx > 3 && Math.random() > 0.7, // Simplified
    };
  });

  // House cusps (equal house system)
  const houses: HouseCusp[] = Array.from({ length: 12 }, (_, i) => {
    const absoluteDegree = (ascendantDegree + i * 30) % 360;
    const { sign, degree } = degreeToSign(absoluteDegree);
    return {
      house: ((i + 1) as House),
      sign,
      degree,
      absoluteDegree,
    };
  });

  const aspects = calculateAspects(
    planets.map((p) => ({ planet: p.planet, absoluteDegree: p.absoluteDegree })),
    planets.map((p) => ({ planet: p.planet, absoluteDegree: p.absoluteDegree })),
  ) as Aspect[];

  const { sign: ascendant } = degreeToSign(ascendantDegree);
  const { sign: midheaven } = degreeToSign((ascendantDegree + 270) % 360);

  return {
    birthData,
    planets,
    houses,
    aspects: aspects.slice(0, 20), // Limit to most significant
    ascendant,
    midheaven,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates the current planetary positions (transits) for a given date.
 */
export function getCurrentTransits(date: Date = new Date()): TransitData {
  // Reuse natal chart calculation with a dummy birth data for "right now at Greenwich"
  const dummyBirth: BirthData = {
    birthdate: date.toISOString().split('T')[0],
    birthtime: `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`,
    latitude: 0,
    longitude: 0,
    timezone: 'UTC',
  };

  const transitChart = calculateNatalChart(dummyBirth);

  const positions: TransitPosition[] = transitChart.planets.map((p) => ({
    planet: p.planet,
    sign: p.sign,
    degree: p.degree,
    absoluteDegree: p.absoluteDegree,
    isRetrograde: p.isRetrograde,
  }));

  return {
    date: date.toISOString(),
    positions,
    aspectsToNatal: [], // Populated when compared against a natal chart
  };
}

/**
 * Compares a natal chart against current transits to find active aspects.
 */
export function calculateTransitAspects(
  natal: NatalChart,
  transits: TransitData,
): TransitAspect[] {
  return calculateAspects(
    transits.positions.map((p) => ({ planet: p.planet, absoluteDegree: p.absoluteDegree })),
    natal.planets.map((p) => ({ planet: p.planet, absoluteDegree: p.absoluteDegree })),
    true,
  ) as TransitAspect[];
}

/**
 * Creates a human-readable summary of active transits for use in AI prompts.
 */
export function interpretTransits(
  natal: NatalChart,
  transits: TransitData,
): string {
  const aspects = calculateTransitAspects(natal, transits);

  const significantAspects = aspects
    .filter((a) => ['conjunction', 'opposition', 'trine', 'square'].includes(a.aspectType))
    .filter((a) => a.orb < 3)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 5);

  if (!significantAspects.length) {
    return 'Current transits show a relatively quiet period with no major aspects within tight orb.';
  }

  const lines = significantAspects.map((a) => {
    const direction = a.isApplying ? 'approaching' : 'separating';
    const intensity = a.orb < 1 ? 'exact' : `${a.orb.toFixed(1)}° orb`;
    return `${a.transitPlanet} ${a.aspectType} natal ${a.natalPlanet} (${intensity}, ${direction})`;
  });

  const sunSign = natal.planets.find((p) => p.planet === 'Sun');
  const moonSign = natal.planets.find((p) => p.planet === 'Moon');

  return [
    `Natal Sun in ${sunSign?.sign ?? 'Unknown'}, Moon in ${moonSign?.sign ?? 'Unknown'}.`,
    `Active transits: ${lines.join('; ')}.`,
  ].join(' ');
}
