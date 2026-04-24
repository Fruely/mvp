# ADR-002: `/api/specialists/list` — Pagination, Performance, and Deferred Refactor

## Status

Accepted — **implementation deferred**; this ADR records context, risks, and the intended future direction only.

## Date

2026-04-24

## Context

The public category experience loads specialists via `GET /api/specialists/list` (Next.js App Router). The route resolves a category, loads candidate specialists (primarily through `specialist_services` joined to `specialists`), enriches rows (profiles, services for pricing, category title), applies geo / language / city filtering, sorts (`relevance`, `new`, `experience`), and paginates in application memory.

Related product constraints:

- Response shape and filters are relied on by category pages.
- Specialists may have **multiple active services in the same category**, which multiplies `specialist_services` rows per specialist.
- `meta.filter_options` (languages and cities) is derived from the **full candidate set** for the category, not from the current page only.

## Current behavior (summary)

At a high level, the handler:

1. **Inputs**: `category_id` / `category` (slug), `limit` (capped), `offset`, optional `language`, `city`, `sort`, optional user coordinates for distance / mobile-service radius, optional non-production debug flags.
2. **Category resolution**: Loads `categories.id` from slug when `category_id` is absent.
3. **Primary path**: Queries `specialist_services` for the category (`category_id`, active, `price_from >= 0`) with `specialists!inner` and public visibility filters (including non-test specialists).
4. **Fallback selects**: Narrower embedded `specialists` selects if the primary query fails (e.g. column compatibility).
5. **Dedup**: Collapses multiple service rows to **one specialist** in JavaScript (first occurrence wins; row order follows DB default for service rows).
6. **Direct fallback**: If no rows after dedup, loads `specialists` by `category_id` with the same visibility rules, then requires at least one qualifying active service per specialist (separate query).
7. **Enrichment**: Fetches names, `specialist_profiles`, and `specialist_services` for pricing (scoped to the listing category) for **all** candidate specialist IDs.
8. **Merge**: Builds card fields, including aggregated min price / comment, `about_line`, coords, internal sort keys.
9. **Geo**: Computes distance when user coords exist; may exclude some mobile-service specialists outside `service_radius_km`.
10. **Filters**: Language (on specialist languages) and city (on profile); price filter is currently a no-op in code.
11. **Sort**: Featured + `created_at` + seeded shuffle for `relevance`; `new` and `experience` use profile/specialist timestamps and parsed experience text.
12. **Pagination**: `slice(offset, offset + limit)` on the **fully built and sorted** list.
13. **Response**: `data` (page), `meta` (`total`, `limit`, `offset`, `next_offset`, `has_more`, `filter_options`). Production responses omit internal `_trace` (non-production may include it).

## Why this is a future bottleneck

- The primary `specialist_services` query has **no server-side `limit` / `range` tied to specialists**: cost scales with **rows in `specialist_services` for that category**, which can be much larger than the number of unique specialists.
- **Dedup, enrichment, sorting, filtering, and pagination** all run over the **full candidate list** in the application tier.
- **`filter_options`** is computed from the merged full set, so any design that only loads one page of specialists from the database **without an additional strategy** would change or degrade facet behavior unless deliberately redesigned.

As specialist and service counts grow, worst-case latency, memory, and Supabase egress increase **per category request**, independent of `limit`.

## Why adding `.range()` on `specialist_services` is unsafe (as primary pagination)

PostgREST / Supabase `.range()` applies to **rows of the queried table** — here, `specialist_services` rows — **not** to distinct specialists.

Effects:

- **Wrong page boundaries**: A “page” may include duplicate specialists or skip specialists compared to a specialist-based mental model.
- **Incorrect `meta.total` / `has_more`**: Totals must reflect **unique specialists after filters**, not raw service row counts.
- **Incorrect pricing**: Per-specialist `min_price_*` aggregates depend on **all** active services in that category for that specialist; slicing service rows first can omit rows and **understate or distort** displayed prices.

Therefore, **row-based pagination on `specialist_services` is not a drop-in performance fix** without a different data model or query shape.

## Why multi-service specialists break row-based pagination

One specialist with *k* active services in the same category produces *k* joined rows. Pagination over those rows:

- does not align with “one card per specialist” in the UI,
- duplicates or splits a single logical entity across pages,
- makes ordering ambiguous unless explicitly defined at **specialist** granularity with a rule for which service row “represents” the row (which the current code avoids by deduping in JS).

## Why `filter_options` complicates bounded pagination

Today, `meta.filter_options.languages` and `meta.filter_options.cities` are derived from **all candidates** in the category (post-merge, pre-page slice). That matches a UX where filters show the full facet space for the category.

If the server only loads a **bounded** subset of specialists from the database:

- **Option A**: Facets are computed only from the loaded subset → **behavior change** (incomplete options).
- **Option B**: Facets require a **second query** (or SQL aggregation) over the full qualifying set → still needs an efficient full-category or aggregated read.
- **Option C**: Facets move to a **dedicated endpoint** or cached materialization → product/API change.

So bounded pagination is not only a `list` query change; it interacts explicitly with **`filter_options` semantics**.

## Preferred future solution: SQL view or RPC (one row per specialist)

The maintainable approach is to push **specialist-granularity** and **per-category aggregates** into the database, for example:

- A **view** or **`SECURITY INVOKER` RPC** that returns **exactly one row per specialist** eligible for a category listing, with columns needed for sort/filter (and optionally pre-aggregated `min_price_*`, active service counts, joined profile `city`, etc.).
- **Pagination** (`LIMIT`/`OFFSET` or keyset) at that result grain, after the same visibility and non-test rules as today.
- **Facets**: Either included via a companion aggregate query/RPC or a small separate read documented in API contracts.

This aligns pagination units with UI cards, preserves correct aggregates, and avoids loading unbounded `specialist_services` explosions into Node — at the cost of **schema/SQL work** and careful parity with existing rules (direct fallback when services use null `category_id`, geo rules, shuffle semantics, etc.).

## Why we keep the current implementation for now

- **No schema migration** is scheduled in this step; the safe fix is inherently **SQL-shaped**.
- **Quick wins** such as `.range()` on `specialist_services` **break correctness** (see above).
- The route is **known and tested** in production flows; a rushed refactor risks regressions on pricing, dedup order, fallback paths, and `meta`.
- Product can **monitor** category size and p95 latency before committing engineering time to RPC/view + parity tests.

## Implementation triggers (when to revisit)

Consider scheduling the refactor when **any** of the following persist or worsen:

- p95 or p99 latency for `GET /api/specialists/list` exceeds agreed SLOs on real categories.
- Single-category `specialist_services` row counts or unique specialist counts cross agreed thresholds (to be defined with ops).
- Database or app memory pressure traced to this route.
- Category pages become a dominant cost center in Supabase metrics (rows read, egress).
- Product needs **new** sort modes (e.g. price, distance as primary sort) that are impractical in pure in-memory passes.

## Future checklist (implementation phase — not active)

- [ ] Specify specialist-level ordering rules explicitly (including dedup tie-breakers vs current “first service row wins”).
- [ ] Design SQL view/RPC (or pair of functions) returning one row per specialist for a category, with visibility + `is_test` parity.
- [ ] Encode or consciously replace **seeded shuffle** for `relevance` if sort moves to SQL.
- [ ] Decide **`filter_options`**: same response contract via aggregate query, separate endpoint, or documented behavior change.
- [ ] Parity tests: empty category, multi-service specialists, direct fallback path, language/city/geo, all sort modes, `meta.total` / `has_more` / `next_offset`.
- [ ] Load test before/after; verify production `_trace` remains absent.

## Non-goals (for this ADR and the current deferral)

- Changing `/api/specialists/search`, `/api/recommended-specialists`, `/api/filters`, or category tree APIs.
- Adding middleware, rate limits, or CDN caching to this route as part of this decision.
- Implementing `.range()` / `.limit()` on `specialist_services` as the primary pagination mechanism.
- Introducing RLS or Supabase client refactors under this ADR.
- Guaranteeing infinite-scale category listings without database-side specialist grain or acceptable product trade-offs.

## Consequences

- **Positive**: Clear documentation of why naive pagination is unsafe; aligned future direction (SQL specialist grain); reduced risk of a harmful “quick fix.”
- **Negative**: **O(full category)** behavior remains until a SQL-backed refactor or an explicit product trade-off (e.g. caps) is accepted.
