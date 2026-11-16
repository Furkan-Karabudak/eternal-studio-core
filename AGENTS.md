# AGENTS.md — Agent Guide (`eternal-studio-core`)

This document is the engineering constitution for AI coding agents working inside `eternal-studio-core`.

---

## 1. MANDATORY GLOBAL INVARIANTS

1. **STRICT ENGLISH-ONLY REPOSITORY POLICY**
   - Every line of Rust, Python, TypeScript, YAML, comments, docstrings, identifiers, error messages, and tests **MUST** be written in English.

2. **ZERO COMFYUI COUPLING**
   - `eternal-studio-core` is a pure, standalone Rust + PyO3 (`abi3-py311`) native engine.
   - It must **never** import or depend on ComfyUI (`server`, `folder_paths`, `comfy_api`, `torch`) or `Eternal-Studio_Comfy`.
   - Prefer **100% pure Rust crates** so cross-platform wheels build cleanly across Linux (`x86_64`, `aarch64`), Windows (`x64`, `aarch64`), and macOS (`arm64`, `x86_64`) without external C/system library dependencies.

3. **VERSION SYNCHRONIZATION**
   - `pyproject.toml` (`[project].version`), `Cargo.toml` (`[package].version`), and `package.json` (`"version"`) must match at all times.
   - Use `node scripts/bumpy.mjs` (`pnpm.cmd bumpy` or `npm run bumpy`) to update versions in lockstep.

4. **KEEP FFI BOUNDARIES THIN & TYPED**
   - Put pure Rust domain logic inside dedicated modules (e.g. `src/engine.rs`) with `#[cfg(test)]` unit tests so `cargo test` executes cleanly without Python linker dependencies.
   - Keep `src/lib.rs` strictly as a thin PyO3 binding layer, and keep `python/eternal_studio_core/__init__.pyi` in sync for strict Pyright type-checking in `Eternal-Studio_Comfy`.
   - Release the GIL (`py.detach(...)` in PyO3 0.24+) for any CPU-heavy or blocking I/O work.

5. **MANDATORY LOCAL REBUILD & INTEGRATION SYNC (NON-NEGOTIABLE)**
   - Whenever you modify any file under `src/`, `python/`, `Cargo.toml`, or `pyproject.toml`, you **MUST** rebuild and install the local extension into the active Python environment before finishing your turn:
     ```powershell
     node scripts/build-local.mjs
     ```
     *(This runs `cargo test`, builds and installs the `abi3` native wheel into the active Python or `COMFY_PYTHON` interpreter, and executes `python -m unittest discover -s tests -v`.)*
   - If the sibling plugin repository `../Eternal-Studio_Comfy` exists on disk, also run its sync/test suite:
     ```powershell
     python -m unittest discover -s ..\Eternal-Studio_Comfy\tests -v
     ```
   - Never finish a turn with stale `.pyd`/`.so` artifacts in the active Python environment.
