import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';

const cfg = window.LAYA_FIREBASE_CONFIG;

async function boot() {
  if (!cfg) {
    window.LAYA_FIREBASE = { ready: false, mode: 'demo', error: 'missing_config' };
    window.dispatchEvent(new CustomEvent('laya-firebase-error', { detail: window.LAYA_FIREBASE }));
    return;
  }

  try {
    const app = initializeApp(cfg);
    let analytics = null;
    try {
      const ok = await analyticsSupported();
      if (ok) analytics = getAnalytics(app);
    } catch (_) {}

    window.LAYA_FIREBASE = {
      ready: true,
      mode: 'configured',
      app,
      analytics,
      config: cfg,
      projectId: cfg.projectId || ''
    };
    window.dispatchEvent(new CustomEvent('laya-firebase-ready', { detail: window.LAYA_FIREBASE }));
  } catch (error) {
    window.LAYA_FIREBASE = {
      ready: false,
      mode: 'config_error',
      error: error?.message || String(error)
    };
    window.dispatchEvent(new CustomEvent('laya-firebase-error', { detail: window.LAYA_FIREBASE }));
  }
}

boot();
