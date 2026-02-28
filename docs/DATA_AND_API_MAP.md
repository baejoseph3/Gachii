# DATA_AND_API_MAP

## Schema and data model notes

### Source-of-truth posture
- `OriginalFiles/src/db/schema_updates.sql` is treated as a **historical hint**, not guaranteed source-of-truth.
- Source-of-truth for migration execution should come from a fresh schema export directly from Neon at migration time.

### Explicitly observed tables (tracked SQL)
- `workout_comments`
- `push_tokens`
- `friend_notification_settings`
- `scheduled_workouts`
- `custom_routines`
- `exercises`
- `achievement_definitions`
- `user_achievements`

### Strongly implied core tables (API query references)
- `users`
- `workouts`
- `workout_exercises`
- `exercise_sets`
- `friendships`

### Relationship/model signals
- Workouts include nested exercises and sets (transactional save behavior).
- Social graph drives friend requests, feed visibility, and per-friend notification settings.
- Achievements depend on definition table + user achievement join/progress table.
- Scheduled workouts can include invited friends and planned exercises.

---

## Backend/API touchpoints discovered in Phase 0

### Legacy frontend API surface (`/api/*` via `OriginalFiles/src/services/api.js`)
- `auth`: login/register/me/settings
- `workouts`: save/list/update/comment(delete/add)/delete
- `friends`: search/send-request/requests/respond/list/notifications/profile/feed/remove
- `exercises`: list/save/update/delete
- `custom-routines`: list/save/update/delete
- `scheduled-workouts`: list/create/delete
- `achievements`: list/definition (admin write path)
- `admin`: list/add/remove/push-test
- `notifications`: register-token/unregister-token

### Legacy serverless endpoint groups (Vercel functions)
- `OriginalFiles/api/auth/[action].js`
- `OriginalFiles/api/workouts/[action].js`
- `OriginalFiles/api/exercises/[action].js`
- `OriginalFiles/api/custom-routines/[action].js`
- `OriginalFiles/api/friends/[action].js`
- `OriginalFiles/api/scheduled-workouts/[action].js`
- `OriginalFiles/api/notifications/[action].js`
- `OriginalFiles/api/achievements/[action].js`
- `OriginalFiles/api/admin/[action].js`
- Shared server libs: `OriginalFiles/api/_lib/*` (auth, response envelope, workout hydration)
- DB client: `OriginalFiles/src/db/client.js` (`pg` + `DATABASE_URL`)

---

## Legacy → Supabase mapping (planned)

| Legacy touchpoint | Supabase equivalent |
|---|---|
| `/api/auth/*` with custom JWT + `JWT_SECRET` | Supabase Auth (GoTrue) sessions + profile/role table reads via PostgREST |
| `/api/workouts/*` CRUD + nested set writes | PostgREST for simple reads/writes; RPC for transactional save/update (`save_workout_with_sets(...)`) |
| `/api/friends/*` social graph and requests | PostgREST for base CRUD + RPC for multi-step actions (`respond_friend_request(...)`, feed assembly) |
| `/api/exercises/*` and `/api/custom-routines/*` | PostgREST table operations under RLS |
| `/api/scheduled-workouts/*` | PostgREST for CRUD; RPC if invite/plan persistence requires transactionality |
| `/api/achievements/*` | PostgREST reads for users; admin definition writes moved to privileged path |
| `/api/admin/*` (including push test) | Supabase Edge Functions for privileged/admin-only operations |
| `/api/notifications/*` token register/unregister | Supabase table writes for APNs device tokens (RLS-scoped), optional Edge Function for privileged send path |
| Server fan-out push logic | Edge Functions/provider-backed notification pipeline |
| Neon direct SQL via pooled `pg` | Supabase Postgres with RLS + RPC + Edge Functions |

### Candidate RPCs from Phase 0
- `save_workout_with_sets(...)` (transactional)
- `get_friends_feed(...)`
- `respond_friend_request(...)`
- `upsert_friend_notification_setting(...)`

---

## Supabase Target Patterns
- Client + RLS default: direct table access through Supabase client for standard user-scoped reads/writes.
- RPC for transactional workflows and aggregate/multi-step logic.
- Edge Functions for privileged/secret workflows (e.g., admin push test, provider-backed sends).

---

## Auth/session and environment contracts

### Legacy auth/session
- JWT access token signed with `JWT_SECRET` in auth API.
- Token persisted client-side in `localStorage` under `authToken`.
- Auth validation via Bearer token in API handlers.
- Additional inactivity-session semantics in `api/_lib/auth.js` via `users.last_active_at`.

### Target auth/session
- Replace custom JWT issuance with Supabase Auth sessions.
- iOS session persistence in Keychain-backed storage only.
- Map legacy fields (`share_workouts`, `is_admin`) into profile/role tables.
- Remove legacy inactivity-expiration policy (`last_active_at` checks); use Supabase-managed session refresh lifecycle.

### Environment
- Legacy frontend env: Firebase web keys (`VITE_FIREBASE_*`) + build version (`VITE_APP_VERSION`).
- Legacy backend env: `DATABASE_URL`, `JWT_SECRET`, Firebase service account JSON.
- Target iOS env posture: Supabase URL + anon key only; never ship service-role key in iOS client.

---

## Migration runbook (schema/data export/import)

### Neon exports
1. Get Neon pooled/direct connection string from Neon Console.
2. Schema-only export:
   ```bash
   pg_dump "$NEON_DATABASE_URL" --schema-only --no-owner --no-privileges > neon_schema.sql
   ```
3. Data-only export:
   ```bash
   pg_dump "$NEON_DATABASE_URL" --data-only --inserts --no-owner --no-privileges > neon_data.sql
   ```
4. Table inventory:
   ```bash
   psql "$NEON_DATABASE_URL" -c "\dt" > neon_tables.txt
   ```
5. Index and constraint summaries:
   ```bash
   psql "$NEON_DATABASE_URL" -c "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY tablename, indexname;" > neon_indexes.txt
   psql "$NEON_DATABASE_URL" -c "SELECT tc.table_name, tc.constraint_name, tc.constraint_type FROM information_schema.table_constraints tc WHERE tc.table_schema='public' ORDER BY tc.table_name, tc.constraint_type;" > neon_constraints.txt
   ```

### Supabase migration/import notes
- Recreate core tables/constraints/indexes from Neon-derived canonical exports.
- Add parity fields (cardio set fields, notes, idempotency key) and audit timestamps where missing.
- Use UUID identifiers as canonical IDs across migrated entities.
- Import in idempotent chunks and verify row counts/checksum spot checks table-by-table.
