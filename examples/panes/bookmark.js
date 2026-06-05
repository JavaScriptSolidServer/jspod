// Pod-local pane for bookmark:Bookmark (dc:title / bookmark:recalls / dcterms:created).
// Loaded by the `--browser panes` data browser from /public/panes/.
// Contract: export default { canHandle(node, h) -> bool, render(node, h) -> htmlString }
// h = { escape, prop, propAll, idOf, types, host, fmtDate, localName }.

export default {
  canHandle(node, h) {
    return h.types(node).includes('Bookmark');
  },

  render(node, h) {
    const url = h.idOf(h.prop(node, 'recalls'));
    const title = h.prop(node, 'title') || url || 'Untitled bookmark';
    const site = h.host(url);
    const date = h.fmtDate(h.prop(node, 'created'));
    const fav = url ? h.escape(new URL('/favicon.ico', url).href) : '';
    return `<div style="font-family:Inter,-apple-system,sans-serif;padding:24px 0 8px;">
      <div style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#999;margin-bottom:18px;">Bookmark</div>
      <a href="${h.escape(url)}" target="_blank" rel="noopener" style="display:flex;gap:18px;align-items:flex-start;text-decoration:none;color:inherit;border:1px solid rgba(127,127,127,0.18);border-radius:14px;padding:24px;background:#fff;">
        <img src="${fav}" alt="" width="44" height="44" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'🔖',style:'font-size:32px;line-height:44px;width:44px;text-align:center'}))" style="width:44px;height:44px;border-radius:9px;flex:0 0 auto;background:rgba(127,127,127,0.08);object-fit:contain;" />
        <div style="min-width:0;">
          <div style="font-size:21px;font-weight:600;color:#1a1a1a;line-height:1.3;margin-bottom:6px;overflow-wrap:anywhere;">${h.escape(title)}</div>
          <div style="font-size:13px;color:#7c3aed;font-family:monospace;overflow-wrap:anywhere;">${h.escape(site)}</div>
        </div>
      </a>
      <div style="display:flex;gap:10px;align-items:center;margin-top:18px;">
        <a href="${h.escape(url)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:600;color:#fff;background:#7c3aed;padding:9px 16px;border-radius:8px;text-decoration:none;">Open ↗</a>
        ${date ? `<span style="margin-left:auto;font-size:12px;color:#aaa;">saved ${h.escape(date)}</span>` : ''}
      </div>
    </div>`;
  }
};
