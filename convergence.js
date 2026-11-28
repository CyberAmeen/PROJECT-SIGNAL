/* PROJECT SIGNAL — CONVERGENCE coordinator (≈2 KB, eager).
   Opens an ECHO's target (Long Watch entry or Atlas dossier) and brings the user back to the exact Intel slide
   when they leave it. A "Back to transmission" chip stays available while they explore. */
(() => {
  'use strict';
  const KEY = 'ps-echo-return', TTL = 45 * 60e3;
  const read = () => { try { const r = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return r && Date.now() - r.t < TTL ? r : null; } catch { return null; } };
  const clear = () => { try { sessionStorage.removeItem(KEY); } catch {} };
  const atlasShell = document.getElementById('atlas-shell');
  let chip = null, toAtlasFromLW = false;
  function showChip(on) {
    if (on && !chip) {
      chip = document.createElement('button'); chip.type = 'button'; chip.className = 'ps-return';
      chip.innerHTML = '<span aria-hidden="true">◂</span> Back to transmission';
      chip.addEventListener('click', () => {
        if (window.LongWatch && window.LongWatch.isOpen) window.LongWatch.close({ fast: true });
        else if (atlasShell && !atlasShell.hidden) document.getElementById('atlas-exit')?.click();
      });
      document.body.appendChild(chip); requestAnimationFrame(() => chip && chip.classList.add('on'));
    } else if (!on && chip) { const c = chip; chip = null; c.classList.remove('on'); setTimeout(() => c.remove(), 300); }
  }
  function back() {
    const r = read(); clear(); showChip(false); if (!r) return;
    const I = window.__intel; if (!I) return;
    setTimeout(() => {
      try { I.openIntel(); const k = I.list.findIndex(c => c.id === r.id); I.go(k >= 0 ? k : Math.min(r.idx || 0, I.list.length - 1), true); } catch {}
    }, 60);
  }
  function openAtlasDossier(id) {
    const launch = document.getElementById('atlas-launch'); if (!launch || !atlasShell) return;
    launch.click(); const t0 = performance.now();
    const wait = () => {
      if (!atlasShell.hidden || performance.now() - t0 > 3000) {
        showChip(!!read());
        setTimeout(() => { try { window.__atlasAscension && window.__atlasAscension.skipBoot(); } catch {}
          setTimeout(() => { try { window.__atlasAscension && window.__atlasAscension.openDossier(id); } catch {} }, 420); }, 120);
      } else requestAnimationFrame(wait);
    };
    wait();
  }
  async function openLongWatchEntry(id, btn) {
    try { if (btn) btn.classList.add('is-loading'); await window.__lwLoad(); } catch { if (btn) btn.classList.remove('is-loading'); return; }
    if (btn) btn.classList.remove('is-loading');
    showChip(!!read());
    window.LongWatch && window.LongWatch.openEntry(id);
  }
  // leaving the destination returns to the slide; a Long Watch → Atlas hand-off keeps the return pending
  window.addEventListener('lw:closed', e => { if (!read()) return; if (e.detail && e.detail.toAtlas) { toAtlasFromLW = true; return; } back(); });
  if (atlasShell) new MutationObserver(() => {
    if (atlasShell.hidden) { if (read()) back(); toAtlasFromLW = false; }
    else if (read()) showChip(true);
  }).observe(atlasShell, { attributes: true, attributeFilter: ['hidden'] });
  // a fresh visit to Intel from the hub abandons an old return
  ['open-stream', 'nav-stream'].forEach(id => document.getElementById(id)?.addEventListener('click', () => { clear(); showChip(false); }));
  window.PSConvergence = { openAtlasDossier, openLongWatchEntry, get pendingReturn() { return read(); } };
})();
