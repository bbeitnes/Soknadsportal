// Alle utregninger for behov og søknader. Rene funksjoner: tar data inn,
// gir tall ut, rører aldri Firebase eller DOM. Testes i test/beregning.test.js.

export const SOKNADSSTATUSER = [
  { id: 'utkast', navn: 'Utkast' },
  { id: 'sendt', navn: 'Sendt' },
  { id: 'innvilget', navn: 'Innvilget' },
  { id: 'avslatt', navn: 'Avslått' },
  { id: 'avsluttet', navn: 'Avsluttet' },
];

export function statusNavn(id) {
  return (SOKNADSSTATUSER.find(s => s.id === id) || SOKNADSSTATUSER[0]).navn;
}

// Søknadens linjer ligger som et kart (id → linje) slik at hvert felt kan
// lagres for seg. Her blir de en sortert liste.
export function linjeliste(soknad) {
  return Object.entries(soknad?.linjer || {})
    .map(([id, l]) => ({ id, ...l }))
    .sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0));
}

export function linjekostnad(linje) {
  return (Number(linje.antall) || 0) * (Number(linje.estPris) || 0);
}

export function sumEstimert(soknad) {
  return linjeliste(soknad).reduce((sum, l) => sum + linjekostnad(l), 0);
}

// Søkt beløp: overstyrt verdi hvis satt, ellers summen av estimatene.
// (Momskompensasjon trekkes fra i trinn b.)
export function soktBelop(soknad) {
  return soknad?.soktOverstyrt ?? sumEstimert(soknad);
}

// Hvor et behov er brukt: én oppføring per søknadslinje som peker på det.
export function behovIBruk(behovId, soknader) {
  const bruk = [];
  for (const s of soknader) {
    for (const l of linjeliste(s)) {
      if (l.behovId === behovId) bruk.push({ soknad: s, linje: l });
    }
  }
  return bruk;
}

// Avslåtte søknader teller ikke som «søkt» eller «finansiert» — behovet
// er da like åpent som før. De vises fortsatt i lista over søknader.
function tellerMed(soknad) {
  return soknad.status !== 'avslatt';
}

function erFinansiert(soknad, linje) {
  return (soknad.status === 'innvilget' || soknad.status === 'avsluttet') && !!linje.finansieres;
}

// Status for ett behov. `anskaffet` summeres fra fakturerte innkjøp
// (trinn c/d) — fram til da er den 0.
export function behovsinfo(behov, soknader, anskaffet = 0) {
  const total = Number(behov.antall) || 0;
  const gjenstar = Math.max(0, total - anskaffet);
  const bruk = behovIBruk(behov.id, soknader);
  const aktiv = bruk.filter(b => tellerMed(b.soknad));
  const iSoknader = aktiv.reduce((sum, b) => sum + (Number(b.linje.antall) || 0), 0);

  let autostatus;
  if (gjenstar === 0) autostatus = 'Anskaffet';
  else if (anskaffet > 0) autostatus = 'Delvis anskaffet';
  else if (aktiv.some(b => erFinansiert(b.soknad, b.linje))) autostatus = 'Finansiert';
  else if (aktiv.length) autostatus = 'Søkt';
  else autostatus = 'Ikke søkt';

  const overstyrt = behov.statusOverstyring === 'trengs-ikke' ? 'Trengs ikke'
    : behov.statusOverstyring === 'anskaffet' ? 'Anskaffet' : null;

  return {
    total, anskaffet, gjenstar, iSoknader, bruk,
    autostatus,
    status: overstyrt || autostatus,
    overstyrt: !!overstyrt,
    erApent: !overstyrt && gjenstar > 0,
    gjenstarKr: gjenstar * (Number(behov.estPris) || 0),
    finansiertI: b => erFinansiert(b.soknad, b.linje),
  };
}

// Behov som kan velges i en søknad: åpne, og ikke allerede med i den.
export function velgbareBehov(behovliste, soknader, soknad) {
  const iSoknaden = new Set(linjeliste(soknad).map(l => l.behovId).filter(Boolean));
  return behovliste
    .map(b => ({ behov: b, info: behovsinfo(b, soknader) }))
    .filter(x => x.info.erApent && !iSoknaden.has(x.behov.id));
}

export const SOKNADSFILTRE = {
  aktive: s => ['utkast', 'sendt', 'innvilget'].includes(s.status),
  innvilget: s => s.status === 'innvilget',
  venter: s => s.status === 'utkast' || s.status === 'sendt',
  lukket: s => s.status === 'avsluttet' || s.status === 'avslatt',
  alle: () => true,
};

export function nesteRekkefolge(soknad) {
  return linjeliste(soknad).reduce((m, l) => Math.max(m, l.rekkefolge ?? 0), 0) + 1;
}
