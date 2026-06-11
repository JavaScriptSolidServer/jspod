# Changelog

## 0.0.48 — 2026-06-11

Changes since 0.0.47 (`a57b66e..`):

### Features

- **panes**: render bookmark enrichment — summary, tags, hero image (#71, #72)
- **panes**: searchable bookmark collection pane + container-pane support (#73, #74)

### Housekeeping

- Removed one-off ASCII-banner dev scripts (`count-ascii.js`, `count-banner.js`, `jspod-ascii.js`, `verify-spacing.js`) — referenced nowhere, never published (#75)
- Tracked MCP dev tools (not published to npm):
  - `mcp.js` — minimal Streamable-HTTP MCP client for the local pod
  - `refresh-mcp-token.sh` — re-mints a 1h owner token and registers the pod's `/mcp` endpoint as the `jspod` MCP server in Claude Code

### Published diff vs 0.0.47

```
 data-browser-panes.js                 | 57 +++++++++++++++------
 examples/panes/bookmark-collection.js | 96 +++++++++++++++++++++++++++++++++++
 examples/panes/bookmark.js            | 82 +++++++++++++++++++++++++-----
 3 files changed, 207 insertions(+), 28 deletions(-)
```

## 0.0.47

- Publish `data-browser-panes.js` + `--browser panes`, a pane-aware data browser augmented by local panes (#69, #70)

Earlier releases predate this changelog — see `git log` for history.
