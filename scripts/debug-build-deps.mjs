import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const logPath = path.join(root, 'debug-db6fdd.log');

function log(hypothesisId, location, message, data) {
  // #region agent log
  const payload = {
    sessionId: 'db6fdd',
    runId: process.env.DEBUG_RUN_ID || 'pre-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(logPath, JSON.stringify(payload) + '\n');
  fetch('http://127.0.0.1:7919/ingest/ce9dbe7c-1721-4bc6-90e5-ffa67b055c53', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'db6fdd' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
log('B', 'scripts/debug-build-deps.mjs:lockfiles', 'lockfile presence', {
  packageLock: existsSync(path.join(root, 'package-lock.json')),
  bunLock: existsSync(path.join(root, 'bun.lock')),
  yarnLock: existsSync(path.join(root, 'yarn.lock')),
  pnpmLock: existsSync(path.join(root, 'pnpm-lock.yaml')),
  declaredPluginReact: pkg.devDependencies?.['@vitejs/plugin-react'],
  declaredVite: pkg.devDependencies?.vite,
  declaredReactIs: pkg.dependencies?.['react-is'] ?? null,
});

function tryResolve(id) {
  try {
    const resolved = require.resolve(id);
    let version = null;
    try {
      version = require(`${id}/package.json`).version;
    } catch {
      version = null;
    }
    return { ok: true, resolved, version };
  } catch (err) {
    return { ok: false, error: err?.code || String(err) };
  }
}

const reactIs = tryResolve('react-is');
log('A', 'scripts/debug-build-deps.mjs:react-is', 'react-is resolve', reactIs);

const pluginReact = tryResolve('@vitejs/plugin-react');
log('D', 'scripts/debug-build-deps.mjs:plugin-react', 'plugin-react resolve', pluginReact);

const recharts = tryResolve('recharts/package.json');
let rechartsPeers = null;
if (recharts.ok) {
  rechartsPeers = require('recharts/package.json').peerDependencies;
}
log('A', 'scripts/debug-build-deps.mjs:recharts', 'recharts peers', { recharts, rechartsPeers });

console.log(JSON.stringify({ reactIs, pluginReact, rechartsPeers, bunLock: existsSync(path.join(root, 'bun.lock')) }, null, 2));
