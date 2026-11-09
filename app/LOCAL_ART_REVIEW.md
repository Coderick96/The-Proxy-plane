# Independent verification of local artwork

Three separate agents independently reviewed (1) the renderer and inference code,
(2) account, credit and ticket security, and (3) browser integration and setup.
Their findings were checked centrally and addressed in this follow-up change.

Confirmed fixes:

- Authenticated configuration requests now work with private-beta API protection.
- Changing accounts during hardware detection cancels before spending the new account's credits.
- Every authorization runs the existing current-credit-schema check, including ordinary artwork.
- Failed local renders refresh the account balance; the store explains retries rather than promising automatic refunds.
- Ticket validation uses explicit checks that remain active under optimized Python.
- GPU profile selection counts the renderer's reusable allocations, preventing quality downgrades caused by its own cached model.
- CPU fallback starts after the failed exception frame is released, allowing old allocations to be reclaimed.

The central follow-up checks were: reproduce and inspect each finding, run focused regressions,
then inspect the final code diff and production build.

Passed after the fixes:

- Production build and whitespace/diff checks.
- HTTP authorization, ownership, replay, entitlement, fixed batch price and paid-endpoint denial tests.
- Actual private-beta configuration authentication and outdated-schema rejection tests with account services mocked.
- Client preflight, retry persistence, three-result validation and account-switch cancellation tests.
- Legacy cloud safety regressions with mock providers.
- Chromium studio, hardware-status and signed-out generation checks, using a hardware-status fixture.
- Five focused Python tests under `python -O`: ticket validation, cached GPU memory,
  OOM frame release, Node/Python signature interoperability, and hardware profiles.

The earlier four-test Python service suite, including simulated partial-batch recovery,
passed before this follow-up. A full six-test rerun was not completed after the fixes;
the five focused optimized-mode tests above were completed. The untouched baseline's
credit database suite still has the documented `10 !== 15` failure.

No actual diffusion inference, image-quality benchmark, live account/payment test or deployment
was performed. These checks verify integration and simulated rendering, not end-to-end production
readiness. Real model downloads, three-image renders on supported devices and hosted-browser
loopback access remain release checks. The pull request should remain a draft until those pass.
