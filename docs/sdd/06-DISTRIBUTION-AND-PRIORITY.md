# Freuly Distribution, Liquidity and Priority

**Status:** Canonical product direction; timeout/priority mechanics are Planned.

## 1. Market unit

Freuly scales through **local liquidity clusters**, not by "finishing a country".

A cluster is the practical market inside which a request can quickly reach an eligible specialist.

Clusters may be:
- city/agglomeration for local services;
- wider radius for mobile trades;
- language/category availability for online services.

Madrid and Düsseldorf may be independent healthy clusters even if surrounding national coverage is incomplete.

## 2. Distribution is separate from matching

Matching answers who is eligible.

Distribution answers who gets the opportunity, in what order and for how long.

This separation is mandatory.

Economic compatibility is a matching gate, before distribution. A specialist blocked because the client's reliable maximum is below that specialist's explicit minimum is not eligible supply. They do not enter distribution, and they do not receive a match notification.

If every otherwise-eligible specialist is blocked only by that comparison, distribution does not start. The client may accept the current supply floor on the same request. That acceptance is a revised demand ceiling, not a Freuly access price and not a category market price. Decline leaves the request stored and undistributed.

A later pricing policy must not treat that supply floor as a hidden Pricing v2 input. Only an explicitly accepted ceiling changes the client budget basis used for newly created access offers.

## 3. Target distribution

**Planned.**

Eligible demand is distributed sequentially.

A specialist who:
- declines;
- does not act inside the opportunity window;
- releases the reservation;
- fails before final connection;

may cause the request to move to the next eligible opportunity.

At no point may redistribution create multiple live exclusive claims or multiple active conversations for one request.

## 4. Load and responsiveness

Distribution policy may eventually consider operational signals such as:
- whether a specialist currently has too many opportunities;
- response history;
- cluster liquidity;
- available supply;
- request urgency;
- radius expansion stages.

These signals affect delivery order/timing, not hidden ownership of the final job.

Any such policy must remain explainable and testable. Do not introduce opaque AI ranking.

## 5. Priority

**Planned, not active core monetization.**

Priority may provide an earlier opportunity to see suitable new demand.

Priority does not mean:
- guaranteed job;
- guaranteed claim;
- stealing an existing reservation;
- parallel access to a claimed request;
- included/free request credits;
- exemption from the access price.

Once another specialist owns a live claim, priority does not bypass exclusivity.

## 6. Pricing independence

Current Beta Pricing v1 does not use cluster density, scarcity, geography, category, specialist identity or priority.

Future Pricing v2 may use additional market information only through an explicit new pricing-policy decision.

A pricing-policy change applies to newly created offers. It never silently reprices a persisted positive offer.

## 7. Timeout/release

**Planned before paid beta activation.**

A product-level timeout/release policy must define:
- how long an uncompleted reservation remains live;
- what happens to an uncaptured/unsettled payment attempt;
- how authorization/store purchase state is released or reconciled;
- whether the request pauses or immediately redistributes;
- how sequential rematch is resumed;
- which notifications are cancelled/reissued.

Do not invent arbitrary timeout values in implementation without an approved spec.

## 8. Success metrics

Distribution should be evaluated by market liquidity rather than country-count vanity metrics.

Useful measures include:
- request volume per cluster/category;
- matchable request rate;
- time to first viable opportunity;
- TAKE/claim rate;
- paid-access conversion;
- release/timeout rate;
- specialist repeat purchase;
- request-to-connection latency.

These metrics may inform later policy but do not directly rewrite live offer prices.
