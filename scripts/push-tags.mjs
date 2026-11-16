import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PYPROJECT_PATH = path.join(ROOT_DIR, 'pyproject.toml');

if (process.env.ETERNAL_PUSHING_TAGS === '1') {
  process.exit(0);
}

try {
  if (!fs.existsSync(PYPROJECT_PATH)) {
    process.exit(0);
  }

  const pyproject = fs.readFileSync(PYPROJECT_PATH, 'utf-8');
  const match = pyproject.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    process.exit(0);
  }

  const tagName = `v${match[1]}`;
  const remote = process.argv[2] || 'origin';

  // Ensure the tag exists locally
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`], {
      cwd: ROOT_DIR,
      stdio: 'ignore',
    });
  } catch {
    process.exit(0);
  }

  // Skip if user is already explicitly pushing only tags
  let stdinData = '';
  try {
    if (!process.stdin.isTTY) {
      stdinData = fs.readFileSync(0, 'utf-8');
    }
  } catch {
    stdinData = '';
  }
  const pushedRefs = stdinData
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
  if (pushedRefs.includes(`refs/tags/${tagName}`)) {
    process.exit(0);
  }

  // Check if remote already has this exact tag pointing to the same commit
  const localTarget = execFileSync('git', ['rev-list', '-n', '1', tagName], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  }).trim();

  const remoteTagsOutput = execFileSync(
    'git',
    ['ls-remote', '--tags', remote, `refs/tags/${tagName}`, `refs/tags/${tagName}^{}`],
    { cwd: ROOT_DIR, encoding: 'utf-8' }
  ).trim();

  if (remoteTagsOutput) {
    const remoteLines = remoteTagsOutput.split('\n');
    const peeledLine = remoteLines.find((l) => l.includes('^{}')) || remoteLines[0];
    const remoteTarget = peeledLine.split(/\s+/)[0];
    if (remoteTarget === localTarget) {
      process.exit(0);
    }
  }

  console.log(`\n\x1b[36mℹ Pushing release tag ${tagName} to ${remote}...\x1b[0m`);
  execFileSync('git', ['push', '--no-verify', remote, `refs/tags/${tagName}`], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, ETERNAL_PUSHING_TAGS: '1' },
  });
  console.log(`\x1b[32m✔ Tag ${tagName} pushed to ${remote}.\x1b[0m\n`);
} catch (err) {
  console.error('\n\x1b[31m✖ Failed to push release tag:\x1b[0m', err.message);
  process.exit(1);
}
