# jspod

> Your personal [Solid](https://solidproject.org) pod, in one command.

[![npm version](https://img.shields.io/npm/v/jspod.svg)](https://www.npmjs.com/package/jspod)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

## Try in 60 seconds

```bash
npx jspod
```

Your browser opens to `http://localhost:5444`. Click **Sign in** and use:

| Username | Password |
| -------- | -------- |
| `me`     | `me`     |

That's it. You have a working Solid pod with a passkey-capable identity provider, a tiny built-in data browser, and a [WebID](https://www.w3.org/2005/Incubator/webid/spec) you can point any Solid app at.

> jspod binds to `127.0.0.1` by default so the placeholder `me` / `me` credentials are reachable only from your local machine.

## CLI options

```
  -p, --port <number>     Port to listen on (default: 5444)
  -h, --host <address>    Host to bind to (default: 127.0.0.1)
  -r, --root <path>       Data directory (default: ./pod-data)
      --multiuser         Enable multi-user mode (registration enabled)
      --no-auth           Open pod, no IDP, no ACL (demos / dev only)
      --no-open           Don't auto-open the browser on start
  -v, --version           Print jspod version
      --help              Show help
```

## The auth ladder

jspod ships you onto the lowest rung that's safe, and the climb is visible:

| Rung | Auth                | How to get there                                   |
| ---: | ------------------- | -------------------------------------------------- |
|    0 | None                | `jspod --no-auth` (demos / dev only)               |
|    1 | `me` / `me`         | Default. Localhost-only.                           |
|    2 | Your password       | Change it in your pod's account settings           |
|    3 | Passkey             | Add a passkey from account settings                |
|    4 | Hardware key / MFA  | Power-user setup                                   |

Override the initial password without going through the UI:

```bash
JSS_SINGLE_USER_PASSWORD='your-password' npx jspod
```

## Configuration

| Variable                    | Effect                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `JSS_SINGLE_USER_PASSWORD`  | Seed password instead of `me` (kept out of `ps` / banner output).   |
| `TOKEN_SECRET`              | JWT signing secret. Auto-generated at `<root>/.token-secret` (mode 0600) on first run if unset. Override for operator-managed deployments. |
| `NODE_ENV`                  | Standard Node env. Defaults to `development`.                       |

For LAN-reachable deployments, pass `--host 0.0.0.0` (jspod prints a warning to remind you that the rung-1 credentials are now exposed) and either set `JSS_SINGLE_USER_PASSWORD` or change the password from the pod UI immediately after first sign-in.

## The data browser

jspod ships a deliberately minimal data browser — about 800 bytes of JS that JSS loads from a version-pinned jsdelivr URL. It parses the JSON-LD island JSS already embeds in each HTML response, pretty-prints it, and renders every URI as a clickable link.

The source: [`data-browser.js`](./data-browser.js). The page is the data; the URIs are the navigation. No SPA, no mashlib CDN bundle.

If you want the full mashlib data browser instead, skip jspod and run JSS directly with `jss start --mashlib-cdn`.

## When to use jspod

- ✅ A working personal pod in 60 seconds on your laptop
- ✅ Trying Solid for the first time
- ✅ Local development against a Solid app
- ❌ Hosting pods for multiple users → use [JSS](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) directly with `--multiuser`
- ❌ Production deployments → JSS with operator-managed config

## Links

- [JavaScriptSolidServer (the substrate)](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer)
- [Solid project](https://solidproject.org)
- [Solid spec](https://solidproject.org/TR/protocol)

## License & credits

AGPL-3.0-only — matches [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer), on which jspod is built. By Melvin Carvalho and contributors. Issues: [GitHub](https://github.com/JavaScriptSolidServer/jspod/issues).
