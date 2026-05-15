#!/usr/bin/env node

/**
 * jspod - JavaScript Solid Pod
 * Just works, batteries included
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, delimiter } from 'path';
import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

// Build a browser-friendly URL from a host/port pair. Normalizes wildcard
// addresses (0.0.0.0, ::) to localhost and brackets IPv6 literals so the
// result is always a valid URL the user (and the browser) can open.
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
  host: '0.0.0.0',
  root: './pod-data',
  multiuser: false,
  auth: true,
  open: true
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--port' || arg === '-p') {
    options.port = parseInt(args[++i], 10);
  } else if (arg === '--host' || arg === '-h') {
    options.host = args[++i];
  } else if (arg === '--root' || arg === '-r') {
    options.root = args[++i];
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
    console.log(chalk.green('  -h, --host ') + chalk.yellow('<address>') + chalk.dim('    Host to bind to (default: 0.0.0.0)'));
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

if (!options.multiuser) {
  jssArgs.push('--no-multiuser');
}

// Start JSS with enhanced PATH to find the binary
const jss = spawn('jss', jssArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${join(__dirname, 'node_modules', '.bin')}${delimiter}${process.env.PATH}`,
    TOKEN_SECRET: process.env.TOKEN_SECRET || 'jspod-default-secret-change-in-production',
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
