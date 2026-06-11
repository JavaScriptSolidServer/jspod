#!/usr/bin/env node

/**
 * jspod CLI — argv-parser + banner + signal-handling shell around the
 * programmatic `start()` API in ./lib/start.js. Pod-startup logic lives
 * there; this file owns presentation and the process-lifecycle bits a
 * library shouldn't touch.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, delimiter } from 'path';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { start, formatUrl } from './lib/start.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

// Parse CLI arguments
const args = process.argv.slice(2);

// Subcommand dispatch — must run before the flag-parsing loop below, which
// is shaped for the "start the server" command. New subcommands branch off
// here and exit; the start path is reached only when args[0] isn't one.
if (args[0] === 'install') {
  await runInstall(args.slice(1));
  process.exit(0);
}

// `jspod install` is a thin wrapper over upstream `jss install` — the
// plumbing (spec parsing, bundles, IdP auth, git dual-push) moved into
// JSS itself in 0.0.198 (JSS#464; see jspod#48). jspod keeps two policies:
//   1. --pod defaults to jspod's port (5444; jss alone defaults to 4443)
//   2. bare `jspod install` → the `default` bundle from solid-apps/bundles
// `jss install --help` is the source of truth for flags and spec forms.
async function runInstall(rest) {
  const jssArgs = ['install', ...rest];
  if (!rest.includes('--pod')) jssArgs.push('--pod', 'http://localhost:5444');

  // Detect a "bare" invocation (no app names, no --bundle) while stepping
  // over value-taking flags, so `jspod install --user bob` still gets the
  // default bundle but `jspod install chrome` does not.
  const valueFlags = new Set(['--pod', '--user', '--password', '--bundle', '--nostr-privkey']);
  let bare = true;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--bundle') { bare = false; i++; }
    else if (valueFlags.has(a)) i++;
    else if (!a.startsWith('-')) bare = false;
  }
  if (bare && !rest.includes('--help') && !rest.includes('-h')) {
    jssArgs.push('--bundle', 'default');
  }

  // Same PATH-prepend trick as lib/start.js so the locally-installed jss
  // binary wins regardless of how jspod itself was installed.
  const child = spawn('jss', jssArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: join(__dirname, 'node_modules', '.bin') + delimiter + process.env.PATH
    }
  });
  const code = await new Promise((resolve) => {
    child.once('error', (e) => {
      console.error(chalk.red(`✗ Could not run jss: ${e.message}`));
      resolve(1);
    });
    child.once('exit', (c) => resolve(c ?? 1));
  });
  process.exit(code);
}

const options = {
  port: 5444,
  host: 'localhost',
  root: './pod-data',
  multiuser: false,
  auth: true,
  open: true,
  git: true,
  browser: 'folder',
  provisionKeys: false,
  bootstrap: true,
  nostr: false,
  nostrPath: '/relay'
};

const RUNG_1_USERNAME = 'me';
const RUNG_1_PASSWORD = process.env.JSS_SINGLE_USER_PASSWORD || 'me';
const RUNG_1_PASSWORD_FROM_ENV = !!process.env.JSS_SINGLE_USER_PASSWORD;

function requireValue(flag, value) {
  if (value === undefined) {
    console.error(chalk.red(`✗ Missing value for ${flag}`));
    console.error(chalk.dim('Use --help for usage information'));
    process.exit(1);
  }
  if (value.startsWith('-')) {
    console.error(chalk.red(`✗ Missing value for ${flag}`));
    console.error(chalk.dim(`  Got: ${value} (looks like another option, not a value)`));
    console.error(chalk.dim('Use --help for usage information'));
    process.exit(1);
  }
  return value;
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--port' || arg === '-p') {
    const raw = requireValue(arg, args[++i]);
    const parsed = parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535 || String(parsed) !== raw.trim()) {
      console.error(chalk.red(`✗ Invalid port: ${raw}`));
      console.error(chalk.dim('Port must be an integer in the range 1-65535.'));
      process.exit(1);
    }
    options.port = parsed;
  } else if (arg === '--host' || arg === '-h') {
    const rawHost = requireValue(arg, args[++i]).replace(/^\[|\]$/g, '');
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
  } else if (arg === '--no-git') {
    options.git = false;
  } else if (arg === '--provision-keys') {
    options.provisionKeys = true;
  } else if (arg === '--no-provision-keys') {
    options.provisionKeys = false;
  } else if (arg === '--mcp') {
    options.mcp = true;
  } else if (arg === '--no-mcp') {
    options.mcp = false;
  } else if (arg === '--no-bootstrap') {
    options.bootstrap = false;
  } else if (arg === '--nostr') {
    options.nostr = true;
  } else if (arg === '--no-nostr') {
    options.nostr = false;
  } else if (arg === '--nostr-path') {
    options.nostrPath = requireValue(arg, args[++i]);
  } else if (arg === '--nostr-max-events') {
    const raw = requireValue(arg, args[++i]);
    const parsed = parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== raw.trim()) {
      console.error(chalk.red(`✗ Invalid --nostr-max-events: ${raw}`));
      console.error(chalk.dim('Must be a positive integer.'));
      process.exit(1);
    }
    options.nostrMaxEvents = parsed;
  } else if (arg === '--browser') {
    const raw = requireValue(arg, args[++i]);
    if (raw !== 'json' && raw !== 'folder' && raw !== 'panes') {
      console.error(chalk.red(`✗ Invalid --browser value: ${raw}`));
      console.error(chalk.dim('Must be one of: json, folder, panes'));
      process.exit(1);
    }
    options.browser = raw;
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
    console.log(chalk.yellow('  jspod') + chalk.dim(' [options]') + chalk.dim('              Start the pod (default)'));
    console.log(chalk.yellow('  jspod install') + chalk.dim(' [<app>...]') + chalk.dim('     Install Solid apps from solid-apps/<name>'));
    console.log(chalk.dim('                                 (see `jspod install --help`)\n'));
    console.log(chalk.white('Options:'));
    console.log(chalk.green('  -p, --port ') + chalk.yellow('<number>') + chalk.dim('     Port to listen on (default: 5444)'));
    console.log(chalk.green('  -h, --host ') + chalk.yellow('<address>') + chalk.dim('    Host to bind to (default: localhost)'));
    console.log(chalk.green('  -r, --root ') + chalk.yellow('<path>') + chalk.dim('       Data directory (default: ./pod-data)'));
    console.log(chalk.green('  --multiuser') + chalk.dim('            Enable multi-user mode'));
    console.log(chalk.green('  --no-auth') + chalk.dim('              Disable authentication'));
    console.log(chalk.green('  --no-open') + chalk.dim('              Do not open the browser automatically'));
    console.log(chalk.green('  --no-git') + chalk.dim('               Disable JSS\'s git HTTP backend (it is on by default)'));
    console.log(chalk.green('  --browser ') + chalk.yellow('<folder|json|panes>') + chalk.dim('  Data browser style (default: folder; panes = type-driven panes from /public/panes/)'));
    console.log(chalk.green('  --provision-keys') + chalk.dim('       Generate a Nostr-compatible owner keypair on first start'));
    console.log(chalk.green('  --mcp') + chalk.dim('                  Expose /mcp (Model Context Protocol) tool surface for agents'));
    console.log(chalk.green('  --nostr') + chalk.dim('                Run a Nostr relay (NIP-01) at <pod>/relay'));
    console.log(chalk.green('  --nostr-path ') + chalk.yellow('<path>') + chalk.dim('     Relay WebSocket path (default: /relay)'));
    console.log(chalk.green('  --nostr-max-events ') + chalk.yellow('<n>') + chalk.dim(' Max events kept in relay memory (default: 1000)'));
    console.log(chalk.green('  --no-bootstrap') + chalk.dim('         Skip auto-install of the `default` app bundle on first run'));
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
    console.log(chalk.dim('  • Nostr relay (NIP-01, opt-in via --nostr)'));
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
console.log(chalk.cyan(options.nostr ? '   ├─ ' : '   └─ ') + chalk.white('Mode:      ') + (options.multiuser ? chalk.yellow('Multi-user') : chalk.yellow('Single-user')));
if (options.nostr) {
  console.log(chalk.cyan('   └─ ') + chalk.white('Relay:     ') + chalk.bold.green(`enabled (${options.nostrPath})`));
}

if (options.auth && !options.multiuser) {
  const rungLabel = RUNG_1_PASSWORD_FROM_ENV
    ? 'Sign In (password from JSS_SINGLE_USER_PASSWORD):'
    : 'Sign In (rung 1 of the auth ladder):';
  console.log('\n' + chalk.bold.white(`🔑 ${rungLabel}\n`));
  console.log(chalk.cyan('   ├─ ') + chalk.white('Username:  ') + chalk.bold.green(RUNG_1_USERNAME));
  if (RUNG_1_PASSWORD_FROM_ENV) {
    console.log(chalk.cyan('   ├─ ') + chalk.white('Password:  ') + chalk.dim('(hidden — set via JSS_SINGLE_USER_PASSWORD)'));
  } else {
    console.log(chalk.cyan('   ├─ ') + chalk.white('Password:  ') + chalk.bold.green(RUNG_1_PASSWORD));
  }
  console.log(chalk.cyan('   └─ ') + chalk.dim('Climb: change the password or add a passkey from account settings'));

  const isLoopback =
    options.host === 'localhost' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(options.host) ||
    options.host === '::1';
  if (!isLoopback) {
    if (RUNG_1_PASSWORD_FROM_ENV) {
      console.log('\n' + chalk.bold.red('⚠  Warning: ') + chalk.yellow(
        `--host ${options.host} exposes single-user sign-in beyond localhost.`
      ));
      console.log(chalk.dim('   Make sure your JSS_SINGLE_USER_PASSWORD is strong, and use HTTPS in production.'));
    } else {
      console.log('\n' + chalk.bold.red('⚠  Warning: ') + chalk.yellow(
        `--host ${options.host} exposes the well-known me/me credentials beyond localhost.`
      ));
      console.log(chalk.dim('   Set JSS_SINGLE_USER_PASSWORD=... before running, or bind to localhost.'));
    }
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

// Hand off to the programmatic API. Any pre-flight failure (no free
// port, jss not found, etc.) surfaces as a thrown error here.
let handle;
try {
  handle = await start(options);
} catch (e) {
  console.error(chalk.red('\n✗ Failed to start server'));
  console.error(chalk.dim(e.message));
  process.exit(1);
}

handle.ready.catch((e) => {
  console.error(chalk.red('\n✗ Server failed to become ready'));
  console.error(chalk.dim(e.message));
  process.exit(1);
});

// JSS child exit: if it dies on its own with a non-zero status, the
// CLI should follow. Signal-initiated exits (SIGTERM via Ctrl+C) are
// handled by the SIGINT handler below.
handle.exit.then(({ code, signal }) => {
  if (signal) return; // shutdown handler will exit
  if (code !== 0 && code !== null) {
    console.error(chalk.red(`\n✗ Server exited with code ${code}`));
    process.exit(code);
  }
});

// Graceful shutdown. The JSS child shares our process group, so a terminal
// Ctrl+C delivers SIGINT to it too — it prints its own "Shutting down..."
// and exits. We don't duplicate that line; we just await its exit (which
// handle.stop() does) and then print the farewell, so the output stays
// ordered ahead of the returning shell prompt instead of racing it.
process.on('SIGINT', async () => {
  await handle.stop();
  console.log(chalk.green('\n✓  Server stopped'));
  console.log(chalk.dim('Goodbye! 👋\n'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await handle.stop();
  process.exit(0);
});
