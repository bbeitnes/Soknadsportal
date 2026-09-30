// Lagring og innlogging mot Firebase. Eneste fil som importerer Firebase.
// Samme grensesnitt som lager-minne.js (demo), se lager.js.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import {
  getFirestore, collection, doc, query, where, onSnapshot, getDoc, addDoc, updateDoc,
  deleteDoc, deleteField,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getBytes,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js';
import { firebaseConfig } from '../config/firebase-config.js';
import { DATABASE_ID, ORGANISASJON_ID, STORAGE_PREFIKS } from '../config/app-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, DATABASE_ID);
const storage = getStorage(app);

export const SLETT = Symbol('slett');

// Firestore svarer aldri hvis nettet er borte (skrivingen ligger og venter).
// Vi vil heller vise «Kunne ikke lagre» enn en evig «Lagrer …».
function medTidsfrist(lofte, ms = 15000) {
  return Promise.race([
    lofte,
    new Promise((_, avvis) => setTimeout(() => avvis(new Error('Ingen kontakt med serveren')), ms)),
  ]);
}

function tilFirestore(felt) {
  const ut = {};
  for (const [k, v] of Object.entries(felt)) ut[k] = v === SLETT ? deleteField() : v;
  return ut;
}

export const lager = {
  lytt(samling, tilbakekall, vedFeil) {
    const q = query(collection(db, samling), where('organisasjonId', '==', ORGANISASJON_ID));
    return onSnapshot(q,
      snap => tilbakekall(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      feil => vedFeil?.(feil));
  },
  async hent(samling, id) {
    const d = await getDoc(doc(db, samling, id));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  },
  async opprett(samling, data) {
    const d = await medTidsfrist(addDoc(collection(db, samling), { ...data, organisasjonId: ORGANISASJON_ID }));
    return d.id;
  },
  oppdater(samling, id, felt) {
    return medTidsfrist(updateDoc(doc(db, samling, id), tilFirestore(felt)));
  },
  slett(samling, id) {
    return medTidsfrist(deleteDoc(doc(db, samling, id)));
  },
  async lastOpp(delsti, fil) {
    const sti = `${STORAGE_PREFIKS}/${delsti}`;
    await medTidsfrist(uploadBytes(ref(storage, sti), fil, { contentType: fil.type }), 120000);
    return sti;
  },
  filUrl(sti) {
    return getDownloadURL(ref(storage, sti));
  },
  hentBytes(sti) {
    return medTidsfrist(getBytes(ref(storage, sti)), 120000);
  },
  slettFil(sti) {
    return deleteObject(ref(storage, sti)).catch(feil => {
      if (feil.code !== 'storage/object-not-found') throw feil;
    });
  },
};

const LENKE_EPOST = 'soknadsportal.innloggingsepost';

export const innlogging = {
  vedEndring(tilbakekall) {
    return onAuthStateChanged(auth, u => tilbakekall(u
      ? { epost: (u.email || '').toLowerCase(), navn: u.displayName || '', bekreftet: u.emailVerified }
      : null));
  },
  loggInnMedGoogle() {
    return signInWithPopup(auth, new GoogleAuthProvider());
  },
  async sendInnloggingslenke(epost) {
    const url = location.origin + location.pathname;
    await sendSignInLinkToEmail(auth, epost, { url, handleCodeInApp: true });
    localStorage.setItem(LENKE_EPOST, epost);
  },
  // Kalles ved oppstart. Er adressen en innloggingslenke, fullføres den.
  // Åpnes lenken i en annen nettleser enn den ble bestilt fra, må brukeren
  // skrive e-posten på nytt — da returneres 'trenger-epost'.
  async fullforLenke(epost) {
    if (!isSignInWithEmailLink(auth, location.href)) return 'ingen-lenke';
    const lagret = epost || localStorage.getItem(LENKE_EPOST);
    if (!lagret) return 'trenger-epost';
    await signInWithEmailLink(auth, lagret, location.href);
    localStorage.removeItem(LENKE_EPOST);
    history.replaceState(null, '', location.pathname + location.hash);
    return 'innlogget';
  },
  loggUt() {
    return signOut(auth);
  },
};
