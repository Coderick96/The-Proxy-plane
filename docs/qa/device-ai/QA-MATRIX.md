# Browser-device AI verification

| Area | Status | Executed evidence / limitation |
| --- | --- | --- |
| Full regression | PASS | npm test: 27 groups, including 18 component fixtures. |
| Build | PASS | npm run build; worker JS and app-hosted runtime MJS/WASM emitted. Runtime is lazy: model weights are not deployed. Existing chunk-size advisory remains. |
| Production dependencies | PASS | npm audit --omit=dev: zero vulnerabilities at execution time. |
| Scheduler and engine | PASS | Independent numeric LCM oracles, seeded noise, image mapping, mocked 12-step/3-image pipeline, graph contracts and sequential session release. No real model inference. |
| Tokenizer | PASS | Real pinned vocabulary/merges against seven official CLIP oracle vectors, Unicode normalization, EOS and truncation. Reproducible fixtures included. Independently executed by QA. |
| Download/cache | PASS | Size/SHA verification, cache reuse, corruption eviction, quota fallback, omitted credentials/referrer, bounded progress and isolated cache removal. |
| Oversize stream regression | PASS | QA reproduced an unbounded cache-tee hang; fixed by caching only verified bounded-buffer streams. Independently retested: oversize never-ending stream rejects, aborts and never caches. |
| Consent/device gates | PASS | No Worker/model download without explicit generate+consent; unsupported GPU disables generation. |
| Editor integration | PASS | Actual App with mock Worker: guest prompt → 3 choices → apply, no popup/no inference API calls. |
| Cancellation/privacy | PASS | Worker termination and stale-result rejection on cancel, card change and mode change; component/account-key reset clears prompts/results. |
| Responsive/accessibility | PASS | Actual Chromium at 390/768/1440: no horizontal overflow, zero scoped axe violations. |
| Native capability probe | PASS | Executed Chromium: secure context, WebGPU adapter present, Google SwiftShader, shader-f16 false. |
| Genuine model/GPU inference | BLOCKED | No physical GPU here; software adapter lacks shader-f16. No generated real-art evidence claimed. |
| Real iPhone/Android/PC | NOT RUN | Must verify complete download, memory fit, genuine generation, cancellation and card application on actual supported devices. |
| Live cloud AI/billing | NOT RUN | Unchanged optional mode; no API key, paid branch, provider generation or live payment was used. |

Private beta test recommendation: feature preview available; actual supported-device inference must be validated before promoting device generation as launch-ready. Existing application/account/cloud launch blockers are not resolved by this local feature.

Independent QA source-reviewed the engine, tokenizer, manifest, Worker and UI; independently executed numeric/tokenizer/manifest/download checks and reproduced/retested the cache-tee fix. The lead executed the full aggregate/build/audit and the independently authored browser harness. No independent real GPU image-generation claim is made.
