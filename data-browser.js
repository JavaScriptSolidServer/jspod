// jspod minimal data browser — the page is the data. JSS embeds the
// resource as JSON-LD in #dataisland; this module just makes it visible
// in #mashlib with clickable URIs. See data-browser.css for the styling.
const d=document.getElementById('dataisland'),m=document.getElementById('mashlib');
m.innerHTML=`<pre>${d.textContent.replace(/https?:\/\/[^"\s]+/g,'<a href="$&">$&</a>')}</pre>`
