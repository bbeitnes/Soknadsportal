// Miljøvalg. Samme kode deployes til to mapper (…/Soknadsportal og
// …/Soknadsportal-test). Miljøet avgjøres av URL-en:
//   - «-test» i stien          → testdatabasen
//   - ?demo på localhost        → data i minnet, ingen innlogging (for utvikling)
//   - ellers                    → prod
const sti = decodeURIComponent(location.pathname).toLowerCase();
const erLokal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export const MILJO = erLokal && new URLSearchParams(location.search).has('demo')
  ? 'demo'
  : (sti.includes('-test') || erLokal ? 'test' : 'prod');

// Navngitte Firestore-databaser i Firebase-prosjektet. Opprettes én gang i
// Firebase Console (Firestore → Create database → Database ID).
export const DATABASE_ID = MILJO === 'prod' ? 'soknadsportal' : 'soknadsportal-test';

// Storage har ikke navngitte bøtter; test og prod skilles med stiprefiks.
export const STORAGE_PREFIKS = `soknadsportal/${MILJO === 'prod' ? 'prod' : 'test'}`;

// Én organisasjon i dag. Feltet ligger likevel på alle dokumenter.
export const ORGANISASJON_ID = 'skiens-skolemusikk';

export const APPNAVN = MILJO === 'prod' ? 'Søknadsportal' : `Søknadsportal (${MILJO.toUpperCase()})`;
