# ANIMA

> *Your inner universe, illuminated.*

A spiritual and therapeutic mobile + web app offering tarot readings, astrology insights, AI-powered chat, and constellation therapy.

## Tech Stack

- **React Native + Expo** — iOS & Android
- **React (Vite)** — Web
- **Supabase** — Database, Auth (PostgreSQL + RLS)
- **Stripe** — Payments & subscriptions
- **Claude API (Anthropic)** — AI readings & chat
- **ElevenLabs** — Text-to-speech voice readings
- **Swiss Ephemeris** — Astrology calculations
- **i18n** — English, Spanish, French

## Project Structure

```
ANIMA/
├── apps/
│   ├── mobile/       # Expo React Native app
│   └── web/          # Vite + React web app
└── packages/
    ├── shared/       # Shared types, i18n, AI wrappers, tarot data
    └── supabase/     # DB schema, migrations, RLS policies
```

## Getting Started

```bash
# Install dependencies
yarn install

# Start mobile app
yarn mobile

# Start web app
yarn web

# Build shared package
yarn build:shared
```

## Environment Variables

Create `.env` files based on the following:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

## License

Proprietary — All rights reserved.
