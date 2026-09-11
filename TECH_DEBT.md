# Technical Debt / Cleanup Candidates

This file tracks verified or suspected cleanup candidates discovered during normal development.

Do not treat an entry as permission to delete code. Each candidate must be verified independently before removal.

## Status values

- `candidate` — suspected legacy/dead/duplicated code, not yet verified
- `verified` — evidence indicates it is safe to remove, awaiting explicit cleanup task
- `blocked` — removal risk or dependency discovered
- `resolved` — cleanup completed and verified

## Candidates

_No candidates recorded yet._

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
