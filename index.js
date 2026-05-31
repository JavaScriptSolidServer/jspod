#!/usr/bin/env node

/**
 * jspod CLI — argv-parser + banner + signal-handling shell around the
 * programmatic `start()` API in ./lib/start.js. Pod-startup logic lives
 * there; this file owns presentation and the process-lifecycle bits a
 * library shouldn't touch.
 */

import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { existsSync, readFileSync, promises as fsPromises } from 'fs';
import { tmpdir } from 'os';
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

async function runInstall(rest) {
  const opts = {
    pod: 'http://localhost:5444',
    user: 'me',
    password: process.env.JSS_SINGLE_USER_PASSWORD || 'me',
    apps: [],
    bundles: []
  };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--pod') opts.pod = rest[++i];
    else if (a === '--user') opts.user = rest[++i];
    else if (a === '--password') opts.password = rest[++i];
    else if (a === '--bundle') opts.bundles.push(rest[++i]);
    else if (a === '--help' || a === '-h') { printInstallHelp(); process.exit(0); }
    else if (a.startsWith('--')) {
      console.error(chalk.red(`✗ Unknown flag: ${a}`));
      printInstallHelp();
      process.exit(1);
    }
    else opts.apps.push(a);
  }

  // Bare `jspod install` (no apps, no bundles) → install the `default`
  // bundle. The bundle definition lives at solid-apps/bundles, so updates
  // ship without a jspod release. Power users skip this by naming apps
  // or passing --bundle explicitly.
  if (opts.apps.length === 0 && opts.bundles.length === 0) {
    opts.bundles.push('default');
  }

  // Expand any --bundle sources into the apps[] list.
  for (const source of opts.bundles) {
    let bundleSpecs;
    try {
      bundleSpecs = await loadBundle(source);
    } catch (e) {
      console.error(chalk.red(`✗ Couldn't load bundle "${source}": ${e.message}`));
      process.exit(1);
    }
    console.log(chalk.dim(`bundle "${source}" → ${bundleSpecs.length} apps: ${bundleSpecs.join(', ')}`));
    opts.apps.push(...bundleSpecs);
  }
  opts.pod = opts.pod.replace(/\/$/, '');

  console.log(chalk.bold.white(`\nInstalling ${opts.apps.length} app${opts.apps.length === 1 ? '' : 's'} → `) +
              chalk.green(opts.pod));
  console.log('');

  // Authenticate against the local pod's IDP. Token is needed to push to
  // /public/apps/<name>/ on a default jspod (private-write inherits from
  // /public/.acl: public-read, owner-write).
  let token;
  try {
    const r = await fetch(`${opts.pod}/idp/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: opts.user, password: opts.password })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    token = j.access_token;
    if (!token) throw new Error('no access_token in response');
  } catch (e) {
    console.error(chalk.red(`✗ Could not authenticate against ${opts.pod}: ${e.message}`));
    console.error(chalk.dim('  Is jspod running?  → ') + chalk.bold('npx jspod'));
    process.exit(1);
  }

  let okCount = 0;
  for (const input of opts.apps) {
    const spec = parseAppSpec(input);
    if (spec.error) {
      console.error(chalk.red(`✗ ${input}: ${spec.error}`));
      continue;
    }
    const { source, name, ref } = spec;
    const dest = `${opts.pod}/public/apps/${name}`;
    // Respect the platform's tmp dir — `/tmp` is hardcoded out on
    // Termux (Android), where the writable tmp is at $PREFIX/tmp.
    const tmp = join(tmpdir(), `jspod-install-${name}-${process.pid}`);

    // Clean stale tmp from a previous failed run
    if (existsSync(tmp)) spawnSync('rm', ['-rf', tmp], { stdio: 'ignore' });

    // Full clone (no --depth: shallow pushes are rejected by JSS git-receive).
    // --branch picks a tag or branch when pinned (e.g. `foo/bar#v2`).
    const cloneArgs = ['clone', '--quiet'];
    if (ref) cloneArgs.push('--branch', ref);
    cloneArgs.push(source, tmp);
    const clone = spawnSync('git', cloneArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    if (clone.status !== 0) {
      console.error(chalk.red(`✗ ${input}: clone failed`));
      const err = clone.stderr?.toString?.().trim() || '';
      if (err) console.error(chalk.dim(`  ${err.slice(0, 300)}`));
      continue;
    }

    // Push to the pod. `updateInstead` (which extracts the working tree)
    // only fires when the push targets the branch HEAD points at on the
    // server. JSS 0.0.197+ auto-inits with HEAD=main; older versions
    // honor the operator's `init.defaultBranch` (often `main`, sometimes
    // `gh-pages` for GitHub-Pages-heavy users). Push to both — the one
    // matching server-side HEAD extracts; the other just creates a ref.
    // Idempotent on re-run.
    const pushArgs = (branch) => ['-C', tmp, '-c',
      `http.extraHeader=Authorization: Bearer ${token}`,
      'push', dest, `HEAD:${branch}`];

    const pushMain = spawnSync('git', pushArgs('main'),
      { stdio: ['ignore', 'pipe', 'pipe'] });
    const errMain = pushMain.stderr?.toString?.() || '';

    // If the first push failed for a "won't auto-init" reason (path
    // already has content, e.g. jspod's bundled pilot), don't keep going.
    if (pushMain.status !== 0 && (errMain.includes('not found') || errMain.includes('404'))) {
      console.log(chalk.yellow(`⊘ ${input}: skipped (path already in use — bundled or manually placed)`));
      spawnSync('rm', ['-rf', tmp], { stdio: 'ignore' });
      continue;
    }

    const pushPages = spawnSync('git', pushArgs('gh-pages'),
      { stdio: ['ignore', 'pipe', 'pipe'] });

    if (pushMain.status !== 0 && pushPages.status !== 0) {
      console.error(chalk.red(`✗ ${input}: push failed`));
      const err = (errMain + '\n' + (pushPages.stderr?.toString?.() || '')).trim();
      console.error(chalk.dim(`  ${err.slice(0, 400)}`));
      spawnSync('rm', ['-rf', tmp], { stdio: 'ignore' });
      continue;
    }

    console.log(chalk.green(`✓ ${input}`) + chalk.dim(` → ${dest}/`));
    okCount++;
    spawnSync('rm', ['-rf', tmp], { stdio: 'ignore' });
  }

  console.log('');
  console.log(chalk.bold(`${okCount}/${opts.apps.length} installed.`));
  if (okCount > 0) {
    console.log(chalk.dim('Open in browser: ') + chalk.cyan(`${opts.pod}/public/apps/`));
  }
}

// Resolve a --bundle <source> argument to a fetchable URL or local file path.
function resolveBundleSource(source) {
  if (!source) throw new Error('bundle source required');
  if (/^https?:\/\//.test(source)) return { kind: 'url', loc: source };
  if (source.startsWith('./') || source.startsWith('/') || source.endsWith('.jsonld')) {
    if (source.startsWith('./') || source.startsWith('/')) {
      return { kind: 'file', loc: source };
    }
  }
  if (source.includes('/')) {
    const cleaned = source.replace(/^\/+|\/+$/g, '');
    if (cleaned.split('/').length !== 2) {
      throw new Error('expected <name>, <org>/<repo>, URL, or filesystem path');
    }
    return { kind: 'url', loc: `https://raw.githubusercontent.com/${cleaned}/HEAD/bundle.jsonld` };
  }
  if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(source)) {
    throw new Error(`invalid bundle name "${source}"`);
  }
  return { kind: 'url', loc: `https://raw.githubusercontent.com/solid-apps/bundles/HEAD/${source}.jsonld` };
}

async function loadBundle(source) {
  const { kind, loc } = resolveBundleSource(source);
  let text;
  if (kind === 'file') {
    text = await fsPromises.readFile(loc, 'utf8');
  } else {
    const r = await fetch(loc);
    if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${loc}`);
    text = await r.text();
  }
  let doc;
  try { doc = JSON.parse(text); }
  catch (e) { throw new Error(`bundle is not valid JSON: ${e.message}`); }
  const items = doc['schema:itemListElement'] || doc.itemListElement || [];
  if (!Array.isArray(items)) throw new Error('bundle has no schema:itemListElement array');
  return items.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') return item['app:spec'] || item.spec || null;
    return null;
  }).filter(Boolean);
}

function parseAppSpec(input) {
  let base = input;
  let renameName = null;
  const eqIx = base.lastIndexOf('=');
  if (eqIx > 0) {
    renameName = base.slice(eqIx + 1);
    base = base.slice(0, eqIx);
  }
  let ref = null;
  const hashIx = base.lastIndexOf('#');
  if (hashIx > 0) {
    ref = base.slice(hashIx + 1) || null;
    base = base.slice(0, hashIx);
  }
  let source, name;
  if (/^https?:\/\//.test(base)) {
    source = base.replace(/\.git$/, '').replace(/\/$/, '');
    name = source.split('/').pop();
  } else if (base.includes('/')) {
    const cleaned = base.replace(/\.git$/, '').replace(/^\/+|\/+$/g, '');
    if (cleaned.split('/').length !== 2) {
      return { error: 'expected <org>/<repo> shorthand' };
    }
    source = `https://github.com/${cleaned}`;
    name = cleaned.split('/').pop();
  } else {
    source = `https://github.com/solid-apps/${base}`;
    name = base;
  }
  if (renameName) name = renameName;
  if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(name)) {
    return { error: `invalid pod-path name "${name}"` };
  }
  if (ref && !/^[a-z0-9][a-z0-9_./-]*$/i.test(ref)) {
    return { error: `invalid ref "${ref}"` };
  }
  return { source, name, ref };
}

function printInstallHelp() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                   jspod install - Help                             ║
╚═══════════════════════════════════════════════════════════════════╝
`));
  console.log(chalk.white('Usage:'));
  console.log(chalk.yellow('  jspod install') + chalk.dim(' [options] [<app>...]\n'));
  console.log(chalk.white('Options:'));
  console.log(chalk.green('  --pod ') + chalk.yellow('<url>') + chalk.dim('       Target pod (default: http://localhost:5444)'));
  console.log(chalk.green('  --user ') + chalk.yellow('<name>') + chalk.dim('      Username (default: me)'));
  console.log(chalk.green('  --password ') + chalk.yellow('<pw>') + chalk.dim('     Password (default: $JSS_SINGLE_USER_PASSWORD or "me")'));
  console.log(chalk.green('  --bundle ') + chalk.yellow('<src>') + chalk.dim('    Install every app in a bundle. Source: <name> (e.g. starter,'));
  console.log(chalk.dim('                       agentic, all), <org>/<repo>, https://… URL, or ./local.jsonld'));
  console.log(chalk.green('  --help') + chalk.dim('             Show this help message\n'));
  console.log(chalk.white('App spec:') + chalk.dim('  <name> | <org>/<repo> | https://github.com/<org>/<repo>'));
  console.log(chalk.dim('             Optional suffixes:  #<branch-or-tag>   =<pod-path-name>'));
  console.log('');
  console.log(chalk.white('Examples:'));
  console.log(chalk.dim('  jspod install chrome                            # solid-apps/chrome'));
  console.log(chalk.dim('  jspod install chrome vellum pdf                 # several at once'));
  console.log(chalk.dim('  jspod install                                   # default bundle (home, plaza, vellum, plume, …)'));
  console.log(chalk.dim('  jspod install JavaScriptSolidServer/git         # any GitHub org/repo'));
  console.log(chalk.dim('  jspod install litecut/litecut.github.io=litecut # rename pod path'));
  console.log(chalk.dim('  jspod install solid-apps/chrome#v1              # pin a tag or branch'));
  console.log(chalk.dim('  jspod install --bundle starter                  # curated starter set'));
  console.log(chalk.dim('  jspod install --bundle agentic                  # agent stack'));
  console.log(chalk.dim('  jspod install --bundle all                      # every solid-app'));
  console.log(chalk.dim('  jspod install --pod http://192.168.0.1:5444 chrome'));
  console.log('');
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
    if (raw !== 'json' && raw !== 'folder') {
      console.error(chalk.red(`✗ Invalid --browser value: ${raw}`));
      console.error(chalk.dim('Must be one of: json, folder'));
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
    console.log(chalk.green('  --browser ') + chalk.yellow('<folder|json>') + chalk.dim('  Data browser style (default: folder)'));
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
