#!/usr/bin/env node
// Minimal MCP (Streamable-HTTP) client for the local jss pod.
// Usage: node mcp.mjs <tool> '<json-args>'   |   node mcp.mjs --list
const POD = process.env.POD || 'http://localhost:5444';
const U = process.env.POD_USER || 'me', P = process.env.POD_PASS || 'me';

async function token() {
  const r = await fetch(`${POD}/idp/credentials`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: U, password: P }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('auth failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function rpc(tok, method, params) {
  const r = await fetch(`${POD}/mcp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tok}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const text = await r.text();
  // handle both plain JSON and SSE framing
  const line = text.includes('data:') ? text.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('') : text;
  return JSON.parse(line);
}

const [, , tool, argstr] = process.argv;
const tok = await token();

if (tool === '--list') {
  const r = await rpc(tok, 'tools/list', {});
  for (const t of r.result.tools) console.log(`${t.name}\t${(t.description || '').split('\n')[0]}`);
  process.exit(0);
}

const args = argstr ? JSON.parse(argstr) : {};
const r = await rpc(tok, 'tools/call', { name: tool, arguments: args });
if (r.error) { console.error('ERR', JSON.stringify(r.error)); process.exit(1); }
const out = r.result?.content?.map(c => c.text ?? JSON.stringify(c)).join('\n') ?? JSON.stringify(r.result);
console.log(out);
