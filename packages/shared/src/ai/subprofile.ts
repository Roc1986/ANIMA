import { SubProfile, SubProfileInsights } from '../types/user';

/**
 * Client-side encryption utilities for SubProfile data.
 *
 * TODO: Implement full AES-256-GCM encryption using the Web Crypto API
 * (available in browsers and Node.js 18+).
 *
 * The encryption key should be derived from the user's session/auth token
 * using PBKDF2 or HKDF — the server should NEVER see the plaintext.
 *
 * Current implementation is a placeholder that base64-encodes data.
 * Replace encryptInsights/decryptInsights with real crypto before production.
 */

/**
 * Serialises and "encrypts" SubProfileInsights for storage.
 * PLACEHOLDER: Replace with real AES-256-GCM encryption.
 */
export async function encryptInsights(
  insights: SubProfileInsights,
  _userKey?: CryptoKey,
): Promise<{ encryptedInsights: string; iv: string }> {
  // TODO: Replace this stub with actual AES-GCM encryption:
  //
  // const iv = crypto.getRandomValues(new Uint8Array(12));
  // const encoded = new TextEncoder().encode(JSON.stringify(insights));
  // const encrypted = await crypto.subtle.encrypt(
  //   { name: 'AES-GCM', iv },
  //   userKey,
  //   encoded,
  // );
  // return {
  //   encryptedInsights: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  //   iv: btoa(String.fromCharCode(...iv)),
  // };

  const json = JSON.stringify(insights);
  const encoded = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json).toString('base64');
  return {
    encryptedInsights: encoded,
    iv: 'placeholder-iv',
  };
}

/**
 * Decrypts a SubProfile's encrypted insights back to a plain object.
 * PLACEHOLDER: Replace with real AES-256-GCM decryption.
 */
export async function decryptInsights(
  subProfile: SubProfile,
  _userKey?: CryptoKey,
): Promise<SubProfileInsights> {
  // TODO: Replace with real decryption using subProfile.iv and userKey

  try {
    const decoded =
      typeof atob !== 'undefined'
        ? decodeURIComponent(escape(atob(subProfile.encryptedInsights)))
        : Buffer.from(subProfile.encryptedInsights, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SubProfileInsights;
  } catch {
    return {
      emotionalThemes: [],
      recurringTopics: [],
      lifeEvents: [],
      spiritualInclinations: [],
      relationships: [],
      notes: [],
    };
  }
}

/**
 * Creates an empty SubProfile for a new user.
 */
export function createEmptySubProfile(userId: string): SubProfile {
  return {
    id: crypto.randomUUID?.() ?? `sp_${Date.now()}`,
    userId,
    encryptedInsights: '',
    iv: '',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Updates a SubProfile with newly extracted insights.
 * Merges the new insights with existing decrypted insights, then re-encrypts.
 */
export async function updateSubProfile(
  existing: SubProfile,
  newInsights: Partial<SubProfileInsights>,
  userKey?: CryptoKey,
): Promise<SubProfile> {
  const currentInsights = existing.encryptedInsights
    ? await decryptInsights(existing, userKey)
    : ({
        emotionalThemes: [],
        recurringTopics: [],
        lifeEvents: [],
        spiritualInclinations: [],
        relationships: [],
        notes: [],
      } as SubProfileInsights);

  const merged: SubProfileInsights = {
    emotionalThemes: Array.from(
      new Set([...currentInsights.emotionalThemes, ...(newInsights.emotionalThemes ?? [])]),
    ),
    recurringTopics: Array.from(
      new Set([...currentInsights.recurringTopics, ...(newInsights.recurringTopics ?? [])]),
    ),
    lifeEvents: Array.from(
      new Set([...currentInsights.lifeEvents, ...(newInsights.lifeEvents ?? [])]),
    ),
    spiritualInclinations: Array.from(
      new Set([
        ...currentInsights.spiritualInclinations,
        ...(newInsights.spiritualInclinations ?? []),
      ]),
    ),
    relationships: [
      ...currentInsights.relationships,
      ...(newInsights.relationships ?? []),
    ],
    overallMoodTone: newInsights.overallMoodTone ?? currentInsights.overallMoodTone,
    notes: Array.from(new Set([...currentInsights.notes, ...(newInsights.notes ?? [])])),
  };

  const { encryptedInsights, iv } = await encryptInsights(merged, userKey);
  return {
    ...existing,
    encryptedInsights,
    iv,
    lastUpdated: new Date().toISOString(),
  };
}
