// Datalaget: holder levende kopier av samlingene og har alle skriveoperasjoner.
// Sider leser `tilstand` og kaller funksjonene her — de importerer aldri
// lager/Firebase selv.
//
// Hver skriving oppdaterer bare feltene som faktisk er endret (med punktum-
// stier for søknadslinjer), så to som redigerer samtidig bare overskriver
// hverandre på samme felt: siste lagring per felt vinner.
import { lager, innlogging, SLETT } from './lager.js';
import { linjeliste, nesteRekkefolge } from './beregning.js';

export { innlogging };

export const tilstand = {
  meg: null,        // { epost, navn, rolle, status }
  givere: [],
  behov: [],
  soknader: [],
  lastet: new Set(),
};

const SAMLINGER = ['givere', 'behov', 'soknader'];

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
    soktOverstyrt: null,
    // Arves fra giveren nå, kan justeres per søknad (trinn b).
    momsProsent: giver?.momsTrekk ? (giver.momsProsent ?? 0) : null,
    revisjon: false, linjer: {}, dokumenter: {},
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
