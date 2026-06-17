#!/usr/bin/env bash
# Re-mint a 1h owner Bearer token from the local jss IdP and (re)register
# the pod's /mcp endpoint as the "jspod" MCP server in Claude Code.
# Usage: ./refresh-mcp-token.sh
set -euo pipefail

POD="${POD:-http://localhost:5444}"
USER_NAME="${POD_USER:-me}"
PASSWORD="${POD_PASS:-me}"
NAME="${MCP_NAME:-jspod}"

TOKEN=$(curl -s -m 6 "$POD/idp/credentials" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER_NAME\",\"password\":\"$PASSWORD\"}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d);if(!r.access_token){console.error("no token: "+d);process.exit(1)}process.stdout.write(r.access_token)})')

claude mcp remove "$NAME" 2>/dev/null || true
claude mcp add --transport http "$NAME" "$POD/mcp" \
  --header "Authorization: Bearer $TOKEN"

echo "Refreshed '$NAME' -> $POD/mcp (token valid ~1h)"
