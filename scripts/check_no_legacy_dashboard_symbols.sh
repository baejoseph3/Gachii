#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

legacy_symbol_pattern="Dash""board"

echo "Checking for legacy workout-home symbols outside allowed discovery/source areas..."
if matches=$(rg -n "$legacy_symbol_pattern" \
    --glob '!OriginalFiles/**' \
    --glob '!.git/**' \
    --glob '!Docs/Phase0_Discovery_Blueprint.md' \
    --glob '!Docs/Phase1_Foundation_Report.md' \
    .); then
  echo "❌ Found disallowed legacy workout-home references:"
  echo "$matches"
  exit 1
fi

echo "Checking Workout feature file naming (must start with Workout*)..."
invalid_files=$(find iOSApp/Features/Workout -type f -name '*.swift' ! -name 'Workout*.swift' | sort || true)
if [[ -n "$invalid_files" ]]; then
  echo "❌ Found non-conforming Swift files under iOSApp/Features/Workout/:"
  echo "$invalid_files"
  exit 1
fi


echo "Checking canonical feature map (Workout/Social/Calendar/Progress/Profile only)..."
if [[ -d iOSApp/Features/Home ]]; then
  echo "❌ Found deprecated iOSApp/Features/Home directory. Workout-home must live under WorkoutView artifacts."
  exit 1
fi

if home_matches=$(rg -n "\bHomeView(Model)?\b" iOSApp --glob '!iOSApp/Gachii.xcodeproj/**'); then
  echo "❌ Found deprecated HomeView symbols; use WorkoutView artifacts instead:"
  echo "$home_matches"
  exit 1
fi

echo "✅ Naming checks passed."
