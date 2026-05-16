// jspod minimal data browser — the page is the data. JSS embeds the
// resource as JSON-LD in #dataisland; this single module:
//   1. Injects its own <style> (no separate .css fetch needed)
//   2. Parses the JSON-LD and pretty-prints with 2-space indent
//   3. Renders into #mashlib with every URI as a clickable <a>
// Goal: a baseline mashlib that fits in one file, ~800 bytes total.
document.head.insertAdjacentHTML('beforeend','<style>body{font:14px/1.6 system-ui,-apple-system,sans-serif;margin:2em;color:#222;background:#f3eee5}#mashlib pre{padding:1.5em;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:auto;white-space:pre-wrap;word-break:break-all}a{color:#0a66c2;text-decoration:none}a:hover{text-decoration:underline}</style>')
const d=JSON.parse(document.getElementById('dataisland').textContent)
document.getElementById('mashlib').innerHTML='<pre>'+JSON.stringify(d,null,2).replace(/https?:\/\/[^"\s]+/g,'<a href="$&">$&</a>')+'</pre>'
