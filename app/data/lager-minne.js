// Demo-lagring i minnet: samme grensesnitt som lager-firebase.js, men uten
// nett og innlogging. Brukes bare på localhost med ?demo, for å prøve
// skjermbildene. Alt forsvinner ved omlasting.
//
// Feil kan simuleres fra konsollen: `demoFeil = true` får neste lagringer
// til å feile, så feilmeldingen og «Prøv igjen» kan testes.
import { ORGANISASJON_ID } from '../config/app-config.js';
import { lagDemodata } from './demodata.js';

export const SLETT = Symbol('slett');

const data = lagDemodata();
const lyttere = {};
const filer = new Map();
let teller = 1000;

const vent = ms => new Promise(r => setTimeout(r, ms));
const kopi = x => structuredClone(x);

function varsle(samling) {
  const liste = Object.entries(data[samling] || {}).map(([id, d]) => ({ id, ...kopi(d) }));
  (lyttere[samling] || []).forEach(cb => cb(liste));
}

async function skriv(samling, endring) {
  await vent(250);
  if (window.demoFeil) throw new Error('Simulert feil (demoFeil = true)');
  endring(data[samling] ||= {});
  varsle(samling);
}

// «linjer.l1.antall» → nøstet oppdatering, som Firestore sin updateDoc.
function settSti(obj, sti, verdi) {
  const deler = sti.split('.');
  let o = obj;
  for (const d of deler.slice(0, -1)) o = (o[d] ||= {});
  const siste = deler.at(-1);
  if (verdi === SLETT) delete o[siste];
  else o[siste] = kopi(verdi);
}

export const lager = {
  lytt(samling, tilbakekall) {
    (lyttere[samling] ||= []).push(tilbakekall);
    setTimeout(() => varsle(samling), 0);
    return () => { lyttere[samling] = lyttere[samling].filter(x => x !== tilbakekall); };
  },
  async hent(samling, id) {
    const d = data[samling]?.[id];
    return d ? { id, ...kopi(d) } : null;
  },
  async opprett(samling, innhold) {
    const id = `demo${teller++}`;
    await skriv(samling, s => { s[id] = { ...kopi(innhold), organisasjonId: ORGANISASJON_ID }; });
    return id;
  },
  sett(samling, id, innhold) {
    return skriv(samling, s => { s[id] = { ...kopi(innhold), organisasjonId: ORGANISASJON_ID }; });
  },
  oppdater(samling, id, felt) {
    return skriv(samling, s => {
      if (!s[id]) throw new Error('Dokumentet finnes ikke');
      for (const [k, v] of Object.entries(felt)) settSti(s[id], k, v);
    });
  },
  flett(samling, id, felt) {
    return skriv(samling, s => { s[id] = { ...(s[id] || {}), ...kopi(felt), organisasjonId: ORGANISASJON_ID }; });
  },
  slett(samling, id) {
    return skriv(samling, s => { delete s[id]; });
  },
  async lastOpp(delsti, fil) {
    await vent(400);
    if (window.demoFeil) throw new Error('Simulert feil (demoFeil = true)');
    filer.set(delsti, URL.createObjectURL(fil));
    return delsti;
  },
  async filUrl(sti) {
    return filer.get(sti) || 'data:text/plain;charset=utf-8,' + encodeURIComponent('Demofil: ' + sti);
  },
  async hentBytes(sti) {
    const url = filer.get(sti);
    if (!url) throw new Error('Demofilen finnes ikke: ' + sti);
    return (await fetch(url)).arrayBuffer();
  },
  async slettFil(sti) {
    filer.delete(sti);
  },
};

const demobruker = { epost: 'kari@korpset.no', navn: 'Kari Nordmann', bekreftet: true };

export const innlogging = {
  vedEndring(tilbakekall) {
    setTimeout(() => tilbakekall(demobruker), 0);
    return () => {};
  },
  async loggInnMedGoogle() {},
  // Demo sender aldri e-post. Svaret 'demo' lar siden si fra om det.
  async sendInnloggingslenke() {
    await vent(300);
    if (window.demoFeil) throw new Error('Simulert feil (demoFeil = true)');
    return 'demo';
  },
  async fullforLenke() { return 'ingen-lenke'; },
  async loggUt() { location.reload(); },
};
