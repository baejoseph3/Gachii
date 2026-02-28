# Prompt for Agentic Coding LLM: Rewrite Spotter to Native iOS (Swift) + Supabase

You are a senior iOS engineer, mobile architect, and migration lead.

Your task is to **rewrite the existing Spotter React/PWA application into a native iOS app using Swift**, prepared for **App Store submission**.

You must execute this as a **strict phased migration**, implementing one part at a time (not all at once), with clear deliverables and validation for each phase.

---

## Primary Goals

1. Build a production-ready native iOS app using **Swift + SwiftUI**.
2. Preserve feature parity with the existing web app where appropriate.
3. **Migrate backend/data from Vercel + Neon to Supabase**:
   - Use Supabase Postgres as the system of record.
   - Replace Vercel serverless API dependencies with Supabase-native patterns (Supabase Auth, PostgREST, RPC, Edge Functions when required).
4. Remove web/PWA-only logic that does not apply to native iOS.
5. Enforce modular, reusable UI and feature architecture.
6. Deliver incremental progress with tests/checks after each phase.

---

## Operating Constraints (Must Follow)
- Work in phases; **HARD STOP** after completing the current phase deliverables.
- Treat `/OriginalFiles` as read-only; modifying it is a failure.
- Implement only outside `/OriginalFiles` (`App/`, `Core/`, `DesignSystem/`, `Features/`, `Shared/`, `Resources/`, `Tests/`).
- Do not invent features or schema; if unclear, log it as an open question and add only a minimal stub.
- Keep the project building; prefer small, reviewable changes.
- No web/PWA code paths, service workers, or Firebase web messaging in the iOS app.
- Never include Supabase service-role keys; only Supabase URL + anon key are client-allowed.
- Follow the required output format exactly.

---

## Canonical App View Map (Must Use)

The app has five primary user-facing views. Use these names consistently in code, documentation, and navigation:

1. `WorkoutView`
2. `SocialView`
3. `CalendarView`
4. `ProgressView`
5. `ProfileView`

**Naming correction requirement:**
- If the current codebase uses `DashboardView` to represent the workout screen, rename it to `WorkoutView` and update all references (routes, coordinators, tests, previews, and file names).
- Avoid legacy naming aliases after migration unless required for temporary compatibility during phased refactors.

## Audit Ground Truth Rule (Do Not Rely Solely on README)

- Treat `README` and other high-level docs as **potentially stale guidance**, not absolute truth.
- In Phase 0, perform a **full-scope source audit** of the original application to establish ground truth.
- Audit must include frontend, backend/services, database integrations, and deployment/runtime config (including existing Neon Postgres usage and Vercel/serverless paths) before planning migration to Supabase.
- When docs conflict with code/config, trust code/config and explicitly document discrepancies.

---

## Repository Layout Rule: `OriginalFiles/` Source Audit

In the new repo, legacy source files will be provided under an `OriginalFiles/` directory.

You must follow these rules:
- Treat `OriginalFiles/` as **read-only migration source material**.
- In **Phase 0**, audit the files under `OriginalFiles/` to discover routes, views, features, API touchpoints, and web-only logic.
- Build all new Swift/SwiftUI implementation files **outside** `OriginalFiles/` (for example: `App/`, `Core/`, `DesignSystem/`, `Features/`, `Shared/`, `Resources/`, `Tests/`).
- Do not place new production iOS code inside `OriginalFiles/`.
- If temporary mapping notes are needed, place them in dedicated migration docs outside `OriginalFiles/`.

---

## Non-Negotiable Constraints

- Do **not** do a big-bang rewrite.
- Implement migration by view/feature slices in priority order, not all at once.
- Enforce canonical naming: `WorkoutView`, `SocialView`, `CalendarView`, `ProgressView`, `ProfileView` (rename legacy `DashboardView` to `WorkoutView`).
- Work in phases and stop after each phase with implementation summary + build/test status.
- Audit only `OriginalFiles/` for legacy discovery; write all new app code outside `OriginalFiles/`.
- Replace Firebase web notification implementation with **native iOS notifications** (`UserNotifications`, APNs flow as needed).
- Remove PWA/browser-only resilience code, including:
  - service worker dependencies,
  - install/update prompts,
  - visibility/reload hacks,
  - random refresh/close mitigations specific to browser runtime.
- Do not expose Supabase service-role keys in the client app.

---

## Required iOS Architecture & Coding Standards

### Stack
- Swift 6.0+
- iOS 18.0+ deployment target (latest stable baseline)
- SwiftUI + MVVM (or Clean Architecture style)
- Async/await
- Centralized API/data layer
- Strongly typed models (`Codable`)
- Typed error handling
- Keychain for sensitive credentials/tokens


### UI Framework Migration Rules (React/Tailwind/Lucide → SwiftUI)
- Do not port TailwindCSS classes directly; translate styling intent into SwiftUI tokens, modifiers, and reusable style abstractions.
- Replace Lucide icon usage with native iOS/SF Symbols-first iconography (or approved custom asset set only when needed).
- Convert web utility-style patterns into a SwiftUI `DesignSystem` with semantic tokens (color, type scale, spacing, corner radius, elevation).
- Ensure all migrated UI follows native SwiftUI composition patterns instead of web-centric component assumptions.

### Feature-First Structure
Use this structure (or equivalent):

- `App/` (entrypoint, app lifecycle, dependency container, root navigation)
- `Core/` (networking, supabase client, session/auth, storage, telemetry, utils)
- `DesignSystem/` (tokens, spacing, typography, reusable layout modifiers, primitives)
- `Features/<FeatureName>/` (views, view models, models, services, coordinators)
- `Shared/` (cross-feature components and utilities)
- `Resources/` (assets, localization, plist configs)
- `Tests/` (unit/integration/UI)

### Mandatory Reusability Rules
You must explicitly implement reusable design/layout primitives for consistency:

1. **Layout tokens** (single source of truth), e.g.
   - header font sizes/weights
   - footer spacing
   - padding below headers
   - padding above footers
   - card horizontal/vertical padding
2. **Shared view wrappers/modifiers**, e.g.
   - `ScreenContainer` (safe-area + common content padding)
   - `HeaderBlock` (title/subtitle/standard spacing)
   - `CardContainer` (shared card style + spacing)
3. **Shared reusable UI primitives and theme styles** (must live in `DesignSystem`), including:
   - chip-style cards / badges,
   - primary/secondary/destructive button styles,
   - semantic color roles (brand, surface, text, status),
   - standardized title/text styles,
   - reusable icon treatment and sizing conventions.
4. **Shared flows/coordinators** for destinations reachable from multiple entry points:
   - Audit the app for screens/flows reached from different user paths.
   - Implement one reusable flow/screen + parameterized entry context instead of duplicating UI or logic.
   - Apply this pattern broadly across features to ensure cross-view consistency.
5. Keep business logic out of views; keep views thin.

---

## Supabase Migration Requirements (Replaces Vercel + Neon)

### Data/Backend Target State
- Move from Vercel API + Neon DB to **Supabase**.
- Use Supabase Postgres tables for persistence.
- Use one of these patterns:
  - direct client access through Supabase with strict RLS policies, and/or
  - Supabase Edge Functions for privileged workflows.

### Migration Plan Requirements
You must provide and execute migration steps for:

1. **Schema migration to Supabase Postgres**
   - Map current tables/indexes/constraints to Supabase.
   - Provide SQL migration files.
2. **Data migration**
   - Export from existing Neon DB and import to Supabase.
   - Include idempotent scripts/commands where possible.
3. **Auth migration strategy**
   - Map current auth/session behavior to Supabase Auth.
   - Document token/session handling in iOS.
4. **API migration**
   - Replace Vercel serverless calls with Supabase client queries/RPC/Edge Functions.
   - Remove dead Vercel API call paths from iOS migration scope.
5. **Security model**
   - RLS policies for each user-owned table.
   - Principle of least privilege.

### Supabase Environment & Secret Handling
- Client-safe values allowed in app config:
  - Supabase URL
  - Supabase anon key
- Sensitive values server-side only:
  - service-role key
  - any admin secrets

---

## Notifications Requirements

- Remove Firebase web messaging assumptions.
- Implement iOS-native notifications:
  - authorization prompt strategy,
  - APNs token registration scaffolding,
  - foreground/background/open handling,
  - deep-link navigation to destination screen.

---

## UX / Accessibility / Performance Requirements

- Native navigation patterns (`TabView`, `NavigationStack`)
- Dynamic Type support
- Dark mode support
- VoiceOver-friendly labels and traits
- 44pt minimum touch targets
- Loading / empty / error states with recovery actions
- Offline-aware messaging and graceful fallback
- Prefer reusable skeleton/loading components

---

## Sequential Execution Plan (Do Not Reorder)

After each phase, output:
- what was implemented,
- files created/changed (explicitly separate: any files read in `OriginalFiles/` vs newly created files outside `OriginalFiles/`),
- build/test results,
- risks/open questions,
- next phase plan.

### Phase 0 — Discovery + Parity + Migration Blueprint
1. Audit current React/PWA features and routes specifically from `OriginalFiles/`, using source code/config as ground truth (not README-only assumptions).
2. Produce a **View Feature Inventory** for each primary view (`WorkoutView`, `SocialView`, `CalendarView`, `ProgressView`, `ProfileView`) listing **all discovered features** in that view.
3. Produce feature parity matrix (web feature → iOS screen/flow → priority), explicitly mapping the five primary views.
4. Identify all PWA-only logic to drop.
5. Identify Firebase touchpoints to replace.
6. Audit backend/services and infrastructure dependencies in the original app (API surfaces, Vercel serverless functions, Neon/Postgres usage, env var contracts, auth/session flows).
7. Produce Vercel+Neon → Supabase migration blueprint.

### Phase 1 — Foundation (iOS + Design System)
1. Initialize iOS project structure.
2. Add dependency container and root navigation shell.
3. Build design tokens + reusable layout primitives:
   - header/footer sizes/padding,
   - shared card spacing,
   - safe-area screen container.
4. Build base shared UI primitives (chip cards, buttons, colors, titles, icon styles) in `DesignSystem`.
5. Perform foundational naming cleanup: rename legacy `DashboardView` artifacts to `WorkoutView` artifacts and update references.

### Phase 2 — Supabase Core Integration
1. Configure Supabase client layer in iOS.
2. Add env/config strategy for dev/staging/prod.
3. Implement auth/session manager (Keychain-backed).
4. Implement common query/error mapping utilities.
5. Add tests for Supabase client wrappers and session handling.

### Phase 3 — Database + Backend Migration to Supabase
1. Create SQL schema migration scripts.
2. Migrate data from Neon to Supabase.
3. Implement/verify RLS policies.
4. Replace Vercel API dependencies with Supabase access pattern.
5. Validate parity with core read/write workflows.

### Phase 4 — Auth + Core Flows
1. Implement auth UI and lifecycle with Supabase Auth.
2. Identify high-traffic destinations reachable from multiple user entry points.
3. Implement shared reusable flow coordinators/screens for those destinations, parameterized by entry context.
4. Remove duplicated screens/view models where a reusable flow can be used.
5. Add unit tests for flow logic and state transitions.

### Phase 5 — View-by-View Feature Migration (One View at a Time)
Implement the five primary views in this priority order:
1. `WorkoutView` (highest priority)
2. `SocialView`
3. `CalendarView`
4. `ProgressView`
5. `ProfileView`

For each view, complete all steps before moving to the next view:
1. Build service + model layer.
2. Build view model state machine.
3. Build SwiftUI screens with shared design primitives.
4. Wire navigation/deep links and shared reusable flows.
5. Add tests.
6. Validate against Supabase backend.
7. Check naming consistency (no legacy `DashboardView` references for workout features).

Do not begin next view until current view passes checks.

### Phase 6 — Notifications + Removal of Web-Only Concerns
1. Implement native iOS notifications and deep-link routing.
2. Remove any residual Firebase web messaging assumptions.
3. Remove all PWA-specific lifecycle/update/install/refresh logic.
4. Use native lifecycle hooks (`scenePhase`) only where needed.

### Phase 7 — Hardening + App Store Readiness
1. Accessibility/performance pass.
2. Release configuration and signing setup.
3. Info.plist privacy strings and required app metadata.
4. TestFlight-ready checklist.
5. Final migration report with:
   - feature parity status,
   - Supabase migration status,
   - removed web-only items,
   - known gaps and next actions.

---

## Required Output Format (Every Response)

Use these exact sections:

1. **Phase Goal**
2. **Implementation Steps Executed**
3. **Files Added/Changed**
4. **Critical Code Snippets**
5. **Build/Test Results**
6. **Risks/Assumptions**
7. **Next Phase**
8. **Why this ordering**

Additional mandatory reporting rules:
- Include a **Per-View Feature Checklist** that lists every feature discovered/implemented for each of the five primary views.
- For Phase 0, this checklist must be exhaustive discovery output so missing features can be reviewed.
- For later phases, update the checklist status (`not started`, `in progress`, `implemented`, `deferred`) per feature.
- Include an **OriginalFiles Audit Summary** in Phase 0 with per-view source file references from `OriginalFiles/`.
- Include a **Docs vs Source Discrepancy Report** in Phase 0 (e.g., README claims vs actual frontend/backend/database code paths).

---

## Definition of Done

Migration is complete only when all are true:

- Core product features are implemented natively in SwiftUI.
- A complete per-view feature inventory is documented and tracked so every discovered web feature is either implemented, intentionally deferred, or explicitly dropped with rationale.
- Full-scope audit coverage is completed across original frontend, backend/services, and database integrations, with README/doc discrepancies explicitly resolved.
- Shared modular design system + reusable layout primitives are in place and used consistently.
- TailwindCSS/Lucide-derived UI is fully adapted to native SwiftUI design-system primitives and SF Symbols-oriented iconography.
- Canonical view naming is enforced (`WorkoutView`, `SocialView`, `CalendarView`, `ProgressView`, `ProfileView`), and legacy `DashboardView` naming is removed or fully migrated.
- Repeated-entry flows are implemented via shared reusable flow/screen logic wherever a destination is reachable from multiple paths.
- Backend/data stack is migrated to Supabase (DB + access paths), with RLS and secure secret handling.
- Firebase web messaging is replaced with native iOS notification handling.
- PWA-specific logic is removed from migration scope.
- Legacy `OriginalFiles/` content is preserved as source reference; all new iOS implementation lives outside `OriginalFiles/`.
- App builds in Release and is ready for TestFlight/App Store submission.
