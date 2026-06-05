// Pod-local pane for bookmark:Bookmark.
// Core: dc:title / bookmark:recalls / dcterms:created.
// Enrichment (optional, rendered when present): dc:description (summary),
// schema:keywords (tags), schema:image (hero), schema:datePublished.
// Loaded by the `--browser panes` data browser from /public/panes/.
// Contract: export default { canHandle(node, h) -> bool, render(node, h) -> htmlString }
// h = { escape, prop, propAll, first, idOf, types, host, fmtDate, localName }.

export default {
  canHandle(node, h) {
    return h.types(node).includes('Bookmark');
  },

  render(node, h) {
    const url = h.idOf(h.prop(node, 'recalls'));
    const title = h.first(h.prop(node, 'title')) || url || 'Untitled bookmark';
    const site = h.host(url);
    const date = h.fmtDate(h.first(h.prop(node, 'created')));
    const fav = url ? h.escape(new URL('/favicon.ico', url).href) : '';

    // Enrichment — all optional.
    const desc = h.first(h.prop(node, 'description'));
    const tags = h.propAll(node, 'keywords').map(t => h.first(t)).filter(Boolean);
    const img = h.idOf(h.prop(node, 'image'));
    const published = h.fmtDate(h.first(h.prop(node, 'datePublished')));

    const hero = img
      ? `<img class="bm-hero" src="${h.escape(img)}" alt="" onerror="this.style.display='none'">`
      : '';
    const rule = desc ? `<div class="bm-rule"></div>` : '';
    // Render the summary as paragraphs (split on blank lines); first is the lead.
    const paras = desc ? String(desc).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
    const summary = paras.length
      ? `<div class="bm-body">${paras.map((p, i) =>
          `<p class="${i === 0 ? 'bm-lead' : 'bm-para'}">${h.escape(p)}</p>`).join('')}</div>`
      : '';
    const chips = tags.length
      ? `<div class="bm-tags">${tags.map(t => `<span class="bm-tag">${h.escape(t)}</span>`).join('')}</div>`
      : '';
    const meta = [published ? `published ${h.escape(published)}` : '', date ? `saved ${h.escape(date)}` : '']
      .filter(Boolean).join(' &middot; ');

    return `<style>
      .bm-wrap{max-width:680px;margin:0 auto;padding:8px 0 28px;font-family:Inter,-apple-system,system-ui,sans-serif;}
      .bm-eyebrow{font-family:Georgia,serif;font-size:13px;font-style:italic;color:#a1a1aa;margin-bottom:18px;}
      .bm-card{background:#fff;border:1px solid rgba(24,24,27,.07);border-radius:18px;box-shadow:0 1px 3px rgba(24,24,27,.04),0 10px 40px rgba(24,24,27,.07);padding:32px 34px;}
      .bm-head{display:flex;gap:16px;align-items:flex-start;}
      .bm-fav{width:40px;height:40px;border-radius:10px;flex:0 0 auto;background:rgba(127,127,127,.06);object-fit:contain;}
      .bm-titlewrap{min-width:0;flex:1;}
      .bm-title{font-size:22px;font-weight:650;color:#18181b;line-height:1.3;text-decoration:none;overflow-wrap:anywhere;}
      .bm-title:hover{color:#7c3aed;}
      .bm-host{display:block;font-size:12.5px;color:#7c3aed;font-family:ui-monospace,SFMono-Regular,monospace;margin-top:7px;text-decoration:none;overflow-wrap:anywhere;}
      .bm-host:hover{text-decoration:underline;}
      .bm-hero{width:88px;height:88px;border-radius:12px;object-fit:cover;flex:0 0 auto;margin-left:auto;border:1px solid rgba(24,24,27,.06);background:#fafafa;}
      .bm-rule{height:1px;background:rgba(24,24,27,.07);margin:22px 0;}
      .bm-body{display:flex;flex-direction:column;gap:15px;}
      .bm-lead{font-size:16px;line-height:1.7;color:#27272a;margin:0;}
      .bm-para{font-size:15px;line-height:1.72;color:#52525b;margin:0;}
      .bm-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:24px;}
      .bm-tag{font-size:12px;color:#6d28d9;background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.13);padding:4px 11px;border-radius:999px;}
      .bm-foot{display:flex;align-items:center;margin-top:26px;}
      .bm-open{font-size:13px;font-weight:600;color:#fff;background:#7c3aed;padding:10px 18px;border-radius:10px;text-decoration:none;box-shadow:0 2px 10px rgba(124,58,237,.28);transition:background .15s,transform .05s;}
      .bm-open:hover{background:#6d28d9;}
      .bm-open:active{transform:translateY(1px);}
      .bm-meta{margin-left:auto;font-size:12px;color:#a1a1aa;}
    </style>
    <div class="bm-wrap">
      <div class="bm-eyebrow">Bookmark</div>
      <div class="bm-card">
        <div class="bm-head">
          <img class="bm-fav" src="${fav}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'🔖',style:'font-size:30px;line-height:40px;width:40px;text-align:center'}))">
          <div class="bm-titlewrap">
            <a class="bm-title" href="${h.escape(url)}" target="_blank" rel="noopener">${h.escape(title)}</a>
            <a class="bm-host" href="${h.escape(url)}" target="_blank" rel="noopener">${h.escape(site)}</a>
          </div>
          ${hero}
        </div>
        ${rule}
        ${summary}
        ${chips}
        <div class="bm-foot">
          <a class="bm-open" href="${h.escape(url)}" target="_blank" rel="noopener">Open ↗</a>
          ${meta ? `<span class="bm-meta">${meta}</span>` : ''}
        </div>
      </div>
    </div>`;
  }
};
