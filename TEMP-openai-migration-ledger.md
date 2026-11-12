# OpenAI API Migration Decision Ledger

**Application:** The Proxy Plane2.6.5 private beta  
**Current integration:** direct fetch Images generation/editing plus Responses for card/review/safety  
**Selected integration and model:** same APIs, pinned GPT Image2.5 Flare; existing text/safety models retained  
**Approved migration scope and feature-stage plan:** Stage1 restore supported image generation/editing with explicit server quality, same three choices/one credit and safe usage metadata. Stage2 Preview-only credential/model probe and single fixed-operation real smoke batch through existing durable recovery. Stage3 independent QA, all CI, protected Preview and updated package. All are necessary authorized launch work; no production/live billing.
**Privacy and retention requirements:** preserve same provider/private accounts/secret boundary and Responses store:false; do not claim ZDR or new residency guarantees.
**Assessment or implementation:** assessment followed by implementation, as explicitly requested ('okay get it ready for launch'); existing key reuse and Preview destination already approved

Review every item against the application, selected model and provider, developer decisions, and approved scope. Add rows for newly documented capabilities or workload-specific differences; under the migration section, use one row per required workflow or invocation mode, even when sharing a provider, with its selected route, retained alternatives, code/documentation changes, and validation commands/results. Replace every placeholder with a concise, developer-visible decision; never claim a capability was implemented or tested without supporting evidence.

**Applicable:** Whether the capability benefits the application's behavior, workloads, or product requirements: `yes`, `no`, or `unknown`; support alone does not establish applicability.  
**Supported:** Whether the selected model, provider, framework, and SDK can provide the capability: `yes`, `no`, `partial`, or `unknown`.  
**Decision:** The capability's agreed migration outcome: `pending`, `implemented`, `already present`, `deferred`, `unsupported`, or `not applicable`. Use `deferred` only for a feature-specific developer decision or concrete blocker; justify `unsupported` or `not applicable` with capability or workload evidence.  
**Implemented:** Mark `[x]` only after approved implementation is complete and verified; leave `[ ]` for pending, deferred, unsupported, or inapplicable items.  
**Rationale or evidence:** The brief product, compatibility, privacy, cost, or scope justification; include the planned stage and developer-decision receipt, or relevant code, tests, and versioned official documentation.

## Model Selection

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Record a concrete supported model recommendation and suitability for each workload; models may be shared. | yes | yes | implemented | [x] | Approved stage1: replace retired image default with pinned gpt-image-2.5-flare-2026-09-08, explicit medium quality; preserve configurable text/safety gpt-4.1-mini because deprecated does not mean retired. User accepted cloud costs and instructed launch preparation after supplying the existing key. |
| Preserve an appropriate existing model; confirm material model or capability-tier changes. | yes | yes | implemented | [x] | Approved stage1: replace retired image default with pinned gpt-image-2.5-flare-2026-09-08, explicit medium quality; preserve configurable text/safety gpt-4.1-mini because deprecated does not mean retired. User accepted cloud costs and instructed launch preparation after supplying the existing key. |
| Account for workload quality, speed, latency, and cost. | yes | yes | implemented | [x] | Approved stage1: replace retired image default with pinned gpt-image-2.5-flare-2026-09-08, explicit medium quality; preserve configurable text/safety gpt-4.1-mini because deprecated does not mean retired. User accepted cloud costs and instructed launch preparation after supplying the existing key. |

## Instruction File Naming

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve existing instruction files; add compatibility files only with explicit approval, without renaming or rewriting existing files. | no | yes | not applicable | [ ] | No instruction files are renamed, added or migrated. |

## Migrate from Chat Completions to the Responses API

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Migrate applicable OpenAI workloads to the Responses API. | no | yes | already present | [x] | Card generation/review and safety already use Responses with strict schemas and store:false. Image generation/editing retain the supported Images API; no harness/provider rewrite. |
| Preserve existing product behavior and approved provider compatibility. | no | yes | already present | [x] | Card generation/review and safety already use Responses with strict schemas and store:false. Image generation/editing retain the supported Images API; no harness/provider rewrite. |

## Streaming

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve existing streaming and user-visible output behavior. | yes | yes | already present | [x] | Keep complete three-image batch validation, durable persistence and existing streamed JSON delivery; partial unreviewed artwork is not released. |
| Add streaming only where responsiveness benefits justify the approved change. | yes | yes | already present | [x] | Keep complete three-image batch validation, durable persistence and existing streamed JSON delivery; partial unreviewed artwork is not released. |
| Adapt typed Responses streaming events to existing rendering and consumption paths. | yes | yes | already present | [x] | Keep complete three-image batch validation, durable persistence and existing streamed JSON delivery; partial unreviewed artwork is not released. |
| Preserve complete-response workflows and defer disproportionate implementation changes. | yes | yes | already present | [x] | Keep complete three-image batch validation, durable persistence and existing streamed JSON delivery; partial unreviewed artwork is not released. |

## WebSocket Mode

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess persistent transport for long-running or tool-heavy workflows. | no | unknown | not applicable | [ ] | Single buffered image batches and one-shot schema requests have no tool-heavy conversation or persistent transport requirement. |
| Preserve existing HTTP and streaming behavior when WebSockets add insufficient value. | no | unknown | not applicable | [ ] | Single buffered image batches and one-shot schema requests have no tool-heavy conversation or persistent transport requirement. |
| Handle structured errors, failed or incomplete responses, and provider-specific concurrency limits; OpenAI allows one active response per `stream_id` lane, with concurrent lanes. | no | unknown | not applicable | [ ] | Single buffered image batches and one-shot schema requests have no tool-heavy conversation or persistent transport requirement. |
| Recover failed turns according to storage and Zero Data Retention requirements. | no | unknown | not applicable | [ ] | Single buffered image batches and one-shot schema requests have no tool-heavy conversation or persistent transport requirement. |
| Reconnect safely without duplicating visible output or side-effecting tool calls. | no | unknown | not applicable | [ ] | Single buffered image batches and one-shot schema requests have no tool-heavy conversation or persistent transport requirement. |

## Data Privacy and Residency

### Zero Data Retention

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Explicitly confirm Zero Data Retention and other retention requirements. | yes | partial | already present | [x] | Preserve existing privacy: Responses store:false, server-only key, authenticated private results, same direct OpenAI endpoint. ZDR approval/account entitlement is unknown and is not claimed. |
| Verify endpoint, model, feature, tool, caching, and background-execution compatibility. | yes | partial | already present | [x] | Preserve existing privacy: Responses store:false, server-only key, authenticated private results, same direct OpenAI endpoint. ZDR approval/account entitlement is unknown and is not claimed. |
| Configure stateless storage behavior when required. | yes | partial | already present | [x] | Preserve existing privacy: Responses store:false, server-only key, authenticated private results, same direct OpenAI endpoint. ZDR approval/account entitlement is unknown and is not claimed. |
| Preserve existing privacy and storage expectations. | yes | partial | already present | [x] | Preserve existing privacy: Responses store:false, server-only key, authenticated private results, same direct OpenAI endpoint. ZDR approval/account entitlement is unknown and is not claimed. |

### Data Residency

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Identify required storage and processing jurisdictions. | no | unknown | not applicable | [ ] | No new region/residency promise or endpoint change. Existing direct OpenAI processing preserved. |
| Verify project settings, regional endpoints, and regional model or feature availability. | no | unknown | not applicable | [ ] | No new region/residency promise or endpoint change. Existing direct OpenAI processing preserved. |
| Confirm residency or regional-processing tradeoffs with the developer. | no | unknown | not applicable | [ ] | No new region/residency promise or endpoint change. Existing direct OpenAI processing preserved. |

## Processing Tiers

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess tier requirements separately for each distinct workload. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |
| Standard processing. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |
| Priority processing. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |
| Flex processing. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |
| Batch processing. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |
| Reserved processing. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |
| Confirm pricing, latency, availability, retention, and developer preferences. | yes | yes | already present | [x] | Keep standard interactive processing. No paid Priority, Batch, Flex or Reserved change; no new vendor/plan. |

## Prompt Caching

### Prompt Cache Keys

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| For GPT-5.6 and later, omit new cache keys by default and preserve existing keys; for earlier models, use stable cache keys for reusable prompt prefixes. | no | unknown | not applicable | [ ] | No new retained cache identifiers for image batches; unchanged short safety/schema requests retain existing behavior. |
| Avoid cache-key and prefix fragmentation. | no | unknown | not applicable | [ ] | No new retained cache identifiers for image batches; unchanged short safety/schema requests retain existing behavior. |

### Extended Cache Retention for Earlier Models

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess extended retention for eligible models against developer retention requirements. | no | unknown | not applicable | [ ] | No extended retention or caching policy introduced. |

### Explicit Cache Breakpoints for GPT-5.6 and Later

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Apply supported explicit breakpoints to stable, reusable content. | no | no | not applicable | [ ] | Chosen image model and retained GPT-4.1 mini are not GPT-5.6 conversation workloads. |
| Choose implicit or explicit-only caching according to conversation and privacy requirements; record any breakpoint deferral separately. | no | no | not applicable | [ ] | Chosen image model and retained GPT-4.1 mini are not GPT-5.6 conversation workloads. |

### Prompt Cache Diagnostics

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Plan how to obtain a suitable comparison response ID and use `prompt_cache_options.comparison_response_id` on eligible GPT-5.6-and-later Responses requests; record evidenced workflow or retained-framework limitations. | no | no | not applicable | [ ] | No comparison response IDs/history available or required for one-shot image requests. |

## State Management

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Select local or server-side state according to architecture, privacy, and developer approval. | yes | yes | already present | [x] | Application owns durable operation, fingerprint, credit reservation/refund and private result. Do not introduce provider-side conversation storage or previous_response_id. |
| Preserve complete conversation, reasoning, tool-call, and tool-output replay for stateless workflows. | yes | yes | already present | [x] | Application owns durable operation, fingerprint, credit reservation/refund and private result. Do not introduce provider-side conversation storage or previous_response_id. |
| Use stored-response chaining only when retention is permitted and approved. | yes | yes | already present | [x] | Application owns durable operation, fingerprint, credit reservation/refund and private result. Do not introduce provider-side conversation storage or previous_response_id. |

### Instruction Persistence Gotcha

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve durable instructions across stateless replay and stored-response chaining. | yes | yes | already present | [x] | Every independent retained Responses request supplies its existing instructions/schema; no chaining. |
| Replay instruction input items or resend top-level instructions when required. | yes | yes | already present | [x] | Every independent retained Responses request supplies its existing instructions/schema; no chaining. |

## Reasoning

### Encrypted Reasoning Items

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve complete encrypted reasoning items across stateless turns and tool calls. | no | no | not applicable | [ ] | No reasoning replay/tool conversation. |
| Preserve original ordering, encrypted payloads, and tool-call identifiers. | no | no | not applicable | [ ] | No reasoning replay/tool conversation. |
| Avoid replacing original reasoning items with summaries or reconstructed text. | no | no | not applicable | [ ] | No reasoning replay/tool conversation. |

### Reasoning Effort

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Explicitly configure supported reasoning effort for each applicable model and workload. | no | no | not applicable | [ ] | No reasoning-capable text model migration; no unsupported reasoning fields added to Images API. |
| Preserve established preferences or confirm new quality, latency, and cost tradeoffs. | no | no | not applicable | [ ] | No reasoning-capable text model migration; no unsupported reasoning fields added to Images API. |
| Verify selected model and provider support. | no | no | not applicable | [ ] | No reasoning-capable text model migration; no unsupported reasoning fields added to Images API. |

### Reasoning Preservation

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess supported cross-turn versus current-turn reasoning preservation. | no | no | not applicable | [ ] | No multi-turn reasoning history. |
| Preserve required history while respecting context size, latency, privacy, and developer preferences. | no | no | not applicable | [ ] | No multi-turn reasoning history. |

### Reasoning Summaries and Tool-Call Preambles

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess reasoning summaries and tool-call preambles for the existing product experience. | no | no | not applicable | [ ] | No reasoning/tool presentation requested. |
| Preserve existing user-visible behavior and distinguish summaries from verbosity and message phases. | no | no | not applicable | [ ] | No reasoning/tool presentation requested. |
| Verify selected model, provider, and SDK support. | no | no | not applicable | [ ] | No reasoning/tool presentation requested. |

## Verbosity

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Configure supported response verbosity for each applicable request. | no | no | not applicable | [ ] | Preserve strict card/review schemas and image outputs; no new unsupported verbosity field. |
| Preserve established preferences or ask the developer before selecting a new setting. | no | no | not applicable | [ ] | Preserve strict card/review schemas and image outputs; no new unsupported verbosity field. |
| Confirm output-length, user-experience, latency, cost, model, and provider compatibility. | no | no | not applicable | [ ] | Preserve strict card/review schemas and image outputs; no new unsupported verbosity field. |

## Maximum Output Tokens

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve existing output limits when appropriate. | yes | partial | already present | [x] | Retain8000 card/review and300 safety limits. Images API has explicit quality/dimensions/count controls; do not invent a hard monetary limit from tokens. |
| Avoid inventing a limit without an application or developer requirement. | yes | partial | already present | [x] | Retain8000 card/review and300 safety limits. Images API has explicit quality/dimensions/count controls; do not invent a hard monetary limit from tokens. |
| Account for both visible output and reasoning tokens. | yes | partial | already present | [x] | Retain8000 card/review and300 safety limits. Images API has explicit quality/dimensions/count controls; do not invent a hard monetary limit from tokens. |

## Assistant Message Phases

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve supported assistant-message phases across requests and replay. | no | no | not applicable | [ ] | No assistant conversation replay or agent phases. |
| Retain structured assistant outputs rather than collapsing them to plain text. | no | no | not applicable | [ ] | No assistant conversation replay or agent phases. |
| Test relevant commentary and tool-loop behavior. | no | no | not applicable | [ ] | No assistant conversation replay or agent phases. |

## Context Compaction

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess native compaction for long-running conversations and tool-heavy workflows. | no | no | not applicable | [ ] | No growing conversation history; standalone requests. |
| Confirm changes to compaction strategy with the developer. | no | no | not applicable | [ ] | No growing conversation history; standalone requests. |
| Configure appropriate in-request or standalone compaction and thresholds. | no | no | not applicable | [ ] | No growing conversation history; standalone requests. |
| Preserve encrypted compaction items during manual state management. | no | no | not applicable | [ ] | No growing conversation history; standalone requests. |
| Verify privacy requirements and model or provider compatibility. | no | no | not applicable | [ ] | No growing conversation history; standalone requests. |

## Structured Outputs

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve required structured-output schemas, validation, parsing, and error handling. | yes | yes | already present | [x] | Keep existing card/review/safety strict JSON schemas and incomplete-response refusal. |
| Verify model and provider compatibility and add focused schema tests. | yes | yes | already present | [x] | Keep existing card/review/safety strict JSON schemas and incomplete-response refusal. |
| Avoid imposing structured outputs on unrestricted-text workflows. | yes | yes | already present | [x] | Keep existing card/review/safety strict JSON schemas and incomplete-response refusal. |

## Tools

### Tool Choice

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Preserve automatic, required, or restricted tool-selection behavior. | no | no | not applicable | [ ] | Direct Images API; no Responses tool-selection policy. |
| Confirm meaningful changes to tool-use policy with the developer. | no | no | not applicable | [ ] | Direct Images API; no Responses tool-selection policy. |

### Tool Search and Additional Tools

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess deferred tool discovery for large or dynamic tool catalogs. | no | no | not applicable | [ ] | No tool catalog. |
| Preserve correctly positioned additional-tool items and append-only replay. | no | no | not applicable | [ ] | No tool catalog. |
| Maintain stable cached prefixes without unnecessary tool-search complexity. | no | no | not applicable | [ ] | No tool catalog. |
| Confirm adoption or higher-lift implementation with the developer. | no | no | not applicable | [ ] | No tool catalog. |

### Parallel Tool Calls

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess concurrent execution of independent tools. | no | no | not applicable | [ ] | Provider n=3 batch remains one image request, not independent tool execution. |
| Preserve execution order, shared-state assumptions, approvals, and side-effect controls. | no | no | not applicable | [ ] | Provider n=3 batch remains one image request, not independent tool execution. |
| Confirm behavior-changing concurrency with the developer. | no | no | not applicable | [ ] | Provider n=3 batch remains one image request, not independent tool execution. |

### Programmatic Tool Calling

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess supported programmatic coordination of tool calls. | no | no | not applicable | [ ] | No agent or tool-calling redesign. |
| Verify model, provider, SDK, tool, and execution-environment support. | no | no | not applicable | [ ] | No agent or tool-calling redesign. |
| Preserve permissions, approvals, side-effect controls, and application behavior. | no | no | not applicable | [ ] | No agent or tool-calling redesign. |
| Distinguish programmatic calling from ordinary sequential or parallel function calling. | no | no | not applicable | [ ] | No agent or tool-calling redesign. |
| Test execution, results, failures, and changed approval behavior. | no | no | not applicable | [ ] | No agent or tool-calling redesign. |

### Model-Aligned Tool Interfaces

| Guidance item | Applicable | Supported | Decision | Implemented | Rationale or evidence |
|---|---|---|---|---|---|
| Assess conventional repository-search, patch-oriented editing, or other model-aligned tool interfaces. | no | no | not applicable | [ ] | No model-facing tools. |
| Confirm higher-lift tool redesign with the developer before implementation. | no | no | not applicable | [ ] | No model-facing tools. |

## Outcome

**Implemented or already present:** Pending executed stage results; no live result claimed.  
**Remaining work:** Pending executed stage results; no live result claimed.  
**Developer decisions requiring follow-up:** Recorded below  
**Validation evidence:** Pending executed stage results; no live result claimed.

## Workload coverage

| Workflow | Stage | Route and controls | Validation |
|---|---|---|---|
| Artwork |1|Images generations, fixed server model/quality/count, private durable recovery|Pending helper/HTTP regression and real Preview probe|
| Re-sketch |1|Images edits, same reference/rights/Studio gate, three images|Pending mocked multipart/recovery tests; actual edit separate acceptance|
| Cards/set/review |Retained|Responses strict schemas, store:false, independent textmodel|Existing regression suite|
| Safety |Retained|Responses pre/post classification, failclosed|Existing regression plus real smoke checks|
| Operator readiness |2|Preview-only strong secret, no secrets/provider payload returned; model GET then fixed-op durable paid smoke|Pending independent auth/idempotency tests|

## Sources and authorization receipt

User supplied existing key and said 'okay get it ready for launch' after cloud pricing explanation. Earlier full approval, delegation and Preview-only/cloud enablement persist. No new key, paid plan, production promotion or live billing. Quality medium chosen explicitly for controlled standard generation rather than automatic high settings; examples of costs are conditional until real provider usage is measured.

Official docs verified: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare , https://developers.openai.com/api/docs/models/gpt-image-1 (retired), https://developers.openai.com/api/reference/resources/images/methods/generate . GPT Image2.5 output30USD/million tokens, textinput5, imageinput8; actual usage and provider charges must not be confused with app credit units.



## Stage1 completion

Implemented supported image model/quality configuration and generic provider errors for both artwork and re-sketch; three choices/onecredit, safety checks and durable response behavior retained. Added distinct server-side cloud pause and bounded recovery admission, with no existing results/credits removed.

Executed local evidence: full suite40groupsPASS; buildPASS; npmproductionaudit0; operatorHTTPfixturePASS; logical-capacityPGlitePASS; native PostgreSQL independent-connections admissionracePASS. Capacity function-only migration applied to approved backend;6credit/recoverytablecounts+fingerprints unchanged. Providermodelaccessandrealgenerationnotyetclaimed. Stage2 operator code implemented/localtestsPASS; actualPreview verificationpending. Stage3CIandnewPreviewpending.
