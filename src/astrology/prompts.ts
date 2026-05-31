import { NatalChart, TransitData } from '../types/astrology';
import { UserProfile, SubProfileInsights } from '../types/user';
import { interpretTransits } from './calculations';

const TONE = `You are ANIMA, a compassionate and knowledgeable astrologer.
Your readings are warm, insightful, and empowering — never fearful.
Blend technical astrological knowledge with accessible, meaningful interpretation.`;

function languageInstruction(lang: string): string {
  return lang === 'es'
    ? 'Responde completamente en español.'
    : lang === 'fr'
    ? 'Réponds entièrement en français.'
    : 'Respond entirely in English.';
}

/**
 * Builds a prompt for a natal chart interpretation.
 */
export function buildNatalChartPrompt(
  natal: NatalChart,
  userProfile?: Pick<UserProfile, 'name' | 'language'>,
  subProfile?: Partial<SubProfileInsights>,
): string {
  const language = userProfile?.language ?? 'en';
  const name = userProfile?.name;

  const sun = natal.planets.find((p) => p.planet === 'Sun');
  const moon = natal.planets.find((p) => p.planet === 'Moon');
  const rising = natal.planets.find((p) => p.planet === 'Mercury'); // placeholder
  const keyPlanets = natal.planets
    .slice(0, 7)
    .map(
      (p) =>
        `${p.planet} in ${p.sign} (House ${p.house}${p.isRetrograde ? ', Retrograde' : ''})`,
    )
    .join('; ');

  const topAspects = natal.aspects
    .slice(0, 5)
    .map((a) => `${a.planet1} ${a.aspectType} ${a.planet2} (${a.orb.toFixed(1)}° orb)`)
    .join('; ');

  return `${TONE}
${languageInstruction(language)}

${name ? `You are interpreting the natal chart of ${name}.` : 'You are interpreting a natal chart.'}
Ascendant: ${natal.ascendant} | Midheaven: ${natal.midheaven}
Key placements: ${keyPlanets}
Notable aspects: ${topAspects}

Provide a rich natal chart interpretation covering:
1. Core identity (Sun, Moon, Rising)
2. Emotional nature and needs
3. Life themes and soul purpose suggested by the chart
4. Significant strengths and growth areas
5. A closing empowering insight

Write 300–400 words in flowing prose. Be specific to the placements given.`;
}

/**
 * Builds a prompt for a transit reading.
 */
export function buildTransitReadingPrompt(
  natal: NatalChart,
  transits: TransitData,
  userProfile?: Pick<UserProfile, 'name' | 'language'>,
): string {
  const language = userProfile?.language ?? 'en';
  const name = userProfile?.name;
  const transitSummary = interpretTransits(natal, transits);
  const transitDate = new Date(transits.date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return `${TONE}
${languageInstruction(language)}

${name ? `Transit reading for ${name}` : 'Transit reading'} — ${transitDate}.

${transitSummary}

Interpret these transits in a practical, empowering way:
1. What is the overall cosmic weather right now?
2. What are the 2–3 most significant transits and how might they manifest in daily life?
3. What areas of life are being activated (career, love, inner growth, etc.)?
4. What is the best way to work WITH these energies?
5. A brief forecast for the next 2–4 weeks.

Write 200–300 words. Ground the astrology in lived, relatable experience.`;
}
