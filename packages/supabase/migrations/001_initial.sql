-- ============================================================
-- ANIMA — Initial Database Schema
-- Migration: 001_initial.sql
-- ============================================================
-- All tables enable Row Level Security (RLS).
-- Users can only access their own data.
-- Chat messages and sub-profile data are encrypted client-side.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- USERS
-- Extends Supabase auth.users with ANIMA-specific profile data.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  birth_date    DATE,
  birth_time    TIME,
  -- Birth place stored as structured JSON for geocoding data
  birth_place   JSONB, -- { city, country, latitude, longitude, timezone }
  -- Current location for local transit calculations
  current_location JSONB, -- { city, country, latitude, longitude, timezone }
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr')),
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'subscription', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_current_period_end TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Users can only read/update their own profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_own" ON public.users
  FOR DELETE USING (auth.uid() = id);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);

-- ─────────────────────────────────────────────────────────────
-- READINGS
-- Stores tarot and astrology reading history.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.readings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reading_type      TEXT NOT NULL DEFAULT 'tarot'
    CHECK (reading_type IN ('tarot', 'astrology', 'daily')),
  spread_type       TEXT, -- 'daily' | 'yesno' | 'past-present-future' | 'celtic-cross'
  cards_drawn       JSONB, -- Array of { card, position, isReversed }
  ai_interpretation TEXT NOT NULL,
  voice_url         TEXT, -- URL to ElevenLabs-generated audio in Supabase Storage
  birth_data        JSONB, -- Snapshot of birth data used for astrology readings
  transit_data      JSONB, -- Snapshot of transit data at time of reading
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "readings_select_own" ON public.readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "readings_insert_own" ON public.readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "readings_delete_own" ON public.readings
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_readings_user_id ON public.readings(user_id);
CREATE INDEX idx_readings_created_at ON public.readings(created_at DESC);
CREATE INDEX idx_readings_user_type ON public.readings(user_id, reading_type);

-- ─────────────────────────────────────────────────────────────
-- SUB_PROFILES
-- Accumulates silently-extracted psychological insights.
-- Data is encrypted client-side before storage — server sees only ciphertext.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sub_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  -- AES-256-GCM encrypted JSON blob (encrypted client-side)
  encrypted_insights  TEXT NOT NULL DEFAULT '',
  -- Base64-encoded initialization vector for AES-GCM
  iv                  TEXT NOT NULL DEFAULT '',
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sub_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_profiles_select_own" ON public.sub_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sub_profiles_insert_own" ON public.sub_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sub_profiles_update_own" ON public.sub_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sub_profiles_delete_own" ON public.sub_profiles
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sub_profiles_user_id ON public.sub_profiles(user_id);

-- ─────────────────────────────────────────────────────────────
-- CHAT_MESSAGES
-- Stores encrypted conversation history between user and ANIMA.
-- Content is encrypted client-side — server never sees plaintext.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  -- AES-256-GCM encrypted message content (encrypted client-side)
  content     TEXT NOT NULL,
  -- IV used for this specific message's encryption
  iv          TEXT NOT NULL DEFAULT '',
  -- Unencrypted metadata for ordering / display
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft delete: messages can be hidden without permanent removal
  deleted_at  TIMESTAMPTZ
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_own" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_update_own" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_delete_own" ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at ASC);
CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- CONSTELLATION_SESSIONS
-- Stores family/systemic constellation session data.
-- Character and layout data encrypted client-side.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.constellation_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Encrypted character definitions: [{type, skinTone, hairColor, label}]
  characters            TEXT NOT NULL, -- AES-256-GCM encrypted JSON
  characters_iv         TEXT NOT NULL DEFAULT '',
  -- Encrypted layout positions: [{characterIndex, x, y}]
  layout                TEXT NOT NULL, -- AES-256-GCM encrypted JSON
  layout_iv             TEXT NOT NULL DEFAULT '',
  -- Encrypted AI interpretation of the constellation
  ai_interpretation     TEXT NOT NULL,
  interpretation_iv     TEXT NOT NULL DEFAULT '',
  voice_url             TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.constellation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "constellation_select_own" ON public.constellation_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "constellation_insert_own" ON public.constellation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "constellation_delete_own" ON public.constellation_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_constellation_user_id ON public.constellation_sessions(user_id);
CREATE INDEX idx_constellation_created_at ON public.constellation_sessions(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- STRIPE EVENTS (webhook log)
-- Records processed Stripe webhook events for idempotency.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id            TEXT PRIMARY KEY, -- Stripe event ID (evt_xxx)
  type          TEXT NOT NULL,
  data          JSONB NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — this table is only accessed by server-side functions
-- (Supabase Edge Functions with service role key).

-- ─────────────────────────────────────────────────────────────
-- Helper function: trigger new user profile creation
-- Called via Supabase Auth hooks or a trigger on auth.users
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, language, subscription_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.sub_profiles (user_id, encrypted_insights, iv)
  VALUES (NEW.id, '', '')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new Supabase Auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- GDPR: Data export view
-- Returns all user data as a single JSON object.
-- Accessible only by the authenticated user.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.user_data_export AS
SELECT
  u.id,
  u.email,
  u.name,
  u.birth_date,
  u.birth_time,
  u.birth_place,
  u.current_location,
  u.language,
  u.subscription_tier,
  u.created_at,
  (
    SELECT json_agg(r ORDER BY r.created_at DESC)
    FROM public.readings r
    WHERE r.user_id = u.id
  ) AS readings,
  (
    SELECT json_agg(m ORDER BY m.created_at ASC)
    FROM public.chat_messages m
    WHERE m.user_id = u.id AND m.deleted_at IS NULL
  ) AS chat_messages,
  (
    SELECT json_agg(c ORDER BY c.created_at DESC)
    FROM public.constellation_sessions c
    WHERE c.user_id = u.id
  ) AS constellation_sessions
FROM public.users u
WHERE u.id = auth.uid();
