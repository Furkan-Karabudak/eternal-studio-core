import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORE_DIR = path.resolve(__dirname, '..');
const WHEELS_DIR = path.join(CORE_DIR, 'target', 'wheels');

function resolvePython() {
  const argIdx = process.argv.indexOf('--python');
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return process.argv[argIdx + 1];
  }
  return process.env.COMFY_PYTHON || process.env.PYTHON || 'python';
}

function run(cmd, args, cwd = CORE_DIR) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

function main() {
  const python = resolvePython();
  console.log(`\n[eternal-studio-core] Running Rust tests...`);
  run('cargo', ['test']);

  const hasEnv = Boolean(
    process.env.VIRTUAL_ENV ||
      process.env.CONDA_PREFIX ||
      fs.existsSync(path.join(CORE_DIR, '.venv'))
  );

  if (hasEnv && !process.env.COMFY_PYTHON && !process.argv.includes('--python')) {
    console.log(`\n[eternal-studio-core] Virtualenv detected, running maturin develop...`);
    run(python, ['-m', 'maturin', 'develop', '--release']);
  } else {
    console.log(`\n[eternal-studio-core] Building abi3 wheel for ${python}...`);
    fs.mkdirSync(WHEELS_DIR, { recursive: true });
    for (const entry of fs.readdirSync(WHEELS_DIR)) {
      if (entry.endsWith('.whl')) {
        fs.unlinkSync(path.join(WHEELS_DIR, entry));
      }
    }
    run(python, [
      '-m',
      'maturin',
      'build',
      '--release',
      '--interpreter',
      python,
      '--out',
      WHEELS_DIR,
    ]);
    const wheels = fs
      .readdirSync(WHEELS_DIR)
      .filter((f) => f.endsWith('.whl'))
      .map((f) => ({
        name: f,
        full: path.join(WHEELS_DIR, f),
        mtime: fs.statSync(path.join(WHEELS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (wheels.length === 0) {
      throw new Error(`No .whl produced in ${WHEELS_DIR}`);
    }
    console.log(`\n[eternal-studio-core] Installing ${wheels[0].name} into ${python}...`);
    run(python, ['-m', 'pip', 'install', '--force-reinstall', '--no-deps', wheels[0].full]);
  }

  console.log(`\n[eternal-studio-core] Running Python smoke tests...`);
  run(python, ['-m', 'unittest', 'discover', '-s', 'tests', '-v']);
  console.log(`\n[eternal-studio-core] Local native build & install complete.\n`);
}

main();
