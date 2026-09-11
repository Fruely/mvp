# Freuly Agent Safety Contract

This is a live production Next.js/Supabase application. Preserve current production behavior unless a task explicitly requires changing it.

## Mandatory principles

- Current checked-out code is the implementation source of truth.
- `package.json` and the lockfile define the actual installed technology versions.
- Do not restore old code from history, backups, comments or alternate implementations unless explicitly asked.
- Do not refactor unrelated working code.
- Prefer the smallest safe diff.
- Explore broadly when needed; edit narrowly.
- Critical flows (onboarding, auth, moderation, claim, dashboard, publication state) require full flow tracing before changes.
- Suspected legacy/dead code is a candidate only. Never delete it automatically.
- For risky changes, use an isolated branch and Preview, inspect the diff and run relevant checks before merge.
- A successful build alone does not prove business-flow correctness.

Detailed project rules live in `.cursor/rules/` and must be followed.