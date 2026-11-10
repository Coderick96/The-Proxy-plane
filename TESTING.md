Browser-device AI: run `npm run test:device-ai` and `npm run test:device-ai-browser`. The browser harness explicitly mocks GPU inference for UI flows; its native capability probe is not an image-generation test. Genuine supported-device GPU and real iPhone verification remain required. See `docs/qa/device-ai/QA-MATRIX.md`.

# Try this private-beta candidate

Download the **feature/local-art-audit-homepage** branch (not main) and unzip into a new folder. Node.js 24 and npm are required. Do not copy an old environment file into this preview.

On Windows run `START_THE_PROXY_PLANE.bat`. On macOS/Linux, or manually on Windows:

```sh
npm ci
npm start
```

Open the local URL printed in the terminal, normally http://127.0.0.1:5173. Keep the terminal open while testing; Ctrl+C stops both editor and backend. This is a local preview, not a production deployment.

## Ready to try without credentials

- Home navigation on phone-sized and desktop windows.
- Search Scryfall, alternate printings and double-faced card selection (internet required).
- Create/edit frames, text, symbols, layers and uploaded art; save on this browser; export a backup before experimenting.
- Add/remove/edit the print queue; choose Letter/A4; export PDFs and test optional blank backs.
- Print a calibration/test sheet at Actual Size/100%; match the selected paper. Measure card edges at 63.5 × 88.9 mm. This physical step has not been certified by automated tests.

The browser's existing device saves are preserved by account scope; a new browser/profile is useful for isolated testing. No test command should be pointed at the real Supabase database.

## Features still gated

Cloud accounts, community synchronization, cloud AI and checkout need separately configured services. The connected Supabase project contains real data and is read-only for this mission. Its existing 15-credit constraint must not be changed without separate approval. Stripe's approved account is test-mode only; its catalog is verified but there is no webhook endpoint yet. No live payments are enabled.

The new durable AI recovery setup lives in `supabase/ai_recovery.sql`; it has only been exercised locally. It must be reviewed/applied to an isolated test database before cloud AI is enabled. The UI lets authenticated users recover stored artwork choices or download card/review results without another generation charge. Metadata lists do not download every image. Keep beta AI paused until the deployment's recovery process and storage budget are validated.

Local Art Studio is a separate optional desktop companion; see `local-art-studio/README.md`. Its model/GPU generation has not been validated on this host. On iPhone, use artwork upload or a configured cloud service; desktop companion execution is not assumed.

## Report a problem

Include the page/action, screen size or device/browser, visible error, and whether it repeats. Never send passwords, API keys or payment-card details. Screenshots and automated results are under `docs/qa/`; the release recommendation and remaining gates are in `docs/qa/RELEASE-REVIEW.md`.

## Try the layout on your iPhone over a trusted local Wi-Fi network

On the computer where you downloaded the source, use two terminals in the project folder:

```sh
# Terminal 1
npm run server
# Terminal 2
npm run dev -- --host 0.0.0.0
```

Open Vite's printed Network URL on your iPhone on the same Wi-Fi. This makes a local development preview reachable on that network; it does not publish a production site. Leave cloud credentials unconfigured for this isolated test. The app uses secure random-byte UUID generation when the native randomUUID API requires HTTPS. Cloud OAuth still requires correctly configured secure redirect URLs.

Try the home actions, an uploaded image in the editor, one-card PDF export, then Share → Print. Stop both terminals with Ctrl+C afterward. Please report device/browser and actual printer measurements; automated desktop emulation cannot supply those results.
