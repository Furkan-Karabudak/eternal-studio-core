import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PYPROJECT_PATH = path.join(ROOT_DIR, 'pyproject.toml');
const CARGO_TOML_PATH = path.join(ROOT_DIR, 'Cargo.toml');
const ROOT_PKG_PATH = path.join(ROOT_DIR, 'package.json');

function readPyprojectVersion() {
  if (!fs.existsSync(PYPROJECT_PATH)) {
    throw new Error(`pyproject.toml not found at ${PYPROJECT_PATH}`);
  }
  const content = fs.readFileSync(PYPROJECT_PATH, 'utf-8');
  const match = content.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error('Could not find version = "..." in pyproject.toml');
  }
  return match[1];
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    suffix: match[4] || '',
  };
}

function bumpVersion(current, type) {
  const parsed = parseSemver(current);
  if (!parsed) {
    throw new Error(`Current version "${current}" is not valid semver (X.Y.Z).`);
  }
  if (type === 'patch') return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  if (type === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`;
  if (type === 'major') return `${parsed.major + 1}.0.0`;
  return current;
}

function updateTomlVersion(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const updated = content.replace(
    /^(version\s*=\s*)"([^"]+)"/m,
    `$1"${newVersion}"`
  );
  if (content !== updated) {
    fs.writeFileSync(filePath, updated, 'utf-8');
    return true;
  }
  return false;
}

function updatePackageJson(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const updated = content.replace(
    /("version"\s*:\s*)"([^"]+)"/,
    `$1"${newVersion}"`
  );
  if (content !== updated) {
    fs.writeFileSync(filePath, updated, 'utf-8');
    return true;
  }
  return false;
}

function selectMenu(currentVersion) {
  const parsed = parseSemver(currentVersion);
  const options = [
    {
      key: 'patch',
      label: `patch   (${parsed ? bumpVersion(currentVersion, 'patch') : 'N/A'})`,
    },
    {
      key: 'minor',
      label: `minor   (${parsed ? bumpVersion(currentVersion, 'minor') : 'N/A'})`,
    },
    {
      key: 'major',
      label: `major   (${parsed ? bumpVersion(currentVersion, 'major') : 'N/A'})`,
    },
    {
      key: 'asis',
      label: `as is   (${currentVersion} — sync all files to pyproject.toml)`,
    },
    {
      key: 'custom',
      label: 'custom  (enter version manually)',
    },
  ];

  let selected = 0;

  return new Promise((resolve, reject) => {
    const render = (initial = false) => {
      if (!initial) {
        process.stdout.write(`\x1b[${options.length + 2}A`);
      }
      process.stdout.write(
        `\x1b[36mCurrent version (pyproject.toml):\x1b[0m \x1b[1m${currentVersion}\x1b[0m\n`
      );
      process.stdout.write('\x1b[2mUse ↑/↓ arrows and Enter to select (ESC / q / Ctrl+C to cancel):\x1b[0m\n');
      for (let i = 0; i < options.length; i++) {
        const prefix = i === selected ? '\x1b[32m❯ ' : '  ';
        const suffix = i === selected ? '\x1b[0m' : '';
        process.stdout.write(`\x1b[2K${prefix}${options[i].label}${suffix}\n`);
      }
    };

    if (!process.stdin.isTTY) {
      reject(new Error('Interactive terminal (TTY) is required.'));
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    render(true);

    const onKeypress = (_str, key) => {
      if (!key) return;
      if ((key.ctrl && key.name === 'c') || key.name === 'q' || key.name === 'escape') {
        cleanup();
        process.stdout.write('\nCancelled.\n');
        process.exit(0);
      } else if (key.name === 'up' || key.name === 'k') {
        selected = (selected - 1 + options.length) % options.length;
        render(false);
      } else if (key.name === 'down' || key.name === 'j') {
        selected = (selected + 1) % options.length;
        render(false);
      } else if (key.name === 'return') {
        cleanup();
        resolve(options[selected].key);
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('keypress', onKeypress);
  });
}

function promptCustomVersion(currentVersion) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = () => {
      rl.question(`\nEnter custom version (current: ${currentVersion}): `, (answer) => {
        const trimmed = answer.trim().replace(/^v/, '');
        if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(trimmed)) {
          console.log('\x1b[31m✖ Invalid semver format. Expected X.Y.Z (e.g. 0.2.0 or 1.0.0-alpha.1).\x1b[0m');
          ask();
          return;
        }
        rl.close();
        resolve(trimmed);
      });
    };
    ask();
  });
}

async function main() {
  try {
    const currentVersion = readPyprojectVersion();
    const choice = await selectMenu(currentVersion);

    let targetVersion = currentVersion;
    if (choice === 'patch' || choice === 'minor' || choice === 'major') {
      targetVersion = bumpVersion(currentVersion, choice);
    } else if (choice === 'custom') {
      targetVersion = await promptCustomVersion(currentVersion);
    }

    console.log(`\n\x1b[36mSyncing core version to:\x1b[0m \x1b[1m${targetVersion}\x1b[0m\n`);

    const results = [
      { name: 'pyproject.toml', changed: updateTomlVersion(PYPROJECT_PATH, targetVersion) },
      { name: 'Cargo.toml', changed: updateTomlVersion(CARGO_TOML_PATH, targetVersion) },
      { name: 'package.json', changed: updatePackageJson(ROOT_PKG_PATH, targetVersion) },
    ];

    for (const r of results) {
      if (r.changed === null) continue;
      if (r.changed) {
        console.log(`  \x1b[32m✔ Updated\x1b[0m  ${r.name}`);
      } else {
        console.log(`  \x1b[2m• In sync\x1b[0m  ${r.name}`);
      }
    }
    console.log('');
  } catch (err) {
    console.error(`\n\x1b[31m✖ Error:\x1b[0m ${err.message}\n`);
    process.exit(1);
  }
}

main();
