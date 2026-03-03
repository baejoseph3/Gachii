# Phase 2 — Supabase Core Integration Report

## 1. **Phase Goal**
Implement the core Supabase integration foundation for iOS with environment-aware configuration, typed client wrappers, a Keychain-backed auth session manager, and deterministic unit tests.

## 2. **Implementation Steps Executed**
1. Added environment/config modeling (`development`, `staging`, `production`) and Supabase URL/anon-key loading.
2. Added a typed Supabase transport/client abstraction with centralized error mapping.
3. Added API error mapping utilities for status codes and low-level networking/decoding errors.
4. Added Keychain-backed token storage (`SessionTokenStoring`) and an `AuthSessionManager` implementation of `AuthSessionProviding`.
5. Wired `AppContainer.live` to initialize config, client transport, and auth manager.
6. Added unit tests for config parsing, session refresh/sign-out behavior, and Supabase client wrapper behavior.

## 3. **Files Added/Changed**
### Added
- `iOSApp/Core/Config/AppEnvironment.swift`
- `iOSApp/Core/Errors/APIError.swift`
- `iOSApp/Core/Supabase/SupabaseClient.swift`
- `iOSApp/Core/Auth/SessionTokenStore.swift`
- `iOSApp/Core/Auth/AuthSessionManager.swift`
- `iOSApp/GachiiTests/AppConfigTests.swift`
- `iOSApp/GachiiTests/AuthSessionManagerTests.swift`
- `iOSApp/GachiiTests/SupabaseClientTests.swift`
- `Docs/Phase2_Supabase_Core_Integration_Report.md`

### Updated
- `iOSApp/Core/DI/AppContainer.swift`

## 4. **Critical Code Snippets**
### Environment-aware config
```swift
let rawEnvironment = values["GACHII_ENV"] ?? AppEnvironment.development.rawValue
let urlKey = "SUPABASE_URL_\(environment.rawValue.uppercased())"
let anonKeyKey = "SUPABASE_ANON_KEY_\(environment.rawValue.uppercased())"
```

### Typed Supabase wrapper + error mapping
```swift
guard (200...299).contains(response.statusCode) else {
    throw APIErrorMapper.map(statusCode: response.statusCode)
}
```

### Keychain-backed session state
```swift
final class AuthSessionManager: AuthSessionProviding {
    private let tokenStore: SessionTokenStoring
    private let authService: SupabaseAuthServicing
}
```

## 5. **Build/Test Results**
- ✅ Naming guardrail script passes.
- ⚠️ Full iOS build/test (`xcodebuild`) cannot run in this Linux container.

## 6. **Risks/Assumptions**
- Assumes CI/macOS environment injects per-environment Supabase URL and anon-key values.
- Current `StubSupabaseAuthService` is a migration-safe placeholder until real Supabase Auth endpoints are wired.
- Keychain APIs are iOS runtime dependent and need full device/simulator validation in macOS CI.
- Follow-up hardening: app startup now avoids placeholder Supabase credentials and fails safely in unconfigured mode.

## 7. **Next Phase**
Proceed to **Phase 3 — Database + Backend Migration to Supabase**:
1. SQL schema migration scripts,
2. data migration validation path from Neon snapshots,
3. RLS policies,
4. repository-level replacement of Vercel API access paths.

## 8. **Why this ordering**
Phase 2 introduces secure session/config/client primitives first so data and feature migrations in subsequent phases can be built on stable, testable foundations without reworking cross-cutting infrastructure.

---

## Per-View Feature Checklist (Phase 2 status)

### WorkoutView
- Start/continue workout: **not started**
- Timer/pause/resume/persistence: **not started**
- Exercise add/create/swap/reorder/remove: **not started**
- Set entry and notes: **not started**
- Finish/share workflow: **not started**
- History edit/delete/repeat: **not started**
- Routine management: **not started**
- Foundation root shell + state architecture: **in progress**
- Supabase-ready infrastructure dependency surface: **in progress**

### SocialView
- Feed, comments, friends, requests, settings: **not started**
- Foundation root tab and navigation destination scaffolding: **in progress**
- Supabase-ready infrastructure dependency surface: **in progress**

### CalendarView
- Scheduling, invites, planned exercises, routine selection: **not started**
- Foundation root tab and navigation destination scaffolding: **in progress**
- Supabase-ready infrastructure dependency surface: **in progress**

### ProgressView
- Metrics/cards/charts/history/achievements: **not started**
- Foundation root tab and navigation destination scaffolding: **in progress**
- Supabase-ready infrastructure dependency surface: **in progress**

### ProfileView
- Profile editing, settings, sign out, account controls: **not started**
- Foundation root tab and navigation destination scaffolding: **in progress**
- Supabase-ready infrastructure dependency surface: **in progress**
