// Datalaget: holder levende kopier av samlingene og har alle skriveoperasjoner.
// Sider leser `tilstand` og kaller funksjonene her — de importerer aldri
// lager/Firebase selv.
//
// Hver skriving oppdaterer bare feltene som faktisk er endret (med punktum-
// stier for søknadslinjer), så to som redigerer samtidig bare overskriver
// hverandre på samme felt: siste lagring per felt vinner.
import { lager, innlogging, SLETT } from './lager.js';
import { linjeliste, nesteRekkefolge, nesteUtgiftsrekkefolge, nesteRekkefolgeI, tolkPris, innkjopslinjer, leverandorer, vedleggsliste } from './beregning.js';

export { innlogging };

export const tilstand = {
  meg: null,        // { epost, navn, rolle, status }
  givere: [],
  behov: [],
  soknader: [],
  innkjop: [],
  lastet: new Set(),
};

const SAMLINGER = ['givere', 'behov', 'soknader', 'innkjop'];

export function erAdmin() {
  return tilstand.meg?.rolle === 'administrator';
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

export function startLytting(vedEndring, vedFeil) {
  const avmeld = SAMLINGER.map(samling => lager.lytt(samling, liste => {
    tilstand[samling] = liste;
    tilstand.lastet.add(samling);
    vedEndring(samling);
  }, vedFeil));
  return () => avmeld.forEach(f => f());
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
  return lager.opprett('behov', { tittel: '', beskrivelse: '', antall: 1, estPris: 0, statusOverstyring: null, ...signatur() });
}

export function oppdaterBehov(id, felt) {
  return lager.oppdater('behov', id, { ...felt, ...signatur() });
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

export function oppdaterSoknad(id, felt) {
  return lager.oppdater('soknader', id, { ...felt, ...signatur() });
}

// Et valgt behov får antall = gjenstående og behovets estimerte stykkpris.
// Prisen kopieres inn i søknaden, slik at søknaden viser det vi faktisk
// søkte om selv om estimatet i behovslisten endres senere.
export function leggBehovISoknad(soknad, behov, antall) {
  const id = nyId('l');
  return oppdaterSoknad(soknad.id, {
    [`linjer.${id}`]: {
      behovId: behov.id, tittel: '', antall, estPris: Number(behov.estPris) || 0,
      finansieres: false, rekkefolge: nesteRekkefolge(soknad),
    },
  }).then(() => id);
}

export function leggFriLinjeISoknad(soknad) {
  const id = nyId('l');
  return oppdaterSoknad(soknad.id, {
    [`linjer.${id}`]: { behovId: null, tittel: '', antall: 1, estPris: 0, finansieres: false, rekkefolge: nesteRekkefolge(soknad) },
  }).then(() => id);
}

export function oppdaterLinje(soknadId, linjeId, felt) {
  const stier = {};
  for (const [k, v] of Object.entries(felt)) stier[`linjer.${linjeId}.${k}`] = v;
  return oppdaterSoknad(soknadId, stier);
}

export function fjernLinje(soknadId, linjeId) {
  return oppdaterSoknad(soknadId, { [`linjer.${linjeId}`]: SLETT });
}

// Sletter søknaden, innkjøpene dens og filene de eier. Kan ikke angres.
export async function slettSoknad(soknad) {
  for (const i of tilstand.innkjop.filter(x => x.soknadId === soknad.id)) await slettInnkjop(i);
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

export function leggFriLinjeIInnkjop(innkjop) {
  const id = nyId('l');
  return oppdaterInnkjop(innkjop.id, {
    [`linjer.${id}`]: { soknadLinjeId: null, tittel: '', antall: 1, rekkefolge: nesteRekkefolgeI(innkjop.linjer) },
  }).then(() => id);
}

export function fjernInnkjopslinje(innkjop, linjeId) {
  return oppdaterInnkjop(innkjop.id, { [`linjer.${linjeId}`]: SLETT, [`priser.${linjeId}`]: SLETT, [`valgt.${linjeId}`]: SLETT });
}

export function leggTilLeverandor(innkjop) {
  const id = nyId('s');
  return oppdaterInnkjop(innkjop.id, {
    [`leverandorer.${id}`]: { navn: '', kontakt: '', frakt: 0, vedlegg: {}, rekkefolge: nesteRekkefolgeI(innkjop.leverandorer) },
  }).then(() => id);
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
export function settPriser(innkjop, fraLinjeIdx, fraSidIdx, rutenett) {
  const linjer = innkjopslinjer(innkjop), lev = leverandorer(innkjop);
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

export async function lastOppVedlegg(innkjop, sid, fil) {
  const id = nyId('v');
  const trygtNavn = fil.name.replace(/[^\w.\-æøåÆØÅ ]/g, '_');
  const sti = await lager.lastOpp(`innkjop/${innkjop.id}/vedlegg/${id}-${trygtNavn}`, fil);
  await oppdaterInnkjop(innkjop.id, {
    [`leverandorer.${sid}.vedlegg.${id}`]: {
      navn: fil.name, sti, type: fil.type || '',
      lastetOppAv: { epost: tilstand.meg.epost, navn: tilstand.meg.navn }, tid: Date.now(),
    },
  });
}

export async function slettVedlegg(innkjop, sid, vid, sti) {
  const felt = { [`leverandorer.${sid}.vedlegg.${vid}`]: SLETT };
  for (const l of innkjopslinjer(innkjop)) {
    if (innkjop.priser?.[l.id]?.[sid]?.vedleggId === vid) felt[`priser.${l.id}.${sid}.vedleggId`] = SLETT;
  }
  await oppdaterInnkjop(innkjop.id, felt);
  await lager.slettFil(sti);
}
