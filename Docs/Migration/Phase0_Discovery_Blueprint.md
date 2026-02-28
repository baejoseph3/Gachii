# Phase 0 — Discovery, Feature Parity, and Supabase Migration Blueprint

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

### Backend/services audit (legacy Vercel + Postgres)
- API surface via `OriginalFiles/src/services/api.js` under `/api/*`.
- Serverless handlers (action multiplexer pattern) under:
  - `OriginalFiles/api/auth/[action].js`
  - `OriginalFiles/api/workouts/[action].js`
  - `OriginalFiles/api/exercises/[action].js`
  - `OriginalFiles/api/custom-routines/[action].js`
  - `OriginalFiles/api/friends/[action].js`
  - `OriginalFiles/api/scheduled-workouts/[action].js`
  - `OriginalFiles/api/notifications/[action].js`
  - `OriginalFiles/api/achievements/[action].js`
  - `OriginalFiles/api/admin/[action].js`
- Shared server libs in `OriginalFiles/api/_lib/*` (auth, response envelope, workout hydration).
- DB client uses `pg` + `DATABASE_URL` in `OriginalFiles/src/db/client.js`.

### DB schema and data model signals
- `OriginalFiles/src/db/schema_updates.sql` is treated as a **historical hint**, not guaranteed source-of-truth.
- Source-of-truth for migration execution should come from a fresh schema export directly from Neon at migration time.
- From repository evidence, explicitly created tables in the tracked SQL include:
  - `workout_comments`, `push_tokens`, `friend_notification_settings`, `scheduled_workouts`, `custom_routines`, `exercises`, `achievement_definitions`, `user_achievements`.
- Additional strongly implied core tables referenced by API queries:
  - `users`, `workouts`, `workout_exercises`, `exercise_sets`, `friendships`.

### Runtime/deployment config signals
- Vite SPA + serverless APIs (`OriginalFiles/package.json`, `OriginalFiles/vite.config.js`).
- Vercel commit SHA used in versioning (`VERCEL_GIT_COMMIT_SHA`).
- Firebase web push in browser/service worker:
  - `OriginalFiles/src/services/pushNotifications.js`
  - `OriginalFiles/public/firebase-messaging-sw.js`
  - `OriginalFiles/public/manifest.webmanifest`

---

## Per-View Feature Checklist (Phase 0 exhaustive discovery)
Status legend for Phase 0: **discovered** (nothing implemented in iOS yet).

### 1) WorkoutView (canonical target; includes legacy Dashboard workout home)
- [discovered] Start new workout / continue active workout.
- [discovered] Active workout timer, pause/resume behavior, elapsed persistence.
- [discovered] Add exercise from grouped library and search.
- [discovered] Create custom exercise from add-exercise flow.
- [discovered] Swap exercises in-place.
- [discovered] Strength and cardio set entry (reps/weight or duration/distance).
- [discovered] Remove set / remove exercise / reorder exercise.
- [discovered] Unit toggle for cardio distance.
- [discovered] Per-exercise notes.
- [discovered] Finish workout with optional share-to-feed.
- [discovered] Workout history list with edit/delete/repeat.
- [discovered] Pull-to-refresh on workout home.
- [discovered] Today scheduled workout quick-start.
- [discovered] Routine management flow (list/create/edit/delete/start routine).
- [discovered] Routine exercise picker with search + grouped folders.
- [discovered] Manage exercise library entry point.

### 2) SocialView
- [discovered] Feed tab for friends’ workouts.
- [discovered] Pull-to-refresh on feed.
- [discovered] Workout comments add/delete in feed cards.
- [discovered] Friends tab with friend list.
- [discovered] Add tab with user search by username/email.
- [discovered] Send friend requests.
- [discovered] View/respond to incoming friend requests.
- [discovered] Friend profile modal with stats.
- [discovered] Remove friend flow with confirmation modal.
- [discovered] Per-friend workout notification toggle.

### 3) CalendarView
- [discovered] Week-strip calendar browsing with day selection.
- [discovered] Daily timeline combining scheduled + logged workouts.
- [discovered] Create scheduled workout with title/date/time/duration.
- [discovered] Invite/select friends for scheduled workout.
- [discovered] Build planned exercises for scheduled workout.
- [discovered] Exercise list flow with grouped folders + search.
- [discovered] Inline create custom exercise modal in planning flow.
- [discovered] Delete scheduled workout.
- [discovered] Choose workout from custom routines.
- [discovered] Create routine from calendar path.
- [discovered] Full-screen flow state propagation to parent shell.

### 4) ProgressView
- [discovered] Aggregate metrics cards:
  - total workouts,
  - weekly workouts,
  - total volume,
  - weekly volume.
- [discovered] Non-functional placeholder buttons:
  - “Exercise Progress”,
  - “Exercise History”.

### 5) ProfileView
- [discovered] User profile header.
- [discovered] Settings sheet/modal with logout.
- [discovered] Toggle share workouts preference.
- [discovered] Push enable/disable actions + status display.
- [discovered] Achievement list with filters (achieved/not achieved/all).
- [discovered] Achievement loading/error/retry states.
- [discovered] Conditional admin tooling entrypoint from Profile settings (admin users only).
- [discovered] Admin area scope separation (initial iOS admin scope is read-only observability; all mutations deferred).
- [discovered] Notification permission UX requirement for single pre-permission soft ask screen with approved copy/actions.

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

## PWA/browser-only logic to drop in native iOS
- Service worker registration + messaging bootstrap.
- `firebase-messaging-sw.js` runtime behavior.
- Web app manifest install model (`manifest.webmanifest`).
- Browser localStorage token handling and active-workout snapshot handling (replace with Keychain + native persistence).
- Browser/mobile UA detection hooks (`useIsMobile`) and desktop/mobile split rendering.
- Touch-based custom pull-to-refresh mechanics tied to `window.scrollY`.
- Any visibility/reload/browser lifecycle mitigation patterns tied to PWA runtime assumptions.

---

## Firebase touchpoints to replace with iOS-native notifications
- Frontend Firebase initialization and messaging support checks in `src/services/pushNotifications.js`.
- Public service worker push/click handlers in `public/firebase-messaging-sw.js`.
- Backend Firebase Admin multicast sender in `api/notifications/firebase.js` and admin push test path in `api/admin/[action].js`.
- Token register/unregister endpoint contracts in `api/notifications/[action].js` should be replaced with APNs/Supabase-compatible device registration model.

---

## Backend/infrastructure dependency inventory (Vercel + Neon posture)

### Auth/session
- JWT access token signed with `JWT_SECRET` in auth API.
- Token persisted client-side in `localStorage` under `authToken`.
- Auth validation via Bearer token in API handlers.
- Additional inactivity-session semantics in `api/_lib/auth.js` via `users.last_active_at`.

### API surfaces currently used by frontend
- `auth`: login/register/me/settings
- `workouts`: save/list/update/comment(delete/add)/delete
- `friends`: search/send-request/requests/respond/list/notifications/profile/feed/remove
- `exercises`: list/save/update/delete
- `custom-routines`: list/save/update/delete
- `scheduled-workouts`: list/create/delete
- `achievements`: list/definition (admin write path)
- `admin`: list/add/remove/push-test
- `notifications`: register-token/unregister-token

### Data access pattern
- Direct SQL in handlers through pooled `pg` client.
- Some transactional writes (e.g., workout save with exercises + sets).
- Server-side fan-out push logic after workout save/friend request.

### Environment contract
- Frontend env: Firebase web keys (`VITE_FIREBASE_*`) + build version (`VITE_APP_VERSION`).
- Backend env: `DATABASE_URL`, `JWT_SECRET`, Firebase service account JSON.

---

## Vercel + Neon → Supabase migration blueprint

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

---

## Open questions / assumptions blocking later phases
- None at this time for Phase 0 scope. Admin observability remains intentionally basic for v1 and advanced metrics are deferred to a later phase.
