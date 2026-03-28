# Kindred 🌿
### Find your people. Platonic friendship app for adults.

---

## Project Structure

```
kindred/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── db/       PostgreSQL schema + migrations
│   │   ├── middleware/  Auth (JWT)
│   │   ├── routes/   All API routes
│   │   ├── utils/    Compatibility algorithm
│   │   └── index.js  Server + Socket.io
│   └── .env.example
│
└── mobile/           React Native + Expo
    ├── src/
    │   ├── screens/  All app screens
    │   ├── components/  Reusable UI
    │   ├── navigation/  React Navigation setup
    │   ├── hooks/    Zustand auth store
    │   ├── utils/    API client, socket, time
    │   └── constants/  Theme (colors, spacing)
    ├── App.jsx
    └── .env.example
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env       # fill in your values
npm install
npm run db:migrate         # run against your PostgreSQL DB
npm run dev                # starts on port 3000
```

### 2. Mobile

```bash
cd mobile
cp .env.example .env.local  # set EXPO_PUBLIC_API_URL
npm install
npx expo start              # scan QR with Expo Go app
```

---

## Environment Variables

### Backend (.env)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random secret for JWT signing |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_MONTHLY` | Stripe Price ID for $9.99/mo plan |
| `STRIPE_PRICE_ID_YEARLY` | Stripe Price ID for $79.99/yr plan |

### Mobile (.env.local)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend URL (http://localhost:3000 in dev) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

---

## Deploy

### Backend → Railway
1. Push `backend/` to a GitHub repo
2. Connect to Railway → Add PostgreSQL plugin
3. Set all env vars in Railway dashboard
4. Deploy — Railway auto-detects Node.js

### Mobile → Expo EAS
```bash
cd mobile
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
npx eas submit --platform ios
npx eas submit --platform android
```

---

## Key Features Built

- **Compatibility Algorithm** — Quiz (50%) + Interests (30%) + Location (20%)
- **Daily Card Deck** — 5 profiles/day free, unlimited for Kindred+
- **Mutual Connect** — Both must connect before chat opens
- **Real-time Chat** — Socket.io with typing indicators
- **Icebreaker Messages** — Auto-generated on match based on shared interests
- **Hangout Planner** — Propose activities within a match
- **Circles** — Interest-based local groups (max 12 members)
- **Events** — Public local events, RSVP system
- **Safety** — Report, block, profile verification flag
- **Kindred+** — Stripe subscription (monthly/yearly)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo |
| Navigation | React Navigation v6 |
| State | Zustand |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Auth | JWT + SecureStore |
| Storage | Supabase |
| Payments | Stripe |
| Deploy (API) | Railway |
| Deploy (App) | Expo EAS |

---

*Kindred is for platonic friendships only. Built with ❤️*
