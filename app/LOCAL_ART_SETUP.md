# Local artwork for The Proxy Plane

The official artwork flow runs Stable Diffusion on **the user's computer**, produces three
choices, and uses the existing hosted credit ledger to charge **one credit per batch
authorization**. There are no image-generation or moderation API calls in this flow.
The existing Stripe credit packs and account allowances are reused without a database
migration or price change. The uploaded ZIP is retained; editable source is in `app/`.

This is an integrated browser app plus a local Python companion, not a packaged desktop
installer. Windows, Linux and Apple Silicon macOS are the intended targets. NVIDIA CUDA,
Apple Metal and CPU are detected by the companion; AMD/Intel GPUs currently fall back to
CPU. Phones, tablets, managed devices that cannot install Python, and browsers that cannot
reach loopback are not supported. CPU rendering can take many minutes per image.

## Developer / hosted server setup

Run these from `app/`, using Node 20.19+ (Node 22+ recommended):

```sh
npm ci
npm run local-art:keys
```

This generates an Ed25519 private/public pair in the ignored `.local-art-keys/` directory.
It never prints the private key or replaces existing keys. Back up the pair securely.
Keep `private.pem` **only on the hosted account server**, and distribute `public.pem`
with the companion. Never ship Supabase service-role keys, Stripe secrets, the signing
private key, or an OpenAI key to users.

Merge the following into the existing server `.env` (do not overwrite existing account
and billing settings from `PREMIUM_SETUP.md`):

```dotenv
LOCAL_ART_ENABLED=true
LOCAL_ART_PRIVATE_KEY_FILE=.local-art-keys/private.pem
CLIENT_ORIGIN=http://127.0.0.1:5173
```

For hosted deployments set `CLIENT_ORIGIN` to the exact HTTPS app origin. A secret manager
may instead provide `LOCAL_ART_PRIVATE_KEY` as a PEM with literal or escaped newlines.
The existing Supabase configuration and schema through `credits.sql` must be working.
No new SQL or Supabase API grants are needed. The backend checks the existing
`pp_ai_charges` ledger with its existing service role and spends through
`pp_spend_credits`. The local worker never connects to Supabase.

Start the app with the normal `npm start`, or build and serve using the existing deployment
process. Existing image generation and re-sketch requests now use the companion by default.
The old paid image routes reject requests in local mode. There is no automatic paid fallback.
Card/lore generation and rules review still use the existing text provider; those are
separate features and may incur provider fees if configured and used.

## User computer setup

Install Python **3.10–3.12** and Node 22+, and distribute the `app/` source with the
publisher's **public** key. Do not distribute the developer's `.env` or private-key folder.
Users need only the `local-renderer/`, `scripts/local-renderer.mjs`, `package.json`, and
public key to run the companion; no Supabase, Stripe or OpenAI account is needed on it.

From `app/`:

```sh
npm run local-art:setup
```

This creates `.venv` and installs pinned PyTorch and renderer packages. Allow several GB
for packages and approximately 5–15 GB more for cached model downloads; models download
on the first render. NVIDIA users must install a CUDA-compatible PyTorch wheel for their
GPU/driver if the default wheel doesn't report CUDA support. Use the current wheel selector
at https://pytorch.org/get-started/locally/; the setup pins torch 2.8.0 / torchvision 0.23.0.
Run the replacement pip command using `.venv/bin/python` (Windows: `.venv\Scripts\python.exe`).
The companion does not use remote code from model repositories.

Set these environment variables on the user's computer before starting (or create a
local `.env` containing **only these public settings**):

```dotenv
PP_APP_ORIGIN=https://your-proxy-plane-domain.example
PP_ART_PUBLIC_KEY_FILE=/absolute/path/to/publisher-public.pem
```

For local development use the exact origin `http://127.0.0.1:5173`. The development
public key at `.local-art-keys/public.pem` is detected automatically. Run:

```sh
npm run local-art:start
```

Open Proxy Plane → Custom Studio → AI Art Studio → **Check this computer**. Allow local
network access if the browser asks. Enter a prompt and select **Generate artwork · 1 credit**.
Keep that tab open. The artwork picker receives exactly three images and uses the existing
apply/save/print workflow. The set illustrator uses the same integration; Premium/Studio
re-sketch entitlements remain in force. Prompts go to the hosted account server to authorize
credits; re-sketch references also pass through it. Neither goes to a paid image provider.

The companion binds only `127.0.0.1:8790`, pins the publisher's public key and exact app origin,
and checks signed tickets before rendering or returning jobs. Do not expose this port publicly.
Chrome/Edge with local-network permission are recommended. Browser security policies,
corporate device settings, HTTPS-to-loopback restrictions or proxies can block the connection;
check on actual supported browsers before release. No browser security feature is disabled.

## Hardware and quality

Profiles use available GPU/unified memory plus this renderer's reusable GPU allocations,
not just the device's advertised capacity. This avoids downgrading a subsequent batch
because the renderer itself has cached model weights.
Only one image is rendered at a time. Dimensions below are portrait; landscape swaps them
and square uses the shorter edge.

| Available hardware | Model | Starting resolution | Steps |
| --- | --- | --- | --- |
| NVIDIA, ≥16 GB free VRAM | SDXL | 1024 × 1536 | 35 |
| NVIDIA, ≥10 GB free VRAM | SDXL | 832 × 1216 | 30 |
| NVIDIA, ≥6 GB free VRAM | SDXL with CPU offload | 768 × 1152 | 28 |
| Apple Metal, ≥24 GB available RAM | SDXL | 768 × 1152 | 28 |
| Other supported computers | SD 1.5 | 512 × 768 | 30 |
| Out-of-memory recovery | SD 1.5 on CPU | 384 × 576 | 28 |

These are conservative heuristics, not benchmarks or guarantees of maximum possible quality.
At least 4 GB **available** RAM is required for CPU fallback; 16 GB system RAM is recommended.
Models are `stabilityai/stable-diffusion-xl-base-1.0` and
`stable-diffusion-v1-5/stable-diffusion-v1-5`. Their OpenRAIL++ / CreativeML OpenRAIL-M
licenses permit commercial use subject to their terms and use restrictions. Check the
model repositories' licenses before distributing weights. No hosted inference service is used.

## Charging, failures and privacy

- One credit is charged when the hosted server issues a batch authorization, after the
  browser confirms that a companion is ready. Payment prices remain those of the existing
  credit store; this change neither creates Stripe products nor enables live charges.
- The browser stores a request ID per account, prompt, size and reference in session storage
  **before** authorization. Retrying the same request in that tab reuses the persisted database
  operation and never charges twice, including after a network interruption or page reload.
- Tickets last 24 hours; reauthorizing that same request renews the ticket without another
  credit. Seeds remain tied to the operation. The companion saves each completed choice to
  `~/.proxy-plane/art`, resumes partial batches after restart, and releases a batch only when
  all three choices finish. Successful completion clears the tab's retry ID; another deliberate
  generation is a new paid batch. Closing the tab or changing prompt/reference/size loses
  that automatic retry association. Record the job ID for support when necessary.
- There is **no automatic refund based on a client-reported failure**: an untrusted local
  client cannot prove that it did not receive images. Support can investigate the operation
  and use the existing server-only `pp_refund_ai(charge_id)` RPC once. Refunded operations
  cannot obtain new tickets; already-issued offline tickets remain usable until expiry.
- Users can modify local software and run the open models independently. Credits gate the
  official integration, not possession of open model weights. This is not DRM.
- Local output screening uses the SD 1.5 safety classifier for all outputs, including SDXL,
  and fails closed if the classifier errors. It is **not equivalent** to the existing cloud
  text-and-image safety classifier, cannot reliably detect all prohibited content (including
  child exploitation), and should not be presented as a safety guarantee. Reference inputs
  and prompts do not receive equivalent cloud moderation in this free path. No paid
  moderation request is silently added. Existing legacy cloud mode retains its checks.
- Generated files remain on the user's disk until deleted. `PP_ART_CACHE` changes the cache
  location. Model downloads remain in Hugging Face's local cache. Deleting artwork does
  not alter purchased credit balances.

Developers avoid per-image provider fees but still pay any app hosting, database and payment
processing costs. Users supply hardware, storage, bandwidth and electricity.

## Validation and release limits

```sh
npm run build
npm run test:local-art
# Optional, with Playwright + Chromium installed:
npm run test:local-art -- --browser
# Legacy cloud screening with mock providers, without billable calls:
npm run test:local-art -- --legacy
cd local-renderer
python -m unittest test_worker -v
```

The build, authorization/client tests, four Python service tests, and Chromium studio
smoke test passed in the implementation workspace. Tests cover actual HTTP authorization,
real Ed25519 signatures across Node and Python,
credit deduplication and entitlement gates, signed job access, three-choice completion,
cached recovery, and the default paid-endpoint block. Rendering is simulated in automated
tests; they do not establish actual GPU performance, model-download compatibility, billing
configuration or live database security. Before releasing, render three real images on each
supported hardware class and test your deployed HTTPS app's loopback permissions and real
account credits. No production deployment, model download or real payment was performed
as part of this change.

The uploaded baseline's `npm run test:credits` currently fails with `10 !== 15` in
`tests/credits-db.mjs:10`; the same failure was reproduced against the untouched ZIP source.
This integration does not change its SQL, allowances or billing amounts.
