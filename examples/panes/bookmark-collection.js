// Pod-local collection pane for the /public/bookmark/ container.
// Renders every bookmark:Bookmark member as a searchable feed of compact cards.
// Loaded by the `--browser panes` data browser from /public/panes/.
//
// canHandle matches the conventional bookmark container path; render fetches the
// members and returns null if none are bookmarks (so the browser falls back to
// the folder table). Search is a self-contained inline oninput handler — no
// script tag (which wouldn't execute via innerHTML anyway).

export default {
  canHandle(node, h) {
    return h.isContainer && /\/bookmark\/?$/.test(h.path || '');
  },

  async render(node, h) {
    const kids = (h.children || []).filter(it => it.type !== 'container' && it.url.endsWith('.jsonld'));
    const fetched = await Promise.all(kids.map(k =>
      h.fetchResource(k.url).then(n => ({ url: k.url, n })).catch(() => null)));

    const items = [];
    for (const x of fetched) {
      if (!x || !x.n || !h.types(x.n).includes('Bookmark')) continue;
      const recalls = h.idOf(h.prop(x.n, 'recalls'));
      const title = h.first(h.prop(x.n, 'title')) || recalls || 'Untitled bookmark';
      const lead = String(h.first(h.prop(x.n, 'description')) || '').split(/\n\s*\n/)[0].trim();
      const snippet = lead.length > 190 ? lead.slice(0, 187) + '…' : lead;
      const tags = h.propAll(x.n, 'keywords').map(t => h.first(t)).filter(Boolean);
      const host = h.host(recalls);
      const created = h.first(h.prop(x.n, 'created')) || '';
      const q = [title, lead, tags.join(' '), host].join(' ').toLowerCase();
      items.push({ recalls, podUrl: x.url, title, snippet, tags, host, created, q });
    }
    if (!items.length) return null; // not a bookmark collection → fall back to folder
    items.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

    const card = it => {
      const fav = it.recalls ? h.escape(new URL('/favicon.ico', it.recalls).href) : '';
      const chips = it.tags.slice(0, 5).map(t => `<span class="bmc-tag">${h.escape(t)}</span>`).join('');
      // Card body → the bookmark's .jsonld detail page (full summary card).
      // Corner ↗ → the original external link.
      return `<div class="bmc-item" data-q="${h.escape(it.q)}">
        <a class="bmc-main" href="${h.escape(it.podUrl)}">
          <img class="bmc-fav" src="${fav}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'🔖',style:'font-size:22px;line-height:34px;width:34px;text-align:center'}))">
          <div class="bmc-body">
            <div class="bmc-title">${h.escape(it.title)}</div>
            <div class="bmc-host">${h.escape(it.host)}</div>
            ${it.snippet ? `<div class="bmc-snippet">${h.escape(it.snippet)}</div>` : ''}
            ${chips ? `<div class="bmc-tags">${chips}</div>` : ''}
          </div>
        </a>
        <a class="bmc-ext" href="${h.escape(it.recalls)}" target="_blank" rel="noopener" title="Open original ↗" aria-label="Open original">↗</a>
      </div>`;
    };

    const filter = "var r=this.closest('.bmc'),q=this.value.toLowerCase().trim(),n=0;" +
      "r.querySelectorAll('.bmc-item').forEach(function(el){var m=el.getAttribute('data-q').indexOf(q)>-1;el.style.display=m?'':'none';if(m)n++;});" +
      "r.querySelector('.bmc-count').textContent=n;" +
      "r.querySelector('.bmc-empty').style.display=n?'none':'block';";

    return `<style>
      .bmc{max-width:720px;margin:0 auto;padding:8px 0 28px;font-family:Inter,-apple-system,system-ui,sans-serif;}
      .bmc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:20px;}
      .bmc-eyebrow{font-family:Georgia,serif;font-style:italic;font-size:13px;color:#a1a1aa;}
      .bmc-title-main{font-size:24px;font-weight:650;color:#18181b;margin-top:5px;}
      .bmc-count{font-size:15px;color:#a1a1aa;font-weight:500;margin-left:5px;}
      .bmc-search{border:1px solid rgba(24,24,27,.12);border-radius:10px;padding:9px 13px;font-size:14px;outline:none;width:210px;max-width:45vw;background:#fff;font-family:inherit;transition:border-color .15s,box-shadow .15s;}
      .bmc-search:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12);}
      .bmc-list{display:flex;flex-direction:column;gap:12px;}
      .bmc-item{position:relative;background:#fff;border:1px solid rgba(24,24,27,.07);border-radius:14px;box-shadow:0 1px 2px rgba(24,24,27,.04);transition:box-shadow .15s,border-color .15s;}
      .bmc-item:hover{box-shadow:0 4px 18px rgba(24,24,27,.09);border-color:rgba(124,58,237,.25);}
      .bmc-main{display:flex;gap:14px;align-items:flex-start;text-decoration:none;color:inherit;padding:18px 52px 18px 20px;}
      .bmc-main:active{transform:translateY(1px);}
      .bmc-ext{position:absolute;top:13px;right:13px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;color:#b4b4bb;text-decoration:none;font-size:16px;line-height:1;transition:background .15s,color .15s;}
      .bmc-ext:hover{background:rgba(124,58,237,.1);color:#7c3aed;}
      .bmc-fav{width:34px;height:34px;border-radius:8px;flex:0 0 auto;background:rgba(127,127,127,.06);object-fit:contain;margin-top:2px;}
      .bmc-body{min-width:0;flex:1;}
      .bmc-title{font-size:16px;font-weight:600;color:#18181b;line-height:1.35;overflow-wrap:anywhere;}
      .bmc-host{font-size:12px;color:#7c3aed;font-family:ui-monospace,SFMono-Regular,monospace;margin-top:4px;}
      .bmc-snippet{font-size:13.5px;line-height:1.6;color:#52525b;margin-top:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .bmc-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;}
      .bmc-tag{font-size:11px;color:#6d28d9;background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.12);padding:2px 9px;border-radius:999px;}
      .bmc-empty{text-align:center;color:#a1a1aa;padding:28px;font-size:14px;}
    </style>
    <div class="bmc">
      <div class="bmc-head">
        <div>
          <div class="bmc-eyebrow">Collection</div>
          <div class="bmc-title-main">Bookmarks <span class="bmc-count">${items.length}</span></div>
        </div>
        <input class="bmc-search" type="search" placeholder="Search title, summary, tags…" oninput="${filter}">
      </div>
      <div class="bmc-list">${items.map(card).join('')}</div>
      <div class="bmc-empty" style="display:none">No matches.</div>
    </div>`;
  }
};
