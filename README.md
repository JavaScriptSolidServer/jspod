# JSSD - JavaScript Solid Server Daemon

> **Just works**. Batteries included. Zero configuration.

[![npm version](https://img.shields.io/npm/v/jssd.svg)](https://www.npmjs.com/package/jssd)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**JSSD** is the easiest way to run a [Solid](https://solidproject.org) server. It's a thin wrapper around [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) with sensible defaults and a beautiful CLI.

## 🚀 Quick Start

```bash
# Run instantly with npx (no installation required!)
npx jssd

# That's it! Your Solid server is running at http://localhost:3000
```

## ✨ Features

### 🎯 Just Works
- **Zero configuration** - Smart defaults for everything
- **One command** - `npx jssd` and you're running
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
npx jssd
```

### Global Installation

```bash
npm install -g jssd
jssd
```

### Local Installation

```bash
npm install jssd
npx jssd
```

## 🎮 Usage

### Basic Usage

```bash
# Start with defaults (port 3000, single-user)
jssd

# Custom port
jssd --port 8080

# Custom data directory
jssd --root /var/pods

# Multi-user mode
jssd --multiuser
```

### CLI Options

```
Options:
  -p, --port <number>     Port to listen on (default: 3000)
  -h, --host <address>    Host to bind to (default: 0.0.0.0)
  -r, --root <path>       Data directory (default: ./pod-data)
  --multiuser             Enable multi-user mode
  --no-auth               Disable authentication
  --help                  Show help message
```

### Environment Variables

```bash
# Set JWT secret (recommended for production)
export TOKEN_SECRET="your-secret-key-here"

# Set environment
export NODE_ENV="production"

# Run server
jssd
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
   sudo systemctl enable jssd
   sudo systemctl start jssd
   ```

4. **Set up backups**
   - Back up `./pod-data` directory
   - Contains all user data and credentials

5. **Monitor logs**
   ```bash
   jssd --verbose > jssd.log 2>&1
   ```

## 🏃 Quickstart Examples

### Personal Pod

```bash
# Start your personal Solid pod
jssd

# Visit http://localhost:3000 in your browser
# Register with passkey, start storing data!
```

### Multi-User Server

```bash
# Run a server for multiple users
jssd --multiuser --port 443 --root /var/solid-pods

# Users can register and get their own pod space
```

### Development Server

```bash
# Run on custom port for development
jssd --port 8080 --root ./dev-data
```

## 🆚 JSSD vs JavaScriptSolidServer

| Feature | JavaScriptSolidServer | JSSD |
|---------|----------------------|------|
| Installation | `npm install -g javascript-solid-server` | `npx jssd` |
| Configuration | Config file required | Smart defaults |
| Commands | `jss start [options]` | `jssd` |
| First run | 5+ steps | 1 command |
| Use case | Power users, customization | Quick start, demos |

**When to use JavaScriptSolidServer**: Production deployments, custom configuration, advanced features

**When to use JSSD**: Quick demos, local development, "just want it to work"

## 🛠️ How It Works

JSSD is a thin wrapper that:

1. Provides sensible defaults
2. Creates beautiful CLI output
3. Manages the lifecycle of JavaScriptSolidServer
4. Handles graceful shutdown

### Enabled Features

Under the hood, JSSD runs JavaScriptSolidServer with these options:

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
  port: 3000,              // Easy to remember
  host: '0.0.0.0',         // Accept connections from anywhere
  root: './pod-data',      // Local data directory
  multiuser: false,        // Single pod per server
  TOKEN_SECRET: (auto)     // JWT secret (auto-generated, change for production)
}
```

## 🎯 First Run Guide

**Step 1**: Start the server
```bash
npx jssd
```

**Step 2**: Open your browser to `http://localhost:3000`

**Step 3**: Register with a passkey
- Click "Register" or "Sign Up"
- Use your device's biometric auth (fingerprint, Face ID, etc.)
- Your WebID will be created automatically

**Step 4**: Start using your pod!
- Upload files, create resources
- Use Solid apps to connect to your pod
- Your data stays on your server

**Troubleshooting**:
- **Port in use?** Run `jssd --port 3001`
- **Data location?** Check `./pod-data` directory
- **Can't register?** Make sure your browser supports WebAuthn (Chrome, Firefox, Safari, Edge all work)

## 📖 Learn More

### What is Solid?

[Solid](https://solidproject.org) is a web specification that lets people store their data securely in decentralized data stores called Pods. This gives users control over their own data.

### Resources

- **JSSD**: https://github.com/JavaScriptSolidServer/jssd
- **JavaScriptSolidServer**: https://github.com/JavaScriptSolidServer/JavaScriptSolidServer
- **Solid Project**: https://solidproject.org
- **Solid Spec**: https://solidproject.org/TR/protocol
- **WebID**: https://www.w3.org/2005/Incubator/webid/spec

## 🤝 Contributing

Contributions welcome! JSSD is intentionally simple - we want to keep it that way.

**Philosophy**:
- Simple over complex
- Defaults over configuration
- Works over features

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT - see [LICENSE](./LICENSE)

## 🙏 Credits

JSSD is built on top of the excellent [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) by Melvin Carvalho and contributors.

## 💬 Support

- **Issues**: https://github.com/JavaScriptSolidServer/jssd/issues
- **Discussions**: https://github.com/JavaScriptSolidServer/jssd/discussions
- **Solid Forum**: https://forum.solidproject.org

---

**Made with ❤️ for the Solid community**

*"Solid made simple"*
