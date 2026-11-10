# Browser-local artwork

Open **AI Art Studio → On this device**. This is the default artwork mode. It runs in a module Worker on the visitor's GPU, without a desktop companion, localhost inference server, OpenAI key, account database or paid AI credits.

1. Use the hosted HTTPS app in a compatible WebGPU browser.
2. Read the model/download notice and accept its license. The first run downloads approximately 1.04 GB; use Wi-Fi and keep the tab open. Browser storage may cache verified files, but offline use is not guaranteed.
3. Describe the artwork and choose **Generate 3 choices on this device**.
4. Choose **Use option** to apply artwork directly to the current card, then save the card to keep it.
5. **Cancel generation** terminates the Worker. Changing card/account/mode also discards the pending device job. **Remove downloaded model** clears only this model's cache, not cards or saved artwork.

The chosen model produces native 512 × 512 images. Card framing/cropping can resize them but does not add generated detail. Text, card framing and printing remain editable in the existing studio.

## Compatibility and privacy

The model needs WebGPU, shader-f16, at least 256 MiB supported buffer limits, and enough additional CPU/GPU memory for dequantized weights and activations. Feature detection is not proof that the model fits. Some phones cannot run it; memory errors can require closing other tabs or using another device. This release does not claim universal iPhone/Android compatibility.

Prompts and inference stay in the Worker. Only immutable model assets are fetched from Hugging Face, with credentials omitted and referrers suppressed. Runtime JavaScript/WASM is served by the app. Generated choices remain in device memory until applied/saved; they are not automatically synchronized. Explicit cloud saves/shares use the existing user-controlled flows. There is no automatic server inference fallback and no paid-credit mutation for device generation. Cloud artwork remains an explicit separate mode with its existing account and credit requirements.

## Model and licenses

- [DreamShaper 8 LCM browser export](https://huggingface.co/skillsafeai/dreamshaper-8-lcm-onnx-webgpu/tree/a310400909a293a7a937a54854910ed06469192b), pinned revision `a310400909a293a7a937a54854910ed06469192b`.
- [Upstream Lykon model](https://huggingface.co/Lykon/dreamshaper-8-lcm/tree/4645d8bc6a8e6b106d21606d63e8460cdad4f1a6), CreativeML OpenRAIL-M. The full license and use restrictions are provided in `public/licenses/device-ai-openrail-m.txt`; download consent links to that same-origin copy.
- `onnxruntime-web` 1.27.0, `@huggingface/tokenizers` 0.2.0 and `hash-wasm` 4.12.0 are pinned. Notices/license copies are in `public/licenses/`.
- All five model/tokenizer files have immutable revision URLs, exact byte lengths and SHA-256 digests. Verification happens before inference or cache insertion. Weight files are not bundled in Git or deployment source. Small tokenizer fixtures are included so tests run without network access.

## Verification and limits

`npm run test:device-ai` runs download/cache, scheduler/model-contract and real tokenizer-oracle tests. `npm run test:device-ai-browser` runs actual App/Chromium interactions with explicit Worker/GPU mocks and a separate native capability probe. These tests do not generate real model artwork.

The full aggregate suite passes 27 groups. Browser integration passes at 390/768/1440 pixels with zero scoped axe violations, no overflow, no AI POSTs and no popups. The actual environment exposes only SwiftShader, without shader-f16; genuine image generation and physical phone/PC GPU behavior remain BLOCKED/NOT RUN. Test on a compatible physical device before declaring this generator release-ready. See `docs/qa/device-ai/QA-MATRIX.md`.
