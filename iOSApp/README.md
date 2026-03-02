# Gachii iOS App

This directory contains the native iOS SwiftUI migration target. `OriginalFiles/` remains reference-only and untouched.

## Requirements

- Xcode 15+
- Swift 5.9+
- iOS deployment target: 17.0+

## Build / Run

1. Generate the Xcode project:
   ```bash
   cd iOSApp
   xcodegen generate
   ```
2. Open `Gachii.xcodeproj` in Xcode.
3. Select the `GachiiApp` scheme and run on an iOS simulator or device.
4. Run tests with `⌘U` (target: `GachiiTests`).

## Module Boundaries

- `App/`: app entrypoint + root composition.
- `Core/`: shared cross-cutting services (DI container, networking/auth/persistence abstractions).
- `DesignSystem/`: semantic design tokens and reusable UI primitives.
- `Features/`: feature-first vertical slices (`UI`, `ViewModel`, domain/data contracts per feature).
- `GachiiTests/`: unit tests for feature logic and shared services.

## Notes

- Keep business logic in ViewModels/services, not in SwiftUI views.
- Prefer explicit state enums for loading/empty/error/success flows.
- Phase tracking/reporting for migration foundation is documented in `Docs/Phase1_Foundation_Report.md`.

## Workout Feature Naming Guardrails

- New Swift files under `iOSApp/Features/Workout/` must use `Workout*` naming for feature-facing types (views, view models, and routes).
- Legacy workout-home naming is allowed only in migration discovery documentation and `OriginalFiles/` source citations.

## Repository Checks

From the repository root, run:

```bash
./scripts/check_no_legacy_dashboard_symbols.sh
```

This check fails if:
- new legacy workout-home symbols are introduced outside `OriginalFiles/` and discovery documentation, or
- a Swift file in `iOSApp/Features/Workout/` does not start with `Workout`.
