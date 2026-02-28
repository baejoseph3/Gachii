# Spotter

Spotter is a full-stack fitness tracker that lets users log workouts, track weekly volume or distance, manage custom exercises, and connect with friends in a social feed. The front-end is a React + Vite single-page app, while the backend is implemented as serverless API routes under `api/` that talk to a PostgreSQL database.

## Features

- **Authentication**: Email/username login, registration, and persisted sessions via JWTs.
- **Workout logging**: Build workouts with strength or cardio exercises, sets, reps, distance, and units.
- **Dashboard analytics**: Weekly totals and workout history summaries for mobile and desktop layouts.
- **Custom exercises**: Create, edit, and delete personalized exercises for your library.
- **Social feed**: Friend search, requests, and shared workout feed with comments.
- **Push notifications**: Optional Firebase web push tokens registered per user device.
- **Admin tools**: Admin-only user management and push notification testing.

## Architecture Overview

### Front-end

The UI is a React SPA managed in `src/`. Major views include:

- `AuthView` for login/registration flows.
- `DashboardView` / `DashboardViewDesktop` for the workout overview.
- `WorkoutView` for the active workout session.
- `SocialView` / `SocialViewDesktop` for friend interactions.
- `ProfileView` for account settings, logout, and notification status.

Navigation uses a mobile bottom tab bar and a desktop header tab system controlled by the root `App` component.

### Backend API

Serverless API handlers live under `api/` and handle auth, workouts, exercise management, friends, notifications, and admin actions. Each handler reads a `req.query.action` param to route within the module (for example `api/auth/[action].js` supports `login`, `register`, `me`, and `settings`).

### Database

The backend uses PostgreSQL through a pooled client in `src/db/client.js`. The connection string comes from `DATABASE_URL`.


## Recent Refactor Highlights

- Added shared API utilities in `api/_lib/` for:
  - consistent auth token parsing (`requireUserId`)
  - standardized success/error response envelopes (`sendSuccess`/`sendError`)
  - reusable workout hydration logic (`hydrateWorkouts`)
- Refactored `auth`, `friends`, and `workouts` handlers to use shared utilities, reducing repeated logic and making error handling more resilient.
- API responses now support a consistent envelope shape:
  - Success: `{ data, meta? }`
  - Error: `{ error: { message, code, status, details? } }`
- Updated frontend API client to be backward-compatible while unwrapping the new `{ data }` responses.


## Achievements: data-driven setup

Achievements are now stored in Postgres instead of hardcoded in the UI:

- `achievement_definitions`: catalog of all available achievements (title, description, rule metadata, points, order, active flag).
- `user_achievements`: join table tracking which users have unlocked which achievements and when.

This makes adding new achievements simple: insert/update rows in `achievement_definitions` (or call `POST /api/achievements/definition` as an admin). The Progress view loads achievements from `GET /api/achievements/list`.

Rule fields (`rule_key`, `rule_target`) are intentionally generic so you can evolve unlock logic without changing frontend code.

When users load Progress, the API computes current metric values from existing workout history and auto-syncs unlocks (for example, users with historical workouts will immediately unlock `first_workout` if eligible).

### Defining new `rule_key` values

`rule_key` values are controlled by a backend registry in `src/db/queries/achievements.js` (`RULE_RESOLVERS`).

Add a new rule key in 3 steps:

1. **Compute metric(s)** in `loadUserMetrics` (query workouts/sets/etc. and store numeric values on the metrics object).
2. **Register the key** in `RULE_RESOLVERS`, mapping `rule_key` to a resolver function.
3. **Create/update achievement definitions** with that `rule_key` via SQL seed/update or `POST /api/achievements/definition`.

The API validates `ruleKey` against this registry, so unsupported keys are rejected with a clear validation message.

Supported built-in rule keys now include:

- `day_streak`
- `workouts_logged_morning`
- `workouts_logged_evening`
- `exercise_weight_hits`
- `feed_comments_added`
- `muscle_group_workouts_logged`
- `workouts_scheduled`
- `scheduled_workouts_completed`
- `volume_logged_total`

`scheduled_workouts_completed` currently uses a practical sync heuristic: a scheduled day is considered completed if the user has a logged workout on that same calendar date.


Some rule keys require `rule_config`:

- `exercise_weight_hits`: accepts `{ "minWeight": number, "exerciseNameContains"?: string }`
  - Example for bench 225: `{ "minWeight": 225, "exerciseNameContains": "bench" }`
  - Example for any exercise at 315+: `{ "minWeight": 315 }`
- `muscle_group_workouts_logged`: accepts `{ "muscleGroup": "chest" | "back" | ... }`


## Local Development

### Install dependencies

```bash
npm install
```

### Run the front-end

```bash
npm run dev
```

### Run API routes

The `api/` routes are designed for serverless hosting (Vercel/Netlify style). For local development, you can either:

- Use a platform dev server that supports serverless functions, or
- Proxy `/api` requests to a locally hosted serverless runtime.

Ensure your database and JWT secret are configured before attempting auth routes.

## Environment Variables

### Front-end (Vite)

Set these in a `.env` file with the `VITE_` prefix:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

These values power Firebase web push notifications.

### Backend

Set these in the serverless environment (or `.env` for local emulation):

- `DATABASE_URL` — Postgres connection string.
- `JWT_SECRET` — Secret used to sign JWTs for auth sessions.

## Notifications Flow

1. The client requests notification permission and retrieves a Firebase Messaging token.
2. The token is registered with `/api/notifications/register-token`.
3. Tokens can be removed via `/api/notifications/unregister-token`.

The registration flow is coordinated in the root `App` component and `pushNotifications` service.

## Project Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — build production assets.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint.

Scripts are defined in `package.json`.

## Deployment Notes

This repository is designed for Vercel-hosted serverless APIs and a Neon Postgres database.

### Neon setup

1. Create a Neon project and copy the pooled connection string.
2. Set `DATABASE_URL` in Vercel Project Settings → Environment Variables.
3. Apply schema SQL from `src/db/schema_updates.sql`.

### Vercel setup

1. Framework preset: **Vite**.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - Firebase `VITE_*` keys for push notifications.

Because backend routes live in `/api`, Vercel will deploy them as Serverless Functions automatically.

## License

This project does not currently include a license file. Add one if you plan to distribute the code.
