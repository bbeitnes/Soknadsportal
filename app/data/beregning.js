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

// ——— Type (Instrument, Uniform, Utstyr …) ———
// Fritekst på behovet. I en søknad kan linjen overstyre typen, fordi
// kategoriene ofte følger giverens skjema. Tom overstyring = arv fra behovet.

export function linjetype(linje, behovliste) {
  const egen = (linje?.type || '').trim();
  if (egen) return egen;
  const b = linje?.behovId ? behovliste.find(x => x.id === linje.behovId) : null;
  return (b?.type || '').trim();
}

// Grupperer på type. Typene kommer i den manuelle rekkefølgen som er satt
// (dra og slipp); typer som ikke står der kommer etterpå, alfabetisk, med
// «uten type» helt til slutt.
export function grupperPerType(elementer, typeAv, rekkefolge = []) {
  const grupper = new Map();
  for (const e of elementer) {
    const t = (typeAv(e) || '').trim();
    if (!grupper.has(t)) grupper.set(t, []);
    grupper.get(t).push(e);
  }
  const plass = t => { const i = rekkefolge.indexOf(t); return i === -1 ? Infinity : i; };
  return [...grupper.entries()]
    .sort(([a], [b]) => plass(a) - plass(b) || (a === '') - (b === '') || a.localeCompare(b, 'nb'))
    .map(([type, elementer]) => ({ type, elementer }));
}

// Manuell rekkefølge først (de som har fått en), så resten alfabetisk.
export function etterRekkefolgeOgTittel(a, b) {
  return (a.rekkefolge ?? Infinity) - (b.rekkefolge ?? Infinity) || (a.tittel || '').localeCompare(b.tittel || '', 'nb');
}

// Flytter `kilde` til rett før eller etter `mal` i en liste (dra og slipp).
// Uten `mal` legges den først. Gir en ny liste.
export function flyttIListe(liste, kilde, mal, posisjon = 'for') {
  const ut = liste.filter(x => x !== kilde);
  if (mal == null || mal === kilde) { if (mal == null) ut.unshift(kilde); else return [...liste]; return ut; }
  const i = ut.indexOf(mal);
  if (i === -1) { ut.push(kilde); return ut; }
  ut.splice(posisjon === 'etter' ? i + 1 : i, 0, kilde);
  return ut;
}

// Typerekkefølgen i en søknad: søknadens egen først, så den felles fra
// behovslisten for typer søknaden ikke har plassert selv.
export function typerekkefolgeFor(soknad, felles = []) {
  const egen = soknad?.typeRekkefolge || [];
  return [...egen, ...felles.filter(t => !egen.includes(t))];
}

// Alle typer som er i bruk — forslag når man skriver i et typefelt.
export function typeliste(behovliste, soknader = []) {
  const typer = new Set();
  for (const b of behovliste) if ((b.type || '').trim()) typer.add(b.type.trim());
  for (const s of soknader) for (const l of Object.values(s.linjer || {})) if ((l.type || '').trim()) typer.add(l.type.trim());
  return [...typer].sort((a, b) => a.localeCompare(b, 'nb'));
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

// Innkjøpets linjer gruppert og ordnet slik de står i søknaden: samme
// typer, samme typerekkefølge og samme rekkefølge innenfor typen. Frie
// linjer (og linjer som er fjernet fra søknaden) kommer til slutt, uten type.
export function grupperInnkjopslinjer(innkjop, soknad, behovliste, typeRekkefolge = []) {
  const soknadslinjer = soknad?.linjer || {};
  const linjer = innkjopslinjer(innkjop).map(l => {
    const sl = l.soknadLinjeId ? soknadslinjer[l.soknadLinjeId] : null;
    return { linje: l, type: sl ? linjetype(sl, behovliste) : '', fri: sl ? 0 : 1, plass: sl ? (sl.rekkefolge ?? 0) : (l.rekkefolge ?? 0) };
  }).sort((a, b) => a.fri - b.fri || a.plass - b.plass);
  return grupperPerType(linjer, x => x.type, typeRekkefolge).map(g => ({ type: g.type, linjer: g.elementer.map(x => x.linje) }));
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

// ——— Fakturaer og revisjon ———
// En faktura hører til én søknad, får et løpenummer der, og kan dekke
// flere «poster»: valgte tilbudslinjer (innkjopId/linjeId) og løse
// utgifter (utgift/utgiftId). Avvik = fakturabeløp − tilbudt for postene.

export function fakturaliste(fakturaer, soknadId) {
  return fakturaer.filter(f => f.soknadId === soknadId).sort((a, b) => (a.lopenummer ?? 0) - (b.lopenummer ?? 0));
}

export function nesteLopenummer(fakturaer, soknadId) {
  return fakturaliste(fakturaer, soknadId).reduce((m, f) => Math.max(m, f.lopenummer ?? 0), 0) + 1;
}

// Alt potten er brukt på: valgte linjer i alle innkjøp + løse utgifter.
// `tittelFor(innkjop, linje)` og `levNavn(innkjop, sid)` gir tekstene,
// slik at beregningslaget slipper å kjenne søknaden og registeret.
export function revisjonsposter(soknad, innkjopListe, { tittelFor, levNavn }) {
  const poster = [];
  for (const i of innkjopListe) {
    const b = innkjopsberegning(i);
    for (const l of b.linjer) {
      const v = b.perLinje[l.id];
      if (v.valgtSid == null) continue;
      poster.push({
        id: `${i.id}/${l.id}`, type: 'linje', innkjopId: i.id, linjeId: l.id,
        tittel: `${Number(l.antall) || 0} × ${tittelFor(i, l)}`,
        under: `${levNavn(i, v.valgtSid)} · ${i.navn || 'Innkjøp'}`,
        tilbudt: v.sum,
      });
    }
  }
  for (const u of utgiftsliste(soknad)) {
    poster.push({ id: `utgift/${u.id}`, type: 'utgift', utgiftId: u.id, tittel: u.beskrivelse || 'Uten beskrivelse', under: `Løs utgift${u.dato ? ` · ${u.dato.split('-').reverse().join('.')}` : ''}`, tilbudt: Number(u.belop) || 0 });
  }
  return poster;
}

// Nøklene i `dekker` bruker «|» der post-ID-en har «/» (Firestore-feltstier
// kan ikke inneholde skråstrek).
export function fakturaDekker(faktura) {
  return Object.keys(faktura?.dekker || {}).map(k => k.replaceAll('|', '/'));
}

export function fakturaavvik(faktura, poster) {
  const ider = fakturaDekker(faktura);
  const tilbudt = ider.reduce((s, id) => s + (poster.find(p => p.id === id)?.tilbudt || 0), 0);
  return { tilbudt, avvik: ider.length ? (Number(faktura.belop) || 0) - tilbudt : 0, koblet: ider.length > 0 };
}

export function sumFakturert(fakturaer, soknadId) {
  return fakturaliste(fakturaer, soknadId).reduce((s, f) => s + (Number(f.belop) || 0), 0);
}

// Oppsummeringen øverst i Revisjon: hva som er fakturert, hva som mangler
// faktura, og hva som avviker fra tilbud.
export function revisjonsoppsummering(fakturaer, poster) {
  let manglerFaktura = 0;
  const perPost = {};
  for (const p of poster) {
    const fs = fakturaer.filter(f => fakturaDekker(f).includes(p.id));
    perPost[p.id] = fs.map(f => f.lopenummer);
    if (!fs.length) manglerFaktura++;
  }
  let avvikSum = 0, avvikAntall = 0, ikkeKoblet = 0;
  for (const f of fakturaer) {
    const a = fakturaavvik(f, poster);
    if (!a.koblet) ikkeKoblet++;
    else if (a.avvik) { avvikSum += a.avvik; avvikAntall++; }
  }
  return { fakturert: fakturaer.reduce((s, f) => s + (Number(f.belop) || 0), 0), manglerFaktura, avvikSum, avvikAntall, ikkeKoblet, perPost };
}

// ——— Import av behovsliste fra regneark ———
// Tekst limt inn fra Excel/Google Sheets er tabulatorseparert; CSV-filer
// bruker semikolon eller komma. Felt kan stå i hermetegn.

export function tolkTabell(tekst) {
  const t = String(tekst ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const forste = t.split('\n')[0] || '';
  const skille = forste.includes('\t') ? '\t' : (forste.split(';').length >= forste.split(',').length ? ';' : ',');
  const rader = [];
  let rad = [], felt = '', iHermetegn = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (iHermetegn) {
      if (c === '"' && t[i + 1] === '"') { felt += '"'; i++; }
      else if (c === '"') iHermetegn = false;
      else felt += c;
    } else if (c === '"' && felt === '') iHermetegn = true;
    else if (c === skille) { rad.push(felt.trim()); felt = ''; }
    else if (c === '\n') { rad.push(felt.trim()); rader.push(rad); rad = []; felt = ''; }
    else felt += c;
  }
  if (felt !== '' || rad.length) { rad.push(felt.trim()); rader.push(rad); }
  return rader.filter(r => r.some(c => c !== ''));
}

// Overskrifter vi kjenner igjen, per felt i behovet.
const IMPORTKOLONNER = {
  type: /^(type|kategori|gruppe)$/i,
  tittel: /^(tittel|navn|navn\/produkt|produkt|behov|vare)$/i,
  beskrivelse: /^(beskrivelse|spesifikasjon|spek|modell|notat|kommentar|detaljer)$/i,
  antall: /^(antall|stk|ant\.?|mengde)$/i,
  estPris: /^(est\.? ?(stk\.?|stykk)?pris|estimert (stk\.?|stykk)?pris|stykkpris|stk\.?pris|listepris|pris|enhetspris|pris per stk)$/i,
};

// Det importpanelet forteller brukeren. Holdes ved siden av mønstrene over,
// så beskrivelsen og det som faktisk gjenkjennes ikke sklir fra hverandre.
export const IMPORTFELT = [
  { navn: 'Type', paakrevd: false, overskrifter: ['Type', 'Kategori'], eksempel: 'Instrument', tomt: 'Uten type' },
  { navn: 'Tittel', paakrevd: true, overskrifter: ['Tittel', 'Navn', 'Navn/produkt', 'Produkt', 'Behov'], eksempel: 'Kornett', tomt: 'Raden hoppes over' },
  { navn: 'Beskrivelse', paakrevd: false, overskrifter: ['Beskrivelse', 'Spesifikasjon', 'Notat'], eksempel: 'Yamaha YCR2330III', tomt: 'Blir tom' },
  { navn: 'Antall', paakrevd: false, overskrifter: ['Antall', 'Stk'], eksempel: '6', tomt: 'Blir 1' },
  { navn: 'Est. stykkpris', paakrevd: false, overskrifter: ['Est. stykkpris', 'Stykkpris', 'Listepris', 'Pris'], eksempel: '13 539', tomt: 'Blir 0' },
];

function tilTall(tekst) {
  const renset = String(tekst ?? '').replace(/[\s ]/g, '').replace(/kr\.?|,-$/gi, '');
  if (renset === '') return null;
  // «13.539,50» og «13 539,5» → 13539.5; «13,539.50» tolkes ikke.
  const n = Number(renset.includes(',') ? renset.replace(/\./g, '').replace(',', '.') : renset.replace(/\.(?=\d{3}(\D|$))/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN;
}

// Gir { kolonner, harOverskrift, rader }. Uten gjenkjent overskrift antas
// rekkefølgen Type, Tittel, Beskrivelse, Antall, Est. stykkpris. Hver rad får
// status 'ny', 'finnes' (samme tittel og beskrivelse ligger der alt) eller
// 'ugyldig' (mangler tittel, eller ugyldig tall).
export function tolkBehovimport(tekst, eksisterende = []) {
  const tabell = tolkTabell(tekst);
  if (!tabell.length) return { kolonner: null, harOverskrift: false, rader: [] };
  const kolonner = {};
  tabell[0].forEach((celle, i) => {
    for (const [felt, monster] of Object.entries(IMPORTKOLONNER)) {
      if (kolonner[felt] == null && monster.test(celle.trim())) kolonner[felt] = i;
    }
  });
  const harOverskrift = kolonner.tittel != null;
  const kol = harOverskrift ? kolonner : { type: 0, tittel: 1, beskrivelse: 2, antall: 3, estPris: 4 };
  const nokkel = (t, b) => `${(t || '').trim().toLowerCase()}|${(b || '').trim().toLowerCase()}`;
  const finnes = new Set(eksisterende.map(b => nokkel(b.tittel, b.beskrivelse)));
  const sett = new Set();
  const rader = tabell.slice(harOverskrift ? 1 : 0).map(r => {
    const tittel = (r[kol.tittel] ?? '').trim();
    const type = kol.type != null ? (r[kol.type] ?? '').trim() : '';
    const beskrivelse = kol.beskrivelse != null ? (r[kol.beskrivelse] ?? '').trim() : '';
    const antall = kol.antall != null ? tilTall(r[kol.antall]) : null;
    const estPris = kol.estPris != null ? tilTall(r[kol.estPris]) : null;
    let status = 'ny', grunn = '';
    if (!tittel) { status = 'ugyldig'; grunn = 'mangler tittel'; }
    else if (Number.isNaN(antall)) { status = 'ugyldig'; grunn = 'ugyldig antall'; }
    else if (Number.isNaN(estPris)) { status = 'ugyldig'; grunn = 'ugyldig pris'; }
    else if (finnes.has(nokkel(tittel, beskrivelse))) { status = 'finnes'; grunn = 'finnes fra før'; }
    else if (sett.has(nokkel(tittel, beskrivelse))) { status = 'finnes'; grunn = 'står to ganger'; }
    if (status === 'ny') sett.add(nokkel(tittel, beskrivelse));
    return { type, tittel, beskrivelse, antall: antall ?? 1, estPris: estPris ?? 0, status, grunn };
  });
  return { kolonner: kol, harOverskrift, rader };
}
