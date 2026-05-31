export type Arcana = 'major' | 'minor';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type SpreadType = 'daily' | 'yesno' | 'past-present-future' | 'celtic-cross';

export interface TarotCard {
  id: string; // e.g., "major-00", "wands-01"
  name: string; // English name
  arcana: Arcana;
  suit?: Suit; // only for minor arcana
  number: number; // 0-21 for major, 1-14 for minor
  keywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  imageKey: string; // key for referencing card artwork asset
}

export interface DrawnCard {
  card: TarotCard;
  position: string;
  isReversed: boolean;
}

export interface Reading {
  id: string;
  userId: string;
  spreadType: SpreadType;
  cards: DrawnCard[];
  aiInterpretation: string;
  voiceUrl?: string;
  createdAt: string;
}

export interface YesNoResult {
  answer: 'yes' | 'no' | 'maybe';
  confidence: 'strong' | 'moderate' | 'weak';
  explanation: string;
}

export const SPREAD_POSITIONS: Record<SpreadType, string[]> = {
  daily: ['Day\'s Guidance'],
  yesno: ['Answer'],
  'past-present-future': ['Past', 'Present', 'Future'],
  'celtic-cross': [
    'Present Situation',
    'The Challenge',
    'Distant Past / Root',
    'Recent Past',
    'Possible Outcome',
    'Near Future',
    'Your Attitude',
    'External Influences',
    'Hopes and Fears',
    'Final Outcome',
  ],
};
