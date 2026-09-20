# Agent Capability Core

This module is the provider-neutral machine contract for Freuly's agent-facing capabilities.

## Architectural rule

Business capabilities are defined here without transport endpoints or vendor-specific behavior. Protocol adapters (OpenAPI, MCP, A2A, ARD, NLWeb and future protocols) must translate this canonical model instead of duplicating business semantics.

The core describes:

- service identity and supported markets/languages;
- canonical entities;
- capabilities and representative user intents;
- input/output schemas;
- side effects and idempotency requirements;
- authorization scopes and consent requirements;
- personal-data exposure level;
- protocols a capability may be exposed through.

## Safety boundary

A public discovery surface does not imply public write access. Any side-effecting capability must use an authenticated profile, require idempotency, and state the authorization/consent requirement explicitly.

No runtime route or database behavior is introduced by this module alone.
