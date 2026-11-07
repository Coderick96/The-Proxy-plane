# Proxy Plane Art Studio

A standalone companion for The Proxy Plane card editor. Each user runs the renderer on their own machine. SDXL model weights are downloaded on first generation and reused from the local cache. Generation uses no paid API, shared GPU, account, or API key.

The app generates three independent versions of the same prompt, one at a time. Full-card portrait exports a centered 750 × 1050 PNG crop at 300 DPI for a 2.5 × 3.5 inch card before bleed. Landscape exports a 1050 × 720 crop for a generic art window. Use the original PNG when the editor needs its own crop, frame, or bleed. The renderer generates artwork only.

## Run locally

1. Install Python 3.12. In this folder, create a virtual environment with `py -3.12 -m venv .venv` on Windows or `python3.12 -m venv .venv` on macOS/Linux.
2. Activate the environment or invoke its Python directly. Install PyTorch using the command for your OS and hardware from [PyTorch Start Locally](https://pytorch.org/get-started/locally/). For a compatible NVIDIA GPU, choose a CUDA build.
3. Run `python -m pip install -r requirements.txt` and then `python app.py` using that environment. After setup on Windows, double-click `START_ART_STUDIO.bat` to start the companion.
4. Open http://127.0.0.1:8765 and generate. Keep the terminal open while using Art Studio.

The renderer checks CUDA first, Apple MPS second, and CPU last. It uses CPU offloading on CUDA to reduce GPU memory pressure. The first run requires internet access, multiple gigabytes of storage, and time to download weights. CPU generation can be very slow and some devices may lack sufficient memory. The companion targets desktop users with a Python environment.

The generation engine uses the [SDXL base model](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) under its CreativeML Open RAIL++-M license. Proxy Plane owns the application workflow. The model weights are pretrained and fetched from the model publisher.

## Add to The Proxy Plane

Copy `proxy-plane-art.mjs` into the web editor source. Call `openArtStudio` directly from an editor button click. The local companion opens in its own window and sends back the selected PNG files. Pass the selected file into the existing custom-art upload handler.

```js
import { openArtStudio } from "./proxy-plane-art.mjs";

generateArtButton.addEventListener("click", () => {
  openArtStudio(({ original, seed }) => {
    const artwork = new File([original], `proxy-plane-${seed}.png`, {
      type: "image/png",
    });
    // Replace this call with the editor's existing custom-art import function.
    importCustomArt(artwork);
  });
});
```

Use `card` in place of `original` if the editor needs the prepared crop. The popup bridge requires a browser policy that preserves its opener. If the hosted editor uses a policy that severs the opener, users can open the local studio directly and import the downloaded PNG through the existing upload control. The editor itself can stay deployed wherever it is hosted. Each user starts the local companion separately.

For a Python desktop editor, create one `CardArtRenderer` and consume `generate(prompt, layout)` on a worker thread. It yields a seed, original PNG bytes, and crop PNG bytes for each candidate. Exhaust or close the generator to release the renderer for the next request.
