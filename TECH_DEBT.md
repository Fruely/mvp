# Technical Debt / Cleanup Candidates

This file tracks verified or suspected cleanup candidates discovered during normal development.

Do not treat an entry as permission to delete code. Each candidate must be verified independently before removal.

## Status values

- `candidate` — suspected legacy/dead/duplicated code, not yet verified
- `verified` — evidence indicates it is safe to remove, awaiting explicit cleanup task
- `blocked` — removal risk or dependency discovered
- `resolved` — cleanup completed and verified

## Candidates

### TD-001 — no response cache for `POST /api/intent/extract`
- Path/symbol: `app/api/intent/extract/route.ts`, `lib/rate-limit/shared.ts`
- Status: blocked
- Confidence: high
- Risk: low
- Why it appears obsolete: not obsolete — a deliberately deferred optimization.
  Identical extraction requests re-run a paid model call.
- Likely current replacement: a short-TTL cache keyed by SHA-256 of exact
  `raw_text` + locale + time zone + `schema_version` + extraction version,
  storing the hash only and never user text.
- References found: the Upstash Redis client in `lib/rate-limit/shared.ts` is
  private to that module and exposes no general get/set API.
- Required verification: expose a narrow cache helper over the existing Upstash
  client without adding a dependency, then confirm no user text reaches a key.
- Notes: a missing cache is acceptable in production; a missing rate limit is
  not, and the rate limit already fails closed there.

## Entry template

```md
### TD-XXX — short description
- Path/symbol:
- Status: candidate
- Confidence: low | medium | high
- Risk: low | medium | high | critical
- Why it appears obsolete:
- Likely current replacement:
- References found:
- Required verification:
- Notes:
```
