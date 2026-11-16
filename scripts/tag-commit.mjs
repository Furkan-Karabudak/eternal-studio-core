import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PYPROJECT_PATH = path.join(ROOT_DIR, 'pyproject.toml');

try {
  if (!fs.existsSync(PYPROJECT_PATH)) {
    console.error(`\n\x1b[31m✖ pyproject.toml not found at ${PYPROJECT_PATH}\x1b[0m\n`);
    process.exit(1);
  }

  const pyproject = fs.readFileSync(PYPROJECT_PATH, 'utf-8');
  const match = pyproject.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    console.error('\n\x1b[31m✖ Could not find version = "..." in pyproject.toml\x1b[0m\n');
    process.exit(1);
  }

  const version = `v${match[1]}`;

  const existingTags = execFileSync('git', ['tag'], { cwd: ROOT_DIR, encoding: 'utf-8' })
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  if (existingTags.includes(version)) {
    console.log(`\n\x1b[33mℹ Local tag ${version} already exists, skipping.\x1b[0m\n`);
    process.exit(0);
  }

  execFileSync('git', ['tag', '-a', version, '-m', `release ${version}`], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  console.log(`\n\x1b[32m✔ Local tag ${version} attached to commit (will push on git push).\x1b[0m\n`);
} catch (err) {
  console.error('\n\x1b[31m✖ Failed to create local tag:\x1b[0m', err.message);
  process.exit(1);
}
