# Actual device model reference execution

PASS: downloaded and SHA256-verified all three pinned DreamShaper8 LCM model graphs from revision a310400909a293a7a937a54854910ed06469192b. Python ONNX Runtime CPU executed the actual tokenizer output through text encoder, three independent four-step UNet runs, and all three VAE decodes. Outputs were finite float32[1,3,512,512] and visually inspected fantasy artwork. Weight files were removed after execution and are not bundled.

Commands: `python /tmp/proxy-ai-reference/run.py text`, `python /tmp/proxy-ai-reference/run.py unet`, `python /tmp/proxy-ai-reference/run.py vae`. Native runtime regression command: `npm run test:device-ai-runtime`. Logs and three decoded PNG examples are in the accompanying verification artifacts.

This proves actual graph contracts and CPU reference inference. It does not prove full ONNX/WebGPU execution, performance, GPU memory fit, background-tab behavior or iPhone compatibility. Browser-native runtime initialization is separately tested using an actual software WebGPU adapter and a small ONNX graph. Real supported GPU/device acceptance is still required. There is no paid API call or server inference fallback in this reference test.
