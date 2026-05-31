import { useState, useCallback } from 'react';
import {
  calculateNatalChart,
  getCurrentTransits,
  calculateTransitAspects,
  interpretTransits,
} from '../astrology/calculations';
import type { BirthData, NatalChart, TransitData } from '../types/astrology';

interface UseAstrologyReturn {
  natalChart: NatalChart | null;
  transits: TransitData | null;
  transitInterpretation: string | null;
  reading: string | null;
  isLoading: boolean;
  error: string | null;
  generateNatalChart: (birthData: BirthData) => void;
  fetchTransits: () => void;
  fetchAstrologyReading: (language?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook encapsulating natal chart and transit calculations + AI reading fetching.
 */
export function useAstrology(): UseAstrologyReturn {
  const [natalChart, setNatalChart] = useState<NatalChart | null>(null);
  const [transits, setTransits] = useState<TransitData | null>(null);
  const [transitInterpretation, setTransitInterpretation] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNatalChart = useCallback((birthData: BirthData) => {
    try {
      const chart = calculateNatalChart(birthData);
      setNatalChart(chart);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chart calculation failed');
    }
  }, []);

  const fetchTransits = useCallback(() => {
    try {
      const currentTransits = getCurrentTransits(new Date());
      setTransits(currentTransits);
      if (natalChart) {
        const aspects = calculateTransitAspects(natalChart, currentTransits);
        const populated = { ...currentTransits, aspectsToNatal: aspects };
        setTransits(populated);
        const interpretation = interpretTransits(natalChart, populated);
        setTransitInterpretation(interpretation);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transit calculation failed');
    }
  }, [natalChart]);

  const fetchAstrologyReading = useCallback(
    async (language: string = 'en') => {
      if (!natalChart) {
        setError('Please generate your natal chart first');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Call /functions/v1/astrology-reading Edge Function
        // passing natalChart, transits, language
        await new Promise((r) => setTimeout(r, 2000));
        setReading(
          'Your natal chart reveals a soul of profound depth and creative potential. The alignment of your planets speaks to a life path centered on both service and self-expression...',
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get reading');
      } finally {
        setIsLoading(false);
      }
    },
    [natalChart, transits],
  );

  const reset = useCallback(() => {
    setNatalChart(null);
    setTransits(null);
    setTransitInterpretation(null);
    setReading(null);
    setError(null);
  }, []);

  return {
    natalChart,
    transits,
    transitInterpretation,
    reading,
    isLoading,
    error,
    generateNatalChart,
    fetchTransits,
    fetchAstrologyReading,
    reset,
  };
}
