# OPEN_QUESTIONS

## Entry 1
- Question: Are there any unresolved Phase 0 blockers that prevent advancing to implementation planning?
- Why it matters: Determines whether Phase 0 has outstanding decision debt before execution phases.
- Default until decided: No blockers identified in Phase 0 scope.
- Needed by phase: Phase 1

## Entry 2
- Question: What is the exact canonical production schema at migration time (beyond repository SQL hints)?
- Why it matters: Supabase schema migration correctness depends on actual Neon schema/tables/constraints/indexes.
- Default until decided: Treat Neon live exports (`neon_schema.sql`, `neon_data.sql`, table/index/constraint exports) as canonical; treat `OriginalFiles/src/db/schema_updates.sql` as historical context only.
- Needed by phase: Phase 2

## Entry 3
- Question: When should deferred admin mutations (promotion/demotion, broadcast notifications, push tests, other writes) be enabled in iOS?
- Why it matters: Impacts security hardening (RLS/Edge, audit logs, rate limits, guarded confirmations) and App Store scope.
- Default until decided: Admin v1 remains read-only observability only; all admin mutations deferred.
- Needed by phase: Phase 3+

## Entry 4
- Question: Should advanced notification server scenarios be included in v1?
- Why it matters: Affects backend complexity, provider integration, and release risk.
- Default until decided: Keep notification v1 intentionally simple (native registration + token persistence + routing scaffolding); advanced scenarios deferred.
- Needed by phase: Phase 3

## Entry 5
- Question: Are reports/flags entities in scope for initial schema and social moderation workflows?
- Why it matters: Changes schema design and moderation surface area.
- Default until decided: Reports/flags queue out of scope for v1 (no reports/flags entity in initial schema).
- Needed by phase: Phase 3+
