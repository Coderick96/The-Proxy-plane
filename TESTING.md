# Test the private-beta candidate

Current work is on **feature/private-beta-launch-gates**, based on the runtime and credit fixes in [draft PR #8](https://github.com/Coderick96/The-Proxy-plane/pull/8). Use the launch-gates draft PR and its exact tested commit for review; do not use the old `feature/local-art-audit-homepage` branch or main. Main and production remain unchanged.

Use Node.js 22 or later and npm. Extract into a fresh folder and export a card backup before testing. Do not copy credentials from the real-data backend into this candidate. Current environment/account instructions are in [BETA_SETUP.md](BETA_SETUP.md), using the tracked, nonsecret [environment template](config/beta.env.example).

## Local editor preview without credentials

Leave account/provider credentials unconfigured. On Windows, run `START_THE_PROXY_PLANE.bat`; alternatively use:

```sh
npm ci
npm start
```

Open the local URL printed in the terminal, normally `http://127.0.0.1:5173`. Keep the terminal open; Ctrl+C stops the editor and API. This is a local editor preview, not a configured private beta or production deployment. If `VITE_PRIVATE_BETA=true` is set, the private-beta account gate intentionally requires a configured isolated backend.

Without credentials you can check:

- Home actions, card catalog, set/color/rarity filters and price/mana sorting.
- Scryfall search, alternate printings and double-faced selection (internet required).
- Custom frames, text, symbols, layers, uploaded art, zoom and browser-local saves.
- Print queue editing/removal, Letter/A4 settings, PDF exports and optional blank backs.
- Card backup/export/import. Use a separate browser profile for isolated testing.

No test or setup command should target the existing real-data Supabase project. Do not delete old folders or backups until your work is verified.

## Account, credit and AI verification

Use an isolated local Supabase stack or an explicitly approved isolated hosted backend. A complete local stack has not yet been verified in this environment. Running SQL fixtures alone does not establish Auth/REST/Storage behavior. Follow the SQL order and secure configuration in [BETA_SETUP.md](BETA_SETUP.md), then complete [the beta acceptance checklist](BETA_TEST_CHECKLIST.md).

After securely completing the isolated backend `.env`, run `npm run beta:check`. Its expected result with the untouched empty template is **SETUP BLOCKED**. It is an offline configuration check: it does not contact the backend or providers, print credential values, migrate data or certify readiness. Even a configuration PASS still requires actual credentials, isolation and integration checks.

Both device and cloud artwork require authenticated one-credit authorization for three choices. Device computation runs in a browser Worker and requires no OpenAI key or desktop companion; see [DEVICE_AI.md](DEVICE_AI.md). Full diffusion on a compatible physical GPU/phone remains unverified. The available software GPU runtime check does not establish shader-f16 support, model memory fit or actual generated artwork. Unsupported devices can use uploads or an explicitly configured cloud mode.

Cloud AI, email/provider sign-in, community synchronization and Stripe TEST-mode billing need real isolated integration checks before enabling them. Keep `BETA_AI_ENABLED=false` and `BETA_TEST_BILLING=false` until their acceptance gates pass. Serverless cloud AI also needs an idle-recovery scheduler. Owner refills require the optional reviewed SQL and server-only configuration; they do not use Stripe and are disabled in production. Never expose credentials or use a real payment card.

## Automated checks and what they prove

```sh
npm test
npm run build
npm run test:device-ai
npm run test:device-ai-runtime
npm run test:device-ai-browser
npm run test:browser
npm run test:print-browser
```

`npm test` includes SQL/PGlite, HTTP boundary and simulated UI regression checks. The runtime browser test reproduces the old WebGPU startup failure and executes a real weight-free ONNX Add graph with the corrected backend. The device UI browser test explicitly mocks model inference, GPU/account capabilities and credit responses. Neither is a full diffusion test. Browser mobile layouts are emulation, not native iPhone evidence.

The launch-gates work adds `npm run test:postgres` for a disposable local native PostgreSQL concurrency test. It must use disposable local fixture data; it is not permission to connect to a remote or real-data database. Consult that command's actual output and prerequisites before claiming a pass. It does not replace full Supabase Auth, REST or Storage tests.

Executed evidence from PR #8 is in [the runtime/credit QA matrix](docs/qa/runtime-credit-fix/QA-MATRIX.md). Historical baseline checks remain under `docs/qa/`; use the latest exact logs and commit when assessing results. A successful build, liveness endpoint or preview URL is not launch certification.

## Physical phone and printer testing

For layout/editor/upload/print testing on a trusted local Wi-Fi network, use two terminals:

```sh
# Terminal 1
npm run server
# Terminal 2
npm run dev -- --host 0.0.0.0
```

Open Vite's printed Network URL on the phone. Leave cloud credentials unconfigured for this local layout test. Do not expose the development port publicly. Ordinary HTTP LAN URLs do not supply the secure context needed for WebGPU or production OAuth; use a properly configured protected HTTPS preview for those flows.

On an actual iPhone, test Safari navigation, touch controls, keyboard/focus, uploaded art, PDF download/rendering and Share → Print. Select matching paper and Actual Size/100%, disable fit/shrink and printer expansion, then measure card edges at **63.5 × 88.9 mm** and the **25.4 mm** calibration ruler. Record the device/browser, printer, driver, paper, scale and measurements. Browser geometry cannot certify a physical printer.

## Report a result

Use PASS, FAIL, BLOCKED or NOT TESTED, and include the exact commit, action, device/browser and evidence. For a failure, include repeatable steps and expected/actual behavior. Report through Beta desk when the isolated account backend is available. Never send passwords, API keys, refill codes, tokens or payment-card details. Keep main and production unchanged until approval.

The optional `npm run test:accounts-local` runs real disposable GoTrue/PostgREST/PostgreSQL services and application account/credit endpoints. Pull the pinned images listed in BETA_SETUP first. Its storage helpers are fixtures; it does not verify Storage HTTP, email delivery, external OAuth, hosted credentials or physical devices.
