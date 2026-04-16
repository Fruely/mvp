# ADR-001: Multilingual Content Architecture for Specialists

## Status
Accepted

## Date
2026-04-16

## Context

Freuly is evolving from MVP into a scalable SaaS platform. The platform already has live specialist profiles, public specialist pages, dashboard editing flows, and active user onboarding. Multilingual UI already exists, but specialist user-generated content is still stored and rendered primarily in single-language legacy fields.

This creates a structural limitation:

- UI can switch language, but specialist content does not fully follow.
- Public specialist pages are becoming SEO assets.
- Specialists increasingly expect their profiles to be visible to multiple language audiences, especially German-speaking users.
- The platform must be able to grow beyond the current language set without repeated schema redesign or broad refactors.

At the same time, production stability is critical:

- current public pages must continue working,
- current dashboard save/publish flows must not break,
- current API response shapes must remain backward-compatible during rollout,
- existing live specialists must not experience disruption.

## Decision

Freuly will implement multilingual specialist content using an additive, backward-compatible translation-table architecture.

The system will follow this model:

- core entities remain language-agnostic,
- localized user-generated content is stored in dedicated translation tables,
- existing legacy text fields remain temporarily in place as a compatibility layer during migration,
- rollout must happen incrementally using fallback reads and dual writes where needed,
- adding new languages must not require schema redesign.

## Core Architectural Principles

### 1. Languages are data, not hardcoded structure
Language support must not be implemented through hardcoded per-language columns such as:

- `about_ru`
- `about_ua`
- `about_de`

and must not rely on language-specific branching spread across the codebase.

New languages must be addable without changing table structure.

### 2. Base entities and translations are separate concerns
Language-independent data stays in core tables.

Localized user-generated content belongs in translation tables associated with the base entity.

Examples:
- specialist base data remains in `specialists`
- specialist profile translations live in a dedicated translation table
- specialist service translations live in a dedicated translation table

### 3. Rollout must be additive and backward-compatible
No destructive migration is allowed in the initial rollout.

Existing fields, queries, pages, and flows must continue working until the new multilingual layer is fully adopted.

### 4. Legacy fields are a temporary compatibility layer
Current legacy text fields remain in place for compatibility, fallback, and safe incremental rollout.

They are not the intended long-term multilingual architecture.

### 5. Public rendering must use centralized fallback logic
Localized reads must follow a consistent resolution strategy:

1. requested language translation
2. source/default language translation
3. legacy field fallback

Fallback logic must be centralized and predictable, not duplicated inconsistently across the app.

### 6. Multiple write paths must remain consistent
If more than one write path exists for specialist content, multilingual support must not be implemented in only one of them.

Parallel write paths must either:
- be updated consistently, or
- be deprecated in a controlled way.

## Target Data Model Direction

Freuly should move toward this pattern:

- `languages`
- `specialists`
- `specialist_profile_translations`
- `specialist_services`
- `specialist_service_translations`

Where:

### `specialists`
Stores language-independent entity data, such as:
- identity
- category
- status
- slug
- media references
- contact and structural fields

### `specialist_profile_translations`
Stores localized profile content, such as:
- about / about_me
- short bio if applicable
- extra info if applicable
- future SEO text fields if needed

Each row should represent one locale for one specialist profile.

### `specialist_services`
Stores language-independent service data, such as:
- specialist linkage
- pricing
- ordering
- currency
- active/inactive state

### `specialist_service_translations`
Stores localized service content, such as:
- title
- description
- price comment

Each row should represent one locale for one service.

## Why Translation Tables Are Preferred

Translation tables are the preferred long-term architecture over JSONB-only multilingual storage because Freuly needs:

- scalability to many languages,
- relational integrity,
- unique constraints by entity and locale,
- cleaner partial updates,
- safer future workflows around machine translation and manual review,
- clearer evolution for SEO-sensitive localized content,
- less risk of hidden write/merge bugs in complex JSON payloads.

JSONB may be acceptable as a short-lived helper in specific places, but not as the primary long-term multilingual architecture for specialist content.

## Rollout Strategy

### Phase 1 — Schema only
Add translation tables and constraints.

Do not remove or rename existing legacy text fields.

Do not change production behavior yet.

### Phase 2 — Safe read integration
Update read paths to resolve localized content from translation tables when available, with fallback to legacy fields.

This must be backward-compatible and must not break current response shapes.

### Phase 3 — Dual write
Update save flows so that existing legacy fields continue to be written, while translation rows are also created or updated.

This must be done carefully for all relevant write paths.

### Phase 4 — Migration and stabilization
Backfill existing profiles and services into translation tables.

Monitor fallback behavior and validate that publish, list, and detail pages continue to work correctly.

### Phase 5 — Long-term cleanup
Only after all critical readers and writers fully support the new model may legacy text fields be considered for deprecation.

This is a later decision, not part of the initial rollout.

## Non-Negotiable Safety Rules

The following are not allowed during the initial multilingual rollout:

- removing existing legacy fields,
- changing current public response shapes in breaking ways,
- implementing multilingual reads without fallback,
- implementing multilingual writes in only one of multiple active write paths,
- hardcoding current languages in schema design,
- broad refactors unrelated to multilingual specialist content,
- destructive migrations on live production tables.

## Known Risk Areas

Special care is required in the following areas:

- dashboard bulk save logic,
- publish validation that still depends on legacy service title fields,
- public specialist page API shape,
- specialist list and recommended specialist queries,
- duplicate or parallel service write APIs,
- partial-update behavior that may accidentally wipe fields.

## Implementation Guidance

All implementation prompts and code changes related to multilingual specialist content must follow this ADR.

Cursor or any developer working on this feature must:

- prefer additive changes,
- preserve production behavior,
- preserve backward compatibility,
- avoid speculative repo-wide cleanup,
- implement in small, reviewable phases.

## Consequences

This decision increases short-term implementation discipline, but it avoids future architectural debt and repeated redesign.

It enables Freuly to scale from its current MVP state into a multilingual SaaS platform without forcing a large rewrite when new languages and markets are added.
