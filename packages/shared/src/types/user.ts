export type SubscriptionTier = 'free' | 'subscription' | 'premium';

export type Language = 'en' | 'es' | 'fr';

export interface BirthPlace {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CurrentLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  birthdate: string | null; // ISO date string: YYYY-MM-DD
  birthtime: string | null; // HH:MM (24h)
  birthplace: BirthPlace | null;
  currentLocation: CurrentLocation | null;
  language: Language;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * SubProfile: Accumulated insights extracted silently from chat conversations.
 * This data is encrypted client-side before storing in Supabase.
 *
 * TODO: Implement client-side AES-GCM encryption using the user's derived key
 * (derived from their authentication token via PBKDF2 or similar KDF).
 * The server should NEVER see unencrypted sub-profile data.
 */
export interface SubProfile {
  id: string;
  userId: string;
  /** Client-side AES-256-GCM encrypted JSON blob */
  encryptedInsights: string;
  /** Initialization vector used for encryption (base64) */
  iv: string;
  lastUpdated: string;
}

/**
 * Decrypted sub-profile insights (never stored as-is on server)
 */
export interface SubProfileInsights {
  /** Key emotional themes extracted from conversations */
  emotionalThemes: string[];
  /** Recurring concerns or topics */
  recurringTopics: string[];
  /** Significant life events mentioned */
  lifeEvents: string[];
  /** Spiritual or philosophical inclinations */
  spiritualInclinations: string[];
  /** Relationships mentioned (anonymized) */
  relationships: Array<{
    role: string; // e.g., "partner", "mother", "friend"
    dynamics?: string;
  }>;
  /** Summary of overall psychological state */
  overallMoodTone?: string;
  /** Free-form notes accumulated */
  notes: string[];
}
