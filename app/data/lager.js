// Velger lagring etter miljø: Firebase for test/prod, minnet for demo.
// Resten av appen importerer herfra og vet ikke hvilken som er i bruk.
import { MILJO } from '../config/app-config.js';

const modul = MILJO === 'demo'
  ? await import('./lager-minne.js')
  : await import('./lager-firebase.js');

export const { lager, innlogging, SLETT } = modul;
