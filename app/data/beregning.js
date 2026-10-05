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

// Typen til en innkjøpslinje: den linjen har i søknaden, eller – for en fri
// linje som bare ligger i innkjøpet – typen som er satt på linjen selv.
export function innkjopslinjetype(linje, soknad, behovliste) {
  const sl = linje?.soknadLinjeId ? soknad?.linjer?.[linje.soknadLinjeId] : null;
  return sl ? linjetype(sl, behovliste) : (linje?.type || '').trim();
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
export function typeliste(behovliste, soknader = [], innkjopListe = []) {
  const typer = new Set();
  for (const b of behovliste) if ((b.type || '').trim()) typer.add(b.type.trim());
  for (const s of soknader) for (const l of [...Object.values(s.linjer || {}), ...Object.values(s.utgifter || {})]) if ((l.type || '').trim()) typer.add(l.type.trim());
  for (const i of innkjopListe) for (const l of Object.values(i.linjer || {})) if ((l.type || '').trim()) typer.add(l.type.trim());
  return [...typer].sort((a, b) => a.localeCompare(b, 'nb'));
}

export function linjekostnad(linje) {
  return (Number(linje.antall) || 0) * (Number(linje.estPris) || 0);
}

// ——— Lagt til etter søknaden ———
// Behovet kan endre seg etter at søknaden er sendt (trombone i stedet for
// klarinett), og vi kjøper av og til ting som ikke sto på lista. Linjer som
// legges til da merkes `etterSoknad` og kan ha et `notat`. De teller ikke i
// det vi søkte om, men går inn i innkjøp, pott og revisjon som alle andre.

export function soktLinjer(soknad) {
  return linjeliste(soknad).filter(l => !l.etterSoknad);
}

export function tilleggslinjer(soknad) {
  return linjeliste(soknad).filter(l => l.etterSoknad);
}

// Estimatet for det vi søkte om — uten linjer lagt til etter søknaden.
export function sumEstimert(soknad) {
  return soktLinjer(soknad).reduce((sum, l) => sum + linjekostnad(l), 0);
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

// Samme med øre – for faktiske beløp i sluttoppgjøret.
export function giverandelOre(belop, prosent) {
  return Math.round(belop * (100 - (prosent ?? 0))) / 100;
}

// Foreslått søkt beløp: giverens andel av estimatet, etter egenandelen.
export function soktForslag(soknad) {
  return giverbehov(soknad, egenandelPlanlagt(soknad));
}

// Søkt beløp: overstyrt verdi hvis satt, ellers forslaget.
export function soktBelop(soknad) {
  return soknad?.soktOverstyrt ?? soktForslag(soknad);
}

// ——— Egne midler og egenandel ———
// Egne midler føres på det vi kjøper: `egneMidler` på innkjøpslinjen (settes
// i Innkjøp når prisen er valgt) eller på en løs utgift. Det er en beslutning
// vi tar mens vi handler: tenorsaksofonen koster 50 580, vi dekker 40 000
// selv, og søknaden belastes med 10 580. Egne midler trekkes fra før giverens
// andel regnes ut (vi får ikke momskompensasjon fra oss selv).
//
// `egenandel` på søknaden er noe annet: det vi eventuelt har LOVET giveren å
// dekke selv. Den trekkes fra foreslått søkt beløp og er det vi måler de
// fordelte egne midlene mot. Blir innvilget beløp et annet enn søkt, velger
// vi (`egenandelValg`) om vi holder på beløpet ('belop', standard) eller på
// andelen ('andel': egenandelen følger innvilget/søkt).
//
// Rammen for bruken er alltid tilskudd + egne midler (se pott()). Er det satt
// en egenandel på søknaden, er det DEN som er egne midler, og beløpene på
// varene viser bare hvor den går. Uten egenandel på søknaden er egne midler
// summen av det som ligger på varene.

export function egenandelPlanlagt(soknad) {
  return Number(soknad?.egenandel) || 0;
}

// Egenandelen hvis vi holder på andelen etter tildeling.
export function egenandelSomAndel(soknad) {
  const sokt = soktBelop(soknad), innvilget = soknad?.innvilget;
  if (innvilget == null || !(sokt > 0)) return egenandelPlanlagt(soknad);
  return Math.round(egenandelPlanlagt(soknad) * innvilget / sokt);
}

// Egenandelen som gjelder nå.
export function egenandel(soknad) {
  return soknad?.egenandelValg === 'andel' ? egenandelSomAndel(soknad) : egenandelPlanlagt(soknad);
}

// Det giveren må dekke for at estimatet skal gå opp med en gitt egenandel.
export function giverbehov(soknad, egen = egenandel(soknad)) {
  return giverandel(Math.max(0, sumEstimert(soknad) - egen), momsProsent(soknad));
}

// ——— Utgifter og pott ———
// En utgift er enten planlagt eller løs. Planlagt = den peker på en fri linje
// i søknaden (`soknadLinjeId`): da hentes beskrivelse og type fra linjen
// (lagres ikke på utgiften), `planlagt` er satt og `sokt` er estimatet vi
// søkte om. Har linjen ingen type, gjelder utgiftens egen (`linjetype` er
// linjens). Beløpet på utgiften er det faktiske. Planlagte står først, i
// søknadens linjerekkefølge; de løse i den rekkefølgen de ble lagt inn.

export function utgiftsliste(soknad) {
  const plass = new Map(linjeliste(soknad).map((l, i) => [l.id, i]));
  return Object.entries(soknad?.utgifter || {})
    .map(([id, u]) => {
      const l = u.soknadLinjeId ? soknad.linjer?.[u.soknadLinjeId] : null;
      return l ? { id, ...u, beskrivelse: l.tittel || '', type: l.type || u.type || null, linjetype: l.type || null, planlagt: true, sokt: linjekostnad(l) } : { id, ...u };
    })
    .sort((a, b) => (b.planlagt ? 1 : 0) - (a.planlagt ? 1 : 0)
      || (a.planlagt ? plass.get(a.soknadLinjeId) - plass.get(b.soknadLinjeId) : 0)
      || (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0));
}

// Søknadslinjene som er ført som utgift (linje-id-er).
export function linjerMedUtgift(soknad) {
  return new Set(Object.values(soknad?.utgifter || {}).map(u => u.soknadLinjeId).filter(id => id && soknad.linjer?.[id]));
}

// Linjene som kan plukkes inn i Utgifter: frie linjer vi søkte om (ikke fra
// Behov, ikke lagt til etter søknaden) som verken ligger i et innkjøp eller
// alt er ført som utgift. En linje følges opp ett av stedene, aldri begge.
export function kanBliUtgift(soknad, innkjopListe) {
  const opptatt = linjerMedUtgift(soknad);
  for (const i of innkjopListe) for (const l of innkjopslinjer(i)) if (l.soknadLinjeId) opptatt.add(l.soknadLinjeId);
  return soktLinjer(soknad).filter(l => !l.behovId && !opptatt.has(l.id));
}

export function sumUtgifter(soknad) {
  return Math.round(utgiftsliste(soknad).reduce((sum, u) => sum + (Number(u.belop) || 0), 0) * 100) / 100;
}

export function erInnvilget(soknad) {
  return soknad?.status === 'innvilget' || soknad?.status === 'avsluttet';
}

// Hengelåsen: en søknad som ikke lenger er utkast, er låst. Det vi søkte om
// (linjene, egenandelen, søkt beløp, giver og momsprosent) kan da ikke endres.
// Den låses opp ved å sette statusen tilbake til Utkast.
export function erLast(soknad) {
  return !!soknad?.status && soknad.status !== 'utkast';
}

// Egeninnsats (dugnad o.l.) er en løs utgift uten faktura: verdien er
// estimert, ingen betaler den, og hele beløpet er egne midler.
export function utgiftEgne(utgift) {
  return utgift?.egeninnsats ? Number(utgift.belop) || 0 : Number(utgift?.egneMidler) || 0;
}

// Egne midler fordelt på det vi kjøper: valgte innkjøpslinjer og løse utgifter.
export function fordelteEgneMidler(soknad, innkjopListe = []) {
  const linjer = innkjopListe.reduce((sum, i) => sum + innkjopsberegning(i).egne, 0);
  return Math.round((linjer + utgiftsliste(soknad).reduce((sum, u) => sum + utgiftEgne(u), 0)) * 100) / 100;
}

// Potten: rammen (innvilget + egne midler), hva som er disponert av den
// (valgt i alle innkjøp + løse utgifter) og hva som gjenstår.
//   egne            egenandelen på søknaden hvis den er satt, ellers summen
//                   av egne midler på varene (`fordelt`)
//   ramme           innvilget + egne
//   disponertFull   det vi faktisk betaler
//   egenBrukt       egne midler brukt (de brukes først)
//   disponert       det som belaster giveren: giverens andel av resten
//   disponertRamme  egenBrukt + disponert – det som er brukt av rammen
//   moms            resten, som dekkes av momskompensasjonen neste år
//   gjenstar        ramme − disponertRamme
export function pott(soknad, innkjopListe = []) {
  const prosent = momsProsent(soknad);
  const innvilget = soknad?.innvilget ?? null;
  const innkjop = innkjopListe.reduce((sum, i) => sum + sumInnkjop(i), 0);
  const disponertFull = sumUtgifter(soknad) + innkjop;
  const lovet = egenandel(soknad), fordelt = fordelteEgneMidler(soknad, innkjopListe);
  const egne = lovet > 0 ? lovet : fordelt;
  const egenBrukt = Math.min(egne, Math.max(0, disponertFull));
  const disponert = giverandel(disponertFull - egenBrukt, prosent);
  return {
    harMoms: prosent != null,
    prosent,
    giverProsent: prosent == null ? 100 : 100 - prosent,
    sokt: soktBelop(soknad),
    innvilget,
    egenandel: lovet,
    egenandelPlanlagt: egenandelPlanlagt(soknad),
    fordelt,
    egne,
    egenBrukt,
    ramme: innvilget == null ? null : innvilget + egne,
    disponertFull,
    innkjop,
    utgifter: sumUtgifter(soknad),
    disponert,
    disponertRamme: egenBrukt + disponert,
    moms: disponertFull - egenBrukt - disponert,
    gjenstar: innvilget == null ? null : innvilget + egne - egenBrukt - disponert,
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

// En søknadslinje er finansiert når det er valgt en pris for den hos en
// leverandør i et innkjøp. Gir nøklene «soknadId/linjeId» for dem.
export function finansierteLinjer(innkjopListe) {
  const ut = new Set();
  for (const i of innkjopListe) {
    const b = innkjopsberegning(i);
    for (const l of b.linjer) if (l.soknadLinjeId && b.perLinje[l.id].valgtSid != null) ut.add(`${i.soknadId}/${l.soknadLinjeId}`);
  }
  return ut;
}

// Anskaffet antall per behov, summert fra fakturerte innkjøp: linjen er
// valgt hos en leverandør, og enten dekket av en faktura eller i et innkjøp
// med status «Fakturert». Gir et kart behovId → antall.
export function anskaffetPerBehov(soknader, innkjopListe, fakturaer) {
  const dekket = new Set(fakturaer.flatMap(f => fakturaDekker(f)));
  const ut = new Map();
  for (const i of innkjopListe) {
    const soknadslinjer = soknader.find(s => s.id === i.soknadId)?.linjer || {};
    const b = innkjopsberegning(i);
    for (const l of b.linjer) {
      const behovId = soknadslinjer[l.soknadLinjeId]?.behovId;
      if (!behovId || b.perLinje[l.id].valgtSid == null) continue;
      if (i.status !== 'fakturert' && !dekket.has(`${i.id}/${l.id}`)) continue;
      ut.set(behovId, (ut.get(behovId) || 0) + (Number(l.antall) || 0));
    }
  }
  return ut;
}

// Status for ett behov. `anskaffet` kommer fra anskaffetPerBehov(), og
// `finansierte` fra finansierteLinjer().
export function behovsinfo(behov, soknader, anskaffet = 0, finansierte = new Set()) {
  const total = Number(behov.antall) || 0;
  const gjenstar = Math.max(0, total - anskaffet);
  const bruk = behovIBruk(behov.id, soknader);
  const aktiv = bruk.filter(b => tellerMed(b.soknad));
  const iSoknader = aktiv.reduce((sum, b) => sum + (Number(b.linje.antall) || 0), 0);
  const erFinansiert = b => tellerMed(b.soknad) && finansierte.has(`${b.soknad.id}/${b.linje.id}`);

  let autostatus;
  if (gjenstar === 0) autostatus = 'Anskaffet';
  else if (anskaffet > 0) autostatus = 'Delvis anskaffet';
  else if (aktiv.some(erFinansiert)) autostatus = 'Finansiert';
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
    finansiertI: erFinansiert,
  };
}

// Behov som kan velges i en søknad: åpne, og ikke allerede med i den.
// `anskaffet` er kartet fra anskaffetPerBehov().
export function velgbareBehov(behovliste, soknader, soknad, anskaffet = new Map()) {
  const iSoknaden = new Set(linjeliste(soknad).map(l => l.behovId).filter(Boolean));
  return behovliste
    .map(b => ({ behov: b, info: behovsinfo(b, soknader, anskaffet.get(b.id) || 0) }))
    .filter(x => x.info.erApent && !iSoknaden.has(x.behov.id));
}

export const SOKNADSFILTRE = {
  aktive: s => ['utkast', 'sendt', 'innvilget'].includes(s.status),
  innvilget: s => s.status === 'innvilget',
  venter: s => s.status === 'utkast' || s.status === 'sendt',
  lukket: s => s.status === 'avsluttet' || s.status === 'avslatt',
  alle: () => true,
};

// Neste frist (kort 0010): det brukeren har skrevet i «Neste frist», ellers
// søknadsfristen mens søknaden er utkast («Send søknaden»). Avsluttede og
// avslåtte søknader har ingen. `tilstand` er 'forfalt' (datoen er passert),
// 'naer' (innen FRISTVARSEL_DAGER) eller 'senere'. Ingenting av dette lagres.
export const FRISTVARSEL_DAGER = 30;

export function nesteFrist(soknad, iDag) {
  if (!soknad || SOKNADSFILTRE.lukket(soknad)) return null;
  const egen = soknad.nesteFrist || null;
  const dato = egen || (soknad.status === 'utkast' ? soknad.frist : null) || null;
  if (!dato) return null;
  const dager = Math.round((Date.parse(dato) - Date.parse(iDag)) / 86400000);
  return {
    dato, dager,
    hva: egen ? (soknad.nesteFristHva || '') : 'Send søknaden',
    tilstand: dager < 0 ? 'forfalt' : dager <= FRISTVARSEL_DAGER ? 'naer' : 'senere',
  };
}

// Søknadslisten: det som haster øverst (nærmeste eller forfalte neste frist
// først). Resten: nyeste søknadsfrist først, uten frist øverst (nye utkast).
export function sorterSoknader(soknader, iDag) {
  const rader = [...soknader]
    .sort((a, b) => (b.frist || '9999').localeCompare(a.frist || '9999'))
    .map(s => ({ s, n: nesteFrist(s, iDag) }));
  return [
    ...rader.filter(x => x.n).sort((a, b) => a.n.dato.localeCompare(b.n.dato)),
    ...rader.filter(x => !x.n),
  ].map(x => x.s);
}

// ——— Årshjul (kort 0009) ———
// Fristene ligger på giveren: `givere.<id>.frister.<fid>` = { dato, tekst, arlig }.
// En årlig frist gjentas på samme dag hvert år; året i datoen er bare året
// den ble lagt inn. Neste forekomst, måned og markering regnes ut her.

const toSifre = n => String(n).padStart(2, '0');
const erSkuddaar = aar => (aar % 4 === 0 && aar % 100 !== 0) || aar % 400 === 0;
const dagerMellom = (fra, til) => Math.round((Date.parse(til) - Date.parse(fra)) / 86400000);

// Datoen en årlig frist faller på i et gitt år (29.02 blir 28.02 uten skuddår).
export function arligDato(dato, aar) {
  const [, m, d] = dato.split('-');
  return `${aar}-${m}-${m === '02' && d === '29' && !erSkuddaar(aar) ? '28' : d}`;
}

// Giverens frister som liste, sortert på dag i året. Uten dato sist (nye).
export function fristliste(giver) {
  const nokkel = f => (f.dato ? f.dato.slice(5) : '99') + (f.tekst || '');
  return Object.entries(giver?.frister || {}).map(([id, f]) => ({ id, ...f }))
    .sort((a, b) => nokkel(a).localeCompare(nokkel(b), 'nb'));
}

// Neste gang fristen inntreffer (i dag teller med). null når den mangler
// dato eller er en engangsfrist som er passert.
export function nesteForekomst(frist, iDag) {
  if (!frist?.dato) return null;
  if (!frist.arlig) return frist.dato >= iDag ? frist.dato : null;
  const aar = Number(iDag.slice(0, 4));
  const iAar = arligDato(frist.dato, aar);
  return iAar >= iDag ? iAar : arligDato(frist.dato, aar + 1);
}

// Tolv måneder: forrige måned (`forrige`), inneværende (`denne`) og ti fram.
// Hver måned har `poster` sortert på dato:
//   { type: 'giver', dato, giverId, fristId, navn, tekst, tilstand }   tilstand: 'passert' | 'naer' | 'senere'
//   { type: 'soknad', dato, soknadId, navn, tekst, tilstand }          tilstand fra nesteFrist()
// Vinduet har hver kalendermåned én gang, så en årlig frist står ett sted.
export function aarshjul(givere, soknader, iDag) {
  const [aar, maaned] = iDag.split('-').map(Number);
  const maaneder = [];
  for (let i = -1; i < 11; i++) {
    const n = aar * 12 + (maaned - 1) + i;
    maaneder.push({ aar: Math.floor(n / 12), maaned: n % 12 + 1, forrige: i === -1, denne: i === 0, poster: [] });
  }
  const maanedFor = dato => maaneder.find(m => dato.startsWith(`${m.aar}-${toSifre(m.maaned)}-`));
  for (const g of givere) {
    for (const f of fristliste(g)) {
      if (!f.dato) continue;
      const dato = f.arlig ? arligDato(f.dato, maaneder.find(m => m.maaned === Number(f.dato.slice(5, 7))).aar) : f.dato;
      const dager = dagerMellom(iDag, dato);
      maanedFor(dato)?.poster.push({
        type: 'giver', dato, giverId: g.id, fristId: f.id, navn: g.navn || 'Uten navn', tekst: f.tekst || '',
        tilstand: dager < 0 ? 'passert' : dager <= FRISTVARSEL_DAGER ? 'naer' : 'senere',
      });
    }
  }
  for (const s of soknader) {
    const n = nesteFrist(s, iDag);
    if (n) maanedFor(n.dato)?.poster.push({ type: 'soknad', dato: n.dato, soknadId: s.id, navn: s.tittel || 'Uten tittel', tekst: n.hva, tilstand: n.tilstand });
  }
  for (const m of maaneder) m.poster.sort((a, b) => a.dato.localeCompare(b.dato) || a.type.localeCompare(b.type) || a.navn.localeCompare(b.navn, 'nb'));
  return maaneder;
}

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
//   priser:       { lid: { sid: { raa: '1200 -15%', alternativ, vedleggId, side } } }
//                 `alternativ` = produktet leverandøren tilbyr i stedet for det vi ba om
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
  // `rabatt` er rabatten som tekst («10 %» eller «180»), tom uten rabatt.
  let netto = liste, under = 'vår pris', rabattTekst = '';
  if (m[2]) {
    const rabatt = parseFloat(m[2].replace(',', '.'));
    if (m[3]) { netto = liste * (1 - rabatt / 100); under = `Liste ${kr(liste)} −${m[2]} %`; rabattTekst = `${m[2]} %`; }
    else { netto = liste - rabatt; under = `Liste ${kr(liste)} −${kr(rabatt)}`; rabattTekst = kr(rabatt); }
  }
  return { liste, netto: Math.round(netto * 100) / 100, under, rabatt: rabattTekst };
}

// Tusenskille i undertekstene — samme som ui/format.js, gjentatt her så
// beregningslaget ikke avhenger av UI-laget.
function kr(n) {
  const [hele, ore] = (Math.round(n * 100) / 100).toFixed(2).split('.');
  return hele.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + ore;
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

  // Egne midler på en linje teller først når det er valgt en pris for den.
  let sumValgt = 0, egne = 0;
  const brukt = new Set();
  const perLinje = {};
  for (const l of linjer) {
    const sid = valgt[l.id];
    const p = sid ? celle[l.id][sid] : null;
    const antall = Number(l.antall) || 0;
    perLinje[l.id] = { valgtSid: p ? sid : null, sum: p ? antall * p.netto : null, egne: p ? Number(l.egneMidler) || 0 : 0 };
    if (p) { sumValgt += antall * p.netto; egne += perLinje[l.id].egne; brukt.add(sid); }
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
    sumValgt, frakt, total: sumValgt + frakt, brukt, egne,
  };
}

// Innkjøpets linjer gruppert og ordnet slik de står i søknaden: samme
// typer, samme typerekkefølge og samme rekkefølge innenfor typen. Frie
// linjer kommer sist i typen de er merket med; uten type (og linjer som er
// fjernet fra søknaden) kommer de til slutt.
export function grupperInnkjopslinjer(innkjop, soknad, behovliste, typeRekkefolge = []) {
  const soknadslinjer = soknad?.linjer || {};
  const linjer = innkjopslinjer(innkjop).map(l => {
    const sl = l.soknadLinjeId ? soknadslinjer[l.soknadLinjeId] : null;
    return { linje: l, type: innkjopslinjetype(l, soknad, behovliste), fri: sl ? 0 : 1, plass: sl ? (sl.rekkefolge ?? 0) : (l.rekkefolge ?? 0) };
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
  const utgift = linjerMedUtgift(soknad);
  return linjeliste(soknad).filter(l => !fordelt.has(l.id) && !utgift.has(l.id));
}

export function nesteRekkefolgeI(kart) {
  return Object.values(kart || {}).reduce((m, x) => Math.max(m, x.rekkefolge ?? 0), 0) + 1;
}

// ——— Bestilling ———
// Det som bestilles hos én leverandør: linjene som er valgt hos den, med
// antall, listepris, rabatt og sum, pluss frakt. `vare` er det leverandøren
// kaller varen (alternativt produkt eller teksten fra tilbudet) når vi har
// det, og da står vår egen betegnelse i `varLinje`. `rekkefolge` er
// linje-ID-ene slik matrisen viser dem.
export function bestilling(innkjop, sid, { tittelFor, rekkefolge = [] }) {
  const b = innkjopsberegning(innkjop);
  const lev = innkjop?.leverandorer?.[sid] || {};
  const vedlegg = vedleggsliste(lev);
  const plass = id => { const i = rekkefolge.indexOf(id); return i === -1 ? Infinity : i; };
  const dokumenter = new Set();
  const linjer = b.linjer
    .filter(l => b.perLinje[l.id].valgtSid === sid)
    .sort((x, y) => plass(x.id) - plass(y.id))
    .map(l => {
      const pris = innkjop.priser?.[l.id]?.[sid] || {}, p = b.celle[l.id][sid];
      const dok = vedlegg.find(v => v.id === pris.vedleggId) || (vedlegg.length === 1 ? vedlegg[0] : null);
      if (dok) dokumenter.add(dok.navn);
      const antall = Number(l.antall) || 0;
      const hos = (pris.alternativ || pris.tekst || '').trim();
      return { vare: hos || tittelFor(l), varLinje: hos ? tittelFor(l) : '', antall, liste: p.liste, rabatt: p.rabatt, netto: p.netto, sum: antall * p.netto };
    });
  const sum = linjer.reduce((s, l) => s + l.sum, 0);
  const frakt = linjer.length ? Number(lev.frakt) || 0 : 0;
  return { linjer, sum, frakt, total: sum + frakt, dokumenter: [...dokumenter] };
}

// ——— Lese priser fra et tilbud ———
// ui/pdftekst.js gir tilbudet som linjer, med tabulator mellom cellene i en
// tabell. En varelinje kjennes igjen på «antall (enhet) enhetspris», eventuelt
// fulgt av rabatt i prosent og beløp:
//   «100 Acme ABC-123 kornett ⇥ 4 stk ⇥ 12 000,00 ⇥ 12,0% ⇥ 42 240,00»
//   «70001 ⇥ Acme ABC-123 kornett ⇥ 4 ⇥ stk ⇥ 12 000,00 ⇥ -12% ⇥ 42 240,00»
//   «AB-100 ⇥ Acme ABC-123 kornett ⇥ 4,00 Stk ⇥ 12000,00 ⇥ 12,00 ⇥ 42240,00»
// Linjer rett under som bare er tekst, er resten av varebeskrivelsen.

const ENHET = 'stk|par|sett|pk|pakke|pakker|eske|esker|boks|rull|sats|m|kg|l';
const BELOP = '\\d{1,3}(?:[ \\u00a0.]?\\d{3})*,\\d{2}';
const ER_BELOP = new RegExp(`^${BELOP}$`);
const ER_ANTALL = new RegExp(`^(\\d+)(,0+)?(?:\\s*(${ENHET})\\.?)?$`, 'i');
const ER_ENHET = new RegExp(`^(${ENHET})\\.?$`, 'i');
const ER_PROSENT = /^[-−]?\s*(\d+(?:,\d+)?)\s*%$/;
// Linjer som ikke er en del av varebeskrivelsen: serienummer, løse tall og
// «Antall enheter: 283».
const STOY = [/^s\.?\s?nr/i, /^\d+$/, /:\s*\d[\d  ]*$/];

const belop = t => parseFloat(t.replace(/[  .]/g, '').replace(',', '.'));
const omtrent = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.002);

// Stemmer antall × pris − rabatt med et av beløpene på linjen (med eller uten mva)?
function stemmer(antall, pris, rabatt, summer, mva = true) {
  const netto = antall * pris * (1 - (rabatt || 0) / 100);
  return summer.some(sum => omtrent(sum, netto) || (mva && (omtrent(sum * 1.25, netto) || omtrent(sum, netto * 1.25))));
}

function tolkCeller(celler) {
  for (let i = 1; i < celler.length - 1; i++) {
    const a = celler[i].match(ER_ANTALL);
    if (!a) continue;
    let j = i + 1, enhet = a[3] || '';
    if (!enhet && ER_ENHET.test(celler[j])) enhet = celler[j++];
    // «4,00» er bare et antall når enheten står ved – ellers er det et beløp.
    if ((a[2] && !enhet) || !ER_BELOP.test(celler[j] || '')) continue;
    const antall = Number(a[1]), pris = belop(celler[j++]);
    const r = (celler[j] || '').match(ER_PROSENT);
    if (r) j++;
    let rabatt = r ? belop(r[1]) : null;
    const summer = celler.slice(j).filter(c => ER_BELOP.test(c)).map(belop);
    // Rabatt uten prosenttegn («15,00» i en %-kolonne): tallet rett etter
    // prisen er rabatten når linjen bare går opp med den. Mva. holdes utenfor
    // her – 20 % rabatt og «uten mva.» gir samme sum.
    if (!rabatt && summer.length > 1 && summer[0] <= 100 && !stemmer(antall, pris, 0, summer, false) && stemmer(antall, pris, summer[0], summer.slice(1), false)) rabatt = summer.shift();
    return noyaktig({ forst: celler.slice(0, i), antall, enhet: enhet.toLowerCase().replace('.', ''), pris, rabatt, summer });
  }
  return null;
}

// Er prosenten avrundet («4,98» for 10 045 → 9 545), er linjesummen fasiten:
// da brukes netto stykkpris uten rabatt, når den er et helt ørebeløp.
function noyaktig(t) {
  if (!t.rabatt) return t;
  const netto = t.antall * t.pris * (1 - t.rabatt / 100);
  const sum = t.summer.find(s => omtrent(s, netto));
  if (sum == null || Math.abs(sum - netto) < 0.005) return t;
  const ore = sum / t.antall * 100;
  return Math.abs(ore - Math.round(ore)) > 1e-6 ? t : { ...t, pris: Math.round(ore) / 100, rabatt: null };
}

// En linje uten tabulatorer (alt i én tekst) deles opp fra høyre. «no 2 8
// 380,00» kan leses som 2 × 8 380 eller 8 × 380 — beløpene på linjen avgjør.
function delOppTekst(tekst) {
  const hale = pris => new RegExp(`^(.*?)\\s+(\\d+)\\s*((?:${ENHET})\\.?)?\\s+(${pris})(?:\\s+([-−]?\\s*\\d+(?:,\\d+)?\\s*%))?((?:\\s+${BELOP})*)$`, 'i');
  const forsok = [hale(BELOP), hale('\\d{1,3},\\d{2}')].map(re => {
    const m = tekst.match(re);
    return m && tolkCeller([m[1], m[2] + (m[3] ? ' ' + m[3] : ''), m[4], ...(m[5] ? [m[5]] : []), ...(m[6].match(new RegExp(BELOP, 'g')) || [])]);
  }).filter(Boolean);
  return forsok.find(t => stemmer(t.antall, t.pris, t.rabatt, t.summer)) || forsok[0] || null;
}

// linjer: [{ side, y, hoyde, tekst }] ovenfra og ned (y og hoyde er valgfrie).
// Gir én rad per vare: { side, varenr, beskrivelse, antall, enhet, pris,
// rabatt, avvik }. `avvik` = tallene på linjen går ikke opp (bør sjekkes).
export function tolkTilbudslinjer(linjer) {
  const rader = [];
  let apen = null, forrige = null;
  for (const l of linjer) {
    const tekst = (l.tekst || '').trim();
    if (!tekst) continue;
    const celler = tekst.split('\t').map(c => c.trim()).filter(Boolean);
    const t = celler.length > 1 ? tolkCeller(celler) : delOppTekst(tekst);
    if (t && t.forst.join('').trim()) {
      const harVarenr = t.forst.length > 1 && /^\S*\d\S*$/.test(t.forst[0]);
      apen = {
        side: l.side ?? 1, varenr: harVarenr ? t.forst[0] : '',
        beskrivelse: t.forst.slice(harVarenr ? 1 : 0).join(' ').replace(/\s+/g, ' ').trim(),
        antall: t.antall, enhet: t.enhet, pris: t.pris, rabatt: t.rabatt,
        avvik: t.summer.length > 0 && !stemmer(t.antall, t.pris, t.rabatt, t.summer),
      };
      rader.push(apen);
      forrige = l;
      continue;
    }
    // Bare tekst rett under en vare, i samme eller litt mindre skrift = resten
    // av beskrivelsen. Uten plassering (ren tekst) vet vi ikke hva som hører sammen.
    const h = forrige?.hoyde || 10, forhold = (l.hoyde || h) / h;
    const tett = l.y != null && forrige?.y != null && forrige.y - l.y <= 1.7 * h && forhold >= 0.7 && forhold <= 1.06;
    if (apen && celler.length === 1 && (l.side ?? 1) === apen.side && tett && !STOY.some(re => re.test(tekst))) {
      apen.beskrivelse += ' ' + tekst;
      forrige = l;
    } else apen = null;
  }
  return rader;
}

// Prisen slik den skrives i en celle i matrisen: «9650 -10%».
export function tilbudsprisTekst(pris, rabatt) {
  const t = n => String(Math.round(n * 100) / 100).replace('.', ',');
  return rabatt ? `${t(pris)} -${t(rabatt)}%` : t(pris);
}

// Hvor like to varetekster er (0–1). Ordene i den ene letes opp i den andre
// uten skilletegn, så «YCR-2330III» og «YCR2330III» er samme ord. Ord med
// tall er modellnavn: de holdes hele («YTS-280» er ikke «YAS-280») og teller
// dobbelt. Andre ord deles på bindestrek («Bb-klarinett» → «klarinett»).
const kompakt = s => String(s || '').toLowerCase().replace(/[^a-z0-9æøå]/g, '');
const ordI = s => [...new Set(String(s || '').toLowerCase().split(/[\s,;()/]+/)
  .flatMap(o => /\d/.test(o) ? [kompakt(o)] : o.split(/[^a-zæøå]+/))
  .filter(o => o.length >= 3 || (/\d/.test(o) && o.length >= 2)))];
const vekt = o => o.length * (/\d/.test(o) ? 2 : 1);

function andelFunnet(ord, tekst) {
  let alle = 0, funnet = 0;
  for (const o of ord) { alle += vekt(o); if (tekst.includes(o)) funnet += vekt(o); }
  return alle ? funnet / alle : 0;
}

export function likhet(a, b) {
  return (andelFunnet(ordI(a), kompakt(b)) + andelFunnet(ordI(b), kompakt(a))) / 2;
}

// Forslag til hvilken varelinje hver tilbudsrad hører til: beste treff først,
// og hver varelinje brukes bare én gang. varelinjer: [{ id, tekst, antall }].
// Gir en liste med varelinje-id (eller null) per rad. Samme antall teller litt.
export function foreslaKobling(rader, varelinjer, terskel = 0.45) {
  const par = [];
  rader.forEach((r, i) => varelinjer.forEach(v => {
    const poeng = likhet(`${r.varenr || ''} ${r.beskrivelse}`, v.tekst) + (Number(v.antall) === r.antall ? 0.05 : 0);
    if (poeng >= terskel) par.push({ i, id: v.id, poeng });
  }));
  par.sort((a, b) => b.poeng - a.poeng);
  const ut = rader.map(() => null), brukt = new Set();
  for (const p of par) {
    if (ut[p.i] != null || brukt.has(p.id)) continue;
    ut[p.i] = p.id;
    brukt.add(p.id);
  }
  return ut;
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

// Finnes navnet i leverandørregisteret? Store/små bokstaver og mellomrom i
// endene teller ikke. Et tomt navn regnes som kjent (ingenting å legge inn).
export function leverandorIRegister(navn, register) {
  const n = (navn || '').trim().toLowerCase();
  return !n || register.some(l => (l.navn || '').trim().toLowerCase() === n);
}

// Er posten urørt siden «+ Ny …» lagde den? Da gir «neste» i sidepanelet
// (knappen nederst og ⌘/Ctrl+Enter) ingen ny post. Verdiene er de som
// `opprett…()` setter; tom tekst, null og tomme kart regnes som det samme.
const URORT = {
  fakturaer: { leverandor: '', fakturanr: '', dato: null, belop: null, fil: null, dekker: {}, merknad: '' },
  behov: { type: '', tittel: '', beskrivelse: '', antall: 1, estPris: 0, statusOverstyring: null },
  leverandorer: { navn: '', kontakt: '' },
  givere: { navn: '', kontakt: '', momsTrekk: false },
};

export function erTomPost(samling, post) {
  const tom = v => v == null || (typeof v === 'string' && !v.trim()) || (typeof v === 'object' && !Object.keys(v).length);
  return Object.entries(URORT[samling]).every(([felt, standard]) => {
    const v = post?.[felt];
    return tom(standard) ? tom(v) : v === standard || v == null;
  });
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

// Fakturaer og utgifter har øre. Summer avrundes til øre, så flyttall ikke
// gir «avvik» på en tusendels øre.
const ore = n => Math.round(n * 100) / 100;

// Alt potten er brukt på: valgte linjer i alle innkjøp + løse utgifter.
// `tittelFor(innkjop, linje)` og `levNavn(innkjop, sid)` gir tekstene,
// slik at beregningslaget slipper å kjenne søknaden og registeret.
// `alternativ` er satt når den valgte leverandøren tilbød et annet produkt
// enn det vi ba om. `etterSoknad` og `notat` følger linjer som ble lagt til
// etter at søknaden var sendt. `egeninnsats` = løs utgift uten faktura
// (dugnad), der hele beløpet er egne midler. `kategori` er typen linjen har i søknaden
// (trenger `behovliste`), typen en fri linje i innkjøpet er merket med, eller
// typen en løs utgift er merket med (valgfritt),
// og `egne` er egne midler på posten (`egneMidler` på innkjøpslinjen, satt i
// Innkjøp, eller på utgiften).
export function revisjonsposter(soknad, innkjopListe, { tittelFor, levNavn, behovliste = [] }) {
  const poster = [];
  for (const i of innkjopListe) {
    const b = innkjopsberegning(i);
    for (const l of b.linjer) {
      const v = b.perLinje[l.id];
      if (v.valgtSid == null) continue;
      const sl = l.soknadLinjeId ? soknad?.linjer?.[l.soknadLinjeId] : null;
      poster.push({
        id: `${i.id}/${l.id}`, type: 'linje', innkjopId: i.id, linjeId: l.id,
        tittel: `${Number(l.antall) || 0} × ${tittelFor(i, l)}`,
        navn: tittelFor(i, l), antall: Number(l.antall) || 0, stykkpris: b.celle[l.id][v.valgtSid].netto,
        under: `${levNavn(i, v.valgtSid)} · ${i.navn || 'Innkjøp'}`,
        alternativ: (i.priser?.[l.id]?.[v.valgtSid]?.alternativ || '').trim(),
        etterSoknad: !!sl?.etterSoknad, notat: (sl?.notat || '').trim(),
        kategori: innkjopslinjetype(l, soknad, behovliste),
        tilbudt: ore(v.sum), egne: v.egne,
      });
    }
  }
  for (const u of utgiftsliste(soknad)) {
    poster.push({ id: `utgift/${u.id}`, type: 'utgift', utgiftId: u.id, tittel: u.beskrivelse || 'Uten beskrivelse', under: `${u.egeninnsats ? 'Egeninnsats' : u.planlagt ? 'Utgift fra søknaden' : 'Løs utgift'}${u.dato ? ` · ${u.dato.split('-').reverse().join('.')}` : ''}`, tilbudt: Number(u.belop) || 0, egne: utgiftEgne(u), egeninnsats: !!u.egeninnsats, kategori: (u.type || '').trim() });
  }
  return poster;
}

// Egne midler som er fordelt på postene.
export function sumEgneMidler(poster) {
  return ore(poster.reduce((s, p) => s + (p.egne || 0), 0));
}

// Sluttoppgjøret per kategori: hva vi har betalt, og hvem som dekker det.
// Tilbudslinjene grupperes på typen de har i søknaden (i søknadens
// rekkefølge). Løse utgifter som er merket med en type går inn i den typen;
// de andre er en egen gruppe til slutt. `kostnad` er
// fakturert beløp der posten har faktura, ellers tilbudt pris. Egne midler
// trekkes fra før giverens andel regnes ut. `perPost` kommer fra
// revisjonsoppsummering(). Gir { grupper: [{ navn, poster, tilbudt, fakturert,
// kostnad, egne, giver, moms }], sum: { … } }.
// Postene gruppert per kategori (type) i søknadens typerekkefølge. Utgifter
// uten type står for seg til slutt («Andre utgifter»).
export function kategorigrupper(poster, typeRekkefolge = []) {
  const utenType = p => p.type === 'utgift' && !p.kategori;
  const grupper = grupperPerType(poster.filter(p => !utenType(p)), p => p.kategori, typeRekkefolge)
    .map(g => ({ navn: g.type || 'Uten type', poster: g.elementer }));
  const utgifter = poster.filter(utenType);
  if (utgifter.length) grupper.push({ navn: 'Andre utgifter', poster: utgifter });
  return grupper;
}

// Partiturrekkefølgen for janitsjarkorps. Det første instrumentet i varenavnet
// avgjør («Altsax/Kornett/Horn» er en saksofon); navn som ikke gjenkjennes
// kommer til slutt.
const PARTITUR = [
  /piccolo|fløyte/,
  /obo/,
  /fagott/,
  /(ess|alt|bass)?[- ]?klarinett/,
  /(sopran|alt|tenor|baryton|bass)?[- ]?(saksofon|saxofon|sax)/,
  /kornett|(piccolo)?[- ]?trompet|flygelhorn/,
  /(alt|valt|wald|tenor)?[- ]?horn/,
  /(alt|tenor|bass)?[- ]?trombone/,
  /baryton|eufonium|euphonium/,
  /tuba|sousafon/,
  /tromme|pauke|cymbal|klokkespill|xylofon|marimba|slagverk/,
];

export function partiturplass(navn) {
  const t = String(navn || '').toLowerCase();
  let best = null;
  PARTITUR.forEach((re, plass) => {
    const m = re.exec(t);
    if (!m) return;
    // Starter to treff på samme sted, vinner det lengste («barytonsaksofon»
    // er en saksofon, «flygelhorn» er ikke et horn).
    if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.lengde)) best = { plass, index: m.index, lengde: m[0].length };
  });
  return best ? best.plass : PARTITUR.length;
}

const erInstrumenttype = type => /^instrument(er)?$/i.test(String(type || '').trim());

// Det en faktura gjelder, slik det listes i revisjonsrapporten: gruppert per
// type som på forsiden, instrumenter i partiturrekkefølge og resten
// alfabetisk etter varenavn.
export function grupperFakturaposter(poster, typeRekkefolge = []) {
  const navn = p => p.navn ?? p.tittel ?? '';
  const alfabetisk = (a, b) => navn(a).localeCompare(navn(b), 'nb');
  return kategorigrupper(poster, typeRekkefolge).map(g => ({
    ...g,
    poster: [...g.poster].sort(erInstrumenttype(g.navn)
      ? (a, b) => partiturplass(navn(a)) - partiturplass(navn(b)) || alfabetisk(a, b)
      : alfabetisk),
  }));
}

export function fordelingPerKategori(poster, perPost, prosent, typeRekkefolge = []) {
  const ut = kategorigrupper(poster, typeRekkefolge).map(g => {
    const tilbudt = ore(g.poster.reduce((s, p) => s + p.tilbudt, 0));
    const fakturert = ore(g.poster.reduce((s, p) => s + (perPost[p.id]?.fakturert ?? 0), 0));
    const kostnad = ore(g.poster.reduce((s, p) => s + (perPost[p.id]?.fakturert ?? p.tilbudt), 0));
    const egne = sumEgneMidler(g.poster);
    const giver = giverandelOre(kostnad - egne, prosent);
    return { ...g, tilbudt, fakturert, kostnad, egne, giver, moms: ore(kostnad - egne - giver) };
  });
  // Summen er summen av radene, så tabellen går opp på øret.
  const sum = {};
  for (const felt of ['tilbudt', 'fakturert', 'kostnad', 'egne', 'giver', 'moms']) sum[felt] = ore(ut.reduce((s, g) => s + g[felt], 0));
  return { grupper: ut, sum };
}

// Innkjøpslinjer uten valgt leverandør. De er ikke «brukt» og vises ikke i
// revisjonen – lista sier fra om dem, så ingen linje blir glemt.
export function linjerUtenValg(innkjopListe) {
  const ut = [];
  for (const i of innkjopListe) {
    const b = innkjopsberegning(i);
    for (const l of b.linjer) if (b.perLinje[l.id].valgtSid == null) ut.push({ innkjop: i, linje: l });
  }
  return ut;
}

// Nøklene i `dekker` bruker «|» der post-ID-en har «/» (Firestore-feltstier
// kan ikke inneholde skråstrek).
// Posttittel til lister og rapport, med alternativt produkt når det er kjøpt.
export function posttittel(post) {
  return post.alternativ ? `${post.tittel} (alternativ: ${post.alternativ})` : post.tittel;
}

export function fakturaDekker(faktura) {
  return Object.keys(faktura?.dekker || {}).map(k => k.replaceAll('|', '/'));
}

// Avvik per faktura: beløp mot tilbudt for postene den dekker. Gis `alle`
// (søknadens fakturaer), sier `alene` om fakturaen er den eneste på postene
// sine – ellers er avviket per faktura meningsløst (kreditnota, delfaktura),
// og avviket per post (fakturertPerPost) gjelder i stedet.
export function fakturaavvik(faktura, poster, alle = null) {
  const ider = fakturaDekker(faktura);
  const tilbudt = ore(ider.reduce((s, id) => s + (poster.find(p => p.id === id)?.tilbudt || 0), 0));
  const ut = { tilbudt, avvik: ider.length ? ore((Number(faktura.belop) || 0) - tilbudt) : 0, koblet: ider.length > 0 };
  if (alle) ut.alene = ider.every(id => !alle.some(f => f !== faktura && f.id !== faktura.id && fakturaDekker(f).includes(id)));
  return ut;
}

// Fakturert per post: hver faktura (og kreditnota, negativt beløp) fordeles
// på postene den dekker i forhold til tilbudt pris. Dekker den bare én post,
// går hele beløpet dit. Gir postId → beløp.
export function fakturertPerPost(fakturaer, poster) {
  const ut = {};
  for (const f of fakturaer) {
    const dekket = fakturaDekker(f).map(id => poster.find(p => p.id === id)).filter(Boolean);
    if (!dekket.length) continue;
    const belop = Number(f.belop) || 0;
    const tilbudtSum = dekket.reduce((s, p) => s + p.tilbudt, 0);
    for (const p of dekket) {
      const andel = tilbudtSum > 0 ? p.tilbudt / tilbudtSum : 1 / dekket.length;
      ut[p.id] = (ut[p.id] || 0) + belop * andel;
    }
  }
  for (const id of Object.keys(ut)) ut[id] = ore(ut[id]);
  return ut;
}

export function sumFakturert(fakturaer, soknadId) {
  return ore(fakturaliste(fakturaer, soknadId).reduce((s, f) => s + (Number(f.belop) || 0), 0));
}

// Oppsummeringen øverst i Revisjon: hva som er fakturert, hva som mangler
// faktura, og hva som avviker fra tilbud.
// Avviket regnes per post: fakturert (alle fakturaer og kreditnotaer på
// posten) mot tilbudt. perPost[id] = { nr: [løpenummer], fakturert, avvik }.
// Egeninnsats skal ikke ha faktura: den teller ikke som «mangler faktura»,
// og summeres for seg i `egeninnsats`.
export function revisjonsoppsummering(fakturaer, poster) {
  let manglerFaktura = 0, avvikSum = 0, avvikAntall = 0, egeninnsats = 0;
  const fakturert = fakturertPerPost(fakturaer, poster);
  const perPost = {};
  for (const p of poster) {
    const fs = fakturaer.filter(f => fakturaDekker(f).includes(p.id));
    const avvik = fs.length ? ore((fakturert[p.id] || 0) - p.tilbudt) : 0;
    perPost[p.id] = { nr: fs.map(f => f.lopenummer), fakturert: fs.length ? fakturert[p.id] || 0 : null, avvik };
    if (p.egeninnsats) egeninnsats += p.tilbudt;
    else if (!fs.length) manglerFaktura++;
    else if (avvik) { avvikSum += avvik; avvikAntall++; }
  }
  const ikkeKoblet = fakturaer.filter(f => !fakturaDekker(f).length).length;
  return { fakturert: ore(fakturaer.reduce((s, f) => s + (Number(f.belop) || 0), 0)), manglerFaktura, avvikSum: ore(avvikSum), avvikAntall, ikkeKoblet, egeninnsats: ore(egeninnsats), perPost };
}

// ——— Revisor og godkjenning ———
// En revisor er en bruker med rollen «revisor» som står i `soknad.tilgang`
// (liste med e-postadresser). Hver revisor har sin egen oppføring
// `soknad.revisorer.<nøkkel>` = { epost, navn, godkjent: { tid, avtrykk },
// merknad }, som bare revisoren selv kan skrive (se firestore.rules).

// E-postadressen som nøkkel i `revisorer`: punktum og @ kan ikke stå i en
// feltsti. Samme omskriving gjøres i firestore.rules.
export function revisornokkel(epost) {
  return String(epost || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// cyrb53: kort, fast hash av en tekst. Skal bare oppdage endringer – at ingen
// andre enn revisoren kan skrive godkjenningen, sørger reglene for.
function hash(tekst) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Fingeravtrykk av det revisoren går god for. Endres noe av dette etter en
// godkjenning, gjelder den ikke lenger:
//   rammen      søkt, innvilget, egenandel (og valget beløp/andel), momsprosent
//   postene     valgt leverandør og pris, antall, egne midler, frakt hos
//               leverandører det er valgt noe hos, løse utgifter (beløp,
//               egeninnsats, egne midler)
//   fakturaene  løpenummer, leverandør, fakturanr, dato, beløp, vedlegg og
//               hva de er koblet til
// Typer, titler, merknader, rekkefølge, dokumenter, status og priser som ikke
// er valgt inngår ikke. Endres det som inngår her, må versjonen («v1») økes –
// da blir alle tidligere godkjenninger «endret etter godkjenningen».
export function revisjonsavtrykk(soknad, innkjopListe = [], fakturaer = []) {
  const o = n => Math.round((Number(n) || 0) * 100);
  const etterId = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const ramme = [
    o(soktBelop(soknad)), soknad?.innvilget == null ? null : o(soknad.innvilget),
    o(egenandelPlanlagt(soknad)), soknad?.egenandelValg === 'andel' ? 'andel' : 'belop', momsProsent(soknad),
  ];
  const innkjop = innkjopListe.map(i => {
    const b = innkjopsberegning(i);
    const linjer = b.linjer.filter(l => b.perLinje[l.id].valgtSid != null).map(l => {
      const sid = b.perLinje[l.id].valgtSid;
      return [l.id, sid, Number(l.antall) || 0, o(b.celle[l.id][sid].netto), o(b.perLinje[l.id].egne)];
    }).sort(etterId);
    const frakt = b.leverandorer.filter(s => b.brukt.has(s.id)).map(s => [s.id, s.leverandorId ?? null, o(s.frakt)]).sort(etterId);
    return [i.id, linjer, frakt];
  }).sort(etterId);
  const utgifter = utgiftsliste(soknad).map(u => [u.id, o(u.belop), !!u.egeninnsats, o(utgiftEgne(u))]).sort(etterId);
  const fakt = fakturaliste(fakturaer, soknad?.id).map(f => [
    f.id, f.lopenummer ?? null, f.leverandor || '', f.fakturanr || '', f.dato || null,
    f.belop == null ? null : o(f.belop), f.fil?.sti || null, Object.keys(f.dekker || {}).sort(),
  ]).sort(etterId);
  return 'v1:' + hash(JSON.stringify([ramme, innkjop, utgifter, fakt]));
}

// Tildelte revisorer med status: 'godkjent', 'endret' (tallene er endret etter
// godkjenningen) eller 'ikke'. `brukere` er brukerlisten når den kan leses:
// da teller bare de som (fortsatt) har rollen Revisor. Revisorer kan ikke lese
// brukerlisten og gir null; da vises alle i `tilgang`.
export function revisorstatus(soknad, avtrykk, brukere = null) {
  return (soknad?.tilgang || []).map(epost => {
    const b = brukere?.find(x => (x.epost || x.id) === epost);
    if (brukere && b?.rolle !== 'revisor') return null;
    const r = soknad.revisorer?.[revisornokkel(epost)];
    const g = r?.godkjent || null;
    return {
      epost, navn: r?.navn || b?.navn || epost, merknad: (r?.merknad || '').trim(),
      tid: g?.tid ?? null, status: !g ? 'ikke' : g.avtrykk === avtrykk ? 'godkjent' : 'endret',
    };
  }).filter(Boolean).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}

// Revisorenes kommentarer til én faktura
// (`revisorer.<nøkkel>.kommentarer.<fakturaId>` = { tekst, tid }). Bare
// tildelte revisorer teller, som i revisorstatus(). Vises bare på skjerm.
export function fakturakommentarer(soknad, fakturaId, brukere = null) {
  return revisorstatus(soknad, null, brukere).map(r => {
    const k = soknad.revisorer?.[revisornokkel(r.epost)]?.kommentarer?.[fakturaId];
    const tekst = (k?.tekst || '').trim();
    return tekst ? { epost: r.epost, navn: r.navn, tekst, tid: k.tid ?? null } : null;
  }).filter(Boolean);
}

// Revisjonen er godkjent når alle tildelte revisorer har en gyldig godkjenning.
export function revisjonGodkjent(statuser) {
  return statuser.length > 0 && statuser.every(r => r.status === 'godkjent');
}

// ——— Statuslampe for sikkerhetskopien ———
// `status` er innholdet i sikkerhetskopi-status.json (skrives av jobbene i
// backup/, B-26) eller null når filen ikke kan leses. Fargen lagres ikke; den
// regnes ut av alderen: kopien tas hver natt, så over 26 timer betyr at én
// natt er hoppet over, over 50 at to er det. Restore-testen kjører månedlig.
export const KOPI_GUL_TIMER = 26;
export const KOPI_ROD_TIMER = 50;
export const RESTORE_GUL_DAGER = 35;

export function kopistatus(status, na) {
  const tid = iso => { const t = Date.parse(iso ?? ''); return Number.isNaN(t) ? null : t; };
  const tatt = tid(status?.kopi?.tatt);
  const timer = tatt === null ? null : (na - tatt) / 3600000;
  const kjort = tid(status?.restoreTest?.kjort);
  const bestatt = status?.restoreTest?.bestatt === true;
  return {
    farge: timer === null ? 'gra' : timer > KOPI_ROD_TIMER ? 'rod' : timer > KOPI_GUL_TIMER ? 'gul' : 'gronn',
    tatt,
    dokumenter: status?.kopi?.dokumenter ?? null,
    filer: status?.kopi?.filer ?? null,
    restore: {
      kjort, bestatt,
      farge: kjort === null ? 'gra' : !bestatt || na - kjort > RESTORE_GUL_DAGER * 86400000 ? 'gul' : 'gronn',
    },
  };
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
