// Firebase Web SDK-oppsett. API-nøkkelen ligger i api-nokkel.js, som ikke er i git:
// lokalt lages den fra api-nokkel.eksempel.js, ved deploy skrives den fra GitHub-secret
// FIREBASE_API_KEY (se OPPSETT.md §8). Nettleseren må uansett få nøkkelen, så den er
// synlig for den som åpner siden – derfor er den begrenset til våre domener i Google
// Cloud Console, og tilgangskontrollen ligger i firestore.rules.
// Samme Firebase-prosjekt som KorpsApp og Bestillingsportal, men egne navngitte databaser (se app-config.js).
import { API_NOKKEL } from './api-nokkel.js';

export const firebaseConfig = {
  apiKey: API_NOKKEL,
  authDomain: "skiensskolemusikk-b5cbc.firebaseapp.com",
  projectId: "skiensskolemusikk-b5cbc",
  storageBucket: "skiensskolemusikk-b5cbc.firebasestorage.app",
  messagingSenderId: "125188360972",
  appId: "1:125188360972:web:4d7c61a2155353e0b79729"
};
