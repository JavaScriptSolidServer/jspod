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

> jspod binds to `localhost` by default so the placeholder `me` / `me` credentials are reachable only from your local machine.

## CLI options

```
  -p, --port <number>     Port to listen on (default: 5444)
  -h, --host <address>    Host to bind to (default: localhost)
  -r, --root <path>       Data directory (default: ./pod-data)
      --multiuser         Enable multi-user mode (registration enabled)
      --no-auth           Open pod, no IDP, no ACL (demos / dev only)
      --no-open           Don't auto-open the browser on start
      --no-git            Disable JSS's git HTTP backend
      --browser <style>   Data browser: folder (default) or json
      --provision-keys    Generate a Nostr-compatible owner keypair on first start
      --mcp               Enable MCP server at /mcp (agent tool surface; pairs with charlie)
  -v, --version           Print jspod version
      --help              Show help
```

## Install Solid apps

After your pod is running, drop more Solid apps in with one command:

```bash
jspod install chrome                              # solid-apps/chrome (default registry)
jspod install vellum win98 pdf                    # several at once
jspod install                                     # curated set: chrome vellum win98 pdf hub
jspod install JavaScriptSolidServer/git           # any GitHub org/repo
jspod install litecut/litecut.github.io=litecut   # rename the pod path
jspod install solid-apps/chrome#v1                # pin a branch or tag
jspod install --bundle starter                    # curated starter set
jspod install --bundle agentic                    # agent stack (charlie + chat + ...)
jspod install --bundle all                        # every solid-app
```

Each app lands at `/public/apps/<name>/` and is reachable in the browser immediately. `jspod install --help` for the full spec.

### Available bundles

Curated sets, all maintained at [`solid-apps/bundles`](https://github.com/solid-apps/bundles):

| Bundle | Apps | Use |
|---|---|---|
| `starter` | chrome, vellum, pdf, alarm, chat | Minimal pleasant first-run |
| `all` | every solid-app | Everything in the org |
| `media` | playlist, pdf | Media stack |
| `productivity` | vellum, hub, win98, chat, mindstr, transcribe | Docs + workspace + retro shell + chat + mind mapping + speech-to-text |
| `agentic` | charlie, chat, taskify, vellum, forum, chrome | Run agents on your pod — pairs with `--mcp` |

You can also point at your own bundle URL:

```bash
jspod install --bundle https://my.pod/bundles/dev-stack.jsonld
```

## Run agents

When `--mcp` is enabled, your pod exposes 16 tools at `/mcp` (CRUD, ACL, skills, docs, federation) that any MCP-compatible client — Claude Desktop, Cursor, custom bots — can drive. The natural way to use it from a browser is the bundled chat bot:

```bash
npx jspod --mcp                  # pod with MCP server enabled
jspod install --bundle agentic   # charlie, chat, taskify, vellum, forum, chrome
```

Then open `http://localhost:5444/public/apps/charlie/`, log in via the xlogin button, paste an LLM API key in settings. Charlie reads its persona from `<pod>/SKILL.md`, uses the pod's `/mcp` as its tool surface, and chats with you. Edit `SKILL.md` and the bot's behaviour shifts next session — no retraining, no vendor.

The whole stack — identity, memory, tools, brain — runs on your pod.

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
