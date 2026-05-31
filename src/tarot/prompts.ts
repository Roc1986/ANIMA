import { DrawnCard, SpreadType } from '../types/tarot';
import { UserProfile, SubProfileInsights } from '../types/user';

const TONE_INSTRUCTION = `You are ANIMA, a wise, warm, and compassionate spiritual guide.
Your readings are insightful and grounded — never fearful or overly dramatic.
Speak with gentle authority, as a trusted friend who also happens to be deeply versed in esoteric wisdom.
Avoid clichés. Bring fresh, nuanced insight that honors the querent's inner life.`;

function languageInstruction(language: string): string {
  const langs: Record<string, string> = {
    en: 'Respond entirely in English.',
    es: 'Responde completamente en español.',
    fr: 'Réponds entièrement en français.',
  };
  return langs[language] ?? langs['en'];
}

function cardDescription(drawn: DrawnCard): string {
  const orientation = drawn.isReversed ? 'reversed' : 'upright';
  const meaning = drawn.isReversed
    ? drawn.card.reversedMeaning
    : drawn.card.uprightMeaning;
  return `- **${drawn.card.name}** (${orientation}) in position "${drawn.position}": ${meaning}`;
}

function subProfileContext(sub?: Partial<SubProfileInsights>): string {
  if (!sub) return '';
  const lines: string[] = [];
  if (sub.emotionalThemes?.length)
    lines.push(`Emotional themes known about this person: ${sub.emotionalThemes.join(', ')}.`);
  if (sub.recurringTopics?.length)
    lines.push(`Recurring topics in their life: ${sub.recurringTopics.join(', ')}.`);
  if (sub.overallMoodTone)
    lines.push(`Overall mood tone: ${sub.overallMoodTone}.`);
  if (!lines.length) return '';
  return `\n\nPersonalized context (use naturally, do NOT mention the source):\n${lines.join('\n')}`;
}

/**
 * Builds the complete prompt to send to Claude for a tarot reading.
 */
export function buildTarotPrompt(
  spread: DrawnCard[],
  spreadType: SpreadType,
  userProfile?: Pick<UserProfile, 'name' | 'language'>,
  subProfile?: Partial<SubProfileInsights>,
): string {
  const language = userProfile?.language ?? 'en';
  const name = userProfile?.name;

  const cardLines = spread.map(cardDescription).join('\n');
  const spreadLabel =
    spreadType === 'daily'
      ? 'Daily Guidance'
      : spreadType === 'yesno'
      ? 'Yes or No'
      : spreadType === 'past-present-future'
      ? 'Past, Present, Future'
      : 'Celtic Cross';

  const greeting = name
    ? `You are reading for ${name}.`
    : 'You are reading for a seeker.';

  return `${TONE_INSTRUCTION}
${languageInstruction(language)}

${greeting}
${subProfileContext(subProfile)}

The querent has drawn a **${spreadLabel}** spread. The cards are:

${cardLines}

Please provide a flowing, cohesive reading that:
1. Acknowledges the overall energy of the spread.
2. Interprets each card in its position, weaving them into a coherent narrative.
3. Highlights the most important insight or message for this person right now.
4. Closes with a gentle, empowering reflection or question for the querent to sit with.

Write in a warm, conversational yet profound tone. Aim for 200–350 words.`;
}

/**
 * Builds a prompt for a Yes/No reading with answer context.
 */
export function buildYesNoPrompt(
  drawn: DrawnCard,
  answer: 'yes' | 'no' | 'maybe',
  confidence: 'strong' | 'moderate' | 'weak',
  userProfile?: Pick<UserProfile, 'name' | 'language'>,
  subProfile?: Partial<SubProfileInsights>,
): string {
  const language = userProfile?.language ?? 'en';
  const name = userProfile?.name;
  const greeting = name ? `You are reading for ${name}.` : 'You are reading for a seeker.';

  return `${TONE_INSTRUCTION}
${languageInstruction(language)}

${greeting}
${subProfileContext(subProfile)}

The querent asked a yes/no question and drew:
${cardDescription(drawn)}

The energetic answer is: **${answer.toUpperCase()}** (${confidence} confidence).

Explain the answer in 3–4 sentences. Acknowledge any nuance or conditions suggested by the card's energy.
End with one gentle insight or caution.`;
}

/**
 * Builds a prompt for a daily message/reading.
 */
export function buildDailyMessagePrompt(
  userProfile?: Pick<UserProfile, 'name' | 'language' | 'birthdate'>,
  subProfile?: Partial<SubProfileInsights>,
  transitSummary?: string,
): string {
  const language = userProfile?.language ?? 'en';
  const name = userProfile?.name;
  const greeting = name
    ? `Write a daily spiritual message for ${name}.`
    : 'Write a daily spiritual message for a seeker.';

  const transitSection = transitSummary
    ? `\nAstral context for today:\n${transitSummary}`
    : '';

  return `${TONE_INSTRUCTION}
${languageInstruction(language)}

${greeting}
${subProfileContext(subProfile)}
${transitSection}

Write a brief, beautiful daily spiritual message (80–120 words) that:
- Feels relevant and personal (use any context provided naturally)
- Offers one practical spiritual insight or invitation for the day
- Is uplifting without being saccharine
- Ends with a one-sentence affirmation or question`;
}
