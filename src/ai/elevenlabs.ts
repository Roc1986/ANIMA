/**
 * ElevenLabs TTS wrapper.
 * Uses the ElevenLabs REST API directly to avoid heavy SDK dependencies.
 *
 * Voice IDs are chosen for a warm, calm, professional quality in each language.
 * Replace with your preferred ElevenLabs voice IDs from your account.
 */

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Default voice IDs per language.
 * These are example ElevenLabs voice IDs — replace with your chosen voices.
 */
export const DEFAULT_VOICE_IDS: Record<string, string> = {
  en: 'EXAVITQu4vr4xnSDxMaL', // "Sarah" — calm, warm English voice
  es: 'jsCqWAovK2LkecY7zXl4', // "Valentina" — warm Spanish voice
  fr: 'XrExE9yKIg1WjnnlVkGX', // "Juliette" — calm French voice
};

export interface TTSOptions {
  /** ElevenLabs voice ID. Defaults to language-based default. */
  voiceId?: string;
  /** Speaking stability (0–1). Higher = more consistent. Default 0.75 */
  stability?: number;
  /** Similarity boost (0–1). Higher = closer to original voice. Default 0.75 */
  similarityBoost?: number;
  /** Speaking style exaggeration (0–1). Default 0.0 */
  style?: number;
  /** Model ID. Default 'eleven_multilingual_v2' */
  modelId?: string;
}

/**
 * Generates speech audio from text using ElevenLabs TTS.
 * Returns the audio as a Buffer (Node.js) or Uint8Array (browser).
 */
export async function generateVoice(
  text: string,
  language: string = 'en',
  options: TTSOptions = {},
): Promise<Uint8Array> {
  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  const voiceId = options.voiceId ?? DEFAULT_VOICE_IDS[language] ?? DEFAULT_VOICE_IDS['en'];
  const modelId = options.modelId ?? 'eleven_multilingual_v2';

  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;

  const body = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: options.stability ?? 0.75,
      similarity_boost: options.similarityBoost ?? 0.75,
      style: options.style ?? 0.0,
      use_speaker_boost: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs TTS error ${response.status}: ${errorText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Generates a voice reading and uploads it, returning a public URL.
 * This function is a placeholder — implement with your storage provider
 * (e.g., Supabase Storage) to get a public URL for the audio.
 */
export async function generateAndStoreVoice(
  text: string,
  language: string = 'en',
  options: TTSOptions = {},
): Promise<string> {
  const audioData = await generateVoice(text, language, options);

  // TODO: Upload audioData to Supabase Storage (or S3, Cloudflare R2, etc.)
  // and return the public URL.
  //
  // Example with Supabase:
  // const { data, error } = await supabase.storage
  //   .from('voice-readings')
  //   .upload(`readings/${Date.now()}.mp3`, audioData, { contentType: 'audio/mpeg' });
  // return supabase.storage.from('voice-readings').getPublicUrl(data.path).data.publicUrl;

  console.warn('[ElevenLabs] Storage not configured. Returning placeholder URL.');
  return `data:audio/mpeg;base64,${btoa(String.fromCharCode(...audioData.slice(0, 100)))}...`;
}
