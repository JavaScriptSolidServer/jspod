#!/usr/bin/env node

/**
 * jspod - JavaScript Solid Pod
 * Just works, batteries included
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, delimiter } from 'path';
import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

// Build a browser-friendly URL from a host/port pair. Normalizes wildcard
// addresses (0.0.0.0, ::) to localhost and brackets IPv6 literals so the
// result is always a valid URL the user (and the browser) can open.
// IPv6 zone identifiers (e.g. `fe80::1%lo0`) are rejected at CLI parse
// time — the WHATWG URL spec doesn't support them, so any URL we built
// with one would be unparseable by Node and by the browser regardless
// of `%` encoding.
function formatUrl(host, port) {
  if (host === '0.0.0.0' || host === '::' || host === '*') {
    return `http://localhost:${port}`;
  }
  if (host.includes(':')) {
    return `http://[${host}]:${port}`;
  }
  return `http://${host}:${port}`;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  port: 5444,
  host: '127.0.0.1',
  root: './pod-data',
  multiuser: false,
  auth: true,
  open: true
};

// Auth-ladder rung-1 credentials. See issue #6: jspod ships a deliberately
// weak default sign-in so the new user is on a working pod within seconds,
// with a clearly-marked path to climb (change password / add a passkey).
// Safe because the default host is localhost-only (127.0.0.1).
// Username is fixed by JSS for root pods (server.js:970). Password defaults
// to 'me' but can be overridden via JSS_SINGLE_USER_PASSWORD so the env
// override documented in the README actually takes effect (and the banner
// shows the effective password, not a stale default).
const RUNG_1_USERNAME = 'me';
const RUNG_1_PASSWORD = process.env.JSS_SINGLE_USER_PASSWORD || 'me';
const RUNG_1_PASSWORD_FROM_ENV = !!process.env.JSS_SINGLE_USER_PASSWORD;

// Require a value after a value-taking flag. Without this guard, a stray
// `jspod --host` (no value) reads `undefined` from args[++i] and the next
// .replace() call throws a cryptic TypeError. Friendlier to error early
// and tell the user what's missing.
function requireValue(flag, value) {
  if (value === undefined) {
    console.error(chalk.red(`✗ Missing value for ${flag}`));
    console.error(chalk.dim('Use --help for usage information'));
    process.exit(1);
  }
  return value;
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--port' || arg === '-p') {
    options.port = parseInt(requireValue(arg, args[++i]), 10);
  } else if (arg === '--host' || arg === '-h') {
    // Strip optional brackets from IPv6 literals so a user-friendly
    // `--host [::1]` paste-in stays canonical. formatUrl re-adds the
    // brackets where they belong in URLs; the raw host going to JSS
    // and to comparisons remains the unbracketed literal.
    const rawHost = requireValue(arg, args[++i]).replace(/^\[|\]$/g, '');
    // Reject IPv6 zone identifiers — WHATWG URL spec doesn't support
    // them, so any URL we built (banner, browser auto-open, readiness
    // probe) would be unparseable. Better to fail fast with a clear
    // message than to ship a broken auto-open silently.
    if (rawHost.includes('%')) {
      console.error(chalk.red(`✗ IPv6 zone identifiers are not supported: ${rawHost}`));
      console.error(chalk.dim('Bind to a non-zoned address (e.g. ::1, 127.0.0.1, or your LAN IP) instead.'));
      process.exit(1);
    }
    options.host = rawHost;
  } else if (arg === '--root' || arg === '-r') {
    options.root = requireValue(arg, args[++i]);
  } else if (arg === '--multiuser') {
    options.multiuser = true;
  } else if (arg === '--no-auth') {
    options.auth = false;
  } else if (arg === '--no-open') {
    options.open = false;
  } else if (arg === '--version' || arg === '-v') {
    console.log(`jspod v${pkg.version}`);
    process.exit(0);
  } else if (arg === '--help') {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                         jspod - Help                               ║
╚═══════════════════════════════════════════════════════════════════╝
`));
    console.log(chalk.white('Usage:'));
    console.log(chalk.yellow('  jspod') + chalk.dim(' [options]\n'));
    console.log(chalk.white('Options:'));
    console.log(chalk.green('  -p, --port ') + chalk.yellow('<number>') + chalk.dim('     Port to listen on (default: 5444)'));
    console.log(chalk.green('  -h, --host ') + chalk.yellow('<address>') + chalk.dim('    Host to bind to (default: 127.0.0.1)'));
    console.log(chalk.green('  -r, --root ') + chalk.yellow('<path>') + chalk.dim('       Data directory (default: ./pod-data)'));
    console.log(chalk.green('  --multiuser') + chalk.dim('            Enable multi-user mode'));
    console.log(chalk.green('  --no-auth') + chalk.dim('              Disable authentication'));
    console.log(chalk.green('  --no-open') + chalk.dim('              Do not open the browser automatically'));
    console.log(chalk.green('  -v, --version') + chalk.dim('           Show jspod version'));
    console.log(chalk.green('  --help') + chalk.dim('                  Show this help message\n'));
    console.log(chalk.white('Examples:'));
    console.log(chalk.dim('  jspod'));
    console.log(chalk.dim('  jspod --port 8080 --root /var/pods'));
    console.log(chalk.dim('  jspod --multiuser\n'));
    console.log(chalk.white('Features:'));
    console.log(chalk.dim('  • Solid Protocol compliant'));
    console.log(chalk.dim('  • WebID authentication'));
    console.log(chalk.dim('  • Passkey support'));
    console.log(chalk.dim('  • WebSocket notifications'));
    console.log(chalk.dim('  • JSON-LD native\n'));
    console.log(chalk.white('Resources:'));
    console.log(chalk.blue('  https://github.com/JavaScriptSolidServer/jspod'));
    console.log(chalk.blue('  https://solidproject.org\n'));
    process.exit(0);
  } else {
    console.error(chalk.red(`✗ Unknown option: ${arg}`));
    console.error(chalk.dim('Use --help for usage information'));
    process.exit(1);
  }
}

// Ensure data directory exists
if (!existsSync(options.root)) {
  mkdirSync(options.root, { recursive: true });
}

// Resolve the JWT signing secret. Priority:
//   1. TOKEN_SECRET env var (operator-controlled)
//   2. Persisted random secret at <root>/.token-secret (generated on
//      first run, mode 0600). Same data dir always produces the same
//      effective secret across restarts — sessions and refresh tokens
//      survive process bounces.
// Generating per-data-dir avoids the previous footgun of a hardcoded
// fallback string that anyone could use to forge JWTs against a
// non-loopback deployment.
function resolveTokenSecret(rootDir) {
  if (process.env.TOKEN_SECRET) return process.env.TOKEN_SECRET;
  const secretFile = join(rootDir, '.token-secret');
  if (existsSync(secretFile)) {
    return readFileSync(secretFile, 'utf8').trim();
  }
  const secret = randomBytes(48).toString('base64');
  writeFileSync(secretFile, secret, { mode: 0o600 });
  return secret;
}
const tokenSecret = resolveTokenSecret(options.root);

// Display startup banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                  ${chalk.bold.white('██╗███████╗██████╗  ██████╗ ██████╗ ')}             ║
║                  ${chalk.bold.white('██║██╔════╝██╔══██╗██╔═══██╗██╔══██╗')}             ║
║                  ${chalk.bold.white('██║███████╗██████╔╝██║   ██║██║  ██║')}             ║
║             ${chalk.bold.white('██   ██║╚════██║██╔═══╝ ██║   ██║██║  ██║')}             ║
║             ${chalk.bold.white('╚█████╔╝███████║██║     ╚██████╔╝██████╔╝')}             ║
║              ${chalk.bold.white('╚════╝ ╚══════╝╚═╝      ╚═════╝ ╚═════╝ ')}             ║
║                                                                   ║
║                       ${chalk.bold.yellow('JavaScript Solid Pod')}                        ║
║                  ${chalk.dim('Batteries included, just works')}                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`));

console.log(chalk.blue('🚀 Starting Solid server...\n'));

console.log(chalk.bold.white('📡 Server Configuration:\n'));
console.log(chalk.cyan('   ├─ ') + chalk.white('URL:       ') + chalk.bold.green(formatUrl(options.host, options.port)));
console.log(chalk.cyan('   ├─ ') + chalk.white('Port:      ') + chalk.yellow(options.port));
console.log(chalk.cyan('   ├─ ') + chalk.white('Host:      ') + chalk.yellow(options.host));
console.log(chalk.cyan('   ├─ ') + chalk.white('Pod Root:  ') + chalk.yellow(options.root));
console.log(chalk.cyan('   └─ ') + chalk.white('Mode:      ') + (options.multiuser ? chalk.yellow('Multi-user') : chalk.yellow('Single-user')));

if (options.auth && !options.multiuser) {
  const rungLabel = RUNG_1_PASSWORD_FROM_ENV
    ? 'Sign In (password from JSS_SINGLE_USER_PASSWORD):'
    : 'Sign In (rung 1 of the auth ladder):';
  console.log('\n' + chalk.bold.white(`🔑 ${rungLabel}\n`));
  console.log(chalk.cyan('   ├─ ') + chalk.white('Username:  ') + chalk.bold.green(RUNG_1_USERNAME));
  // Only print the literal password when it's the rung-1 default. If
  // the user set a real password via env, echoing it to stdout would
  // leak into terminal scrollback, shell history capture, CI logs, and
  // shared sessions. They already know the value they set; the banner
  // just confirms it was picked up.
  if (RUNG_1_PASSWORD_FROM_ENV) {
    console.log(chalk.cyan('   ├─ ') + chalk.white('Password:  ') + chalk.dim('(hidden — set via JSS_SINGLE_USER_PASSWORD)'));
  } else {
    console.log(chalk.cyan('   ├─ ') + chalk.white('Password:  ') + chalk.bold.green(RUNG_1_PASSWORD));
  }
  console.log(chalk.cyan('   └─ ') + chalk.dim('Climb: change the password or add a passkey from account settings'));

  // Loud warning if the rung-1 known credentials are reachable beyond
  // the local machine. See issue #6 ("auth ladder"): rung 1 is only
  // safe when the host is loopback-only. Any other bind exposes the
  // well-known me/me credentials to the LAN (or worse).
  // Loopback covers the full 127.0.0.0/8 IPv4 range plus IPv6 ::1.
  // (Bracketed `[::1]` input is stripped to `::1` at CLI parse time
  // — see options.host parsing — so it matches here without a
  // bracketed branch.)
  const isLoopback =
    options.host === 'localhost' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(options.host) ||
    options.host === '::1';
  if (!isLoopback) {
    console.log('\n' + chalk.bold.red('⚠  Warning: ') + chalk.yellow(
      `--host ${options.host} exposes the well-known me/me credentials beyond localhost.`
    ));
    console.log(chalk.dim('   Set JSS_SINGLE_USER_PASSWORD=... before running, or bind to 127.0.0.1.'));
  }
}

console.log('\n' + chalk.bold.white('✨ Features:\n'));
console.log(chalk.cyan('   ├─ ') + chalk.green('Solid Protocol     ') + chalk.bold.green('✓'));
console.log(chalk.cyan('   ├─ ') + chalk.green('WebID Auth         ') + (options.auth ? chalk.bold.green('✓') : chalk.dim('✗')));
console.log(chalk.cyan('   ├─ ') + chalk.green('Passkeys           ') + (options.auth ? chalk.bold.green('✓') : chalk.dim('✗')));
console.log(chalk.cyan('   ├─ ') + chalk.green('Notifications      ') + chalk.bold.green('✓'));
console.log(chalk.cyan('   └─ ') + chalk.green('JSON-LD Native     ') + chalk.bold.green('✓'));

console.log('\n' + chalk.bold.white('📚 Resources:\n'));
console.log(chalk.cyan('   ├─ ') + chalk.white('Server:     ') + chalk.blue.underline('https://github.com/JavaScriptSolidServer/jspod'));
console.log(chalk.cyan('   ├─ ') + chalk.white('Solid:      ') + chalk.blue.underline('https://solidproject.org'));
console.log(chalk.cyan('   └─ ') + chalk.white('WebID:      ') + chalk.blue.underline('https://www.w3.org/2005/Incubator/webid/spec'));

console.log('\n' + chalk.dim('Press ') + chalk.bold.red('Ctrl+C') + chalk.dim(' to stop the server\n'));
console.log(chalk.yellow('⏳ Initializing server components...\n'));

// Build jss arguments
const jssArgs = [
  'start',
  '--port', options.port.toString(),
  '--host', options.host,
  '--root', options.root,
  '--notifications',
  '--conneg'
];

if (options.multiuser) {
  // Multi-user mode is an explicit opt-out from jspod's single-user
  // positioning (#3). The IDP stays available so users can register.
  if (options.auth) jssArgs.push('--idp');
} else {
  // Default: single-user personal pod with rung-1 credentials seeded.
  // The pod, IDP, and known credentials are created on first start;
  // every subsequent start is a no-op (JSS is idempotent on the seed).
  jssArgs.push('--no-multiuser', '--single-user');
  if (options.auth) {
    jssArgs.push('--idp', '--single-user-password', RUNG_1_PASSWORD);
  }
}

if (!options.auth) {
  // JSS's `--public` is the real no-auth switch: skip WAC, open
  // read/write. Without it, `--no-auth` would only mean "no IDP"
  // — the pod would still be ACL-gated and unreachable.
  jssArgs.push('--public');
}

// Start JSS with enhanced PATH to find the binary
const jss = spawn('jss', jssArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${join(__dirname, 'node_modules', '.bin')}${delimiter}${process.env.PATH}`,
    TOKEN_SECRET: tokenSecret,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

jss.on('error', (error) => {
  console.error(chalk.red('\n✗ Failed to start server'));
  console.error(chalk.dim(error.message));
  process.exit(1);
});

// Auto-open the browser once the server is responsive (single-user first-run delight).
// Opt out with --no-open, or by running in CI / SSH / non-TTY environments.
const browserUrl = formatUrl(options.host, options.port);

function shouldAutoOpen() {
  if (!options.open) return false;
  // Require both stdin and stdout to be TTYs so that piped invocations
  // (e.g. `echo | jspod`) are treated as non-interactive.
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  if (process.env.CI) return false;
  if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY) return false;
  if (process.env.TERM === 'dumb') return false;
  return true;
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
  child.on('error', () => {}); // best-effort; never block the server
  child.unref();
}

if (shouldAutoOpen()) {
  waitForReady(browserUrl).then((ready) => {
    if (ready) {
      console.log(chalk.green(`\n🌐 Opening ${browserUrl} in your browser...`));
      openInBrowser(browserUrl);
    }
  });
}

jss.on('exit', (code) => {
  if (code !== 0) {
    console.error(chalk.red(`\n✗ Server exited with code ${code}`));
    process.exit(code);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n' + chalk.yellow('⚠  Shutting down gracefully...'));
  jss.kill('SIGTERM');
  setTimeout(() => {
    console.log(chalk.green('✓  Server stopped'));
    console.log(chalk.dim('\nGoodbye! 👋\n'));
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  jss.kill('SIGTERM');
  process.exit(0);
});
