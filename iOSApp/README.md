# Gachii iOS App

This directory contains the native iOS SwiftUI migration target. `OriginalFiles/` remains reference-only and untouched.

## Requirements

- Xcode 18+ (latest stable)
- Swift 6.0+
- iOS deployment target: 26.0+

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
