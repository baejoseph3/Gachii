# MIGRATION_SPEC

## Source of Truth
This migration is now split across the following documents under `/docs`:
- `MIGRATION_SPEC.md` (constitution: goals, constraints, standards, phases, and definition of done)
- `FEATURE_INVENTORY.md` (canonical per-view feature parity checklist)
- `DATA_AND_API_MAP.md` (schema/data model map and backend/API migration mapping)
- `OPEN_QUESTIONS.md` (open questions, risks, and assumptions)
- `WEB_ONLY_DROPS.md` (web/PWA-specific logic and Firebase web messaging touchpoints to remove/replace)

Future phases must follow these documents and keep them updated as decisions are made.

---

## Scope and constraints followed
- Audited legacy implementation **only** from `OriginalFiles/` as migration source-of-truth.
- Produced migration planning artifacts **outside** `OriginalFiles/`.
- This phase contains discovery/planning only (no iOS runtime implementation yet).

---

## OriginalFiles Audit Summary

### Frontend entrypoints and navigation topology
- Root orchestration is in `OriginalFiles/src/App.jsx` with auth state, tab state, workout lifecycle state, and API orchestration in one component.
- Mobile tab map (`activeTab`) currently includes: `workout`, `social`, `calendar`, `progress`, `profile`.
- Desktop tab map (`currentTab`) currently includes: `workouts`, `social`, `calendar`, `progress`, `profile`, and conditional `admin`.
- Naming conflict confirmed: both `DashboardView` (workout home/overview) and `WorkoutView` (active workout session) coexist.

### Primary view source files (required canonical iOS map)
- Workout domain currently spans:
  - `OriginalFiles/src/components/views/DashboardView.jsx` (workout home + routines)
  - `OriginalFiles/src/components/views/WorkoutView.jsx` (active workout session)
- Social: `OriginalFiles/src/components/views/SocialView.jsx`
- Calendar: `OriginalFiles/src/components/views/CalendarView.jsx`
- Progress: `OriginalFiles/src/components/views/ProgressView.jsx`
- Profile: `OriginalFiles/src/components/views/ProfileView.jsx`

### Runtime/deployment config signals
- Vite SPA + serverless APIs (`OriginalFiles/package.json`, `OriginalFiles/vite.config.js`).
- Vercel commit SHA used in versioning (`VERCEL_GIT_COMMIT_SHA`).
- Firebase web push in browser/service worker:
  - `OriginalFiles/src/services/pushNotifications.js`
  - `OriginalFiles/public/firebase-messaging-sw.js`
  - `OriginalFiles/public/manifest.webmanifest`

---

## Feature parity matrix (web → native iOS)

| Web capability | iOS target screen/flow | Priority |
|---|---|---|
| Dashboard workout home (`DashboardView`) | `WorkoutView` home state (renamed canonical) | P0 |
| Active workout session (`WorkoutView`) | `WorkoutView` active session state | P0 |
| Workout history CRUD/repeat | `WorkoutView` + reusable workout detail flow | P0 |
| Custom routines CRUD/start | `WorkoutView` routine subflow + shared routine picker | P1 |
| Social feed/comments/friends/requests | `SocialView` tabbed subflows | P1 |
| Calendar scheduling + plan builder | `CalendarView` | P1 |
| Profile settings/share preference | `ProfileView` | P0 |
| Achievements (currently in Profile) | `ProfileView` | P1 |
| Progress metrics cards | `ProgressView` | P2 |
| Admin tools | Guarded admin flow from `ProfileView` settings; v1 scope = read-only observability dashboards only | P2 |

**Admin v1 read-only observability scope**
- Users list (read-only): `id`, `displayName`, `username`, `role`, `createdAt`, `lastActiveAt`, `status` (`email` only if operationally required).
- Workouts list (read-only): `id`, `user`, `occurredAt`, `type/title`, `duration`, `exerciseCount`, `createdAt`.
- Common filters (read-only): time range, role/status, basic search.
- Required aggregates (read-only): new users (7d), workouts (7d), social-feed workouts (7d).
- Out of scope for v1: all admin mutations (promotion/demotion, broadcast notifications, test pushes, or any write action).

---

## Architecture standards and migration blueprint

### 1) Target architecture
- iOS app (SwiftUI) uses Supabase client with:
  - Supabase Auth (GoTrue)
  - PostgREST queries/RPC
  - Realtime optional (future)
- Privileged operations moved to Supabase Edge Functions when RLS alone is insufficient.
- Remove dependency on Vercel serverless route multiplexers.

### 2) Schema migration strategy
- **Do not rely exclusively on repository migration files** for final schema shape; pull canonical schema directly from Neon before writing Supabase migrations.
- Create versioned SQL migrations for Supabase Postgres that:
  1. Recreate core tables from Neon source-of-truth (`users`-adjacent profile table, workouts/exercises/sets/comments/friendships/scheduled_workouts/custom_routines/achievements).
  2. Add constraints and indexes mirroring current production behavior.
  3. Add compatibility fields required for parity (e.g., cardio set fields, notes, client idempotency key).
  4. Add immutable audit timestamps where missing.
- Use UUID identifiers as the canonical strategy for all migrated entities (no legacy int-ID compatibility required).

### 2.1) How to export canonical schema directly from Neon (operator runbook)
1. Get your Neon pooled/direct connection string from Neon Console (Project → Connection Details).
2. Export schema-only SQL (no data):
   ```bash
   pg_dump "$NEON_DATABASE_URL" --schema-only --no-owner --no-privileges > neon_schema.sql
   ```
3. Export data-only snapshot (for later import testing):
   ```bash
   pg_dump "$NEON_DATABASE_URL" --data-only --inserts --no-owner --no-privileges > neon_data.sql
   ```
4. Export table inventory for quick diffing:
   ```bash
   psql "$NEON_DATABASE_URL" -c "\dt" > neon_tables.txt
   ```
5. (Recommended) Export indexes/constraints summary:
   ```bash
   psql "$NEON_DATABASE_URL" -c "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY tablename, indexname;" > neon_indexes.txt
   psql "$NEON_DATABASE_URL" -c "SELECT tc.table_name, tc.constraint_name, tc.constraint_type FROM information_schema.table_constraints tc WHERE tc.table_schema='public' ORDER BY tc.table_name, tc.constraint_type;" > neon_constraints.txt
   ```
6. Use these exports as migration source-of-truth and treat `OriginalFiles/src/db/schema_updates.sql` as supplemental historical context only.

### 3) Data migration strategy (Neon export → Supabase import)
- Export: use the Neon runbook above (`neon_schema.sql` + `neon_data.sql`) as canonical artifacts.
- Transform:
  - map auth identity from legacy `users` to Supabase Auth users + profile table,
  - ensure JSON fields valid for Supabase import.
- Import via `psql`/Supabase SQL editor in idempotent chunks.
- Verify row counts + checksum spot checks per table using the exported Neon artifacts as baseline.

### 4) Auth/session migration strategy
- Replace custom JWT issuance with Supabase Auth sessions.
- iOS session persistence in Keychain-backed storage only.
- Map legacy fields (`share_workouts`, `is_admin`) into profile/role tables.
- Remove legacy inactivity-expiration policy (`last_active_at` checks). Use Supabase-managed session refresh lifecycle.

### 5) API migration strategy
- Replace each `/api/*` route with one of:
  - direct table query via Supabase client under RLS,
  - SQL function (RPC) for aggregate/transaction workflows,
  - Edge Function for privileged multi-step operations (e.g., admin push test).
- Candidate RPCs:
  - `save_workout_with_sets(...)` (transactional)
  - `get_friends_feed(...)`
  - `respond_friend_request(...)`
  - `upsert_friend_notification_setting(...)`

### 6) Security / RLS baseline
- Enable RLS on all user-owned tables.
- Policies by ownership (`auth.uid() = user_id`) and relationship-based read access (friends feed/profile).
- Separate admin claims/roles for admin-only operations.
- Never ship service-role key in iOS client; only URL + anon key in app config.

### 6.1) Identifier strategy
- Use UUID primary keys across Supabase schema for all migrated entities.
- No legacy integer-ID interoperability constraints are required for iOS migration target.

### 7) Notification migration strategy (native iOS)
- Replace Firebase web push with APNs-native flow:
  - permission prompt strategy (`UNUserNotificationCenter`),
  - APNs token registration to Supabase table,
  - notification delivery path via Edge Function/provider,
  - deep-link destination payload mapping to canonical views.
- Keep v1 implementation intentionally simple: native registration + token persistence + routing scaffolding; advanced server scenarios deferred.
- Add a **single** pre-permission soft-ask screen before the iOS system prompt (English-only in v1 unless the app is already localized).
- Approved soft-ask copy:
  - Title: “Stay in the loop?”
  - Body: “Enable notifications for workout reminders and updates from friends (likes, comments, and new activity). You can change this anytime in Settings.”
  - Actions: “Not now” / “Enable notifications”
- Ensure `Info.plist` notification purpose string and App Store privacy disclosures align with actual notification usage.

### 8) Cutover plan
1. Stand up Supabase schema + RLS in staging.
2. Backfill data from Neon snapshot.
3. Point iOS dev build to Supabase staging.
4. Validate read/write parity for P0/P1 workflows.
5. Freeze legacy writes, perform delta migration, cut production traffic.

---

## Phase plan
- Phase 0: discovery/planning only (complete).
- Later phases: execute migration and iOS implementation according to this split documentation set.

## Required output format (for future phases)
- Keep canonical view naming: `WorkoutView`, `SocialView`, `CalendarView`, `ProgressView`, `ProfileView`.
- Keep updates split by document role:
  - feature changes in `FEATURE_INVENTORY.md`,
  - data/API changes in `DATA_AND_API_MAP.md`,
  - decisions/risks/questions in `OPEN_QUESTIONS.md`,
  - web/PWA removals in `WEB_ONLY_DROPS.md`,
  - constitutional updates in `MIGRATION_SPEC.md`.

## Definition of done
- Migration work is done only when:
  - parity features are implemented per agreed status transitions,
  - Supabase schema/RLS/API replacements are in place,
  - web-only/PWA logic is removed from native scope,
  - unresolved questions are closed or explicitly deferred with phase ownership,
  - docs in `/docs` reflect the current, accurate state.

---

## Docs vs Source Discrepancy Report

1. README claims Progress view loads achievements; source shows achievements loaded in **ProfileView**, while `ProgressView` only shows computed workout metrics.
2. README “major views” list omits `CalendarView`, `AdminView`, and dual desktop-specific view files, which are active in `App.jsx` navigation.
3. README frames “dashboard analytics” as central; source shows workout home includes substantial routine CRUD/workout-start orchestration beyond analytics.
4. README suggests normalized API envelopes; source still contains mixed endpoint styles (`api/notifications/[action].js` returns legacy `{ message }` directly).

### Decision updates from product direction
- Achievements remain in `ProfileView` for native migration parity.
- Inactivity-based forced logout is removed; Supabase session refresh is authoritative.
- Admin tooling remains available in iOS through Profile settings only for admin users.
- Admin capability rollout is tiered: initial App Store build includes read-only observability dashboards only (users/workouts); mutating admin operations are deferred until RLS/Edge hardening, audit logs, rate limits, and guarded confirmation UX are in place.
- Notifications strategy is Apple-native push with a single pre-permission soft ask and approved v1 copy/actions.
- Workout reminders are confirmed as in-scope for v1 notifications and should remain in soft-ask copy.
- Reports/flags queue is out of scope for v1 (no reports/flags entity planned in initial schema).
- Social feed is intentionally workout-centric only (current user and friends' workouts) and does not include arbitrary/free-form user posts.
- Supabase migration may fully transition to UUID identifiers.
