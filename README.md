# eternal-studio-core

High-performance Rust native core engine for **Eternal Studio** (`Eternal-Studio_Comfy`), compiled via PyO3 + Maturin (`abi3-py311`) into cross-platform Python wheels.

## Architecture Boundary

`eternal-studio-core` contains **zero ComfyUI host dependencies** (`PromptServer`, `folder_paths`, `comfy_api`, `torch`). It owns compiled, CPU/I/O-intensive engine primitives (directory scanning/indexing, thumbnail generation, waveform analysis, metadata parsing, etc.) exposed to Python through a thin typed interface.

## Local Development

```powershell
# Run Rust tests, build the abi3 wheel, install into Python, and run smoke tests
node scripts/build-local.mjs

# Or target a specific ComfyUI Python interpreter (e.g. ComfyUI embedded Python)
node scripts/build-local.mjs --python C:\Path\To\ComfyUI\python_embeded\python.exe
```
