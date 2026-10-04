// Sikkerhetskopi og gjenoppretting (backup/) mot database og filer i minnet
// og et arkiv i en midlertidig mappe. Ingen nettverk, ingen ekte data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { krypter, dekrypter, TILLEGG } from '../backup/lib/krypto.mjs';
import { kod, dekod, kanonisk, byttPrefiks } from '../backup/lib/koding.mjs';
import { beholdes, stempel } from '../backup/lib/oppbevaring.mjs';
import { LokalLager } from '../backup/lib/lager.mjs';
import { MinneMal } from '../backup/lib/minne.mjs';
import { flettStatus } from '../backup/lib/status.mjs';
import { taKopi, rydd, listeKopier, velgKopi, lesKopi, hentKopi, planlegg, gjenopprett, kontroller } from '../backup/lib/kjerne.mjs';

const PASSORD = 'riktig hest batteri';
const DOGN = 24 * 3600 * 1000;

async function medArkiv(t) {
  const mappe = await mkdtemp(path.join(tmpdir(), 'kopi-'));
  t.after(() => rm(mappe, { recursive: true, force: true }));
  return new LokalLager(mappe);
}

async function prod() {
  const mal = new MinneMal('soknadsportal', 'soknadsportal/prod');
  await mal.skrivDokumenter([
    { sti: 'soknader/s1', data: { tittel: 'Nye horn', linjer: { a: { antall: 2 } }, dokumenter: { d1: { sti: 'soknadsportal/prod/soknader/s1/soknad.pdf' } } } },
    { sti: 'fakturaer/f1', data: { belop: 8060.8, fil: 'soknadsportal/prod/fakturaer/f1/1-faktura.pdf' } },
    { sti: 'brukere/kari@example.com', data: { rolle: 'administrator' } },
  ]);
  await mal.skrivFil('soknader/s1/soknad.pdf', Buffer.from('søknadstekst'), 'application/pdf');
  await mal.skrivFil('fakturaer/f1/1-faktura.pdf', Buffer.from('faktura 1'), 'application/pdf');
  return mal;
}

test('kryptering: riktig passord gir innholdet tilbake, feil passord og skadet fil gir feil', () => {
  const kryptert = krypter(Buffer.from('hemmelig'), PASSORD);
  assert.equal(kryptert.length, 8 + TILLEGG);
  assert.ok(!kryptert.includes('hemmelig'));
  assert.equal(dekrypter(kryptert, PASSORD).toString(), 'hemmelig');
  assert.throws(() => dekrypter(kryptert, 'feil'), /feil passord/);
  kryptert[40] ^= 1;
  assert.throws(() => dekrypter(kryptert, PASSORD), /skadet/);
  assert.throws(() => dekrypter(Buffer.from('ikke en kopi i det hele tatt, bare tekst som er lang nok'), PASSORD), /filformat/);
});

test('koding: Firestore-typer overlever turen gjennom JSON', () => {
  class Tid { constructor(s, n) { this.seconds = s; this.nanoseconds = n; } toMillis() { return this.seconds * 1000; } }
  const typer = { tid: (s, n) => new Tid(s, n), geo: (lat, lng) => ({ lat, lng }), ref: sti => ({ ref: sti }) };
  const data = { tekst: 'a', tall: 8060.8, tom: null, liste: [1, { x: true }], nar: new Tid(1700000000, 5), ikkeTall: NaN, bytes: new Uint8Array([1, 2, 3]) };
  const tilbake = dekod(JSON.parse(JSON.stringify(kod(data))), typer);
  assert.ok(tilbake.nar instanceof Tid);
  assert.deepEqual([tilbake.nar.seconds, tilbake.nar.nanoseconds], [1700000000, 5]);
  assert.ok(Number.isNaN(tilbake.ikkeTall));
  assert.deepEqual([...tilbake.bytes], [1, 2, 3]);
  assert.deepEqual(tilbake.liste, [1, { x: true }]);
  assert.equal(kanonisk({ b: 1, a: [2, { d: 1, c: 2 }] }), kanonisk({ a: [2, { c: 2, d: 1 }], b: 1 }));
  assert.throws(() => kod({ rar: new Map() }), /Ukjent Firestore-type/);
});

test('byttPrefiks: bare filstier under det gamle prefikset endres', () => {
  const d = { fil: 'soknadsportal/prod/fakturaer/f1/a.pdf', tekst: 'soknadsportal/produkt', liste: ['soknadsportal/prod/x'] };
  assert.deepEqual(byttPrefiks(d, 'soknadsportal/prod', 'soknadsportal/restore'),
    { fil: 'soknadsportal/restore/fakturaer/f1/a.pdf', tekst: 'soknadsportal/produkt', liste: ['soknadsportal/restore/x'] });
});

test('oppbevaring: 30 daglige, første i hver måned i 12 måneder, og alltid den nyeste', () => {
  const na = Date.parse('2026-10-04T03:00:00Z');
  const navn = dato => `${dato}T021700Z.json.gz.spk`;
  const alle = ['2025-09-01', '2025-11-01', '2025-11-02', '2026-08-01', '2026-08-15', '2026-09-03', '2026-09-04', '2026-09-05', '2026-10-04'].map(navn);
  assert.deepEqual([...beholdes(alle, na)].sort(),
    ['2025-11-01', '2026-08-01', '2026-09-03', '2026-09-05', '2026-10-04'].map(navn));
  // 3. og 4. september er eldre enn 30 døgn; 3. beholdes som første kopi i september.
  assert.deepEqual([...beholdes([navn('2024-01-01')], na)], [navn('2024-01-01')]);
  assert.equal(stempel(na), '2026-10-04T030000Z');
});

test('kopi → restore: målet blir likt kopien, filstiene peker på restore-prefikset, prod er urørt', async t => {
  const lager = await medArkiv(t);
  const kilde = await prod();
  const for_ = kanonisk(await kilde.lesDokumenter());
  const { navn, nyeFiler } = await taKopi({ mal: kilde, lager, passord: PASSORD });
  assert.equal(nyeFiler, 2);
  // Ingenting i arkivet er lesbart uten passordet.
  assert.ok(!(await lager.les(`db/${navn}`)).includes('Nye horn'));

  const restore = new MinneMal('soknadsportal-restore', 'soknadsportal/restore');
  await restore.skrivDokumenter([{ sti: 'soknader/gammel', data: { tittel: 'Fra forrige test' } }]);
  await restore.skrivFil('rester.txt', Buffer.from('x'), 'text/plain');
  const bilde = await lesKopi({ lager, passord: PASSORD, navn: await velgKopi(lager) });
  await gjenopprett({ mal: restore, lager, passord: PASSORD, bilde, tomForst: true });

  const k = await kontroller({ mal: restore, bilde });
  assert.equal(k.ok, true);
  assert.deepEqual(k.samlinger.soknader, { kopi: 1, lagtTilbake: 1, avvik: 0 });
  assert.deepEqual(k.filer, { kopi: 2, lagtTilbake: 2, avvik: 0 });
  assert.equal(restore.dok.get('fakturaer/f1').fil, 'soknadsportal/restore/fakturaer/f1/1-faktura.pdf');
  assert.equal((await restore.lesFil('fakturaer/f1/1-faktura.pdf')).toString(), 'faktura 1');
  assert.equal(restore.filer.get('fakturaer/f1/1-faktura.pdf').type, 'application/pdf');
  assert.equal(restore.dok.has('soknader/gammel'), false);
  assert.equal(restore.filer.has('rester.txt'), false);
  assert.equal(kanonisk(await kilde.lesDokumenter()), for_);
});

test('kontroll: avvik i dokument, manglende fil og ekstra dokument oppdages', async t => {
  const lager = await medArkiv(t);
  const { bilde } = await taKopi({ mal: await prod(), lager, passord: PASSORD });
  const mal = new MinneMal('soknadsportal-restore', 'soknadsportal/restore');
  await gjenopprett({ mal, lager, passord: PASSORD, bilde });
  mal.dok.get('soknader/s1').tittel = 'Endret';
  mal.dok.set('givere/g9', { navn: 'Ekstra' });
  mal.filer.delete('soknader/s1/soknad.pdf');
  const k = await kontroller({ mal, bilde });
  assert.equal(k.ok, false);
  assert.equal(k.samlinger.soknader.avvik, 1);
  assert.deepEqual(k.samlinger.givere, { kopi: 0, lagtTilbake: 1, avvik: 1 });
  assert.equal(k.filer.avvik, 1);
});

test('gjenoppretting til prod: planen viser nye, endrede og slettede, og prod blir nøyaktig som kopien', async t => {
  const lager = await medArkiv(t);
  const mal = await prod();
  const { bilde } = await taKopi({ mal, lager, passord: PASSORD });
  // Etter kopien: en søknad endres, en faktura slettes med filen sin, en bruker og en fil kommer til.
  mal.dok.get('soknader/s1').tittel = 'Ødelagt';
  mal.dok.delete('fakturaer/f1');
  mal.filer.delete('fakturaer/f1/1-faktura.pdf');
  mal.dok.set('brukere/ny@example.com', { rolle: 'bruker' });
  await mal.skrivFil('fakturaer/f2/ny.pdf', Buffer.from('ny'), 'application/pdf');

  const plan = await planlegg({ mal, bilde });
  assert.deepEqual(plan.samlinger.soknader, { nye: 0, endret: 1, like: 0, slettes: 0 });
  assert.deepEqual(plan.samlinger.fakturaer, { nye: 1, endret: 0, like: 0, slettes: 0 });
  assert.deepEqual(plan.samlinger.brukere, { nye: 0, endret: 0, like: 1, slettes: 1 });
  assert.deepEqual(plan.filer, { nye: 1, endret: 0, like: 1, slettes: 1 });

  const r = await gjenopprett({ mal, lager, passord: PASSORD, bilde });
  assert.equal(r.filerSkrevet, 1);
  assert.equal((await kontroller({ mal, bilde })).ok, true);
  assert.equal(mal.dok.has('brukere/ny@example.com'), false);
  assert.equal(mal.dok.get('fakturaer/f1').fil, 'soknadsportal/prod/fakturaer/f1/1-faktura.pdf');
});

test('en fil som er slettet i portalen følger med når en eldre kopi gjenopprettes', async t => {
  const lager = await medArkiv(t);
  const mal = await prod();
  const dag1 = Date.parse('2026-10-01T02:17:00Z');
  const forste = await taKopi({ mal, lager, passord: PASSORD, na: dag1 });
  await mal.slettFil('fakturaer/f1/1-faktura.pdf');
  const andre = await taKopi({ mal, lager, passord: PASSORD, na: dag1 + DOGN });
  assert.equal(andre.nyeFiler, 0);
  assert.equal(andre.bilde.filer.length, 1);
  await rydd({ lager, passord: PASSORD, na: dag1 + DOGN });
  assert.equal((await lager.liste('filer')).length, 2);

  const restore = new MinneMal('soknadsportal-restore', 'soknadsportal/restore');
  const bilde = await lesKopi({ lager, passord: PASSORD, navn: await velgKopi(lager, '2026-10-01') });
  await gjenopprett({ mal: restore, lager, passord: PASSORD, bilde, tomForst: true });
  assert.equal((await restore.lesFil('fakturaer/f1/1-faktura.pdf')).toString(), 'faktura 1');
  assert.equal(forste.navn, '2026-10-01T021700Z.json.gz.spk');
});

test('rydding: gamle kopier og filer ingen kopi viser til forsvinner – den nyeste blir alltid igjen', async t => {
  const lager = await medArkiv(t);
  const mal = await prod();
  const start = Date.parse('2026-08-10T02:17:00Z');
  await taKopi({ mal, lager, passord: PASSORD, na: start });                 // første i august: beholdes som månedlig
  await mal.skrivFil('fakturaer/f3/kort.pdf', Buffer.from('levde kort'), 'application/pdf');
  await taKopi({ mal, lager, passord: PASSORD, na: start + DOGN });          // eneste kopi med f3
  await mal.slettFil('fakturaer/f3/kort.pdf');
  await taKopi({ mal, lager, passord: PASSORD, na: start + 40 * DOGN });
  assert.equal((await lager.liste('filer')).length, 3);

  const r = await rydd({ lager, passord: PASSORD, na: start + 40 * DOGN });
  assert.deepEqual(r, { slettedeKopier: 1, slettedeFiler: 1 });
  assert.deepEqual(await listeKopier(lager), ['2026-08-10T021700Z.json.gz.spk', '2026-09-19T021700Z.json.gz.spk']);
  assert.equal((await lager.liste('filer')).length, 2);

  // Mange år senere: alt er for gammelt, men én kopi blir stående.
  await rydd({ lager, passord: PASSORD, na: start + 2000 * DOGN });
  assert.deepEqual(await listeKopier(lager), ['2026-09-19T021700Z.json.gz.spk']);
});

test('hent til Mac: kopien kan brukes som kilde, og en skadet fil i arkivet stopper hentingen', async t => {
  const proisp = await medArkiv(t), mac = await medArkiv(t);
  const { navn } = await taKopi({ mal: await prod(), lager: proisp, passord: PASSORD });
  const bilde = await hentKopi({ fra: proisp, til: mac, passord: PASSORD, navn });
  assert.equal(bilde.filer.length, 2);
  const restore = new MinneMal('soknadsportal-restore', 'soknadsportal/restore');
  await gjenopprett({ mal: restore, lager: mac, passord: PASSORD, bilde, tomForst: true });
  assert.equal((await kontroller({ mal: restore, bilde })).ok, true);

  const [blob] = await proisp.liste('filer');
  const sti = path.join(proisp.rot, 'filer', blob.navn);
  const innhold = await readFile(sti);
  innhold[innhold.length - 20] ^= 1;
  await writeFile(sti, innhold);
  await assert.rejects(hentKopi({ fra: proisp, til: await medArkiv(t), passord: PASSORD, navn }), /skadet/);
  await assert.rejects(lesKopi({ lager: proisp, passord: 'feil passord', navn }), /feil passord/);
});

test('en avbrutt opplasting (feil størrelse) lastes opp på nytt ved neste kopi', async t => {
  const lager = await medArkiv(t);
  const mal = await prod();
  await taKopi({ mal, lager, passord: PASSORD, na: 1e12 });
  const [blob] = await lager.liste('filer');
  await writeFile(path.join(lager.rot, 'filer', blob.navn), Buffer.from('halv'));
  const { nyeFiler, bilde } = await taKopi({ mal, lager, passord: PASSORD, na: 1e12 + DOGN });
  assert.equal(nyeFiler, 1);
  const restore = new MinneMal('soknadsportal-restore', 'soknadsportal/restore');
  await gjenopprett({ mal: restore, lager, passord: PASSORD, bilde, tomForst: true });
  assert.equal((await kontroller({ mal: restore, bilde })).ok, true);
});

test('statusfilen: jobbene oppdaterer hver sin del, og bare tidspunkt, antall og bestått slipper gjennom (B-26)', () => {
  const kopi = { tatt: '2026-10-05T02:17:00.000Z', dokumenter: 122, filer: 24 };
  const etterKopi = flettStatus(null, { kopi: { ...kopi, hemmelig: 'kari@example.com' } });
  assert.deepEqual(etterKopi, { kopi });
  const etterTest = flettStatus({ ...etterKopi, annet: 'skal bort' }, { restoreTest: { kjort: '2026-10-01T03:43:00.000Z', bestatt: true, sti: 'x' } });
  assert.deepEqual(etterTest, { kopi, restoreTest: { kjort: '2026-10-01T03:43:00.000Z', bestatt: true } });
  const nyKopi = flettStatus(etterTest, { kopi: { ...kopi, tatt: '2026-10-06T02:17:00.000Z' } });
  assert.equal(nyKopi.restoreTest.bestatt, true);
  assert.equal(nyKopi.kopi.tatt, '2026-10-06T02:17:00.000Z');
});
