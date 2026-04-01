import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  increment
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const cfg = window.LAYA_FIREBASE_CONFIG;

async function boot() {
  if (!cfg) {
    window.LAYA_FIREBASE = { ready: false, mode: 'demo', error: 'missing_config' };
    window.dispatchEvent(new CustomEvent('laya-firebase-error', { detail: window.LAYA_FIREBASE }));
    return;
  }

  try {
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    await setPersistence(auth, browserLocalPersistence);

    let analytics = null;
    try {
      const ok = await analyticsSupported();
      if (ok) analytics = getAnalytics(app);
    } catch (_) {}

    window.LAYA_FIREBASE = {
      ready: true,
      mode: 'configured',
      app,
      auth,
      db,
      storage,
      analytics,
      config: cfg,
      projectId: cfg.projectId || '',
      sdk: {
        onAuthStateChanged,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        deleteUser,
        doc,
        getDoc,
        setDoc,
        updateDoc,
        deleteDoc,
        serverTimestamp,
        collection,
        query,
        where,
        orderBy,
        onSnapshot,
        runTransaction,
        increment,
        storageRef,
        uploadString,
        uploadBytes,
        getDownloadURL,
      }
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
