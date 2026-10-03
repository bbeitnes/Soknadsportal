// Datalaget: holder levende kopier av samlingene og har alle skriveoperasjoner.
// Sider leser `tilstand` og kaller funksjonene her — de importerer aldri
// lager/Firebase selv.
//
// Hver skriving oppdaterer bare feltene som faktisk er endret (med punktum-
// stier for søknadslinjer), så to som redigerer samtidig bare overskriver
// hverandre på samme felt: siste lagring per felt vinner.
import { lager, innlogging, SLETT } from './lager.js';
import { ORGANISASJON_ID } from '../config/app-config.js';
import { linjeliste, nesteRekkefolge, nesteUtgiftsrekkefolge, nesteRekkefolgeI, tolkPris, innkjopslinjer, leverandorer, vedleggsliste, nesteLopenummer, linjetype, anskaffetPerBehov, finansierteLinjer, revisornokkel, revisjonsavtrykk, revisorstatus, fakturakommentarer } from './beregning.js';

export { innlogging };

export const tilstand = {
  meg: null,        // { epost, navn, rolle, status }
  givere: [],
  behov: [],
  soknader: [],
  innkjop: [],
  leverandorer: [],
  fakturaer: [],
  brukere: [],
  innstillinger: [],
  lastet: new Set(),
};

const SAMLINGER = ['givere', 'behov', 'soknader', 'innkjop', 'leverandorer', 'fakturaer', 'brukere', 'innstillinger'];

export function erAdmin() {
  return tilstand.meg?.rolle === 'administrator';
}

// Revisor: ser bare søknadene hen er tildelt, og kan bare skrive sin egen
// oppføring i `revisorer` på dem. Håndheves i firestore.rules.
export function erRevisor() {
  return tilstand.meg?.rolle === 'revisor';
}

// Sjekker at innlogget bruker er invitert. Første innlogging gjør en
// invitert bruker aktiv og tar med navnet fra innloggingen.
export async function hentTilgang(bruker) {
  const rad = await lager.hent('brukere', bruker.epost);
  if (!rad) return null;
  if (rad.status !== 'aktiv' || (!rad.navn && bruker.navn)) {
    const felt = { status: 'aktiv' };
    if (!rad.navn && bruker.navn) felt.navn = bruker.navn;
    await lager.oppdater('brukere', bruker.epost, felt);
    Object.assign(rad, felt);
  }
  tilstand.meg = { epost: bruker.epost, navn: rad.navn || bruker.navn || '', rolle: rad.rolle, status: rad.status };
  return tilstand.meg;
}

// Samlinger portalen klarer seg uten. Feiler lesingen (typisk fordi de nye
// reglene ikke er limt inn i Firebase ennå), fortsetter vi med tom liste i
// stedet for å stoppe hele portalen.
const VALGFRIE = new Set(['innstillinger']);

function lyttSamling(samling, vedEndring, vedFeil) {
  return lager.lytt(samling, liste => {
    tilstand[samling] = liste;
    tilstand.lastet.add(samling);
    vedEndring(samling);
  }, feil => {
    if (!VALGFRIE.has(samling)) return vedFeil?.(feil);
    console.warn(`Kunne ikke lese «${samling}» – fortsetter uten. Er firestore.rules oppdatert?`, feil);
    tilstand[samling] = [];
    tilstand.lastet.add(samling);
    vedEndring(samling);
  });
}

export function startLytting(vedEndring, vedFeil) {
  // Ingenting fra en tidligere innlogging skal bli liggende.
  for (const samling of SAMLINGER) tilstand[samling] = [];
  tilstand.lastet.clear();
  if (erRevisor()) return startRevisorlytting(vedEndring, vedFeil);
  const avmeld = SAMLINGER.map(samling => lyttSamling(samling, vedEndring, vedFeil));
  return () => avmeld.forEach(f => f());
}

// Revisor får ikke lese hele samlingene. Søknadene hentes med et filter på
// tilgangslisten, og innkjøp og fakturaer hentes per tildelt søknad.
// Registrene leses som for andre; brukerlisten leses ikke.
function startRevisorlytting(vedEndring, vedFeil) {
  const avmeld = ['givere', 'behov', 'leverandorer', 'innstillinger'].map(samling => lyttSamling(samling, vedEndring, vedFeil));
  tilstand.lastet.add('brukere');
  const DELT = ['innkjop', 'fakturaer'];
  const perSoknad = new Map(); // soknadId → { innkjop, fakturaer, avmeld }
  const samle = () => {
    for (const samling of DELT) {
      const deler = [...perSoknad.values()].map(p => p[samling]);
      if (deler.every(Boolean)) { tilstand[samling] = deler.flat(); tilstand.lastet.add(samling); }
    }
    vedEndring();
  };
  avmeld.push(lager.lytt('soknader', liste => {
    tilstand.soknader = liste;
    tilstand.lastet.add('soknader');
    const ider = new Set(liste.map(s => s.id));
    for (const [id, p] of perSoknad) if (!ider.has(id)) { p.avmeld.forEach(f => f()); perSoknad.delete(id); }
    for (const id of ider) {
      if (perSoknad.has(id)) continue;
      const p = { innkjop: null, fakturaer: null, avmeld: [] };
      perSoknad.set(id, p);
      for (const samling of DELT) p.avmeld.push(lager.lytt(samling, l => { p[samling] = l; samle(); }, vedFeil, ['soknadId', '==', id]));
    }
    samle();
  }, vedFeil, ['tilgang', 'array-contains', tilstand.meg.epost]));
  return () => { avmeld.forEach(f => f()); perSoknad.forEach(p => p.avmeld.forEach(f => f())); };
}

export function alleLastet() {
  return SAMLINGER.every(s => tilstand.lastet.has(s));
}

function signatur() {
  return { endretAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, endretTid: Date.now() };
}

const nyId = prefiks => prefiks + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ——— Givere ———

export function opprettGiver() {
  return lager.opprett('givere', { navn: '', kontakt: '', momsTrekk: false, momsProsent: 8, ...signatur() });
}

export function oppdaterGiver(id, felt) {
  return lager.oppdater('givere', id, { ...felt, ...signatur() });
}

export function slettGiver(id) {
  if (tilstand.soknader.some(s => s.giverId === id)) {
    return Promise.reject(new Error('Giveren har søknader og kan ikke slettes'));
  }
  return lager.slett('givere', id);
}

// ——— Behov ———

export function opprettBehov() {
  return lager.opprett('behov', { type: '', tittel: '', beskrivelse: '', antall: 1, estPris: 0, statusOverstyring: null, ...signatur() });
}

// Import fra regneark: ett behov per rad. Går raden galt underveis,
// stopper vi; det som alt er opprettet blir liggende (og hoppes over
// som «finnes fra før» hvis importen kjøres på nytt).
export async function importerBehov(rader) {
  let antall = 0;
  for (const r of rader) {
    await lager.opprett('behov', { type: r.type || '', tittel: r.tittel, beskrivelse: r.beskrivelse, antall: r.antall, estPris: r.estPris, statusOverstyring: null, ...signatur() });
    antall++;
  }
  return antall;
}

export function oppdaterBehov(id, felt) {
  return lager.oppdater('behov', id, { ...felt, ...signatur() });
}

// Anskaffet antall per behov (behovId → antall), fra fakturerte innkjøp.
export function anskaffet() {
  return anskaffetPerBehov(tilstand.soknader, tilstand.innkjop, tilstand.fakturaer);
}

// Søknadslinjer som har fått valgt en pris i et innkjøp («soknadId/linjeId»).
export function finansierte() {
  return finansierteLinjer(tilstand.innkjop);
}

export function slettBehov(id) {
  const iBruk = tilstand.soknader.some(s => linjeliste(s).some(l => l.behovId === id));
  if (iBruk) return Promise.reject(new Error('Behovet ligger i en søknad og kan ikke slettes'));
  return lager.slett('behov', id);
}

// ——— Søknader ———

export function opprettSoknad({ giverId, tittel, frist }) {
  const giver = tilstand.givere.find(g => g.id === giverId);
  return lager.opprett('soknader', {
    giverId, tittel, frist: frist || null, sendt: null, status: 'utkast',
    soktOverstyrt: null, innvilget: null,
    // Arves fra giveren nå, kan justeres per søknad.
    momsProsent: giver?.momsTrekk ? (giver.momsProsent ?? 0) : null,
    revisjon: false, linjer: {}, utgifter: {}, dokumenter: {},
    ...signatur(),
  });
}

// En revisor kan bare skrive i sin egen oppføring (`revisorer.<nøkkel>`), og
// setter ikke «sist endret». Navn og e-post følger med, så oppføringen sier
// hvem den tilhører (reglene krever e-posten).
export function oppdaterSoknad(id, felt) {
  if (erRevisor()) {
    const sti = `revisorer.${revisornokkel(tilstand.meg.epost)}`;
    return lager.oppdater('soknader', id, { ...felt, [`${sti}.epost`]: tilstand.meg.epost, [`${sti}.navn`]: tilstand.meg.navn });
  }
  return lager.oppdater('soknader', id, { ...felt, ...signatur() });
}

// ——— Revisorer og godkjenning ———

// Krysser en revisor av eller på for søknaden. `tilgang` er listen reglene
// og revisorens spørring bruker.
export function settRevisor(soknad, epost, pa) {
  const andre = (soknad.tilgang || []).filter(e => e !== epost);
  return oppdaterSoknad(soknad.id, { tilgang: pa ? [...andre, epost] : andre });
}

export function avtrykkFor(soknad) {
  return revisjonsavtrykk(soknad, innkjopFor(soknad.id), tilstand.fakturaer);
}

// Tildelte revisorer med status. Revisorer kan ikke lese brukerlisten.
export function revisorerFor(soknad) {
  return revisorstatus(soknad, avtrykkFor(soknad), erRevisor() ? null : tilstand.brukere);
}

// Feltstien til innlogget revisors egen oppføring på søknaden.
export function minRevisorsti(soknadId, felt) {
  return `soknader/${soknadId}/revisorer.${revisornokkel(tilstand.meg.epost)}.${felt}`;
}

// Kommentarene tildelte revisorer har skrevet til en faktura.
export function kommentarerFor(soknad, fakturaId) {
  return fakturakommentarer(soknad, fakturaId, erRevisor() ? null : tilstand.brukere);
}

// Det som lagres når revisoren forlater et felt i sin egen oppføring. En
// kommentar til en faktura lagres med tidspunkt, og fjernes når feltet tømmes.
// Andre felt (merknaden) lagres som de er (null).
export function revisorfelt(sti, verdi) {
  const m = sti.match(/^(revisorer\.[^.]+\.kommentarer\.[^.]+)\.tekst$/);
  return m ? { [m[1]]: verdi ? { tekst: verdi, tid: Date.now() } : SLETT } : null;
}

// Revisoren godkjenner tallene slik de står nå.
export function godkjennRevisjon(soknad) {
  return oppdaterSoknad(soknad.id, { [`revisorer.${revisornokkel(tilstand.meg.epost)}.godkjent`]: { tid: Date.now(), avtrykk: avtrykkFor(soknad) } });
}

export function trekkGodkjenning(soknad) {
  return oppdaterSoknad(soknad.id, { [`revisorer.${revisornokkel(tilstand.meg.epost)}.godkjent`]: null });
}

// Er søknaden ikke lenger et utkast, er en ny linje «lagt til etter
// søknaden»: den endrer ikke det vi søkte om.
function etterSoknadFelt(soknad) {
  return soknad.status === 'utkast' ? {} : { etterSoknad: true, notat: '' };
}

// Et valgt behov får antall = gjenstående og behovets estimerte stykkpris.
// Prisen kopieres inn i søknaden, slik at søknaden viser det vi faktisk
// søkte om selv om estimatet i behovslisten endres senere.
export function leggBehovISoknad(soknad, behov, antall) {
  const id = nyId('l');
  return oppdaterSoknad(soknad.id, {
    [`linjer.${id}`]: {
      behovId: behov.id, tittel: '', antall, estPris: Number(behov.estPris) || 0,
      rekkefolge: nesteRekkefolge(soknad), ...etterSoknadFelt(soknad),
    },
  }).then(() => id);
}

// Flere behov på én gang (en hel type, eller alle åpne), i den rekkefølgen
// de kommer. Én skriving, så søknaden tegnes bare én gang.
export function leggFlereBehovISoknad(soknad, valg) {
  const felt = {};
  let rekkefolge = nesteRekkefolge(soknad);
  valg.forEach(({ behov, antall }, nr) => {
    felt[`linjer.${nyId('l')}${nr}`] = {
      behovId: behov.id, tittel: '', antall, estPris: Number(behov.estPris) || 0,
      rekkefolge: rekkefolge++, ...etterSoknadFelt(soknad),
    };
  });
  return Object.keys(felt).length ? oppdaterSoknad(soknad.id, felt) : Promise.resolve();
}

export function leggFriLinjeISoknad(soknad) {
  const id = nyId('l');
  return oppdaterSoknad(soknad.id, {
    [`linjer.${id}`]: { behovId: null, type: null, tittel: '', antall: 1, estPris: 0, rekkefolge: nesteRekkefolge(soknad), ...etterSoknadFelt(soknad) },
  }).then(() => id);
}

export function fjernLinje(soknadId, linjeId) {
  return oppdaterSoknad(soknadId, { [`linjer.${linjeId}`]: SLETT });
}

// Sletter søknaden, innkjøpene dens og filene de eier. Kan ikke angres.
export async function slettSoknad(soknad) {
  for (const i of tilstand.innkjop.filter(x => x.soknadId === soknad.id)) await slettInnkjop(i);
  for (const f of tilstand.fakturaer.filter(x => x.soknadId === soknad.id)) await slettFaktura(f);
  await lager.slett('soknader', soknad.id);
  for (const d of Object.values(soknad.dokumenter || {})) {
    await lager.slettFil(d.sti).catch(err => console.error('Kunne ikke slette fil', d.sti, err));
  }
}

export function innkjopFor(soknadId) {
  return tilstand.innkjop.filter(i => i.soknadId === soknadId).sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0));
}

// ——— Løse utgifter (ligger som kart på søknaden, som linjene) ———

export function leggTilUtgift(soknad, { beskrivelse, belop, dato }) {
  const id = nyId('u');
  return oppdaterSoknad(soknad.id, {
    [`utgifter.${id}`]: {
      beskrivelse, belop, dato: dato || null,
      lagtInnAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn },
      rekkefolge: nesteUtgiftsrekkefolge(soknad),
    },
  }).then(() => id);
}

export function oppdaterUtgift(soknadId, utgiftId, felt) {
  const stier = {};
  for (const [k, v] of Object.entries(felt)) stier[`utgifter.${utgiftId}.${k}`] = v;
  return oppdaterSoknad(soknadId, stier);
}

export function fjernUtgift(soknadId, utgiftId) {
  return oppdaterSoknad(soknadId, { [`utgifter.${utgiftId}`]: SLETT });
}

export async function lastOppDokument(soknadId, fil) {
  const id = nyId('d');
  const trygtNavn = fil.name.replace(/[^\w.\-æøåÆØÅ ]/g, '_');
  const sti = await lager.lastOpp(`soknader/${soknadId}/dokumenter/${id}-${trygtNavn}`, fil);
  await oppdaterSoknad(soknadId, {
    [`dokumenter.${id}`]: {
      navn: fil.name, sti, type: fil.type || '',
      lastetOppAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, tid: Date.now(),
    },
  });
}

export async function slettDokument(soknadId, dokId, sti) {
  await oppdaterSoknad(soknadId, { [`dokumenter.${dokId}`]: SLETT });
  await lager.slettFil(sti);
}

export function dokumentUrl(sti) {
  return lager.filUrl(sti);
}

// ——— Innkjøp (tilbudsmatrisen) ———

export function opprettInnkjop(soknad) {
  const eksisterende = innkjopFor(soknad.id);
  const rekkefolge = eksisterende.reduce((m, i) => Math.max(m, i.rekkefolge ?? 0), 0) + 1;
  return lager.opprett('innkjop', {
    soknadId: soknad.id, navn: `Innkjøp ${rekkefolge}`, status: 'innhenter', rekkefolge,
    linjer: {}, leverandorer: {}, priser: {}, valgt: {}, ...signatur(),
  });
}

export function oppdaterInnkjop(id, felt) {
  return lager.oppdater('innkjop', id, { ...felt, ...signatur() });
}

export async function slettInnkjop(innkjop) {
  await lager.slett('innkjop', innkjop.id);
  for (const s of leverandorer(innkjop)) for (const v of vedleggsliste(s)) {
    await lager.slettFil(v.sti).catch(err => console.error('Kunne ikke slette fil', v.sti, err));
  }
}

// Linje fra søknaden. Antallet i innkjøpet starter som antallet i søknaden,
// men kan endres fritt etterpå. Tittelen kopieres som reserve hvis linjen
// senere fjernes fra søknaden.
export function leggSoknadslinjeIInnkjop(innkjop, soknadLinje, tittel) {
  const id = nyId('l');
  return oppdaterInnkjop(innkjop.id, {
    [`linjer.${id}`]: { soknadLinjeId: soknadLinje.id, tittel, antall: Number(soknadLinje.antall) || 0, rekkefolge: nesteRekkefolgeI(innkjop.linjer) },
  }).then(() => id);
}

// Flere søknadslinjer på én gang (f.eks. en hel type).
export function leggSoknadslinjerIInnkjop(innkjop, linjer) {
  const felt = {};
  let rekkefolge = nesteRekkefolgeI(innkjop.linjer);
  for (const { soknadLinje, tittel } of linjer) {
    felt[`linjer.${nyId('l')}`] = { soknadLinjeId: soknadLinje.id, tittel, antall: Number(soknadLinje.antall) || 0, rekkefolge: rekkefolge++ };
  }
  return Object.keys(felt).length ? oppdaterInnkjop(innkjop.id, felt) : Promise.resolve();
}

// Behovet endret seg: et behov fra behovslisten legges i søknaden og rett
// inn i innkjøpet. Feiler det siste, ligger linjen igjen som «ikke fordelt».
export async function leggBehovISoknadOgInnkjop(soknad, innkjop, behov, antall) {
  const linjeId = await leggBehovISoknad(soknad, behov, antall);
  return leggSoknadslinjeIInnkjop(innkjop, { id: linjeId, antall }, behov.tittel || '');
}

export function leggFriLinjeIInnkjop(innkjop) {
  const id = nyId('l');
  return oppdaterInnkjop(innkjop.id, {
    [`linjer.${id}`]: { soknadLinjeId: null, type: null, tittel: '', antall: 1, rekkefolge: nesteRekkefolgeI(innkjop.linjer) },
  }).then(() => id);
}

// Deler en linje i to, så antallet kan fordeles på flere leverandører. Den
// nye linjen får ett stykk (antallet justeres etterpå i begge) og de samme
// prisene, men ingen valgt leverandør. Begge peker på samme linje i
// søknaden, og den nye legger seg rett under den gamle.
export function delInnkjopslinje(innkjop, linjeId) {
  const l = innkjop.linjer?.[linjeId];
  const antall = Number(l?.antall) || 0;
  if (!l || antall < 2) return Promise.resolve(null);
  const id = nyId('l');
  const felt = {
    [`linjer.${linjeId}.antall`]: antall - 1,
    [`linjer.${id}`]: { soknadLinjeId: l.soknadLinjeId ?? null, type: l.type ?? null, tittel: l.tittel || '', antall: 1, rekkefolge: (l.rekkefolge ?? 0) + 0.5 },
  };
  if (innkjop.priser?.[linjeId]) felt[`priser.${id}`] = innkjop.priser[linjeId];
  return oppdaterInnkjop(innkjop.id, felt).then(() => id);
}

export function fjernInnkjopslinje(innkjop, linjeId) {
  return oppdaterInnkjop(innkjop.id, { [`linjer.${linjeId}`]: SLETT, [`priser.${linjeId}`]: SLETT, [`valgt.${linjeId}`]: SLETT });
}

// Leverandør fra registeret legges i innkjøpet. Navn og kontakt hentes
// derfra ved visning; innkjøpet eier bare frakt og vedlegg.
export function leggTilLeverandor(innkjop, leverandorId) {
  const id = nyId('s');
  return oppdaterInnkjop(innkjop.id, {
    [`leverandorer.${id}`]: { leverandorId, frakt: 0, vedlegg: {}, rekkefolge: nesteRekkefolgeI(innkjop.leverandorer) },
  }).then(() => id);
}

// ——— Leverandørregister ———

export function opprettLeverandor(navn = '') {
  return lager.opprett('leverandorer', { navn, kontakt: '', ...signatur() });
}

export function oppdaterLeverandor(id, felt) {
  return lager.oppdater('leverandorer', id, { ...felt, ...signatur() });
}

export function slettLeverandor(id) {
  const iBruk = tilstand.innkjop.some(i => leverandorer(i).some(l => l.leverandorId === id));
  if (iBruk) return Promise.reject(new Error('Leverandøren er brukt i et innkjøp og kan ikke slettes'));
  return lager.slett('leverandorer', id);
}

export async function fjernLeverandor(innkjop, sid) {
  const felt = { [`leverandorer.${sid}`]: SLETT };
  for (const l of innkjopslinjer(innkjop)) {
    if (innkjop.priser?.[l.id]?.[sid]) felt[`priser.${l.id}.${sid}`] = SLETT;
    if (innkjop.valgt?.[l.id] === sid) felt[`valgt.${l.id}`] = SLETT;
  }
  await oppdaterInnkjop(innkjop.id, felt);
  for (const v of vedleggsliste(innkjop.leverandorer?.[sid])) {
    await lager.slettFil(v.sti).catch(err => console.error('Kunne ikke slette fil', v.sti, err));
  }
}

// Prisen lagres slik den ble skrevet («1200 -15%»); netto regnes ut ved
// visning. Blir cellen tom eller ugyldig, faller et valg av den bort.
export function settPris(innkjop, linjeId, sid, raa) {
  const felt = {};
  const tekst = String(raa ?? '').trim();
  if (tekst === '') felt[`priser.${linjeId}.${sid}`] = SLETT;
  else felt[`priser.${linjeId}.${sid}.raa`] = tekst;
  if (!tolkPris(tekst) && innkjop.valgt?.[linjeId] === sid) felt[`valgt.${linjeId}`] = SLETT;
  return oppdaterInnkjop(innkjop.id, felt);
}

// Innliming fra Excel: rutenettet legges inn fra cellen det limes i.
// `linjeIder` er linjene i den rekkefølgen matrisen viser dem.
export function settPriser(innkjop, linjeIder, fraLinjeIdx, fraSidIdx, rutenett) {
  const linjer = linjeIder.map(id => ({ id })), lev = leverandorer(innkjop);
  const felt = {};
  rutenett.forEach((rad, i) => {
    const l = linjer[fraLinjeIdx + i];
    if (!l) return;
    rad.forEach((verdi, j) => {
      const s = lev[fraSidIdx + j];
      if (!s) return;
      if (verdi === '') felt[`priser.${l.id}.${s.id}`] = SLETT;
      else felt[`priser.${l.id}.${s.id}.raa`] = verdi;
      if (!tolkPris(verdi) && innkjop.valgt?.[l.id] === s.id) felt[`valgt.${l.id}`] = SLETT;
    });
  });
  return oppdaterInnkjop(innkjop.id, felt);
}

export function velgPris(innkjop, linjeId, sid) {
  return oppdaterInnkjop(innkjop.id, { [`valgt.${linjeId}`]: innkjop.valgt?.[linjeId] === sid ? SLETT : sid });
}

export function settValgt(innkjop, valgt) {
  const felt = {};
  for (const l of innkjopslinjer(innkjop)) {
    const ny = valgt[l.id], gammel = innkjop.valgt?.[l.id];
    if (ny !== gammel) felt[`valgt.${l.id}`] = ny ?? SLETT;
  }
  return Object.keys(felt).length ? oppdaterInnkjop(innkjop.id, felt) : Promise.resolve();
}

// Med `linjeId` kobles vedlegget samtidig til den linjens pris hos leverandøren.
export async function lastOppVedlegg(innkjop, sid, fil, linjeId = null) {
  const id = nyId('v');
  const trygtNavn = fil.name.replace(/[^\w.\-æøåÆØÅ ]/g, '_');
  const sti = await lager.lastOpp(`innkjop/${innkjop.id}/vedlegg/${id}-${trygtNavn}`, fil);
  const felt = {
    [`leverandorer.${sid}.vedlegg.${id}`]: {
      navn: fil.name, sti, type: fil.type || '',
      lastetOppAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, tid: Date.now(),
    },
  };
  if (linjeId) felt[`priser.${linjeId}.${sid}.vedleggId`] = id;
  await oppdaterInnkjop(innkjop.id, felt);
}

// Priser lest fra et tilbud, lagt inn i én skriving. Hver pris kobles til
// dokumentet og siden den står på, og leverandørens egen varetekst tas med,
// så det går an å se hva prisen gjaldt.
// rader: [{ linjeId, raa, side, tekst }]. En rad med `ny: { tittel, antall }`
// i stedet for linjeId er noe leverandøren tilbyr som vi ikke har spurt om:
// den blir en ny fri linje i innkjøpet.
export function settTilbudspriser(innkjop, sid, vedleggId, rader) {
  const felt = {};
  let rekkefolge = nesteRekkefolgeI(innkjop.linjer);
  rader.forEach((r, nr) => {
    let linjeId = r.linjeId;
    if (r.ny) {
      // Linjen finnes bare fordi vi tar imot dette tilbudet, så prisen velges med én gang.
      linjeId = nyId('l') + nr;
      felt[`linjer.${linjeId}`] = { soknadLinjeId: null, tittel: r.ny.tittel, antall: r.ny.antall, rekkefolge: rekkefolge++ };
      felt[`valgt.${linjeId}`] = sid;
    }
    const sti = `priser.${linjeId}.${sid}`;
    felt[`${sti}.raa`] = r.raa;
    felt[`${sti}.vedleggId`] = vedleggId;
    felt[`${sti}.side`] = r.side;
    felt[`${sti}.tekst`] = r.tekst;
  });
  return Object.keys(felt).length ? oppdaterInnkjop(innkjop.id, felt).then(() => true) : Promise.resolve(true);
}

export async function slettVedlegg(innkjop, sid, vid, sti) {
  const felt = { [`leverandorer.${sid}.vedlegg.${vid}`]: SLETT };
  for (const l of innkjopslinjer(innkjop)) {
    if (innkjop.priser?.[l.id]?.[sid]?.vedleggId === vid) felt[`priser.${l.id}.${sid}.vedleggId`] = SLETT;
  }
  await oppdaterInnkjop(innkjop.id, felt);
  await lager.slettFil(sti);
}

// ——— Fakturaer ———
// Løpenummeret tildeles som høyeste + 1 blant søknadens fakturaer. To som
// oppretter samtidig kan i teorien få samme nummer; da rettes det for hånd.

export function fakturaerFor(soknadId) {
  return tilstand.fakturaer.filter(f => f.soknadId === soknadId).sort((a, b) => (a.lopenummer ?? 0) - (b.lopenummer ?? 0));
}

export function opprettFaktura(soknadId, felt = {}) {
  return lager.opprett('fakturaer', {
    soknadId, lopenummer: nesteLopenummer(tilstand.fakturaer, soknadId),
    leverandor: '', fakturanr: '', dato: null, belop: null, fil: null, dekker: {}, merknad: '',
    lagtInnAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, tid: Date.now(),
    ...felt, ...signatur(),
  });
}

export function oppdaterFaktura(id, felt) {
  return lager.oppdater('fakturaer', id, { ...felt, ...signatur() });
}

export async function slettFaktura(faktura) {
  await lager.slett('fakturaer', faktura.id);
  if (faktura.fil?.sti) await lager.slettFil(faktura.fil.sti).catch(err => console.error('Kunne ikke slette fil', err));
}

// Post-ID-ene har «/» (innkjopId/linjeId), som ikke kan stå i en
// Firestore-feltsti. I `dekker` lagres de derfor med «|» i stedet.
export const dekkerNokkel = postId => postId.replaceAll('/', '|');
export const dekkerPostId = nokkel => nokkel.replaceAll('|', '/');

export function settDekker(faktura, postId, pa) {
  return oppdaterFaktura(faktura.id, { [`dekker.${dekkerNokkel(postId)}`]: pa ? true : SLETT });
}

export async function lastOppFakturafil(faktura, fil) {
  const trygtNavn = fil.name.replace(/[^\w.\-æøåÆØÅ ]/g, '_');
  const sti = await lager.lastOpp(`fakturaer/${faktura.id}/${Date.now()}-${trygtNavn}`, fil);
  const gammel = faktura.fil?.sti;
  await oppdaterFaktura(faktura.id, { fil: { navn: fil.name, sti, type: fil.type || '' } });
  if (gammel) await lager.slettFil(gammel).catch(() => {});
}

export function filBytes(sti) {
  return lager.hentBytes(sti);
}

// ——— Kvittering fra mobil ———
// Filen lastes opp først, så opprettes fakturaen med den. Da finnes det
// aldri en faktura uten bilag fra mobilen.
export async function opprettKvittering(soknadId, { belop, fakturanr, fil }) {
  const id = nyId('k');
  const trygtNavn = fil.name.replace(/[^\w.\-æøåÆØÅ ]/g, '_');
  const sti = await lager.lastOpp(`fakturaer/${id}/${Date.now()}-${trygtNavn}`, fil);
  const lopenummer = nesteLopenummer(tilstand.fakturaer, soknadId);
  await lager.sett('fakturaer', id, {
    soknadId, lopenummer, leverandor: '', fakturanr: fakturanr || '', dato: new Date().toISOString().slice(0, 10),
    belop, fil: { navn: fil.name, sti, type: fil.type || '' }, dekker: {}, fraMobil: true,
    lagtInnAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, tid: Date.now(), ...signatur(),
  });
  return lopenummer;
}

// ——— Brukere (administrator) ———
// Dokument-ID er e-posten med små bokstaver; det er den innloggingen
// slås opp på. Ingen e-post sendes: administrator kopierer en lenke og
// sender den selv. Status blir «aktiv» ved første innlogging.

export function inviterBruker(epost, rolle) {
  const id = epost.trim().toLowerCase();
  if (tilstand.brukere.some(b => b.id === id)) return Promise.reject(new Error('Brukeren er alt invitert'));
  return lager.sett('brukere', id, {
    epost: id, navn: '', rolle, status: 'invitert',
    invitertAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, invitertTid: Date.now(),
  }).then(() => id);
}

export function oppdaterBruker(id, felt) {
  return lager.oppdater('brukere', id, felt);
}

export function fjernBruker(id) {
  if (id === tilstand.meg.epost) return Promise.reject(new Error('Brukeren kan ikke fjerne seg selv'));
  return lager.slett('brukere', id);
}

// Administrator sender en innloggingslenke på e-post til en bruker (for dem
// uten Google-konto). Firebase sender e-posten; portalen ser aldri lenken.
// Mottakeren skriver inn adressen sin én gang når lenken åpnes.
export function sendInnloggingslenkeTil(bruker) {
  return innlogging.sendInnloggingslenke(bruker.epost, { husk: false });
}

// Teksten administrator sender til den inviterte.
export function invitasjonstekst(bruker) {
  const url = location.origin + location.pathname;
  return `Du er invitert til Søknadsportal.\n\nGå til ${url} og logg inn med Google-kontoen din, eller be om en innloggingslenke på e-post (se i søppelpost hvis den ikke kommer). Bruk adressen ${bruker.epost}.`;
}

// ——— Manuell rekkefølge (dra og slipp) ———
// Felles typerekkefølge ligger i ett innstillingsdokument for
// organisasjonen. Behov har `rekkefolge` innenfor typen sin. Søknader har
// sin egen `typeRekkefolge`, og linjene har `rekkefolge` fra før.

// Innstillingsdokumentet for organisasjonen: felles typerekkefølge og
// kontaktinfoen som står på bestillinger (orgNavn, orgNr, kontaktperson,
// telefon, epost, adresse, leveringsadresse, fakturainfo). Alt skrives med
// flett(), så feltene ikke overskriver hverandre og dokumentet opprettes ved
// første lagring.
export function organisasjon() {
  return tilstand.innstillinger.find(i => i.id === ORGANISASJON_ID) || {};
}

export function oppdaterInnstillinger(id, felt) {
  return lager.flett('innstillinger', id, felt);
}

export function fellesTyperekkefolge() {
  return organisasjon().typeRekkefolge || [];
}

export function settFellesTyperekkefolge(typer) {
  return lager.flett('innstillinger', ORGANISASJON_ID, { typeRekkefolge: typer });
}

// Skriver ny rekkefølge for behovene i én type (og ny type for behovet som
// ble flyttet dit). Rører ikke «sist endret» — rekkefølge er ikke innhold.
export function settBehovrekkefolge(ordnetIder, { flyttetId = null, nyType = null } = {}) {
  const skrivinger = [];
  for (const [i, id] of ordnetIder.entries()) {
    const b = tilstand.behov.find(x => x.id === id);
    if (!b) continue;
    const felt = {};
    if (b.rekkefolge !== i + 1) felt.rekkefolge = i + 1;
    if (id === flyttetId && nyType != null && (b.type || '') !== nyType) felt.type = nyType;
    if (Object.keys(felt).length) skrivinger.push(lager.oppdater('behov', id, felt));
  }
  return Promise.all(skrivinger);
}

// Ny rekkefølge for linjene i én typegruppe i en søknad. Linjene bytter på
// rekkefølgetallene gruppen allerede har, så resten av søknaden er urørt.
// Flyttes en linje til en annen type, overstyres typen i søknaden (eller
// nullstilles hvis den nye typen er behovets egen).
export function settLinjerekkefolge(soknad, ordnetIder, { flyttetId = null, nyType = null } = {}) {
  const felt = {};
  const tall = ordnetIder.map(id => soknad.linjer?.[id]?.rekkefolge ?? 0).sort((a, b) => a - b);
  // Like tall (eller en linje fra en annen gruppe) → gi gruppen nye, stigende tall.
  const unike = new Set(tall).size === tall.length;
  const start = Math.max(0, ...Object.values(soknad.linjer || {}).map(l => l.rekkefolge ?? 0));
  ordnetIder.forEach((id, i) => {
    const ny = unike ? tall[i] : start + i + 1;
    if (soknad.linjer?.[id]?.rekkefolge !== ny) felt[`linjer.${id}.rekkefolge`] = ny;
  });
  if (flyttetId && nyType != null) {
    const l = soknad.linjer?.[flyttetId];
    if (l && linjetype(l, tilstand.behov) !== nyType) {
      const arvet = l.behovId ? (tilstand.behov.find(b => b.id === l.behovId)?.type || '').trim() : '';
      felt[`linjer.${flyttetId}.type`] = nyType === arvet || nyType === '' ? null : nyType;
    }
  }
  return Object.keys(felt).length ? oppdaterSoknad(soknad.id, felt) : Promise.resolve();
}

export function settSoknadTyperekkefolge(soknadId, typer) {
  return oppdaterSoknad(soknadId, { typeRekkefolge: typer });
}
