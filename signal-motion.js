/* PROJECT SIGNAL — one motion permission for the whole site (PRISM). iOS asks once per page; a grant from the hub's
   TILT chip or Intel's tilt button is remembered here, so nothing asks twice. Readings are shared and rAF-throttled. */
(() => {
  'use strict';
  const D = window.DeviceOrientationEvent, subs = new Set(), last = { beta: 0, gamma: 0, t: 0 };
  let granted = !!D && typeof D.requestPermission !== 'function' && 'ontouchstart' in window, listening = false, pend = false;
  const flush = () => { pend = false; for (const f of subs) { try { f(last); } catch {} } };
  const on = e => { if (e.gamma == null) return; last.beta = e.beta || 0; last.gamma = e.gamma || 0; last.t = performance.now(); if (!pend) { pend = true; requestAnimationFrame(flush); } };
  const listen = () => { if (listening || !granted || !subs.size) return; listening = true; addEventListener('deviceorientation', on, { passive: true }); };
  const unlisten = () => { if (!listening || subs.size) return; listening = false; removeEventListener('deviceorientation', on); };
  window.PSMotion = {
    get supported() { return !!D && 'ontouchstart' in window; },
    get granted() { return granted; },
    get needsTap() { return !!D && typeof D.requestPermission === 'function' && !granted; },
    markGranted() { granted = true; listen(); },
    request() { if (granted) return Promise.resolve(true); if (!D || typeof D.requestPermission !== 'function') { granted = !!D; listen(); return Promise.resolve(granted); }
      return D.requestPermission().then(s => { granted = s === 'granted'; listen(); return granted; }).catch(() => false); },
    subscribe(f) { subs.add(f); listen(); return () => { subs.delete(f); unlisten(); }; },
    get last() { return last; },
  };
})();
