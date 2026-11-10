# Browser-local artwork

Open **AI Art Studio → On this device**. This is the default artwork mode. It runs in a module Worker on the visitor's GPU, without a desktop companion, localhost inference server or OpenAI key. Both artwork modes cost one account credit per three-choice request. Device generation therefore needs the server account/credit backend, while image computation remains local.

1. Use the hosted HTTPS app in a compatible WebGPU browser and sign in with an available credit balance.
2. Read the model/download notice and accept its license. The first run downloads approximately 1.04 GB; use Wi-Fi and keep the tab open. Browser storage may cache verified files, but offline use is not guaranteed.
3. Describe the artwork and choose **Generate 3 choices on this device · 1 credit**. Runtime/model preparation occurs before server authorization; no image-generation steps run until the server confirms the one-credit receipt.
4. Choose **Use option** to apply artwork directly to the current card, then save the card to keep it.
5. **Cancel generation** terminates the Worker. Changing card/account/mode also discards the pending device job. **Remove downloaded model** clears only this model's cache, not cards or saved artwork.

The chosen model produces native 512 × 512 images. Card framing/cropping can resize them but does not add generated detail. Text, card framing and printing remain editable in the existing studio.

## Compatibility and privacy

The model needs WebGPU, shader-f16, at least 256 MiB supported buffer limits, and enough additional CPU/GPU memory for dequantized weights and activations. Feature detection is not proof that the model fits. Some phones cannot run it; memory errors can require closing other tabs or using another device. This release does not claim universal iPhone/Android compatibility.

Prompts and inference stay in the Worker. Only immutable model assets are fetched from Hugging Face, with credentials omitted and referrers suppressed. Runtime JavaScript/WASM is served by the app. Generated choices remain in device memory until applied/saved; they are not automatically synchronized. Explicit cloud saves/shares use the existing user-controlled flows. There is no automatic server inference fallback and no server image inference in device mode. Only an operation ID, pinned model revision and request fingerprint are sent to the credit endpoint; raw prompts/images are not sent for that authorization. Cloud artwork remains a separate explicit mode.

## Model and licenses

- [DreamShaper 8 LCM browser export](https://huggingface.co/skillsafeai/dreamshaper-8-lcm-onnx-webgpu/tree/a310400909a293a7a937a54854910ed06469192b), pinned revision `a310400909a293a7a937a54854910ed06469192b`.
- [Upstream Lykon model](https://huggingface.co/Lykon/dreamshaper-8-lcm/tree/4645d8bc6a8e6b106d21606d63e8460cdad4f1a6), CreativeML OpenRAIL-M. The full license and use restrictions are provided in `public/licenses/device-ai-openrail-m.txt`; download consent links to that same-origin copy.
- `onnxruntime-web` 1.27.0, `@huggingface/tokenizers` 0.2.0 and `hash-wasm` 4.12.0 are pinned. Notices/license copies are in `public/licenses/`.
- All five model/tokenizer files have immutable revision URLs, exact byte lengths and SHA-256 digests. Verification happens before inference or cache insertion. Weight files are not bundled in Git or deployment source. Small tokenizer fixtures are included so tests run without network access.

## Verification and limits

`npm run test:device-ai` runs download/cache, scheduler/model-contract and real tokenizer-oracle tests. `npm run test:device-ai-browser` runs actual App/Chromium interactions with explicit Worker/GPU mocks and a separate native capability probe. These tests do not generate real model artwork.

The full aggregate suite passes 30 groups. Browser integration passes at 390/768/1440 pixels with zero scoped axe violations, no overflow, one mocked credit-authorization POST and no popups. The actual environment exposes only SwiftShader, without shader-f16; genuine image generation and physical phone/PC GPU behavior remain BLOCKED/NOT RUN. Test on a compatible physical device before declaring this generator release-ready. See `docs/qa/runtime-credit-fix/QA-MATRIX.md`.

## Credit accounting and owner development refill

Device authorization is server-authoritative and atomic: one debit, one private receipt, same-ID/same-fingerprint retries do not debit again. Each new worker retry revalidates the receipt so an owner-refunded operation cannot be resumed through the normal UI. Retry seeds derive deterministically from the operation ID. Unknown network responses retain the request ID rather than issuing a new charge. Failures before authorization are uncharged. After authorization, device computation cannot be independently verified by the server, so there is no client-controlled automatic refund; retry the same charged request or ask the owner to review it. Cloud failures retain their existing server-managed refunds.

The normal app workflow enforces authorization, but public model weights and user-controlled browser code cannot provide tamper-proof per-generation billing. A modified client can run the downloaded model outside the app. Strong execution-based monetization requires server-controlled inference.

Owner development refills use a server-only OWNER_TOPOFF_CODE plus authenticated OWNER_USER_ID. A Preview-only opt-in adds 100 wallet credits per new redemption without Stripe/payment, with idempotent request IDs. The refill code is never embedded in public JavaScript. Other accounts are denied even if they know it, and the route is disabled in production. Apply the reviewed `supabase/dev_credits.sql` only to an approved isolated development database.

Activation remains blocked until account credentials, owner identity and the isolated staging database are connected. No real-data database schema was changed; the free-project quota is exhausted and the quoted paid branch has not been approved. Device generation intentionally stays disabled when credit authorization is unavailable.

Runtime regression: ORT 1.27's native WebGPU entry requires the matching Asyncify MJS/WASM pair. The previous JSEP pair caused `webgpuInit is not a function`. `node tests/device-ai-runtime-browser.mjs` reproduces that exact old failure and executes a real weight-free ONNX Add graph with the corrected backend on SwiftShader. A runtime self-check now runs before model downloads or credit authorization. This is not a genuine diffusion or physical-phone GPU test.
