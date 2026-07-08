/**
 * jspod — programmatic API.
 *
 * `start(options)` is the embeddable counterpart to the `jspod` CLI.
 * Same pod-startup logic minus the argv parsing, banner printing, and
 * signal handling, all of which are CLI concerns and stay in
 * ../index.js. Library callers own their own logging and lifecycle.
 *
 * Errors in this path *throw* (or reject) rather than `process.exit` —
 * a hosting process should not be terminated by its library.
 */

import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, delimiter } from 'path';
import chalk from 'chalk';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
  chmodSync, statSync, copyFileSync, cpSync, constants as fsConstants
} from 'fs';
import { randomBytes } from 'crypto';
import { createServer } from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const CLI_SCRIPT = join(PACKAGE_ROOT, 'index.js');
const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));

// Build a browser-friendly URL from a host/port pair. Normalizes wildcard
// addresses (0.0.0.0, ::) to localhost and brackets IPv6 literals so the
// result is always a valid URL the user (and the browser) can open.
export function formatUrl(host, port) {
  if (host === '0.0.0.0' || host === '::' || host === '*') {
    return `http://localhost:${port}`;
  }
  if (host.includes(':')) {
    return `http://[${host}]:${port}`;
  }
  return `http://${host}:${port}`;
}

// Find a free port starting at the requested one. Mirrors Vite's
// behaviour: shift up by one and try again, up to 10 attempts.
async function findFreePort(startPort, host, maxTries = 10) {
  for (let p = startPort; p < startPort + maxTries; p++) {
    const free = await new Promise((resolve) => {
      const srv = createServer();
      srv.once('error', () => resolve(false));
      srv.once('listening', () => srv.close(() => resolve(true)));
      srv.listen(p, host);
    });
    if (free) return p;
  }
  return null;
}

// Resolve the JWT signing secret. Priority:
//   1. TOKEN_SECRET env var (operator-controlled)
//   2. Persisted random secret at <root>/.token-secret (generated on
//      first run, mode 0600).
function resolveTokenSecret(rootDir) {
  if (process.env.TOKEN_SECRET) return process.env.TOKEN_SECRET;
  const secretFile = join(rootDir, '.token-secret');
  if (existsSync(secretFile)) {
    ensureMode0600(secretFile);
    const loaded = readFileSync(secretFile, 'utf8').trim();
    if (loaded.length >= 32) return loaded;
    console.warn(chalk.yellow(
      `⚠  ${secretFile} is empty or too short (${loaded.length} chars); regenerating.`
    ));
  }
  const secret = randomBytes(48).toString('base64');
  writeFileSync(secretFile, secret, { mode: 0o600 });
  ensureMode0600(secretFile);
  return secret;
}

function ensureMode0600(path) {
  try {
    const mode = statSync(path).mode & 0o777;
    if (mode !== 0o600) {
      console.warn(chalk.yellow(
        `⚠  Tightening permissions on ${path} (was ${mode.toString(8).padStart(3, '0')}, now 600)`
      ));
      chmodSync(path, 0o600);
    }
  } catch {
    // chmod is a no-op on Windows and may fail on exotic filesystems.
  }
}

async function waitForReady(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 1000);
      await fetch(url, { signal: ac.signal, redirect: 'manual' });
      clearTimeout(t);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}

function openInBrowser(url) {
  let cmd, args;
  if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '""', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}

function shouldAutoOpen() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  if (process.env.CI) return false;
  if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY) return false;
  if (process.env.TERM === 'dumb') return false;
  return true;
}

// Copy src → dst only if dst does not already exist. COPYFILE_EXCL makes
// the no-clobber guarantee atomic: a dst created between check and copy
// surfaces as EEXIST (ignored) instead of being overwritten.
function copyIfAbsent(src, dst) {
  try {
    copyFileSync(src, dst, fsConstants.COPYFILE_EXCL);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

// Seed jspod-owned pages into the running pod's root once JSS has
// finished its init. All seeding is skip-if-exists, matching JSS's own
// root-landing-page seeding: a pod owner who edits index.html (or any
// other seeded page) must not have it clobbered on the next start.
function seedPodFiles(root) {
  try {
    const seed = [
      'welcome.html',         // becomes pod-data/index.html
      'signin.html', 'signin.html.acl',
      'account.html', 'account.html.acl',
      'docs.html', 'docs.html.acl'
    ];
    for (const name of seed) {
      const src = join(PACKAGE_ROOT, name);
      // welcome.html maps onto index.html; everything else is a passthrough
      const destName = name === 'welcome.html' ? 'index.html' : name;
      const dst = join(root, destName);
      if (existsSync(src)) copyIfAbsent(src, dst);
    }

    const linksSrc = join(PACKAGE_ROOT, 'links.jsonld');
    const linksDst = join(root, 'public', 'links.jsonld');
    if (existsSync(linksSrc)) {
      copyIfAbsent(linksSrc, linksDst);
    }

    const appsSrc = join(PACKAGE_ROOT, 'apps');
    const appsDst = join(root, 'public', 'apps');
    const appsDirExisted = existsSync(appsDst);
    if (existsSync(appsSrc) && !appsDirExisted) {
      cpSync(appsSrc, appsDst, { recursive: true });
    }
    return { appsDirExisted };
  } catch {
    return { appsDirExisted: true }; // skip bootstrap on seeding failure
  }
}

const DEFAULTS = {
  port: 5444,
  host: 'localhost',
  root: './pod-data',
  multiuser: false,
  auth: true,
  open: false,            // library default: host owns the window. CLI flips this on.
  git: true,
  browser: 'folder',
  provisionKeys: false,
  mcp: false,
  bootstrap: true,
  nostr: false,
  nostrPath: '/relay'
};

/**
 * Start a jspod instance.
 *
 * @param {Partial<typeof DEFAULTS>} [userOptions]
 * @returns {Promise<{
 *   url: string,
 *   port: number,
 *   host: string,
 *   root: string,
 *   ready: Promise<boolean>,
 *   exit: Promise<{ code: number|null, signal: string|null }>,
 *   stop: () => Promise<{ code: number|null, signal: string|null }>
 * }>}
 */
export async function start(userOptions = {}) {
  const options = { ...DEFAULTS, ...userOptions };

  // Light validation — the CLI does richer argv-shape validation up
  // front; here we just guard against shapes that would break the
  // start path itself.
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  if (options.browser !== 'folder' && options.browser !== 'json' && options.browser !== 'panes') {
    throw new Error(`Invalid browser: ${options.browser} (must be 'folder', 'json', or 'panes')`);
  }

  if (!existsSync(options.root)) {
    mkdirSync(options.root, { recursive: true });
  }

  const requestedPort = options.port;
  const freePort = await findFreePort(requestedPort, options.host);
  if (freePort === null) {
    throw new Error(
      `No free port in range ${requestedPort}-${requestedPort + 9} on ${options.host}.`
    );
  }
  if (freePort !== requestedPort) {
    console.log(chalk.yellow(`Port ${requestedPort} is in use, using ${freePort} instead.`));
  }
  options.port = freePort;

  // No token secret in --no-auth mode: JSS runs --public there (auth is
  // bypassed, so no tokens are ever minted) and persisting the secret
  // would write <root>/.token-secret into a publicly served tree.
  const tokenSecret = options.auth ? resolveTokenSecret(options.root) : null;

  // The data browser URL is a version-pinned jsdelivr asset so the
  // running pod always loads the matching browser code for this jspod.
  const browserFile = options.browser === 'folder' ? 'data-browser-folder.js'
    : options.browser === 'panes' ? 'data-browser-panes.js'
    : 'data-browser.js';
  const dataBrowserUrl = `https://cdn.jsdelivr.net/npm/jspod@${pkg.version}/${browserFile}`;

  const RUNG_1_PASSWORD = process.env.JSS_SINGLE_USER_PASSWORD || 'me';
  const RUNG_1_PASSWORD_FROM_ENV = !!process.env.JSS_SINGLE_USER_PASSWORD;

  const jssArgs = [
    'start',
    '--port', String(options.port),
    '--host', options.host,
    '--root', options.root,
    '--notifications',
    '--conneg',
    '--mashlib-module', dataBrowserUrl,
    // Raise the request body limit above JSS's 20MB default so app
    // installs with a large git history fit — e.g. solid-chat/app's
    // ~30MB pack (`jss install` does a full clone; JSS git-receive
    // rejects shallow pushes). 40MB clears that with headroom without
    // an over-permissive memory-DoS surface. Needs jss >=0.0.208,
    // where --body-limit actually reaches Fastify from the CLI (#562) —
    // enforced by this package's dependency range.
    '--body-limit', options.bodyLimit || '40MB'
  ];

  if (options.multiuser) {
    if (options.auth) jssArgs.push('--idp');
  } else {
    jssArgs.push('--no-multi-user', '--single-user');
    if (options.auth) {
      jssArgs.push('--idp');
      if (!RUNG_1_PASSWORD_FROM_ENV) {
        jssArgs.push('--single-user-password', RUNG_1_PASSWORD);
      }
    }
  }
  if (!options.auth) jssArgs.push('--public');
  jssArgs.push(options.git ? '--git' : '--no-git');
  if (options.provisionKeys) jssArgs.push('--provision-keys');
  if (options.mcp) jssArgs.push('--mcp');
  if (options.nostr) {
    jssArgs.push('--nostr');
    if (options.nostrPath) jssArgs.push('--nostr-path', options.nostrPath);
    if (options.nostrMaxEvents) jssArgs.push('--nostr-max-events', String(options.nostrMaxEvents));
  }

  const jss = spawn('jss', jssArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${join(PACKAGE_ROOT, 'node_modules', '.bin')}${delimiter}${process.env.PATH}`,
      ...(tokenSecret ? { TOKEN_SECRET: tokenSecret } : {}),
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });

  // Wire up exit promise immediately so the handle can be awaited
  // even if the caller never invokes stop() (e.g., the JSS child
  // crashes on its own).
  const exit = new Promise((resolve) => {
    jss.once('exit', (code, signal) => resolve({ code, signal }));
  });
  // Spawn-time errors (jss binary missing, etc.) become a rejected
  // ready promise via the wrapper below.
  let spawnError = null;
  jss.once('error', (e) => { spawnError = e; });

  const url = formatUrl(options.host, options.port);

  const ready = (async () => {
    if (spawnError) throw spawnError;
    const ok = await waitForReady(url);
    if (spawnError) throw spawnError;
    if (!ok) throw new Error(`jspod did not become ready at ${url} within 30s`);
    // Post-readiness: seed pod files and (optionally) bootstrap the
    // default app bundle on first run. Failures here are best-effort
    // — the pod is already running.
    // No seeding in --no-auth mode: jspod runs JSS with --public there,
    // where WAC is bypassed (the seeded .acl files would never be
    // consulted) and a publicly served tree must not be written into —
    // the same rationale as JSS's own public-mode seeding skip (JSS#578).
    if (options.auth) {
      const { appsDirExisted } = seedPodFiles(options.root);
      if (!appsDirExisted && options.bootstrap) {
        console.log(chalk.bold.white(`\n📦 First run — installing the `) +
                    chalk.yellow('default') +
                    chalk.bold.white(` bundle...\n`));
        const podUrl = url.replace(/\/$/, '');
        const installChild = spawn(
          process.execPath,
          [CLI_SCRIPT, 'install', '--pod', podUrl, '--bundle', 'default'],
          { stdio: 'inherit' }
        );
        installChild.on('exit', (code) => {
          if (code !== 0) {
            console.error(chalk.red(`\n✗ Bootstrap exited with code ${code}.`));
            console.error(chalk.dim('  Install apps manually with `jspod install`.'));
          }
        });
        installChild.on('error', (e) => {
          console.error(chalk.red(`\n✗ Bootstrap failed to start: ${e.message}`));
        });
      }
    }
    if (options.open && shouldAutoOpen()) {
      console.log(chalk.green(`\n🌐 Opening ${url} in your browser...`));
      openInBrowser(url);
    }
    return true;
  })();

  // Don't let an unconsumed `ready` rejection crash the process.
  // Callers that care attach their own .catch — those who only call
  // .stop() shouldn't be punished.
  ready.catch(() => {});

  async function stop() {
    if (jss.exitCode !== null || jss.signalCode !== null) {
      return exit;
    }
    return new Promise((resolve) => {
      const kill = setTimeout(() => {
        try { jss.kill('SIGKILL'); } catch {}
      }, 5000);
      jss.once('exit', (code, signal) => {
        clearTimeout(kill);
        resolve({ code, signal });
      });
      try { jss.kill('SIGTERM'); } catch {}
    });
  }

  return {
    url,
    port: options.port,
    host: options.host,
    root: options.root,
    ready,
    exit,
    stop
  };
}
