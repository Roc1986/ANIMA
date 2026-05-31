import { useState, useCallback } from 'react';
import { TAROT_DECK } from '../../../../packages/shared/src/tarot/deck';
import { getSpreadCards } from '../../../../packages/shared/src/tarot/readings';
import { buildTarotPrompt } from '../../../../packages/shared/src/tarot/prompts';
import type { DrawnCard, SpreadType } from '../../../../packages/shared/src/types/tarot';
import type { UserProfile, SubProfileInsights } from '../../../../packages/shared/src/types/user';

interface UseTarotReturn {
  drawnCards: DrawnCard[];
  reading: string | null;
  voiceUrl: string | null;
  isLoading: boolean;
  error: string | null;
  drawSpread: (spreadType: SpreadType) => void;
  fetchReading: (
    spreadType: SpreadType,
    userProfile?: Partial<UserProfile>,
    subProfile?: Partial<SubProfileInsights>,
  ) => Promise<void>;
  reset: () => void;
}

/**
 * Hook encapsulating tarot draw logic and AI reading fetching.
 * In production, fetchReading calls a Supabase Edge Function that wraps Claude.
 */
export function useTarot(): UseTarotReturn {
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [reading, setReading] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawSpread = useCallback((spreadType: SpreadType) => {
    const cards = getSpreadCards(spreadType, TAROT_DECK);
    setDrawnCards(cards);
    setReading(null);
    setVoiceUrl(null);
    setError(null);
  }, []);

  const fetchReading = useCallback(
    async (
      spreadType: SpreadType,
      userProfile?: Partial<UserProfile>,
      subProfile?: Partial<SubProfileInsights>,
    ) => {
      if (!drawnCards.length) return;
      setIsLoading(true);
      setError(null);
      try {
        const prompt = buildTarotPrompt(
          drawnCards,
          spreadType,
          userProfile as any,
          subProfile,
        );

        // TODO: Replace with actual API call to your Edge Function
        // const response = await fetch(
        //   `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tarot-reading`,
        //   {
        //     method: 'POST',
        //     headers: {
        //       'Content-Type': 'application/json',
        //       'Authorization': `Bearer ${supabaseAnonKey}`,
        //     },
        //     body: JSON.stringify({ prompt, language: userProfile?.language ?? 'en' }),
        //   }
        // );
        // const { reading: text, voiceUrl: audio } = await response.json();
        // setReading(text);
        // setVoiceUrl(audio ?? null);

        // Simulated for scaffold:
        await new Promise((r) => setTimeout(r, 1500));
        setReading(
          'The cards speak of transformation and inner growth. Trust the journey unfolding before you — each card is a mirror of your own soul\'s wisdom.',
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get reading');
      } finally {
        setIsLoading(false);
      }
    },
    [drawnCards],
  );

  const reset = useCallback(() => {
    setDrawnCards([]);
    setReading(null);
    setVoiceUrl(null);
    setError(null);
  }, []);

  return { drawnCards, reading, voiceUrl, isLoading, error, drawSpread, fetchReading, reset };
}
