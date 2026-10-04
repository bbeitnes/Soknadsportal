// Kopiering, rydding, henting og gjenoppretting. Kjenner verken Firebase eller
// SFTP: «mal» er databasen + filene (lib/firebase.mjs, eller lib/minne.mjs i
// testene), «lager» er der arkivet ligger (lib/lager.mjs).
//
// Arkivet:
//   db/<tidspunkt>.json.gz.spk   ett kryptert øyeblikksbilde per kopi: alle
//                                dokumentene + listen over filene som fantes da
//   filer/<md5>-<størrelse>.spk  filene, kryptert, én gang per innhold
import { gzipSync, gunzipSync } from 'node:zlib';
import { krypter, dekrypter, md5, TILLEGG } from './krypto.mjs';
import { kanonisk, byttPrefiks, samlingAv } from './koding.mjs';
import { beholdes, stempel } from './oppbevaring.mjs';

const ENDELSE = '.json.gz.spk';
const blobnavn = f => `${f.md5}-${f.storrelse}.spk`;
const stille = () => {};

export function tell(dokumenter) {
  const tall = {};
  for (const d of dokumenter) tall[samlingAv(d.sti)] = (tall[samlingAv(d.sti)] || 0) + 1;
  return tall;
}

export async function taKopi({ mal, lager, passord, na = Date.now(), logg = stille }) {
  const dokumenter = await mal.lesDokumenter();
  const filer = await mal.listeFiler();
  const finnes = new Map((await lager.liste('filer')).map(f => [f.navn, f.storrelse]));
  let nye = 0;
  for (const f of filer) {
    if (finnes.get(blobnavn(f)) === f.storrelse + TILLEGG) continue;
    const innhold = await mal.lesFil(f.sti);
    if (md5(innhold) !== f.md5) throw new Error(`Filen ${f.sti} ble endret mens kopien ble tatt. Kjør på nytt.`);
    await lager.skriv(`filer/${blobnavn(f)}`, krypter(innhold, passord));
    finnes.set(blobnavn(f), f.storrelse + TILLEGG);
    nye++;
    logg(`  lastet opp ${f.sti}`);
  }
  const bilde = { versjon: 1, tatt: new Date(na).toISOString(), database: mal.database, prefiks: mal.prefiks, dokumenter, filer };
  const navn = stempel(na) + ENDELSE;
  await lager.skriv(`db/${navn}`, krypter(gzipSync(JSON.stringify(bilde)), passord));
  return { navn, bilde, nyeFiler: nye };
}

export async function listeKopier(lager) {
  return (await lager.liste('db')).map(f => f.navn).filter(n => n.endsWith(ENDELSE)).sort();
}

// Nyeste kopi, eller nyeste som begynner med datoen («2026-10-01»).
export async function velgKopi(lager, dato = '') {
  const treff = (await listeKopier(lager)).filter(n => n.startsWith(dato));
  if (!treff.length) throw new Error(dato ? `Fant ingen kopi fra ${dato} i ${lager.navn}.` : `Fant ingen kopier i ${lager.navn}.`);
  return treff.at(-1);
}

export async function lesKopi({ lager, passord, navn }) {
  const bilde = JSON.parse(gunzipSync(dekrypter(await lager.les(`db/${navn}`), passord)));
  if (bilde.versjon !== 1) throw new Error(`Ukjent versjon av kopien: ${bilde.versjon}`);
  return bilde;
}

export async function lesFilFraKopi({ lager, passord, fil }) {
  const innhold = dekrypter(await lager.les(`filer/${blobnavn(fil)}`), passord);
  if (md5(innhold) !== fil.md5) throw new Error(`Filen ${fil.sti} i kopien er skadet (feil kontrollsum).`);
  return innhold;
}

// Sletter øyeblikksbilder som er for gamle, og filer som ingen gjenværende
// øyeblikksbilder viser til. Alt leses før noe slettes.
export async function rydd({ lager, passord, na = Date.now(), logg = stille }) {
  const alle = await listeKopier(lager);
  const behold = beholdes(alle, na);
  const bort = alle.filter(n => !behold.has(n));
  if (!bort.length || !behold.size) return { slettedeKopier: 0, slettedeFiler: 0 };
  const iBruk = new Set();
  for (const navn of behold) for (const f of (await lesKopi({ lager, passord, navn })).filer) iBruk.add(blobnavn(f));
  const loseFiler = (await lager.liste('filer')).map(f => f.navn).filter(n => !iBruk.has(n));
  for (const n of bort) { await lager.slett(`db/${n}`); logg(`  ryddet bort ${n}`); }
  for (const n of loseFiler) await lager.slett(`filer/${n}`);
  return { slettedeKopier: bort.length, slettedeFiler: loseFiler.length };
}

// Kopierer ett øyeblikksbilde med filene sine fra ett lager til et annet, og
// kontrollerer at alt kan dekrypteres og har riktig kontrollsum.
export async function hentKopi({ fra, til, passord, navn, logg = stille }) {
  await til.skriv(`db/${navn}`, await fra.les(`db/${navn}`));
  const bilde = await lesKopi({ lager: til, passord, navn });
  const finnes = new Map((await til.liste('filer')).map(f => [f.navn, f.storrelse]));
  const sett = new Set();
  for (const fil of bilde.filer) {
    if (sett.has(blobnavn(fil))) continue;
    sett.add(blobnavn(fil));
    if (finnes.get(blobnavn(fil)) !== fil.storrelse + TILLEGG) {
      await til.skriv(`filer/${blobnavn(fil)}`, await fra.les(`filer/${blobnavn(fil)}`));
      logg(`  hentet ${fil.sti}`);
    }
    await lesFilFraKopi({ lager: til, passord, fil });
  }
  return bilde;
}

const dokumenterTil = (bilde, mal) => bilde.dokumenter.map(d => ({ sti: d.sti, data: byttPrefiks(d.data, bilde.prefiks, mal.prefiks) }));

// Hva en gjenoppretting vil gjøre med målet, per samling.
export async function planlegg({ mal, bilde }) {
  const na = new Map((await mal.lesDokumenter()).map(d => [d.sti, kanonisk(d.data)]));
  const onsket = dokumenterTil(bilde, mal);
  const plan = {};
  const rad = s => (plan[s] ||= { nye: 0, endret: 0, like: 0, slettes: 0 });
  for (const d of onsket) {
    const r = rad(samlingAv(d.sti));
    if (!na.has(d.sti)) r.nye++; else if (na.get(d.sti) === kanonisk(d.data)) r.like++; else r.endret++;
    na.delete(d.sti);
  }
  for (const sti of na.keys()) rad(samlingAv(sti)).slettes++;
  const filerNa = new Map((await mal.listeFiler()).map(f => [f.sti, f.md5]));
  const filer = { nye: 0, endret: 0, like: 0, slettes: 0 };
  for (const f of bilde.filer) {
    if (!filerNa.has(f.sti)) filer.nye++; else if (filerNa.get(f.sti) === f.md5) filer.like++; else filer.endret++;
    filerNa.delete(f.sti);
  }
  filer.slettes = filerNa.size;
  return { samlinger: plan, filer };
}

// Gjør målet nøyaktig likt kopien. Med tomForst slettes alt i målet først, og
// hver fil hentes fra arkivet – slik restore-testen beviser at arkivet er helt.
export async function gjenopprett({ mal, lager, passord, bilde, tomForst = false, logg = stille }) {
  const onsket = dokumenterTil(bilde, mal);
  const stier = new Set(onsket.map(d => d.sti));
  const dokNa = await mal.lesDokumenter();
  await mal.slettDokumenter(dokNa.map(d => d.sti).filter(sti => tomForst || !stier.has(sti)));
  let filerNa = await mal.listeFiler();
  if (tomForst) { for (const f of filerNa) await mal.slettFil(f.sti); filerNa = []; }
  await mal.skrivDokumenter(onsket);

  const har = new Map(filerNa.map(f => [f.sti, f.md5]));
  let skrevet = 0;
  for (const fil of bilde.filer) {
    if (har.get(fil.sti) !== fil.md5) {
      await mal.skrivFil(fil.sti, await lesFilFraKopi({ lager, passord, fil }), fil.type);
      skrevet++;
      logg(`  la tilbake ${fil.sti}`);
    }
    har.delete(fil.sti);
  }
  for (const sti of har.keys()) await mal.slettFil(sti);
  return { dokumenter: onsket.length, filerSkrevet: skrevet };
}

// Leser målet på nytt og sammenligner med kopien: antall og innhold per samling, filer med kontrollsum.
export async function kontroller({ mal, bilde }) {
  const onsket = new Map(dokumenterTil(bilde, mal).map(d => [d.sti, kanonisk(d.data)]));
  const faktisk = await mal.lesDokumenter();
  const samlinger = {};
  const rad = s => (samlinger[s] ||= { kopi: 0, lagtTilbake: 0, avvik: 0 });
  for (const sti of onsket.keys()) rad(samlingAv(sti)).kopi++;
  for (const d of faktisk) {
    const r = rad(samlingAv(d.sti));
    r.lagtTilbake++;
    if (onsket.get(d.sti) !== kanonisk(d.data)) r.avvik++;
    onsket.delete(d.sti);
  }
  for (const sti of onsket.keys()) rad(samlingAv(sti)).avvik++;

  const filerNa = new Map((await mal.listeFiler()).map(f => [f.sti, f.md5]));
  const filer = { kopi: bilde.filer.length, lagtTilbake: filerNa.size, avvik: 0 };
  for (const f of bilde.filer) { if (filerNa.get(f.sti) !== f.md5) filer.avvik++; filerNa.delete(f.sti); }
  filer.avvik += filerNa.size;

  const ok = filer.avvik === 0 && filer.kopi === filer.lagtTilbake
    && Object.values(samlinger).every(r => r.avvik === 0 && r.kopi === r.lagtTilbake);
  return { samlinger, filer, ok };
}
