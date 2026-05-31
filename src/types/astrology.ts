export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Planet =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
  | 'NorthNode' | 'Chiron';

export type AspectType =
  | 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile'
  | 'quincunx' | 'semisquare' | 'sesquiquadrate';

export type House = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface BirthData {
  birthdate: string; // YYYY-MM-DD
  birthtime: string; // HH:MM (24h), optional but affects house calculations
  latitude: number;
  longitude: number;
  timezone: string; // IANA timezone e.g. "America/New_York"
}

export interface PlanetPosition {
  planet: Planet;
  sign: ZodiacSign;
  degree: number; // 0-29.99 degrees within the sign
  absoluteDegree: number; // 0-359.99 degrees of the ecliptic
  house: House;
  isRetrograde: boolean;
}

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  aspectType: AspectType;
  orb: number; // degrees of orb
  isApplying: boolean;
}

export interface HouseCusp {
  house: House;
  sign: ZodiacSign;
  degree: number;
  absoluteDegree: number;
}

export interface NatalChart {
  birthData: BirthData;
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
  ascendant: ZodiacSign;
  midheaven: ZodiacSign;
  calculatedAt: string;
}

export interface TransitPosition {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  absoluteDegree: number;
  isRetrograde: boolean;
}

export interface TransitAspect {
  transitPlanet: Planet;
  natalPlanet: Planet;
  aspectType: AspectType;
  orb: number;
  isApplying: boolean;
  isExact: boolean;
}

export interface TransitData {
  date: string;
  positions: TransitPosition[];
  aspectsToNatal: TransitAspect[];
}

export interface AstrologyReading {
  id: string;
  userId: string;
  natalChart?: NatalChart;
  transitData?: TransitData;
  aiInterpretation: string;
  voiceUrl?: string;
  createdAt: string;
}
