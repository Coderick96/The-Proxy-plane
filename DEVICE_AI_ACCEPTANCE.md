# Built-in device AI and print acceptance

The normal artwork workflow uses the integrated ONNX/WebGPU worker and the pinned
DreamShaper model. It does not require an OpenAI key or make a paid cloud fallback.
Cloud text/set generation is absent from the default workflow until a local text
model exists. The core card editor remains available for manual text and lore.

## Paid AI sales gate

AI credit packs and monthly AI credits are unavailable by default. Both catalog
and direct checkout enforce `DEVICE_AI_PAID_RELEASE_VERIFIED`. Do not set it to
true until image quality, generation completion, retry/credit behavior and print
acceptance are verified on the intended devices. Existing signed payment events,
refunds and cancellations remain processable. Studio and backing purchases are
separate from this gate.

The beta generator still uses the existing one-credit authorization before actual
generation; the new GPU self-check uses no account credits and downloads no model
weights. A self-check success proves runtime initialization only, not good artwork.
The initial model download is approximately 1.04 GB. Its current output is 512 ×
512; higher export DPI does not invent more image detail. No universal phone
compatibility claim is supported.

## Executed verification scope

- ONNX/WebGPU runtime self-test: actual software GPU executed Add = 3.5.
- Native environment probe: SwiftShader, no shader-f16. This environment cannot
  run the full current model through the production hardware gate. Full diffusion
  image quality is BLOCKED here, not passed. No stock image or procedural picture
  is presented as successful model generation.
- Local app/browser workflow: consent, worker lifecycle, three choices and apply,
  cancellation and account isolation use mocked inference; not model quality proof.
- Print regression: physical card trim remains 2.5 × 3.5 inches (180 × 252 PDF
  points), across paper/bleed/duplex options and explicit no-scaling preference.
- New source-image quality check computes effective PPI from actual rendered trim
  and artwork bounds, including image zoom. It warns below 300 PPI and excludes
  vector artwork. Export DPI is separate from source-image resolution.

## Release evidence still required

On each intended hardware/browser family, run the no-credit GPU self-check,
then generate a small prompt set with real pinned weights. Keep prompts and
images on the test device unless the tester explicitly shares them. Review fine
edges, subject consistency, faces/hands, composition and art-box cropping at card
size. Record time, memory failures, cancellation/retry and download/cache recovery.

Export and physically print a first sheet at Actual size/100%. Measure its ruler
and 63.5 × 88.9 mm card trim; compare small text, dark/light colors, crop edges,
front/back alignment and bleed. This environment has no physical printer and
cannot certify paper output from PDF geometry alone.

Android/iOS/Windows packaging should reuse the editor, project/print formats and
separate model/runtime interface. Native acceleration and appropriate models must
be evaluated per platform; the web model is not automatically a phone's OS model.
