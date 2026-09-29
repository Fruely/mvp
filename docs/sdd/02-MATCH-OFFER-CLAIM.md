# Freuly Match, Offer and Claim Contract

**Status:** Canonical

## 1. Matching

Matching answers only:

> Which specialists are objectively eligible for this request?

It must remain deterministic, explainable, testable and inexpensive.

Current matching inputs may include category/service fit, work format, geography, service languages and the specialist's active native installation where required by current runtime policy.

Do not use hidden AI ranking to decide the winner.

Language dimensions remain distinct:

- interface locale;
- source/request language;
- service languages.

No explicit service-language requirement means unrestricted (`[]`), not "use interface locale".

## 2. Offer creation

For a matched service request, the backend creates a canonical service-request `request_offer`.

All specialists matched to the same request receive the same initial access-price snapshot under Pricing v1.

The offer price is server-generated. Client/Native never supplies authoritative amount or currency.

Pricing v1 is owned by ADR-006. Do not activate legacy `lead_pricing_rules` for this flow.

## 3. TAKE

Target meaning of TAKE:

> Reserve my exclusive opportunity to purchase/access this request.

TAKE is not:
- final client selection;
- payment success;
- entitlement;
- conversation creation.

The server resolves the current canonical offer and atomically creates/reuses the claim reservation.

## 4. Exclusivity

A request may have at most one live exclusive claim at a time.

The database/RPC must enforce this under races; UI disabling is not sufficient.

Another specialist cannot obtain a parallel live claim merely because both devices tapped TAKE at the same time.

## 5. Client selection model

Target core product: no client-side tender/carousel/winner selection.

The client may be asked to confirm the pending connection when the paid flow requires it, but that confirmation is not a choice among competing specialists.

Legacy client-selection behavior may remain for existing/legacy paths until deliberately migrated. Do not reuse legacy `client_selected_you` semantics as the new paid-flow design by accident.

## 6. Redistribution

**Planned.**

If a specialist declines, does not act within a defined window, or a reservation/payment is released before final connection, the request may re-enter distribution.

Redistribution is sequential. It must not create concurrent active claims or concurrent conversations.

The exact timeout/release policy is owned by the distribution SDD and must be implemented before paid beta activation.

## 7. Separation of concerns

```text
Matching     = who is eligible?
Distribution = who sees it when?
Priority     = who may receive an earlier opportunity?
Pricing      = what does this offer cost?
Claim        = who currently holds exclusivity?
Payment      = has Freuly access been paid?
Entitlement  = may connection be finalized?
```

Do not collapse these decisions into one score.

## 8. Compatibility

Existing Native consumers must tolerate additive offer/match fields.

Do not remove/rename current match identifiers, status semantics or price fields from a supported response without an explicit compatibility/version plan.
