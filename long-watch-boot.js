/* PROJECT SIGNAL — THE LONG WATCH boot (≈1 KB, eager). Nothing else of the Long Watch loads until it is needed:
   the button press (or an idle-time prefetch after the first touch/hover) pulls in CSS + data + engine once. */
(() => {
  'use strict';
  const V = '20261128p1';
  const btn = document.getElementById('lw-launch'); if (!btn) return;
  let loading = null;
  const css = () => new Promise(res => { if (document.getElementById('lw-css')) return res(); const l = document.createElement('link'); l.id = 'lw-css'; l.rel = 'stylesheet'; l.href = 'long-watch.css?v=' + V; l.onload = l.onerror = res; document.head.appendChild(l); });
  const js = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src + '?v=' + V; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const load = () => loading || (loading = Promise.all([css(), Promise.all([js('long-watch-data.js'), js('long-watch-visuals.js')]).then(() => js('long-watch.js'))]).catch(e => { loading = null; throw e; }));
  window.__lwLoad = () => load(); // CONVERGENCE: echoes open a Long Watch entry directly
  const go = async () => {
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    try { await load(); window.LongWatch && window.LongWatch.open(); }
    catch { btn.querySelector('.ps-portal-text b:last-child').textContent = 'TRY AGAIN'; setTimeout(() => { btn.querySelector('.ps-portal-text b:last-child').textContent = 'LONG WATCH'; }, 2400); }
    finally { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
  };
  btn.addEventListener('click', () => { try { window.SignalAudio && window.SignalAudio.unlock(); } catch {} go(); });
  // warm the cache when intent is likely (finger down / hover), never on page load
  const warm = () => { (window.requestIdleCallback || setTimeout)(() => load().catch(() => {}), { timeout: 600 }); };
  btn.addEventListener('pointerenter', warm, { once: true, passive: true });
  btn.addEventListener('touchstart', warm, { once: true, passive: true });
  // deep link: #long-watch opens it once the power gate is done
  if (location.hash === '#long-watch') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    const start = () => go();
    if (document.getElementById('power-gate')) { addEventListener('pg:done', () => setTimeout(start, 450), { once: true }); setTimeout(() => dispatchEvent(new Event('ps:quickboot')), 60); }
    else setTimeout(start, 300);
  }
})();
