# Recipe Book — Mobile

React Native (Expo) client for the personal recipe book app. Talks to [Recipe Book Backend](../recipe-book-backend) for recipe CRUD, and to Supabase directly for auth and photo upload.

## Tech Stack

- **Framework**: Expo (React Native), Expo Router for file-based navigation
- **Auth**: Supabase Auth, via the Supabase JS client directly (session persisted with AsyncStorage)
- **Data**: Express REST API (`recipe-book-backend`), called with the Supabase access token as a bearer token
- **Photo upload**: `expo-image-picker` to pick a photo, uploaded through the backend's `/upload` route (which stores it in Supabase Storage)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` (already done if you're reading this after initial setup) and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from the same Supabase project the backend uses (the publishable key, not the secret key)
   - `EXPO_PUBLIC_API_URL` — your backend's URL. `localhost` only resolves from an iOS simulator; use `10.0.2.2` for the Android emulator, or your machine's LAN IP for a physical device
3. Start the backend (`recipe-book-backend`) first — this app has no offline/mock mode.
4. Start the dev server:
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── app/                    # Screens and layouts (expo-router, file-based)
│   ├── _layout.tsx         # Root layout, wraps everything in AuthProvider
│   ├── (auth)/             # Public routes — redirect to "/" if already logged in
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (app)/              # Protected routes — redirect to /login if signed out
│       ├── _layout.tsx
│       ├── index.tsx       # Recipe list
│       └── recipe/
│           ├── new.tsx     # Add recipe
│           └── [id]/
│               ├── index.tsx  # View recipe
│               └── edit.tsx   # Edit recipe
├── components/
│   ├── RecipeCard.tsx
│   └── RecipeForm.tsx      # Shared form used by both add and edit screens
├── context/
│   └── AuthContext.tsx     # Wraps Supabase auth session state (useAuth hook)
├── lib/
│   ├── supabase.ts         # Supabase client (AsyncStorage-backed session)
│   └── api.ts              # Fetch wrapper for the Express backend
└── types/
    └── recipe.ts           # Shared TypeScript interfaces (mirrors the web app's types)
```

## Scope

MVP is trimmed to auth, view/add/edit recipes with photos. Search/filter, favourites, and delete are deferred (present in the web app, not yet ported here).

## Scripts

```bash
npm start        # Start the Expo dev server
npm run android  # Start targeting the Android emulator
npm run ios      # Start targeting the iOS simulator
npm run web      # Start targeting web
npm run lint     # ESLint
```
