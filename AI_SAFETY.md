# AI safety in 2.5.7

This release builds directly on 2.5.6. It does not include the paused store
compliance changes, native wrappers, new moderation workflow or new legal pages.
The logo, real-card tools, community, subscriptions and printing remain intact.

The four server AI operations (art, re-sketch, card/set/lore generation and rules
review) check inputs before reserving credits and check complete results before
returning them. Re-sketch references and all generated image choices are reviewed
as image inputs. Text is retained in full within the supported request limits.

The app policy targets child abuse/exploitation (including sexualized minors,
grooming and graphic nonsexual child abuse) and explicit pornography. Non-graphic
prevention, rescue and recovery, dark fantasy, ordinary combat, horror and
non-explicit adult romance are not automatically rejected by this app policy.
OpenAI's own service and model rules apply independently and can be stricter.

Blocked inputs consume no app credits. Blocked results return the exact daily /
purchased credit reservation through the existing idempotent refund mechanism.
A failed, malformed, incomplete or refused safety-classifier response releases
no result; any reserved credits are refunded. Pending checks share the existing
per-account generation lock. No browser-provided decision can bypass the checks.

Set server-only OPENAI_SAFETY_MODEL (default gpt-4.1-mini). The selected model must
support image inputs and structured JSON outputs. Checks use the existing OpenAI
server key with store:false. Safety classification adds provider calls, latency
and operating costs; it does not cost extra user app credits. Prompts, reference
images and generated results go to OpenAI for these checks. Do not log their raw
payloads. There is no new app database of rejected content or automatic reporting
of users in this release.

These are probabilistic model checks, not a guarantee of detecting every abuse
attempt or of compliance with every law. They apply to AI requests/results, not
ordinary local image uploads, imported cards, or existing community posts.

Regression tests use synthetic verdicts and harmless placeholder images with
mock providers. No abusive material was generated or acquired, and no live or
billable AI calls were made. Run npm run test:ai-safety.
