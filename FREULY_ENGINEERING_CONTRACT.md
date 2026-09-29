# Freuly Engineering Contract

**Status:** Canonical

This is the operating contract for humans and coding agents. It governs how code is found, placed, changed, tested, and reported. Product rules stay in the owning documents (`DOMAIN_CONTRACTS`, architecture, data/API, backend-change, security, and each repository's agent entry point). Do not copy those rules into a second copy.

## 1. Understand before edit

Before creating or changing an implementation:

- find the canonical implementation of that responsibility
- search routes, services, repositories, hooks, components, helpers, types, tests, and contracts
- name the module or domain that owns the behavior
- inspect consumers before changing a producer contract
- read the relevant tests before implementing

Absence in the first file opened is not absence in the repository.

```text
SEARCH → TRACE → DECIDE → EDIT
```

Do not go `PROMPT → CREATE NEW FILE`.

## 2. Reuse before create

1. Reuse the existing implementation.
2. Extend it.
3. Extract shared logic only when several real consumers need the same invariant.
4. Create a new implementation only when the responsibility is genuinely new.

A parallel implementation of the same responsibility is prohibited. Do not add a second API client, auth/session mechanism, matching implementation, screen-level repository, server-state cache for the same entity, or helper that restates an existing helper.

## 3. One responsibility, one canonical implementation

Replacement is:

```text
implement replacement
→ migrate all consumers
→ verify
→ remove the superseded implementation
→ remove stale imports, types, tests, and config
```

Do not leave the old and new paths active "just in case". Git history is the archive. A compatibility path stays only for a named migration that still has consumers and a removal condition. Suspected dead code outside this replacement is reported, not deleted.

## 4. Naming is architecture

Names state the domain responsibility. Use established Freuly words when they apply: account, request, match, offer, claim, conversation, message, attachment, specialist, client, installation, push, billing, entitlement.

Do not introduce `utils2`, `newUtils`, `helpersNew`, `manager2`, `serviceNew`, `finalService`, `tempService`, `misc`, or `commonStuff`. Do not append `V2`, `V3`, `New`, or `Final` unless that version is an external protocol or an explicit migration. A file name should let a new developer predict what the file owns. Match the naming already used in that domain.

## 5. Place code with its owner

A helper lives with the domain that owns its invariant. Do not move a business rule into a generic utility folder because the function is reusable.

Native:

```text
route/screen → feature/controller → domain → repository/data access → trusted backend
```

Backend/Web:

```text
route → domain/service → persistence/infrastructure
```

Route files stay thin. Routes are not the business-logic layer.

## 6. Avoid both extremes

Do not over-engineer: no abstraction for one hypothetical future use, no framework for one small task, no interface or factory added only to look architectural, no adapter around stable internal code, and no split of one simple responsibility into many tiny files.

Do not under-engineer: no screen or route that owns domain, network, persistence, and UI together; no copied validation across consumers; no bypass of a domain contract because a patch is faster; no swallowed errors on critical mutations.

Use the smallest structure that keeps ownership clear.

## 7. Minimal diff

Change only what the task requires. Do not reformat unrelated files, rename unrelated symbols, modernize unrelated code, replace a working dependency, or reorganize directories as side work. Do not "clean up" code whose behavior has not been traced. Report unrelated debt separately. Do not expand scope in silence.

## 8. No duplicate business logic

If new logic resembles existing logic, search again and decide which module owns the invariant. The same rule must not drift across Web, Native, backend, SQL/RLS, and tests. Client checks may improve UX. Authoritative business and security rules stay on trusted backend infrastructure.

## 9. Cross-repository contract discipline

Web and Native share one backend. A change to schema, RLS, storage, RPC, an API DTO, an enum or status, auth, billing entitlement, or a push/deep-link contract needs an explicit impact note for both clients and for supported deployed versions.

Name the producer and the consumer by repository, branch, and commit when the change crosses repos. Do not call a consumer feature production-complete while the producer contract it needs is not deployed. Follow `BACKEND_CHANGE_PROTOCOL.md` in Native and `docs/engineering/CHANGE_IMPACT_CHECKLIST.md` in Backend/Web.

## 10. Data and migrations

Do not edit an already-applied production migration to describe a new production change. Add a new migration. Prefer additive, backward-compatible evolution. Do not mutate production data to make a test pass unless the task explicitly authorizes that repair and the mutation is understood. Do not weaken authorization or storage privacy to make a client easier to write.

## 11. Dependencies

Before adding a dependency, check the repository and platform, then the dependencies already present. State why those are insufficient. Do not add a second library for a responsibility that already has one. Do not add a dependency to save a few lines of straightforward code. A Native dependency or native-config change must say whether an EAS rebuild is required.

## 12. Test behavior, not trivia

Tests protect observable contracts and invariants: an unauthorized actor cannot claim; the same attachment cannot be reused; a client draft survives a failed upload; a route resolver selects the correct product area.

Do not test a private detail only because it exists, snapshot a large structure with no behavioral point, or re-implement the production code inside the test. A bugfix is root cause, then the canonical path, then a regression test where practical. Do not change a test only so broken behavior passes.

## 13. Stop conditions

Stop and report before inventing a solution when the task unexpectedly requires a change to the domain model, ownership or auth semantics, database schema beyond the planned migration, billing or financial behavior, a security or privacy boundary, the core routing model, public API compatibility, or a product decision that is not already defined. Do not silently choose a new product architecture.

## 14. Pre-commit architecture audit

Before calling the work complete, answer:

- Did this recreate something that already existed?
- Is there now more than one implementation of one responsibility?
- Is the file in the owning domain?
- Do the names match repository vocabulary?
- Was an abstraction added that this change does not need?
- Does one module now own too much?
- Did the diff touch anything unrelated?
- Is dead code, or a stale import, type, or config, still present?
- Were the consumers considered?
- Do the tests protect behavior rather than the shape of the patch?

Fix failures before commit.

## 15. Definition of done

```text
Implemented → Integrated → Verified → Cleaned → Documented → Diff inspected → Committed → Pushed
```

Never report PASS for a check that was not run. Statuses are `PASS`, `FAIL`, `NOT RUN`, and `PRE-EXISTING FAILURE`.

Native fast check: `npm run check`. Backend/Web domain check: `npm test`; run `npm run check:prepush` before push when the change is substantial. Docs-only commits do not require the application suite unless repository tooling requires it. Detailed release stages stay in the owning definition-of-done document.

## 16. Agent completion report

A substantial coding task reports:

- Changed
- Reused
- Removed
- New files and WHY each was necessary
- Verification
- Commit
- Branch
- Push status
- Production/deployment state
- Remaining limitations / discovered debt

## New file budget

Before every new implementation file, answer:

1. What responsibility does this file own?
2. Why does no existing file own it?
3. Why is extending an existing module worse?
4. Who consumes it?
5. Does the name match the surrounding domain?

If the answers are weak, do not create the file. Route files, migrations, tests, and canonical documentation are not blocked by this budget, and they still follow repository conventions.

## Worktree and concurrency

Safety does not depend on a separate computer. Isolate by explicit repository, explicit branch, a clean or known working tree, and a separate worktree when agents work in parallel. Two agents do not edit the same worktree or branch. After remote changes, fetch and reconcile before editing. Do not overwrite or reset another agent's uncommitted work. Do not force-reset or force-push to resolve ordinary divergence.
