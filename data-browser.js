// jspod minimal data browser — the page is the data. JSS embeds the
// resource as JSON-LD in #dataisland; this module parses it, pretty-
// prints with 2-space indent, and renders to #mashlib with clickable
// URIs. See data-browser.css for the styling.
const d=JSON.parse(document.getElementById('dataisland').textContent);
document.getElementById('mashlib').innerHTML='<pre>'+JSON.stringify(d,null,2).replace(/https?:\/\/[^"\s]+/g,'<a href="$&">$&</a>')+'</pre>'
