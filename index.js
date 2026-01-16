#!/usr/bin/env node

/**
 * jspod - JavaScript Solid Pod
 * Just works, batteries included
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  port: 5444,
  host: '0.0.0.0',
  root: './pod-data',
  multiuser: false,
  auth: true
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
  } else if (arg === '--help') {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                         jspod - Help                               ║
╚═══════════════════════════════════════════════════════════════════╝
`));
    console.log(chalk.white('Usage:'));
    console.log(chalk.yellow('  jssd') + chalk.dim(' [options]\n'));
    console.log(chalk.white('Options:'));
    console.log(chalk.green('  -p, --port ') + chalk.yellow('<number>') + chalk.dim('     Port to listen on (default: 5444)'));
    console.log(chalk.green('  -h, --host ') + chalk.yellow('<address>') + chalk.dim('    Host to bind to (default: 0.0.0.0)'));
    console.log(chalk.green('  -r, --root ') + chalk.yellow('<path>') + chalk.dim('       Data directory (default: ./pod-data)'));
    console.log(chalk.green('  --multiuser') + chalk.dim('            Enable multi-user mode'));
    console.log(chalk.green('  --no-auth') + chalk.dim('              Disable authentication'));
    console.log(chalk.green('  --help') + chalk.dim('                  Show this help message\n'));
    console.log(chalk.white('Examples:'));
    console.log(chalk.dim('  jssd'));
    console.log(chalk.dim('  jssd --port 8080 --root /var/pods'));
    console.log(chalk.dim('  jssd --multiuser\n'));
    console.log(chalk.white('Features:'));
    console.log(chalk.dim('  • Solid Protocol compliant'));
    console.log(chalk.dim('  • WebID authentication'));
    console.log(chalk.dim('  • Passkey support'));
    console.log(chalk.dim('  • WebSocket notifications'));
    console.log(chalk.dim('  • JSON-LD native\n'));
    console.log(chalk.white('Resources:'));
    console.log(chalk.blue('  https://github.com/JavaScriptSolidServer/jssd'));
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
console.log(chalk.cyan('   ├─ ') + chalk.white('URL:       ') + chalk.bold.green(`http://${options.host === '0.0.0.0' ? 'localhost' : options.host}:${options.port}`));
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
console.log(chalk.cyan('   ├─ ') + chalk.white('Server:     ') + chalk.blue.underline('https://github.com/JavaScriptSolidServer/jssd'));
console.log(chalk.cyan('   ├─ ') + chalk.white('Solid:      ') + chalk.blue.underline('https://solidproject.org'));
console.log(chalk.cyan('   └─ ') + chalk.white('WebID:      ') + chalk.blue.underline('https://www.w3.org/2005/Incubator/webid/spec'));

console.log('\n' + chalk.dim('Press ') + chalk.bold.red('Ctrl+C') + chalk.dim(' to stop the server\n'));
console.log(chalk.yellow('⏳ Initializing server components...\n'));

// Find jss binary
const jssBin = join(__dirname, 'node_modules', 'javascript-solid-server', 'bin', 'jss.js');

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

// Start JSS
const jss = spawn('node', [jssBin, ...jssArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TOKEN_SECRET: process.env.TOKEN_SECRET || 'jssd-default-secret-change-in-production',
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

jss.on('error', (error) => {
  console.error(chalk.red('\n✗ Failed to start server'));
  console.error(chalk.dim(error.message));
  process.exit(1);
});

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
