# Changelog

## Unreleased

### Housekeeping

- Removed one-off ASCII-banner dev scripts (`count-ascii.js`, `count-banner.js`, `jspod-ascii.js`, `verify-spacing.js`): referenced nowhere, never published (#75)
- Tracked MCP dev tools (not published to npm) (#75):
  - `mcp.js`: minimal Streamable-HTTP MCP client for the local pod
  - `refresh-mcp-token.sh`: re-mints a 1h owner token and registers the pod's `/mcp` endpoint as the `jspod` MCP server in Claude Code
- Added this changelog (#75)

## 0.0.50 (2026-11-04)

- Require jss 0.0.225 for the dotfile guard fix (#82)

## 0.0.49 (2026-07-11)

- `--plugin` passthrough to jss, jss 0.0.219, `JSPOD_BROWSER_URL` override
- Seed pod files only if they don't exist, so user edits survive restarts (#81)

## 0.0.48 (2026-06-15)

- **panes**: render bookmark enrichment: summary, tags, hero image (#71, #72)
- **panes**: searchable bookmark collection pane, plus container-pane support (#73, #74)
- `jspod install` delegates to the upstream `jss install` (#78)
- Pass `--body-limit 40MB` and require jss >=0.0.208, so large app installs fit (#80)

## 0.0.47 (2026-06-05)

- Publish `data-browser-panes.js` and `--browser panes`, a pane-aware data browser augmented by local panes (#69, #70)

Earlier releases predate this changelog: see `git log` for history.
