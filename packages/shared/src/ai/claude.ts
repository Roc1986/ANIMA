import Anthropic from '@anthropic-ai/sdk';
import { UserProfile, SubProfileInsights } from '../types/user';
import { TransitData } from '../types/astrology';
import { buildDailyMessagePrompt } from '../tarot/prompts';

/**
 * Lazy-initialised Anthropic client.
 * The API key is read from the ANTHROPIC_API_KEY environment variable.
 */
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const DEFAULT_MODEL = 'claude-opus-4-5';
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Generates a tarot reading from a pre-built prompt.
 */
export async function getTarotReading(
  prompt: string,
  language: string = 'en',
): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: DEFAULT_MAX_TOKENS,
    system: `You are ANIMA, a spiritual guide. ${language === 'es' ? 'Respond in Spanish.' : language === 'fr' ? 'Respond in French.' : 'Respond in English.'}`,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

/**
 * Generates a personalized daily message.
 */
export async function getDailyMessage(
  userProfile?: Partial<UserProfile>,
  transitData?: TransitData,
  subProfile?: Partial<SubProfileInsights>,
): Promise<string> {
  const transitSummary = transitData
    ? transitData.aspectsToNatal
        .slice(0, 3)
        .map(
          (a) =>
            `${a.transitPlanet} ${a.aspectType} natal ${a.natalPlanet} (orb ${a.orb.toFixed(1)}°)`,
        )
        .join('; ')
    : undefined;

  const prompt = buildDailyMessagePrompt(
    userProfile as any,
    subProfile,
    transitSummary,
  );

  return getTarotReading(prompt, userProfile?.language ?? 'en');
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Sends a chat message to Claude in the context of a therapeutic/spiritual session.
 */
export async function getChatResponse(
  messages: ChatMessage[],
  userProfile?: Partial<UserProfile>,
  subProfile?: Partial<SubProfileInsights>,
): Promise<string> {
  const client = getClient();
  const language = userProfile?.language ?? 'en';
  const name = userProfile?.name;

  let systemPrompt = `You are ANIMA, a compassionate AI spiritual companion and therapeutic guide.
You combine the wisdom of depth psychology, spirituality, and compassionate listening.
You are NOT a licensed therapist and do not give medical advice. You hold space for the user's inner journey.
Never be dismissive, judgmental, or alarmist. If a user seems to be in crisis, gently recommend professional support.
${language === 'es' ? 'Respond in Spanish.' : language === 'fr' ? 'Respond in French.' : 'Respond in English.'}`;

  if (name) {
    systemPrompt += `\nThe user's name is ${name}.`;
  }

  if (subProfile?.emotionalThemes?.length) {
    systemPrompt += `\nKnown emotional themes (use gently and naturally, do not quote directly): ${subProfile.emotionalThemes.join(', ')}.`;
  }

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 800,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

/**
 * Silently extracts sub-profile insights from a chat message exchange.
 * This runs after each assistant response, in the background.
 * The extracted data is encrypted client-side before storage.
 */
export async function extractSubProfileInsights(
  userMessage: string,
  currentSubProfile?: Partial<SubProfileInsights>,
): Promise<Partial<SubProfileInsights>> {
  const client = getClient();

  const existing = currentSubProfile
    ? JSON.stringify(currentSubProfile, null, 2)
    : 'No existing profile data.';

  const prompt = `You are a silent observer extracting psychological and emotional insights from a user message for personalized future support.

Existing profile data:
${existing}

New user message:
"${userMessage}"

Extract or update the following fields from the message. Only include fields where you have clear evidence. Return valid JSON only, with these optional fields:
{
  "emotionalThemes": ["string array"],
  "recurringTopics": ["string array"],
  "lifeEvents": ["string array"],
  "spiritualInclinations": ["string array"],
  "relationships": [{"role": "string", "dynamics": "string"}],
  "overallMoodTone": "string",
  "notes": ["string array"]
}

Be conservative — only add what is clearly evidenced. Merge with existing data where appropriate.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') return currentSubProfile ?? {};

  try {
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return currentSubProfile ?? {};
    const parsed = JSON.parse(jsonMatch[0]) as Partial<SubProfileInsights>;
    // Merge arrays with existing
    const merged: Partial<SubProfileInsights> = { ...currentSubProfile };
    if (parsed.emotionalThemes) {
      merged.emotionalThemes = Array.from(
        new Set([...(merged.emotionalThemes ?? []), ...parsed.emotionalThemes]),
      );
    }
    if (parsed.recurringTopics) {
      merged.recurringTopics = Array.from(
        new Set([...(merged.recurringTopics ?? []), ...parsed.recurringTopics]),
      );
    }
    if (parsed.lifeEvents) {
      merged.lifeEvents = Array.from(
        new Set([...(merged.lifeEvents ?? []), ...parsed.lifeEvents]),
      );
    }
    if (parsed.spiritualInclinations) {
      merged.spiritualInclinations = Array.from(
        new Set([...(merged.spiritualInclinations ?? []), ...parsed.spiritualInclinations]),
      );
    }
    if (parsed.relationships?.length) {
      merged.relationships = [
        ...(merged.relationships ?? []),
        ...parsed.relationships,
      ];
    }
    if (parsed.overallMoodTone) merged.overallMoodTone = parsed.overallMoodTone;
    if (parsed.notes?.length) {
      merged.notes = Array.from(new Set([...(merged.notes ?? []), ...parsed.notes]));
    }
    return merged;
  } catch {
    return currentSubProfile ?? {};
  }
}
