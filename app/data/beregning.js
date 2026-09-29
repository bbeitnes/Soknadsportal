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

// ——— Momskompensasjon ———
// Noen givere krever at forventet momskompensasjon trekkes ut: koster varen
// 1 000 kr og prosenten er 8, dekker giveren 920 kr og momskompensasjonen
// (som kommer året etter) 80 kr. Prosenten ligger på søknaden (arvet fra
// giveren, kan justeres). null = giveren har ikke innstillingen.

export function momsProsent(soknad) {
  const p = soknad?.momsProsent;
  return p == null ? null : Number(p) || 0;
}

export function harMoms(soknad) {
  return momsProsent(soknad) != null;
}

// Giverens andel av et beløp. Uten moms-innstilling: hele beløpet.
export function giverandel(belop, prosent) {
  if (prosent == null) return Math.round(belop);
  return Math.round(belop * (100 - prosent) / 100);
}

// Foreslått søkt beløp: giverens andel av estimatet.
export function soktForslag(soknad) {
  return giverandel(sumEstimert(soknad), momsProsent(soknad));
}

// Søkt beløp: overstyrt verdi hvis satt, ellers forslaget.
export function soktBelop(soknad) {
  return soknad?.soktOverstyrt ?? soktForslag(soknad);
}

// ——— Løse utgifter og pott ———

export function utgiftsliste(soknad) {
  return Object.entries(soknad?.utgifter || {})
    .map(([id, u]) => ({ id, ...u }))
    .sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0));
}

export function sumUtgifter(soknad) {
  return utgiftsliste(soknad).reduce((sum, u) => sum + (Number(u.belop) || 0), 0);
}

export function erInnvilget(soknad) {
  return soknad?.status === 'innvilget' || soknad?.status === 'avsluttet';
}

// Potten: innvilget beløp, hva som er disponert (valgt i alle innkjøp +
// løse utgifter) og hva som gjenstår. Med moms-innstilling er «disponert»
// giverens andel av det vi faktisk betaler; resten dekkes av
// momskompensasjonen neste år.
export function pott(soknad, innkjopListe = []) {
  const prosent = momsProsent(soknad);
  const innvilget = soknad?.innvilget ?? null;
  const innkjop = innkjopListe.reduce((sum, i) => sum + sumInnkjop(i), 0);
  const disponertFull = sumUtgifter(soknad) + innkjop;
  const disponert = giverandel(disponertFull, prosent);
  return {
    harMoms: prosent != null,
    prosent,
    giverProsent: prosent == null ? 100 : 100 - prosent,
    sokt: soktBelop(soknad),
    innvilget,
    disponertFull,
    innkjop,
    utgifter: sumUtgifter(soknad),
    disponert,
    moms: disponertFull - disponert,
    gjenstar: innvilget == null ? null : innvilget - disponert,
  };
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

export function nesteUtgiftsrekkefolge(soknad) {
  return utgiftsliste(soknad).reduce((m, u) => Math.max(m, u.rekkefolge ?? 0), 0) + 1;
}

// ——— Innkjøp med tilbud (tilbudsmatrisen) ———
// Et innkjøp hører til én søknad og har linjer (fra søknadens behov eller
// fritekst), leverandører og priser. Alt ligger i ett dokument i samlingen
// `innkjop`:
//   linjer:       { lid: { soknadLinjeId, tittel, antall, rekkefolge } }
//   leverandorer: { sid: { navn, kontakt, frakt, rekkefolge, vedlegg: { vid: {…} } } }
//   priser:       { lid: { sid: { raa: '1200 -15%', vedleggId, side } } }
//   valgt:        { lid: sid }

export const INNKJOPSSTATUSER = [
  { id: 'innhenter', navn: 'Innhenter tilbud' },
  { id: 'valgt', navn: 'Valgt' },
  { id: 'fakturert', navn: 'Fakturert' },
];

export function innkjopsstatusNavn(id) {
  return (INNKJOPSSTATUSER.find(s => s.id === id) || INNKJOPSSTATUSER[0]).navn;
}

const etterRekkefolge = (a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0);

export function innkjopslinjer(innkjop) {
  return Object.entries(innkjop?.linjer || {}).map(([id, l]) => ({ id, ...l })).sort(etterRekkefolge);
}

export function leverandorer(innkjop) {
  return Object.entries(innkjop?.leverandorer || {}).map(([id, s]) => ({ id, ...s })).sort(etterRekkefolge);
}

export function vedleggsliste(leverandor) {
  return Object.entries(leverandor?.vedlegg || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.tid || 0) - (b.tid || 0));
}

// Prisen i en celle er alltid STYKKPRIS. «1200» = vår pris. Listepris med
// rabatt skrives «1200 -15%» eller «1200 -180» — begge gir netto 1 020.
// Gir null når cellen er tom eller ikke kan tolkes (= ikke gitt pris).
export function tolkPris(raa) {
  // Regneark limer gjerne inn «kr 1 200,00» — vi ser bort fra «kr».
  const s = String(raa ?? '').replace(/\bkr\.?/gi, '').trim();
  if (!s) return null;
  const m = s.match(/^(\d[\d\s .]*(?:,\d+)?)(?:\s*[-−]\s*(\d+(?:[.,]\d+)?)\s*(%?))?$/);
  if (!m) return null;
  const liste = parseFloat(m[1].replace(/[\s .]/g, '').replace(',', '.'));
  if (!Number.isFinite(liste)) return null;
  let netto = liste, under = 'vår pris';
  if (m[2]) {
    const rabatt = parseFloat(m[2].replace(',', '.'));
    if (m[3]) { netto = liste * (1 - rabatt / 100); under = `Liste ${kr(liste)} −${m[2]} %`; }
    else { netto = liste - rabatt; under = `Liste ${kr(liste)} −${kr(rabatt)}`; }
  }
  return { liste, netto: Math.round(netto * 100) / 100, under };
}

// Tusenskille i undertekstene — samme som ui/format.js, gjentatt her så
// beregningslaget ikke avhenger av UI-laget.
function kr(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Alt matrisen trenger for å tegnes: netto per celle, valgt per linje,
// «alt hos én» per leverandør, og den reelle totalen for valgt kombinasjon
// (frakt telles bare for leverandører der minst én linje er valgt).
export function innkjopsberegning(innkjop) {
  const linjer = innkjopslinjer(innkjop);
  const lev = leverandorer(innkjop);
  const priser = innkjop?.priser || {};
  const valgt = innkjop?.valgt || {};
  const celle = {};
  for (const l of linjer) {
    celle[l.id] = {};
    for (const s of lev) celle[l.id][s.id] = tolkPris(priser[l.id]?.[s.id]?.raa);
  }

  let sumValgt = 0;
  const brukt = new Set();
  const perLinje = {};
  for (const l of linjer) {
    const sid = valgt[l.id];
    const p = sid ? celle[l.id][sid] : null;
    const antall = Number(l.antall) || 0;
    perLinje[l.id] = { valgtSid: p ? sid : null, sum: p ? antall * p.netto : null };
    if (p) { sumValgt += antall * p.netto; brukt.add(sid); }
  }
  let frakt = 0;
  const perLeverandor = {};
  for (const s of lev) {
    const fraktS = Number(s.frakt) || 0;
    if (brukt.has(s.id)) frakt += fraktS;
    let total = fraktS, mangler = 0;
    for (const l of linjer) {
      const p = celle[l.id][s.id];
      if (p) total += (Number(l.antall) || 0) * p.netto; else mangler++;
    }
    perLeverandor[s.id] = { total, mangler, brukt: brukt.has(s.id) };
  }
  return {
    linjer, leverandorer: lev, celle, perLinje, perLeverandor,
    sumValgt, frakt, total: sumValgt + frakt, brukt,
  };
}

export function sumInnkjop(innkjop) {
  return innkjopsberegning(innkjop).total;
}

// Billigst per linje: laveste netto stykkpris blant leverandørene som har
// gitt pris. Gir nytt valgt-kart (linjer uten pris beholder valget sitt).
export function billigstPerLinje(innkjop) {
  const b = innkjopsberegning(innkjop);
  const ut = { ...(innkjop.valgt || {}) };
  for (const l of b.linjer) {
    let best = null;
    for (const s of b.leverandorer) {
      const p = b.celle[l.id][s.id];
      if (p && (!best || p.netto < best.netto)) best = { netto: p.netto, sid: s.id };
    }
    if (best) ut[l.id] = best.sid;
  }
  return ut;
}

// Innliming fra Excel: tabulatorseparerte kolonner, én linje per rad.
export function tolkRutenett(tekst) {
  return String(tekst ?? '').replace(/\r/g, '').split('\n')
    .filter(r => r.trim() !== '')
    .map(r => r.split('\t').map(c => c.trim()));
}

// Søknadslinjer som ennå ikke ligger i noe innkjøp («ikke fordelt»).
export function ikkeFordelte(soknad, innkjopListe) {
  const fordelt = new Set();
  for (const i of innkjopListe) for (const l of innkjopslinjer(i)) if (l.soknadLinjeId) fordelt.add(l.soknadLinjeId);
  return linjeliste(soknad).filter(l => !fordelt.has(l.id));
}

export function nesteRekkefolgeI(kart) {
  return Object.values(kart || {}).reduce((m, x) => Math.max(m, x.rekkefolge ?? 0), 0) + 1;
}

// ——— Leverandørregister ———
// Leverandørene i et innkjøp peker på registeret (leverandorId) og har
// bare det som er spesifikt for innkjøpet: frakt og vedlegg. Eldre
// innkjøp uten leverandorId har navn og kontakt på seg selv.
export function leverandorNavn(lev, register) {
  const r = lev?.leverandorId ? register.find(x => x.id === lev.leverandorId) : null;
  return (r ? r.navn : lev?.navn) || '';
}

export function leverandorKontakt(lev, register) {
  const r = lev?.leverandorId ? register.find(x => x.id === lev.leverandorId) : null;
  return (r ? r.kontakt : lev?.kontakt) || '';
}

// Innkjøp der en registerleverandør er brukt.
export function innkjopMedLeverandor(leverandorId, innkjopListe) {
  return innkjopListe.filter(i => leverandorer(i).some(l => l.leverandorId === leverandorId));
}
