# jspod - JavaScript Solid Pod

> **Just works**. Batteries included. Zero configuration.

[![npm version](https://img.shields.io/npm/v/jspod.svg)](https://www.npmjs.com/package/jspod)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**jspod** is the easiest way to run a [Solid](https://solidproject.org) server. It's a thin wrapper around [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) with sensible defaults and a beautiful CLI.

## 🚀 Quick Start

```bash
# Run instantly with npx (no installation required!)
npx jspod

# That's it! Your Solid server is running at http://localhost:5444
```

## ✨ Features

### 🎯 Just Works
- **Zero configuration** - Smart defaults for everything
- **One command** - `npx jspod` and you're running
- **Beautiful CLI** - Gorgeous terminal output that makes you smile

### 🔋 Batteries Included

Built on [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) with all features enabled:

- ✅ **Solid Protocol** - Full Solid spec compliance
- ✅ **WebID Authentication** - Identity and access control
- ✅ **Passkey Support** - Modern passwordless authentication
- ✅ **WebSocket Notifications** - Real-time updates
- ✅ **JSON-LD Native** - First-class JSON-LD support
- ✅ **Content Negotiation** - Turtle, JSON-LD, and more

## 📦 Installation

### No Installation (Recommended)

```bash
npx jspod
```

### Global Installation

```bash
npm install -g jspod
jspod
```

### Local Installation

```bash
npm install jspod
npx jspod
```

## 🎮 Usage

### Basic Usage

```bash
# Start with defaults (port 5444, single-user)
jspod

# Custom port
jspod --port 8080

# Custom data directory
jspod --root /var/pods

# Multi-user mode
jspod --multiuser
```

### CLI Options

```
Options:
  -p, --port <number>     Port to listen on (default: 5444)
  -h, --host <address>    Host to bind to (default: 127.0.0.1)
  -r, --root <path>       Data directory (default: ./pod-data)
  --multiuser             Enable multi-user mode
  --no-auth               Disable authentication
  --no-open               Do not open the browser automatically
  -v, --version           Show jspod version
  --help                  Show help message
```

### Environment Variables

```bash
# Set JWT secret (recommended for production)
export TOKEN_SECRET="your-secret-key-here"

# Set environment
export NODE_ENV="production"

# Run server
jspod
```

### Production Deployment

**⚠️ Important**: Before deploying to production:

1. **Set TOKEN_SECRET**
   ```bash
   export TOKEN_SECRET="$(openssl rand -base64 32)"
   ```

2. **Use a proper domain** (not localhost)
   - Passkeys require HTTPS in production
   - Get SSL cert (Let's Encrypt recommended)

3. **Run as a service**
   ```bash
   # Example systemd service
   sudo systemctl enable jspod
   sudo systemctl start jspod
   ```

4. **Set up backups**
   - Back up `./pod-data` directory
   - Contains all user data and credentials

5. **Monitor logs**
   ```bash
   jspod > jspod.log 2>&1
   ```

## 🏃 Quickstart Examples

### Personal Pod

```bash
# Start your personal Solid pod
jspod

# Visit http://localhost:5444 in your browser
# Register with passkey, start storing data!
```

### Multi-User Server

```bash
# Run a server for multiple users
jspod --multiuser --port 443 --root /var/solid-pods

# Users can register and get their own pod space
```

### Development Server

```bash
# Run on custom port for development
jspod --port 8080 --root ./dev-data
```

## 🆚 jspod vs JavaScriptSolidServer

| Feature | JavaScriptSolidServer | jspod |
|---------|----------------------|------|
| Installation | `npm install -g javascript-solid-server` | `npx jspod` |
| Configuration | Config file required | Smart defaults |
| Commands | `jss start [options]` | `jspod` |
| First run | 5+ steps | 1 command |
| Use case | Power users, customization | Quick start, demos |

**When to use JavaScriptSolidServer**: Production deployments, custom configuration, advanced features

**When to use jspod**: Quick demos, local development, "just want it to work"

## 🛠️ How It Works

jspod is a thin wrapper that:

1. Provides sensible defaults
2. Creates beautiful CLI output
3. Manages the lifecycle of JavaScriptSolidServer
4. Handles graceful shutdown

### Enabled Features

Under the hood, jspod runs JavaScriptSolidServer with these options:

| Feature | JSS Flag | Description |
|---------|----------|-------------|
| **WebSocket Notifications** | `--notifications` | Real-time updates via WebSockets |
| **Content Negotiation** | `--conneg` | Turtle, JSON-LD, and more |
| **Single-user Mode** | `--no-multiuser` | One pod per server (use `--multiuser` flag to change) |
| **Passkey Auth** | (built-in) | Automatic in JSS - no flag needed |
| **WebID** | (built-in) | Core Solid protocol feature |

### Default Configuration

```javascript
{
  port: 5444,              // Memorable, low collision with common dev servers
  host: '127.0.0.1',       // Localhost-only by default (rung-1 credentials)
  root: './pod-data',      // Local data directory
  multiuser: false,        // Single pod per server
  TOKEN_SECRET: (auto)     // JWT secret (auto-generated, change for production)
}
```

## 🎯 First Run Guide

**Step 1**: Start the server
```bash
npx jspod
```

**Step 2**: Your browser opens automatically to `http://localhost:5444`

> Running over SSH, in CI, or in a non-interactive terminal? jspod skips auto-open and prints the URL instead. You can also pass `--no-open` to disable it explicitly.

**Step 3**: Sign in (rung 1 of the auth ladder)

The first time you start jspod, an IDP account is seeded with deliberately weak default credentials:

| Field    | Value |
| -------- | ----- |
| Username | `me`  |
| Password | `me`  |

Click **Sign in** on the welcome page, then point a Solid app (like [Pilot](https://solid-apps.github.io/pilot/)) at `http://localhost:5444` and sign in with `me` / `me`.

> **Why are the defaults so weak?** jspod ships you onto the first rung of the auth ladder in under a minute, then guides you up. Rung 1 is **only safe on localhost** — jspod binds to `127.0.0.1` by default for exactly this reason. Once you're in, change the password (rung 2) or add a passkey (rung 3) from your pod's account settings. See [issue #6](https://github.com/JavaScriptSolidServer/jspod/issues/6) for the ladder rationale.

**Step 4**: Climb the ladder

| Rung | Auth                  | How                                          |
| ---- | --------------------- | -------------------------------------------- |
| 0    | None                  | `npx jspod --no-auth` (demos / dev only)     |
| 1    | `me` / `me`           | **Default.** Localhost-only.                 |
| 2    | Your password         | Change it from your pod's account settings   |
| 3    | Passkey               | Add a passkey from account settings          |
| 4    | Hardware key / MFA    | Power-user setup                             |

Override the default password without going through the UI:

```bash
JSS_SINGLE_USER_PASSWORD='your-password' npx jspod
```

**Step 3**: Register with a passkey
- Click "Register" or "Sign Up"
- Use your device's biometric auth (fingerprint, Face ID, etc.)
- Your WebID will be created automatically

**Step 4**: Start using your pod!
- Upload files, create resources
- Use Solid apps to connect to your pod
- Your data stays on your server

**Troubleshooting**:
- **Port in use?** Run `jspod --port 5445`
- **Data location?** Check `./pod-data` directory
- **Can't register?** Make sure your browser supports WebAuthn (Chrome, Firefox, Safari, Edge all work)

## 📖 Learn More

### What is Solid?

[Solid](https://solidproject.org) is a web specification that lets people store their data securely in decentralized data stores called Pods. This gives users control over their own data.

### Resources

- **jspod**: https://github.com/JavaScriptSolidServer/jspod
- **JavaScriptSolidServer**: https://github.com/JavaScriptSolidServer/JavaScriptSolidServer
- **Solid Project**: https://solidproject.org
- **Solid Spec**: https://solidproject.org/TR/protocol
- **WebID**: https://www.w3.org/2005/Incubator/webid/spec

## 🤝 Contributing

Contributions welcome! jspod is intentionally simple - we want to keep it that way.

**Philosophy**:
- Simple over complex
- Defaults over configuration
- Works over features

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT - see [LICENSE](./LICENSE)

## 🙏 Credits

jspod is built on top of the excellent [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) by Melvin Carvalho and contributors.

## 💬 Support

- **Issues**: https://github.com/JavaScriptSolidServer/jspod/issues
- **Discussions**: https://github.com/JavaScriptSolidServer/jspod/discussions
- **Solid Forum**: https://forum.solidproject.org

---

**Made with ❤️ for the Solid community**

*"Solid made simple"*
