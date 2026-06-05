// Pod-local pane for wf:Tracker / ical:Vtodo (a task list).
// Loaded by the `--browser panes` data browser from /public/panes/.
// Contract: export default { canHandle(node, h) -> bool, render(node, h) -> htmlString }
// h = { escape, prop, propAll, idOf, types, host, fmtDate, localName }.

export default {
  canHandle(node, h) {
    return h.types(node).some(t => t === 'Tracker' || t === 'Vtodo');
  },

  render(node, h) {
    const issues = h.propAll(node, 'issue');
    const done = i => {
      const s = (i && (h.prop(i, 'status') || i.status)) || 'NEEDS-ACTION';
      return s === 'COMPLETED' || s === 'CANCELLED';
    };
    const active = issues.filter(i => !done(i));
    const title = h.prop(node, 'title') || 'Tasks';
    const row = i => `<li style="padding:8px 0;border-bottom:1px solid rgba(127,127,127,0.12);${done(i) ? 'color:#aaa;text-decoration:line-through;' : ''}">${done(i) ? '☑' : '☐'} ${h.escape(h.prop(i, 'summary') || h.idOf(i))}</li>`;
    return `<div style="font-family:Inter,-apple-system,sans-serif;padding:24px 0 8px;">
      <div style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#999;margin-bottom:6px;">Tasks</div>
      <div style="font-size:26px;font-weight:600;color:#1a1a1a;margin-bottom:4px;">${h.escape(title)}</div>
      <div style="font-size:13px;color:#888;margin-bottom:14px;">${active.length === 0 ? 'All clear.' : active.length + ' task' + (active.length === 1 ? '' : 's') + ' remaining.'}</div>
      <ul style="list-style:none;padding:0;margin:0;">${issues.map(row).join('')}</ul>
    </div>`;
  }
};
