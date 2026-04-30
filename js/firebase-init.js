import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  increment,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const cfg = window.LAYA_FIREBASE_CONFIG;

window.LAYA_FIREBASE = {
  ...(window.LAYA_FIREBASE || {}),
  ready: false,
  booting: true,
  mode: 'booting',
  error: '',
  projectId: cfg?.projectId || window.LAYA_FIREBASE?.projectId || ''
};

window.dispatchEvent(new CustomEvent('laya-firebase-booting', { detail: window.LAYA_FIREBASE }));

async function boot() {
  if (!cfg) {
    window.LAYA_FIREBASE = {
      ready: false,
      booting: false,
      mode: 'demo',
      error: 'missing_config',
      projectId: ''
    };
    window.dispatchEvent(new CustomEvent('laya-firebase-error', { detail: window.LAYA_FIREBASE }));
    return;
  }

  try {
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    let persistenceMode = 'local';
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (persistLocalErr) {
      try {
        await setPersistence(auth, browserSessionPersistence);
        persistenceMode = 'session';
      } catch (persistSessionErr) {
        await setPersistence(auth, inMemoryPersistence);
        persistenceMode = 'memory';
      }
    }
    const analytics = null;

    window.LAYA_FIREBASE = {
      ready: true,
      booting: false,
      mode: 'configured',
      app,
      auth,
      db,
      storage,
      analytics,
      config: cfg,
      projectId: cfg.projectId || '',
      persistenceMode,
      sdk: {
        onAuthStateChanged,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        deleteUser,
        updatePassword,
        EmailAuthProvider,
        reauthenticateWithCredential,
        doc,
        getDoc,
        getDocs,
        setDoc,
        updateDoc,
        deleteDoc,
        serverTimestamp,
        collection,
        collectionGroup,
        query,
        where,
        orderBy,
        onSnapshot,
        runTransaction,
        increment,
        limit,
        storageRef,
        uploadString,
        uploadBytes,
        getDownloadURL,
        deleteObject,
      }
    };

    window.dispatchEvent(new CustomEvent('laya-firebase-ready', { detail: window.LAYA_FIREBASE }));
  } catch (error) {
    console.error('Firebase boot failed:', error);

    window.LAYA_FIREBASE = {
      ready: false,
      booting: false,
      mode: 'config_error',
      error: error?.message || String(error),
      projectId: cfg?.projectId || ''
    };

    window.dispatchEvent(new CustomEvent('laya-firebase-error', { detail: window.LAYA_FIREBASE }));
  }
}

boot();
