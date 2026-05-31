import { TarotCard, DrawnCard, SpreadType, SPREAD_POSITIONS } from '../types/tarot';

/**
 * Draws `count` unique cards from the deck in random order.
 * Uses the Fisher-Yates shuffle for uniform randomness.
 */
export function drawCards(count: number, deck: TarotCard[]): TarotCard[] {
  if (count > deck.length) {
    throw new Error(`Cannot draw ${count} cards from a deck of ${deck.length}`);
  }
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Returns a reversed state for a card (50% chance by default).
 */
function randomReversed(reversalRate = 0.3): boolean {
  return Math.random() < reversalRate;
}

/**
 * Builds a complete spread from a deck: draws the required number of cards,
 * assigns positions, and marks each as upright or reversed.
 */
export function getSpreadCards(
  spreadType: SpreadType,
  deck: TarotCard[],
): DrawnCard[] {
  const positions = SPREAD_POSITIONS[spreadType];
  const drawn = drawCards(positions.length, deck);
  return drawn.map((card, idx) => ({
    card,
    position: positions[idx],
    isReversed: randomReversed(),
  }));
}

/**
 * Interprets a Yes/No reading.
 * Upright cards and their energies lean toward "yes"; reversed toward "no".
 * The overall balance of card energies determines the answer.
 */
export function interpretYesNo(drawnCard: DrawnCard): {
  answer: 'yes' | 'no' | 'maybe';
  confidence: 'strong' | 'moderate' | 'weak';
} {
  // Major arcana carry stronger weight
  const isMajor = drawnCard.card.arcana === 'major';
  const isReversed = drawnCard.isReversed;

  // Inherently positive cards (number-based heuristic)
  const positiveCards = new Set([
    'major-00', // Fool
    'major-01', // Magician
    'major-03', // Empress
    'major-06', // Lovers
    'major-07', // Chariot
    'major-10', // Wheel
    'major-17', // Star
    'major-19', // Sun
    'major-20', // Judgement
    'major-21', // World
    'cups-09',  // Nine of Cups (wish)
    'cups-10',  // Ten of Cups
    'pentacles-09',
    'pentacles-10',
    'wands-06',
  ]);

  const negativeCards = new Set([
    'major-15', // Devil
    'major-16', // Tower
    'swords-03',
    'swords-05',
    'swords-09',
    'swords-10',
    'cups-05',
    'pentacles-05',
  ]);

  let leanYes = positiveCards.has(drawnCard.card.id);
  let leanNo = negativeCards.has(drawnCard.card.id);

  if (isReversed) {
    // Flip the interpretation when reversed
    if (leanYes) {
      leanYes = false;
      leanNo = true;
    } else if (leanNo) {
      leanNo = false;
      leanYes = true;
    }
  }

  const answer = leanYes ? 'yes' : leanNo ? 'no' : 'maybe';
  const confidence = isMajor ? 'strong' : 'moderate';

  return { answer, confidence };
}
