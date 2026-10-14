/* Camada de nuvem: login Google + Firestore com cache offline.
   Usa uma instância própria do Firebase ("diario-treino") para não dividir cache nem sessão
   com o app Gasto Mensal, que roda no mesmo endereço e no mesmo projeto. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  doc, collection, setDoc, getDoc, getDocs, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, RAIZ } from './firebase-config.js';

const app = initializeApp(firebaseConfig, 'diario-treino');
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  db = initializeFirestore(app, { localCache: memoryLocalCache() });
}

let pendentes = 0;
let ultimoErro = null;
function avisarEstado() {
  window.dispatchEvent(new CustomEvent('nuvem-estado', { detail: { pendentes, erro: ultimoErro } }));
}
function caminho(uid, rel) { return RAIZ + '/' + uid + '/' + rel; }
function limpar(o) { return JSON.parse(JSON.stringify(o)); } // Firestore não aceita undefined

const Nuvem = {
  usuario() {
    const u = auth.currentUser;
    return u ? { uid: u.uid, email: u.email, verificado: u.emailVerified } : null;
  },

  async entrar() {
    const prov = new GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, prov);
    } catch (e) {
      const usarRedirect = ['auth/popup-blocked', 'auth/operation-not-supported-in-environment', 'auth/web-storage-unsupported'];
      if (usarRedirect.indexOf(e.code) >= 0) return signInWithRedirect(auth, prov);
      throw e;
    }
  },

  sair() { return signOut(auth); },

  gravar(uid, rel, dados) {
    pendentes++; avisarEstado();
    return setDoc(doc(db, caminho(uid, rel)), limpar(dados))
      .then(() => { pendentes = Math.max(0, pendentes - 1); ultimoErro = null; avisarEstado(); })
      .catch((e) => { pendentes = Math.max(0, pendentes - 1); ultimoErro = e.code || String(e); avisarEstado(); throw e; });
  },

  /* Leitura completa (usada na primeira vinculação, que exige internet). */
  async lerTudo(uid) {
    const [cfg, prefs, sess, pes, live] = await Promise.all([
      getDoc(doc(db, caminho(uid, 'config/main'))),
      getDoc(doc(db, caminho(uid, 'config/prefs'))),
      getDocs(collection(db, caminho(uid, 'sessions'))),
      getDocs(collection(db, caminho(uid, 'weights'))),
      getDoc(doc(db, caminho(uid, 'live/current')))
    ]);
    return {
      config: cfg.exists() ? cfg.data() : null,
      prefs: prefs.exists() ? prefs.data() : null,
      sessions: sess.docs.map((d) => d.data()),
      weights: pes.docs.map((d) => d.data()),
      live: live.exists() ? live.data() : null
    };
  },

  /* Escuta contínua. h = { config, prefs, sessions, weights, live, erro } */
  escutar(uid, h) {
    const err = (e) => h.erro && h.erro(e);
    const subs = [
      onSnapshot(doc(db, caminho(uid, 'config/main')), (s) => h.config(s.exists() ? s.data() : null), err),
      onSnapshot(doc(db, caminho(uid, 'config/prefs')), (s) => h.prefs(s.exists() ? s.data() : null), err),
      onSnapshot(collection(db, caminho(uid, 'sessions')), (s) => h.sessions(s.docs.map((d) => d.data())), err),
      onSnapshot(collection(db, caminho(uid, 'weights')), (s) => h.weights(s.docs.map((d) => d.data())), err),
      onSnapshot(doc(db, caminho(uid, 'live/current')), (s) => h.live(s.exists() ? s.data() : null), err)
    ];
    return () => subs.forEach((f) => f());
  }
};

window.Nuvem = Nuvem;
getRedirectResult(auth).catch((e) => {
  window.dispatchEvent(new CustomEvent('nuvem-erro-login', { detail: { codigo: e.code || String(e) } }));
});
onAuthStateChanged(auth, (u) => {
  window.dispatchEvent(new CustomEvent('nuvem-usuario', { detail: u ? { uid: u.uid, email: u.email, verificado: u.emailVerified } : null }));
});
window.dispatchEvent(new CustomEvent('nuvem-pronta'));
