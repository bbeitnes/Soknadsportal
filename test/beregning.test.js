// Kjøres med: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kr, tolkTall, tolkDato, datoFelt, tidspunkt, fornavn } from '../app/ui/format.js';
import {
  linjeliste, sumEstimert, soktBelop, behovsinfo, velgbareBehov, SOKNADSFILTRE, nesteRekkefolge, finansierteLinjer,
} from '../app/data/beregning.js';

test('kr viser alltid to desimaler, med hardt mellomrom som tusenskille', async () => {
  const { heltall } = await import('../app/ui/format.js');
  assert.equal(kr(12000), '12 000,00');
  assert.equal(kr(1234567), '1 234 567,00');
  assert.equal(kr(0), '0,00');
  assert.equal(kr(-1500), '−1 500,00');
  assert.equal(kr(999.6), '999,60');
  assert.equal(heltall(12000), '12 000');
  assert.equal(heltall(999.6), '1 000');
});

test('tolkTall tåler tusenskille og kr', () => {
  assert.equal(tolkTall('12 000'), 12000);
  assert.equal(tolkTall('12 000 kr'), 12000);
  assert.equal(tolkTall(''), null);
  assert.ok(Number.isNaN(tolkTall('abc')));
  assert.ok(Number.isNaN(tolkTall('-5')));
});

test('tolkDato godtar norske formater', () => {
  assert.equal(tolkDato('15.03.2026'), '2026-03-15');
  assert.equal(tolkDato('15.3.26'), '2026-03-15');
  assert.equal(tolkDato('2026-03-15'), '2026-03-15');
  assert.equal(tolkDato('290926'), '2026-09-29');
  assert.equal(tolkDato('29092026'), '2026-09-29');
  assert.ok(Number.isNaN(tolkDato('2909')));
  assert.ok(Number.isNaN(tolkDato('320926')));
  assert.equal(tolkDato(''), null);
  assert.ok(Number.isNaN(tolkDato('31.02.2026')));
  assert.ok(Number.isNaN(tolkDato('i morgen')));
  assert.equal(datoFelt('2026-03-15'), '15.03.2026');
});

test('tidspunkt viser i dag / i går / dato', () => {
  const naa = new Date(2026, 8, 29, 15, 0).getTime();
  assert.equal(tidspunkt(new Date(2026, 8, 29, 14, 2).getTime(), naa), 'i dag 14:02');
  assert.equal(tidspunkt(new Date(2026, 8, 28, 9, 5).getTime(), naa), 'i går 09:05');
  assert.equal(tidspunkt(new Date(2026, 5, 12).getTime(), naa), '12. juni');
  assert.equal(tidspunkt(new Date(2025, 11, 3).getTime(), naa), '3. desember 2025');
  assert.equal(fornavn('Kari Nordmann', 'k@x.no'), 'Kari');
  assert.equal(fornavn('', 'kasserer@korpset.no'), 'kasserer');
});

const soknad = (id, status, linjer, ekstra = {}) => ({ id, status, linjer, ...ekstra });

test('linjer sorteres og summeres', () => {
  const s = soknad('s1', 'utkast', {
    b: { tittel: 'B', antall: 2, estPris: 1000, rekkefolge: 2 },
    a: { tittel: 'A', antall: 4, estPris: 8500, rekkefolge: 1 },
  });
  assert.deepEqual(linjeliste(s).map(l => l.id), ['a', 'b']);
  assert.equal(sumEstimert(s), 36000);
  assert.equal(soktBelop(s), 36000);
  assert.equal(soktBelop({ ...s, soktOverstyrt: 30000 }), 30000);
  assert.equal(soktBelop({ ...s, soktOverstyrt: 0 }), 0);
  assert.equal(nesteRekkefolge(s), 3);
  assert.equal(nesteRekkefolge({}), 1);
});

test('behovsstatus følger søknadene', () => {
  const behov = { id: 'k', antall: 6, estPris: 8500 };
  assert.equal(behovsinfo(behov, []).status, 'Ikke søkt');
  assert.equal(behovsinfo(behov, []).gjenstarKr, 51000);

  const sendt = soknad('s1', 'sendt', { l: { behovId: 'k', antall: 4 } });
  const info = behovsinfo(behov, [sendt]);
  assert.equal(info.status, 'Søkt');
  assert.equal(info.iSoknader, 4);

  // Finansiert = det er valgt en pris for linjen hos en leverandør i et innkjøp.
  const innvilget = { ...sendt, status: 'innvilget' };
  assert.equal(behovsinfo(behov, [innvilget]).status, 'Søkt');
  const innkjopet = { soknadId: 's1', linjer: { a: { soknadLinjeId: 'l', antall: 4 }, fri: { antall: 1 } }, leverandorer: { x: {} }, priser: { a: { x: { raa: '8000' } }, fri: { x: { raa: '10' } } }, valgt: { fri: 'x' } };
  assert.deepEqual([...finansierteLinjer([innkjopet])], []); // pris, men ikke valgt
  const valgt = finansierteLinjer([{ ...innkjopet, valgt: { a: 'x', fri: 'x' } }]);
  assert.deepEqual([...valgt], ['s1/l']);
  const finansiert = behovsinfo(behov, [innvilget], 0, valgt);
  assert.equal(finansiert.status, 'Finansiert');
  assert.equal(finansiert.finansiertI(finansiert.bruk[0]), true);
  assert.equal(behovsinfo(behov, [innvilget], 4, valgt).status, 'Delvis anskaffet'); // kjøpt går foran

  const avslatt = soknad('s2', 'avslatt', { l: { behovId: 'k', antall: 6 } });
  const iAvslatt = behovsinfo(behov, [avslatt], 0, new Set(['s2/l']));
  assert.equal(iAvslatt.status, 'Ikke søkt');
  assert.equal(iAvslatt.iSoknader, 0);
  assert.equal(iAvslatt.bruk.length, 1); // vises fortsatt
});

test('anskaffet og overstyring', () => {
  const behov = { id: 'k', antall: 6, estPris: 100 };
  assert.equal(behovsinfo(behov, [], 4).status, 'Delvis anskaffet');
  assert.equal(behovsinfo(behov, [], 4).gjenstar, 2);
  const ferdig = behovsinfo(behov, [], 6);
  assert.equal(ferdig.status, 'Anskaffet');
  assert.equal(ferdig.erApent, false);

  const trengsIkke = behovsinfo({ ...behov, statusOverstyring: 'trengs-ikke' }, []);
  assert.equal(trengsIkke.status, 'Trengs ikke');
  assert.equal(trengsIkke.autostatus, 'Ikke søkt');
  assert.equal(trengsIkke.erApent, false);
});

test('velgbare behov: åpne og ikke allerede i søknaden', () => {
  const behov = [
    { id: 'a', antall: 2, estPris: 1 },
    { id: 'b', antall: 1, estPris: 1 },
    { id: 'c', antall: 1, estPris: 1, statusOverstyring: 'trengs-ikke' },
  ];
  const s = soknad('s1', 'utkast', { l: { behovId: 'a', antall: 2 } });
  assert.deepEqual(velgbareBehov(behov, [s], s).map(x => x.behov.id), ['b']);
});

test('søknadsfiltre', () => {
  const alle = ['utkast', 'sendt', 'innvilget', 'avslatt', 'avsluttet'].map(status => ({ status }));
  const tell = f => alle.filter(SOKNADSFILTRE[f]).length;
  assert.equal(tell('aktive'), 3);
  assert.equal(tell('innvilget'), 1);
  assert.equal(tell('venter'), 2);
  assert.equal(tell('lukket'), 2);
  assert.equal(tell('alle'), 5);
});

test('momskompensasjon: giverandel og forslag til søkt beløp', async () => {
  const { giverandel, soktForslag, soktBelop, momsProsent, harMoms } = await import('../app/data/beregning.js');
  assert.equal(giverandel(1000, 8), 920);
  assert.equal(giverandel(1000, null), 1000);
  assert.equal(giverandel(1000, 0), 1000);
  const s = soknad('s1', 'utkast', { l: { antall: 1, estPris: 1000 } }, { momsProsent: 8 });
  assert.equal(soktForslag(s), 920);
  assert.equal(soktBelop(s), 920);
  assert.equal(soktBelop({ ...s, soktOverstyrt: 900 }), 900);
  assert.equal(harMoms(s), true);
  assert.equal(harMoms({ ...s, momsProsent: null }), false);
  assert.equal(momsProsent({ ...s, momsProsent: '8' }), 8);
  assert.equal(soktForslag({ ...s, momsProsent: null }), 1000);
});

test('pott: disponert er giverens andel, moms kommer neste år', async () => {
  const { pott, sumUtgifter, utgiftsliste, nesteUtgiftsrekkefolge } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', { l: { antall: 1, estPris: 1000 } }, {
    momsProsent: 8, innvilget: 5000,
    utgifter: { b: { belop: 1000, rekkefolge: 2 }, a: { belop: 500, rekkefolge: 1 } },
  });
  assert.deepEqual(utgiftsliste(s).map(u => u.id), ['a', 'b']);
  assert.equal(sumUtgifter(s), 1500);
  assert.equal(nesteUtgiftsrekkefolge(s), 3);
  const p = pott(s);
  assert.equal(p.disponertFull, 1500);
  assert.equal(p.disponert, 1380);
  assert.equal(p.moms, 120);
  assert.equal(p.gjenstar, 3620);
  assert.equal(p.giverProsent, 92);

  const utenMoms = pott({ ...s, momsProsent: null });
  assert.equal(utenMoms.disponert, 1500);
  assert.equal(utenMoms.moms, 0);
  assert.equal(utenMoms.gjenstar, 3500);

  const ikkeInnvilget = pott({ ...s, innvilget: null });
  assert.equal(ikkeInnvilget.gjenstar, null);
  assert.equal(pott({}).disponert, 0);
});

test('tolkPris: stykkpris, prosentrabatt og kronerabatt', async () => {
  const { tolkPris } = await import('../app/data/beregning.js');
  assert.equal(tolkPris('1200').netto, 1200);
  assert.equal(tolkPris('1200 -15%').netto, 1020);
  assert.equal(tolkPris('1200 -180').netto, 1020);
  assert.equal(tolkPris('1 200-15 %').netto, 1020);
  assert.equal(tolkPris('8900 -10%').under, 'Liste 8 900,00 −10 %');
  assert.equal(tolkPris('1200 -180').under, 'Liste 1 200,00 −180,00');
  assert.equal(tolkPris('1200').under, 'vår pris');
  assert.equal(tolkPris(''), null);
  assert.equal(tolkPris('abc'), null);
  assert.equal(tolkPris('1200 + 5'), null);
});

const innkjop = {
  linjer: { l1: { antall: 4, rekkefolge: 1 }, l2: { antall: 2, rekkefolge: 2 }, l3: { antall: 1, rekkefolge: 3 } },
  leverandorer: { a: { navn: 'A', frakt: 1500, rekkefolge: 1 }, b: { navn: 'B', frakt: 0, rekkefolge: 2 } },
  priser: { l1: { a: { raa: '1000 -10%' }, b: { raa: '950' } }, l2: { a: { raa: '500' } }, l3: { a: { raa: 'x' }, b: { raa: '100' } } },
  valgt: { l1: 'b', l2: 'a', l3: 'a' },
};

test('innkjopsberegning: valgt, alt hos én og frakt', async () => {
  const { innkjopsberegning, sumInnkjop, billigstPerLinje } = await import('../app/data/beregning.js');
  const b = innkjopsberegning(innkjop);
  assert.equal(b.perLinje.l1.sum, 3800);
  assert.equal(b.perLinje.l2.sum, 1000);
  assert.equal(b.perLinje.l3.valgtSid, null); // «x» er ikke en pris
  assert.equal(b.sumValgt, 4800);
  assert.equal(b.frakt, 1500); // bare A brukes med frakt; B har 0
  assert.equal(b.total, 6300);
  assert.equal(sumInnkjop(innkjop), 6300);
  assert.equal(b.perLeverandor.a.total, 1500 + 3600 + 1000);
  assert.equal(b.perLeverandor.a.mangler, 1);
  assert.equal(b.perLeverandor.b.mangler, 1);
  assert.deepEqual(billigstPerLinje(innkjop), { l1: 'a', l2: 'a', l3: 'b' });
  assert.equal(innkjopsberegning({}).total, 0);
});

test('pott tar med innkjøp, ikkeFordelte og rutenett', async () => {
  const { pott, ikkeFordelte, tolkRutenett } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', { x: { antall: 1, estPris: 1 }, y: { antall: 1, estPris: 1 } }, { innvilget: 10000, utgifter: { u: { belop: 700 } } });
  const p = pott(s, [innkjop]);
  assert.equal(p.innkjop, 6300);
  assert.equal(p.disponertFull, 7000);
  assert.equal(p.gjenstar, 3000);
  assert.deepEqual(ikkeFordelte(s, [{ linjer: { q: { soknadLinjeId: 'x' } } }]).map(l => l.id), ['y']);
  assert.deepEqual(tolkRutenett('1200\t1300\r\n\n 900 -5%\t\n'), [['1200', '1300'], ['900 -5%', '']]);
});

test('fakturaer: løpenummer, poster, avvik og oppsummering', async () => {
  const { nesteLopenummer, revisjonsposter, fakturaavvik, revisjonsoppsummering, sumFakturert } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', {}, { utgifter: { u1: { beskrivelse: 'Parkering', belop: 800, dato: '2026-06-02', rekkefolge: 1 } } });
  const i = { id: 'i1', navn: 'Instrumenter', ...innkjop };
  const poster = revisjonsposter(s, [i], { tittelFor: (_, l) => 'Linje ' + l.id, levNavn: (_, sid) => 'Lev ' + sid });
  assert.deepEqual(poster.map(p => [p.id, p.tilbudt]), [['i1/l1', 3800], ['i1/l2', 1000], ['utgift/u1', 800]]);
  assert.equal(poster[0].tittel, '4 × Linje l1');
  assert.equal(poster[0].under, 'Lev b · Instrumenter');
  const fakturaer = [
    { soknadId: 's1', lopenummer: 1, belop: 3900, dekker: { 'i1/l1': true } },
    { soknadId: 's1', lopenummer: 2, belop: 500, dekker: {} },
    { soknadId: 's2', lopenummer: 1, belop: 1, dekker: {} },
  ];
  assert.equal(nesteLopenummer(fakturaer, 's1'), 3);
  assert.equal(nesteLopenummer(fakturaer, 's9'), 1);
  assert.deepEqual(fakturaavvik(fakturaer[0], poster), { tilbudt: 3800, avvik: 100, koblet: true });
  assert.equal(fakturaavvik(fakturaer[1], poster).koblet, false);
  assert.equal(sumFakturert(fakturaer, 's1'), 4400);
  const o = revisjonsoppsummering(fakturaer.slice(0, 2), poster);
  assert.equal(o.fakturert, 4400);
  assert.equal(o.manglerFaktura, 2);
  assert.equal(o.avvikSum, 100);
  assert.equal(o.avvikAntall, 1);
  assert.equal(o.ikkeKoblet, 1);
  assert.deepEqual(o.perPost['i1/l1'], { nr: [1], fakturert: 3900, avvik: 100 });
  assert.deepEqual(o.perPost['i1/l2'], { nr: [], fakturert: null, avvik: 0 });
});

test('revisjonsposter: alternativt produkt følger den valgte leverandøren', async () => {
  const { revisjonsposter, posttittel } = await import('../app/data/beregning.js');
  const i = {
    id: 'i1', navn: 'Instrumenter', ...innkjop,
    priser: { ...innkjop.priser, l1: { a: { raa: '1000', alternativ: 'Ikke valgt' }, b: { raa: '950', alternativ: ' Jupiter JTB700 ' } } },
  };
  const poster = revisjonsposter({}, [i], { tittelFor: (_, l) => 'Linje ' + l.id, levNavn: (_, sid) => 'Lev ' + sid });
  assert.equal(poster[0].alternativ, 'Jupiter JTB700');
  assert.equal(posttittel(poster[0]), '4 × Linje l1 (alternativ: Jupiter JTB700)');
  assert.equal(poster[1].alternativ, '');
  assert.equal(posttittel(poster[1]), '2 × Linje l2');
});

test('import av behov: CSV med semikolon, overskrifter og duplikater', async () => {
  const { tolkTabell, tolkBehovimport } = await import('../app/data/beregning.js');
  const csv = '﻿Kategori;Navn/produkt;Spesifikasjon;Antall;Listepris;Sum;Prioritet\r\nInstrumenter;Kornett;Yamaha YCR2330III;6;13539;81234;Må ha\r\nInstrumenter;Trompet;"Bb; Yamaha ""pro""";2;23 000;46000;Må ha\r\n;;;;;;\r\nInstrumenter;Horn;Brukt;x;12000;;\r\nInstrumenter;Kornett;Yamaha YCR2330III;1;1;;\r\n';
  assert.equal(tolkTabell(csv).length, 5);
  assert.deepEqual(tolkTabell('a,b\n"x,y",2')[1], ['x,y', '2']);
  const i = tolkBehovimport(csv, [{ tittel: 'trompet', beskrivelse: 'Bb; Yamaha "pro"' }]);
  assert.equal(i.harOverskrift, true);
  assert.deepEqual(i.kolonner, { type: 0, tittel: 1, beskrivelse: 2, antall: 3, estPris: 4 });
  assert.deepEqual(i.rader.map(r => r.status), ['ny', 'finnes', 'ugyldig', 'finnes']);
  assert.deepEqual(i.rader[0], { type: 'Instrumenter', tittel: 'Kornett', beskrivelse: 'Yamaha YCR2330III', antall: 6, estPris: 13539, status: 'ny', grunn: '' });
  assert.equal(i.rader[1].estPris, 23000);
  assert.equal(i.rader[2].grunn, 'ugyldig antall');
  assert.equal(i.rader[3].grunn, 'står to ganger');
});

test('import av behov: limt inn fra regneark uten overskrift', async () => {
  const { tolkBehovimport } = await import('../app/data/beregning.js');
  const i = tolkBehovimport('Instrument\tTuba\tBesson\t2\tkr 45 000,00\n\tNotestativ\t\t\t\nUtstyr\t\tuten tittel\t1\t1');
  assert.equal(i.harOverskrift, false);
  assert.deepEqual(i.rader.map(r => [r.tittel, r.antall, r.estPris, r.status]), [['Tuba', 2, 45000, 'ny'], ['Notestativ', 1, 0, 'ny'], ['', 1, 1, 'ugyldig']]);
  assert.equal(tolkBehovimport('').rader.length, 0);
  assert.equal(tolkBehovimport('Behov\tAntall\tPris\nFlagg\t3\t1.250').rader[0].estPris, 1250);
});

test('importbeskrivelsen stemmer med det som gjenkjennes', async () => {
  const { IMPORTFELT, tolkBehovimport } = await import('../app/data/beregning.js');
  // Hver overskrift portalen lover å kjenne igjen, må faktisk virke …
  const lengste = Math.max(...IMPORTFELT.map(f => f.overskrifter.length));
  for (let n = 0; n < lengste; n++) {
    const hode = IMPORTFELT.map(f => f.overskrifter[Math.min(n, f.overskrifter.length - 1)]).join('\t');
    const i = tolkBehovimport(hode + '\nInstrument\tKornett\tYamaha\t6\t13 539');
    assert.equal(i.harOverskrift, true, hode);
    assert.deepEqual(i.rader[0], { type: 'Instrument', tittel: 'Kornett', beskrivelse: 'Yamaha', antall: 6, estPris: 13539, status: 'ny', grunn: '' }, hode);
  }
  // … og malen (navn + eksempel) må kunne importeres som den er.
  const mal = IMPORTFELT.map(f => f.navn).join(';') + '\r\n' + IMPORTFELT.map(f => f.eksempel).join(';');
  assert.deepEqual(tolkBehovimport(mal).rader.map(r => [r.tittel, r.antall, r.estPris, r.status]), [['Kornett', 6, 13539, 'ny']]);
});

test('type: arv fra behov, overstyring per søknadslinje og gruppering', async () => {
  const { linjetype, grupperPerType, typeliste } = await import('../app/data/beregning.js');
  const behov = [{ id: 'a', type: 'Instrument' }, { id: 'b', type: '' }, { id: 'c' }];
  assert.equal(linjetype({ behovId: 'a' }, behov), 'Instrument');
  assert.equal(linjetype({ behovId: 'a', type: 'Utstyr' }, behov), 'Utstyr');
  assert.equal(linjetype({ behovId: 'a', type: '  ' }, behov), 'Instrument');
  assert.equal(linjetype({ behovId: 'b' }, behov), '');
  assert.equal(linjetype({ behovId: null, type: 'Lokale' }, behov), 'Lokale');
  assert.equal(linjetype({ behovId: 'finnes-ikke' }, behov), '');
  const g = grupperPerType([{ t: 'Utstyr', n: 1 }, { t: '', n: 2 }, { t: 'Instrument', n: 3 }, { t: 'Utstyr', n: 4 }], x => x.t);
  assert.deepEqual(g.map(x => [x.type, x.elementer.map(e => e.n)]), [['Instrument', [3]], ['Utstyr', [1, 4]], ['', [2]]]);
  assert.deepEqual(typeliste(behov, [{ linjer: { l: { type: 'Uniform' }, m: { type: 'Instrument' } } }]), ['Instrument', 'Uniform']);
});

test('manuell rekkefølge: grupper, elementer og flytting', async () => {
  const { grupperPerType, etterRekkefolgeOgTittel, flyttIListe, typerekkefolgeFor } = await import('../app/data/beregning.js');
  const el = [{ t: 'Utstyr' }, { t: '' }, { t: 'Instrument' }, { t: 'Uniform' }];
  const typer = rekkefolge => grupperPerType(el, x => x.t, rekkefolge).map(g => g.type);
  assert.deepEqual(typer([]), ['Instrument', 'Uniform', 'Utstyr', '']);
  assert.deepEqual(typer(['Utstyr', 'Instrument']), ['Utstyr', 'Instrument', 'Uniform', '']);
  assert.deepEqual(typer(['', 'Uniform']), ['', 'Uniform', 'Instrument', 'Utstyr']);

  const behov = [{ tittel: 'Tuba' }, { tittel: 'Kornett', rekkefolge: 2 }, { tittel: 'Althorn' }, { tittel: 'Baryton', rekkefolge: 1 }];
  assert.deepEqual([...behov].sort(etterRekkefolgeOgTittel).map(b => b.tittel), ['Baryton', 'Kornett', 'Althorn', 'Tuba']);

  const l = ['a', 'b', 'c', 'd'];
  assert.deepEqual(flyttIListe(l, 'd', 'b', 'for'), ['a', 'd', 'b', 'c']);
  assert.deepEqual(flyttIListe(l, 'a', 'c', 'etter'), ['b', 'c', 'a', 'd']);
  assert.deepEqual(flyttIListe(l, 'c', null), ['c', 'a', 'b', 'd']);
  assert.deepEqual(flyttIListe(l, 'b', 'b', 'etter'), l);
  assert.deepEqual(flyttIListe(l, 'x', 'b', 'etter'), ['a', 'b', 'x', 'c', 'd']);
  assert.deepEqual(l, ['a', 'b', 'c', 'd']); // originalen er urørt

  assert.deepEqual(typerekkefolgeFor({ typeRekkefolge: ['Uniform'] }, ['Instrument', 'Uniform', 'Utstyr']), ['Uniform', 'Instrument', 'Utstyr']);
  assert.deepEqual(typerekkefolgeFor({}, ['A']), ['A']);
});

test('innkjøpet speiler søknadens typer og rekkefølge', async () => {
  const { grupperInnkjopslinjer, typeliste } = await import('../app/data/beregning.js');
  const behov = [{ id: 'sax', type: 'Instrument' }, { id: 'kornett', type: 'Instrument' }, { id: 'jakke', type: 'Uniform' }];
  const s = { typeRekkefolge: ['Uniform', 'Instrument'], linjer: {
    a: { behovId: 'kornett', rekkefolge: 2 }, b: { behovId: 'sax', rekkefolge: 1 },
    c: { behovId: 'jakke', rekkefolge: 3 }, d: { behovId: 'sax', type: 'Slagverk', rekkefolge: 4 },
  } };
  // Lagt inn i innkjøpet i «tilfeldig» rekkefølge, pluss en fri linje og en linje som er fjernet fra søknaden.
  const i = { linjer: {
    k1: { soknadLinjeId: 'a', rekkefolge: 1 }, k2: { soknadLinjeId: 'c', rekkefolge: 2 }, k3: { soknadLinjeId: null, rekkefolge: 3 },
    k4: { soknadLinjeId: 'b', rekkefolge: 4 }, k5: { soknadLinjeId: 'd', rekkefolge: 5 }, k6: { soknadLinjeId: 'borte', rekkefolge: 6 },
  } };
  const g = grupperInnkjopslinjer(i, s, behov, s.typeRekkefolge);
  assert.deepEqual(g.map(x => [x.type, x.linjer.map(l => l.id)]), [['Uniform', ['k2']], ['Instrument', ['k4', 'k1']], ['Slagverk', ['k5']], ['', ['k3', 'k6']]]);
  assert.deepEqual(grupperInnkjopslinjer({}, s, behov), []);
  // En fri linje kan merkes med type i innkjøpet: den står sist i den typen.
  i.linjer.k3.type = ' Uniform ';
  i.linjer.k7 = { soknadLinjeId: null, type: 'Konsert', rekkefolge: 7 };
  assert.deepEqual(grupperInnkjopslinjer(i, s, behov, s.typeRekkefolge).map(x => [x.type, x.linjer.map(l => l.id)]),
    [['Uniform', ['k2', 'k3']], ['Instrument', ['k4', 'k1']], ['Konsert', ['k7']], ['Slagverk', ['k5']], ['', ['k6']]]);
  assert.deepEqual(typeliste(behov, [s], [i]), ['Instrument', 'Konsert', 'Slagverk', 'Uniform']);
});

test('linjer lagt til etter søknaden teller ikke i det vi søkte om', async () => {
  const { soktLinjer, tilleggslinjer, sumEstimert, soktBelop, revisjonsposter } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', {
    a: { behovId: 'klarinett', antall: 2, estPris: 6500, rekkefolge: 1 },
    b: { behovId: 'trombone', antall: 1, estPris: 10000, rekkefolge: 2, etterSoknad: true, notat: ' I stedet for klarinett ' },
  });
  assert.deepEqual(soktLinjer(s).map(l => l.id), ['a']);
  assert.deepEqual(tilleggslinjer(s).map(l => l.id), ['b']);
  assert.equal(sumEstimert(s), 13000);
  assert.equal(soktBelop(s), 13000);

  const i = { id: 'i1', navn: 'Instrumenter', linjer: { k: { soknadLinjeId: 'b', antall: 1 }, f: { soknadLinjeId: null, antall: 1 } }, leverandorer: { x: {} }, priser: { k: { x: { raa: '9000' } }, f: { x: { raa: '100' } } }, valgt: { k: 'x', f: 'x' } };
  const poster = revisjonsposter(s, [i], { tittelFor: () => 'T', levNavn: () => 'L' });
  assert.deepEqual(poster.map(p => [p.etterSoknad, p.notat]), [[true, 'I stedet for klarinett'], [false, '']]);
});

test('anskaffet per behov: valgt linje som er fakturert', async () => {
  const { anskaffetPerBehov, velgbareBehov } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', { a: { behovId: 'kornett', antall: 4 }, b: { behovId: 'horn', antall: 2 }, c: { behovId: 'tuba', antall: 1 }, d: { antall: 1 } });
  const i = {
    id: 'i1', soknadId: 's1', status: 'valgt',
    linjer: { ka: { soknadLinjeId: 'a', antall: 3 }, kb: { soknadLinjeId: 'b', antall: 2 }, kc: { soknadLinjeId: 'c', antall: 1 }, kd: { soknadLinjeId: 'd', antall: 9 } },
    leverandorer: { x: {} },
    priser: { ka: { x: { raa: '100' } }, kb: { x: { raa: '100' } }, kc: { x: { raa: '100' } }, kd: { x: { raa: '100' } } },
    valgt: { ka: 'x', kb: 'x', kd: 'x' },
  };
  // Bare kornettene er dekket av en faktura. Hornene er valgt, men ikke fakturert.
  const fakturaer = [{ soknadId: 's1', dekker: { 'i1|ka': true, 'i1|kc': true, 'i1|kd': true } }];
  assert.deepEqual([...anskaffetPerBehov([s], [i], fakturaer)], [['kornett', 3]]);
  // Står innkjøpet som «Fakturert», teller alle valgte linjer med et behov.
  assert.deepEqual([...anskaffetPerBehov([s], [{ ...i, status: 'fakturert' }], [])], [['kornett', 3], ['horn', 2]]);
  // To innkjøp av samme behov summeres.
  const s2 = soknad('s2', 'innvilget', { a: { behovId: 'kornett', antall: 2 } });
  const i2 = { id: 'i2', soknadId: 's2', status: 'fakturert', linjer: { k: { soknadLinjeId: 'a', antall: 2 } }, leverandorer: { x: {} }, priser: { k: { x: { raa: '1' } } }, valgt: { k: 'x' } };
  const kjopt = anskaffetPerBehov([s, s2], [i, i2], fakturaer);
  assert.equal(kjopt.get('kornett'), 5);

  // Et ferdig anskaffet behov kan ikke lenger velges i en ny søknad.
  const behov = [{ id: 'kornett', antall: 5 }, { id: 'fagott', antall: 1 }];
  assert.deepEqual(velgbareBehov(behov, [], soknad('ny', 'utkast', {}), kjopt).map(x => x.behov.id), ['fagott']);
  assert.deepEqual(velgbareBehov(behov, [], soknad('ny', 'utkast', {})).map(x => x.behov.id), ['kornett', 'fagott']);
});

test('tilbud: varelinjer leses fra tabellceller, med fortsettelseslinjer', async () => {
  const { tolkTilbudslinjer, tilbudsprisTekst, tolkPris } = await import('../app/data/beregning.js');
  // Oppdiktet tilbud i to vanlige oppsett. y synker nedover siden.
  const l = (side, y, tekst, hoyde = 9) => ({ side, y, hoyde, tekst });
  const rader = tolkTilbudslinjer([
    l(1, 700, 'Tilbudsnummer:\t4711'),
    l(1, 650, 'Beskrivelse\tAntall\tRabatt'),
    l(1, 630, '100 Acme ABC-123 Bb-kornett\t4 stk\t12 000,00\t12,0%\t33 792,00\t8 448,00\t42 240,00'),
    l(1, 617, 'Tamburin Acme TX1,\t1 stk\t4 000,00\t10,0%\t2 880,00\t720,00\t3 600,00'),
    l(1, 607, 'dobbel rad, kalveskinn'),
    l(1, 594, 'Rør klarinett no 2\t8\t400,00\t15,0%\t2 176,00\t544,00\t2 720,00'),
    l(1, 581, 'Køller assortert\t5 stk\t600,00\t2 400,00\t600,00\t3 000,00'),
    l(1, 560, 'Sum (NOK)\t38 739,20\t9 684,80\t48 424,00'),
    l(2, 800, 'Varenr\tBeskrivelse\tAntall\tPris(ink)\tRabatt\tBeløp(ink)'),
    l(2, 785, '70001\tAcme Fløyte, Wave\t2\tstk\t9 000,00\t-10%\t16 200,00', 11),
    l(2, 770, 'S.nr.:\t1', 11),
    l(2, 756, '2', 11),
    l(2, 742, '90000\tDiverse\t1\tstk\t4 000,00\t-10%\t3 600,00', 11),
    l(2, 728, '5 stk. Køller Marimba', 8.8), // undertekst i mindre skrift hører med
    l(2, 714, '70002\tRør, eske a\' 10 stk. 2,5\t10\teske\t400,00\t-10%\t3 000,00', 11),
    l(2, 700, 'Antall enheter: 283', 11),
    l(2, 40, 'Acme Musikk AS', 7),
    l(3, 600, 'Total\t22 800,00'),
  ]);
  assert.deepEqual(rader.map(r => [r.side, r.varenr, r.beskrivelse, r.antall, r.enhet, r.pris, r.rabatt, r.avvik]), [
    [1, '', '100 Acme ABC-123 Bb-kornett', 4, 'stk', 12000, 12, false],
    [1, '', 'Tamburin Acme TX1, dobbel rad, kalveskinn', 1, 'stk', 4000, 10, false],
    [1, '', 'Rør klarinett no 2', 8, '', 400, 15, false],
    [1, '', 'Køller assortert', 5, 'stk', 600, null, false],
    [2, '70001', 'Acme Fløyte, Wave', 2, 'stk', 9000, 10, false],
    [2, '90000', 'Diverse 5 stk. Køller Marimba', 1, 'stk', 4000, 10, false],
    [2, '70002', "Rør, eske a' 10 stk. 2,5", 10, 'eske', 400, 10, true], // 10 × 400 − 10 % er 3 600, ikke 3 000
  ]);
  assert.equal(tilbudsprisTekst(12000, 12), '12000 -12%');
  assert.equal(tilbudsprisTekst(500, null), '500');
  assert.equal(tilbudsprisTekst(1234.56, 12.5), '1234,56 -12,5%');
  assert.equal(tolkPris(tilbudsprisTekst(9000, 10)).netto, 8100);
});

test('tilbud: linje uten tabulatorer deles opp, og beløpene avgjør tvetydighet', async () => {
  const { tolkTilbudslinjer } = await import('../app/data/beregning.js');
  const rader = tolkTilbudslinjer([
    { tekst: '1002 Rør klarinett no 2 8 400,00 15,0% 2 176,00 544,00 2 720,00' },
    { tekst: 'Kornett Acme 4 stk 12 000,00 12,0% 33 792,00 8 448,00 42 240,00' },
    { tekst: 'Med vennlig hilsen' },
    { tekst: 'Notestativ 25 stk 400,00' },
  ]);
  assert.deepEqual(rader.map(r => [r.beskrivelse, r.antall, r.pris, r.rabatt]), [
    ['1002 Rør klarinett no 2', 8, 400, 15],
    ['Kornett Acme', 4, 12000, 12],
    ['Notestativ', 25, 400, null],
  ]);
});

test('tilbud: antall med desimaler, rabatt uten prosenttegn og avrundet prosent', async () => {
  const { tolkTilbudslinjer } = await import('../app/data/beregning.js');
  // Oppdiktet tilbud: «Varenr | Varetekst | Antall | Pris | % | Sum», med et
  // usynlig «0,00%»-felt fra malen etter prisen og på tomme rader.
  const l = (y, tekst, hoyde = 8.5) => ({ side: 1, y, hoyde, tekst });
  const rader = tolkTilbudslinjer([
    l(470, 'Varenr\tVaretekst\tAntall\tPris\t%\tSum', 11.5),
    l(452, 'AB-100\tKornett Bb Acme ABC-123, Lakkert\t4,00 Stk\t12000,00\t0,00%\t15,00\t40800,00'),
    l(443, 'med etui'),
    l(431, '0,00%', 10),
    l(420, '700615\tVentilolje Acme, 50 ml\t25,00 Stk\t100,00\t0,00%\t20,00\t2000,00'), // 20 % rabatt, ikke «uten mva.»
    l(408, 'TX-1\tTrommesett Acme TX1\t1,00 Sett\t10000,00\t0,00%\t4,98\t9500,00'), // prosenten er avrundet
    l(396, 'KL-5\tKøller Acme\t1,00 Par\t300,00\t0,00%\t280,00\t-540,00'), // tull i tilbudet
    l(384, 'RR-2\tRør Acme 2,5\t3,00 Pk\t400,00\t0,00%\t0,00\t1200,00'),
    l(360, 'Frakt\t4,00\t250,00'), // «4,00» uten enhet er et beløp
  ]);
  assert.deepEqual(rader.map(r => [r.varenr, r.beskrivelse, r.antall, r.enhet, r.pris, r.rabatt, r.avvik]), [
    ['AB-100', 'Kornett Bb Acme ABC-123, Lakkert med etui', 4, 'stk', 12000, 15, false],
    ['700615', 'Ventilolje Acme, 50 ml', 25, 'stk', 100, 20, false],
    ['TX-1', 'Trommesett Acme TX1', 1, 'sett', 9500, null, false],
    ['KL-5', 'Køller Acme', 1, 'par', 300, 0, true],
    ['RR-2', 'Rør Acme 2,5', 3, 'pk', 400, 0, false],
  ]);
});

test('tilbud: forslag til kobling mot varelinjer', async () => {
  const { likhet, foreslaKobling } = await import('../app/data/beregning.js');
  assert.ok(likhet('614 Yamaha YCR-2330III Bb-kornett', 'Kornett Yamaha YCR2330III') > 0.8);
  assert.ok(likhet('Yamaha YCL-255S Bb-klarinett', 'Noteklype klarinett') < 0.45);
  assert.ok(likhet('Yamaha YAS-280 Alt Saksofon', 'Tenorsaksofon Yamaha YTS-280') < 0.45); // samme merke, annen modell
  assert.ok(likhet('Bach TB-650 Bb-Trombone med Etui, Barnetrombone', 'Trombone Bach TB650 barnetrombone') > 0.7);
  const varelinjer = [
    { id: 'kornett', tekst: 'Kornett Yamaha YCR2330III', antall: 4 },
    { id: 'klarinett', tekst: 'Klarinett Yamaha YCL-255S', antall: 1 },
    { id: 'noteklype', tekst: 'Noteklype klarinett', antall: 9 },
    { id: 'ror2', tekst: 'Rør klarinett Vandoren 2', antall: 8 },
    { id: 'ror3', tekst: 'Rør klarinett Vandoren 3', antall: 7 },
    { id: 'tuba', tekst: 'Tuba Besson', antall: 1 },
  ];
  const rader = [
    { beskrivelse: 'Noteklype 506N klarinett m/ring', antall: 9 },
    { varenr: '623', beskrivelse: 'Yamaha YCL-255S Bb-klarinett', antall: 1 },
    { varenr: '501924', beskrivelse: 'Yamaha YCR-2330III Kornett, Kort, L Bb', antall: 4 },
    { beskrivelse: 'Vandoren Classic Bb-klarinett rør no 3', antall: 7 },
    { beskrivelse: 'Vandoren Classic Bb-klarinett rør no 2', antall: 8 },
    { beskrivelse: 'Ventilolje syntetisk', antall: 25 },
  ];
  // Like tekster skilles på antall; det som ikke ligner noe, står uten forslag.
  assert.deepEqual(foreslaKobling(rader, varelinjer), ['noteklype', 'klarinett', 'kornett', 'ror3', 'ror2', null]);
});

test('bestilling: linjene som er valgt hos én leverandør', async () => {
  const { bestilling, tolkPris } = await import('../app/data/beregning.js');
  assert.equal(tolkPris('1000 -10%').rabatt, '10 %');
  assert.equal(tolkPris('1000 -180').rabatt, '180,00');
  assert.equal(tolkPris('1000').rabatt, '');
  const i = {
    linjer: { a: { antall: 4, rekkefolge: 1 }, b: { antall: 2, rekkefolge: 2 }, c: { antall: 1, rekkefolge: 3 } },
    leverandorer: { x: { frakt: 500, vedlegg: { v1: { navn: 'Tilbud.pdf', tid: 1 } } }, y: { frakt: 100, leveringsadresse: ' Kari Nordmann\nStorgata 1 ' }, z: { frakt: 900 } },
    priser: {
      a: { x: { raa: '1000 -10%', tekst: '100 Acme kornett' } },
      b: { x: { raa: '200', alternativ: 'Acme B2' }, y: { raa: '150' } },
      c: { x: { raa: '50 -5' } },
    },
    valgt: { a: 'x', b: 'y', c: 'x' },
  };
  const valg = { tittelFor: l => 'Linje ' + l.id, rekkefolge: ['c', 'a', 'b'] };
  const x = bestilling(i, 'x', valg);
  assert.deepEqual(x.linjer, [
    { id: 'c', vare: 'Linje c', varLinje: '', antall: 1, liste: 50, rabatt: '5,00', netto: 45, sum: 45 },
    { id: 'a', vare: '100 Acme kornett', varLinje: 'Linje a', antall: 4, liste: 1000, rabatt: '10 %', netto: 900, sum: 3600 },
  ]);
  assert.deepEqual([x.sum, x.frakt, x.total, x.dokumenter], [3645, 500, 4145, ['Tilbud.pdf']]);
  const y = bestilling(i, 'y', valg);
  assert.deepEqual([y.linjer.map(l => l.vare), y.total, y.dokumenter], [['Linje b'], 400, []]);
  // Egen leveringsadresse følger bestillingen (kort 0015); tom streng når leverandøren ikke har noen.
  assert.deepEqual([x.leveringsadresse, y.leveringsadresse], ['', 'Kari Nordmann\nStorgata 1']);
  // Ingenting valgt hos leverandøren: tom bestilling, og frakten teller ikke.
  assert.deepEqual([bestilling(i, 'z', valg).linjer.length, bestilling(i, 'z', valg).total], [0, 0]);
});

test('bestillinger låser linjene de inneholder (B-32)', async () => {
  const { bestilteLinjer, bestillingsliste, bestillingerHos, harBestillinger, bestilteSoknadslinjer, bestilling, utenBestilte, billigstPerLinje } = await import('../app/data/beregning.js');
  const i = {
    id: 'i1',
    linjer: { a: { soknadLinjeId: 'sa', antall: 4, rekkefolge: 1 }, b: { soknadLinjeId: 'sb', antall: 2, rekkefolge: 2 }, c: { antall: 1, rekkefolge: 3 }, d: { antall: 1, rekkefolge: 4 } },
    leverandorer: { x: { frakt: 500 }, y: { frakt: 100 } },
    priser: { a: { x: { raa: '1000' }, y: { raa: '900' } }, b: { x: { raa: '200' } }, c: { x: { raa: '50' }, y: { raa: '40' } }, d: { y: { raa: '70' } } },
    valgt: { a: 'x', b: 'x', c: 'x', d: 'y' },
    // Bestilt hos x: a og b. Linjen «z» i bestillingen finnes ikke lenger og teller ikke.
    bestillinger: { b2: { sid: 'x', tid: 20, linjer: { b: true } }, b1: { sid: 'x', tid: 10, linjer: { a: true, z: true } } },
  };
  assert.deepEqual(bestillingsliste(i).map(b => b.id), ['b1', 'b2']);
  assert.deepEqual([...bestilteLinjer(i).keys()], ['a', 'b']);
  assert.equal(bestilteLinjer(i).get('a').id, 'b1');
  assert.deepEqual([bestillingerHos(i, 'x').length, bestillingerHos(i, 'y').length, harBestillinger(i), harBestillinger({})], [2, 0, true, false]);
  assert.deepEqual([...bestilteSoknadslinjer([i])], ['sa', 'sb']);

  // Neste bestilling til x: bare c, uten frakt (den sto på den første). Hos y: d med frakt.
  const valg = { tittelFor: l => l.id };
  const x = bestilling(i, 'x', valg);
  assert.deepEqual([x.linjer.map(l => [l.id, l.vare]), x.bestilte, x.frakt, x.total], [[['c', 'c']], 2, 0, 50]);
  const y = bestilling(i, 'y', valg);
  assert.deepEqual([y.linjer.map(l => l.vare), y.bestilte, y.frakt, y.total], [['d'], 0, 100, 170]);
  // Uten bestillinger står frakten på bestillingen som før.
  assert.equal(bestilling({ ...i, bestillinger: {} }, 'x', valg).frakt, 500);

  // Låst på a (bestilt hos x): antall, tittel, valget, prisen hos x. Åpent: egne midler, type, prisen hos y, alt på c.
  const felt = {
    'linjer.a.antall': 5, 'linjer.a.tittel': 'Ny', 'linjer.a': null, 'valgt.a': 'y', 'priser.a': null,
    'priser.a.x': null, 'priser.a.x.raa': '1', 'priser.a.x.alternativ': 'Annet',
    'linjer.a.egneMidler': 100, 'linjer.a.type': 'Instrument', 'priser.a.x.vedleggId': 'v1', 'priser.a.x.side': 2, 'priser.a.y.raa': '800',
    'linjer.c.antall': 3, 'valgt.c': 'y', 'priser.c.x.raa': '60', 'navn': 'Nytt navn', 'bestillinger.b1.linjer.a': null,
  };
  assert.deepEqual(Object.keys(utenBestilte(i, felt)), ['linjer.a.egneMidler', 'linjer.a.type', 'priser.a.x.vedleggId', 'priser.a.x.side', 'priser.a.y.raa', 'linjer.c.antall', 'valgt.c', 'priser.c.x.raa', 'navn', 'bestillinger.b1.linjer.a']);
  assert.equal(utenBestilte({ linjer: i.linjer }, felt), felt); // uten bestillinger: urørt

  // «Billigst per linje» lar bestilte linjer stå: a blir hos x selv om y er billigere.
  assert.deepEqual(billigstPerLinje(i), { a: 'x', b: 'x', c: 'y', d: 'y' });
});

test('delt linje: to innkjøpslinjer fra samme søknadslinje, hver sin leverandør', async () => {
  const { grupperInnkjopslinjer, innkjopsberegning, revisjonsposter, bestilling, anskaffetPerBehov, ikkeFordelte } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', { a: { behovId: 'kornett', antall: 4, rekkefolge: 1 }, b: { behovId: 'horn', antall: 1, rekkefolge: 2 } });
  // Kornettene er delt 3 + 1. Den nye delen (k2) ligger rett etter den gamle.
  const i = {
    id: 'i1', soknadId: 's1', status: 'fakturert', navn: 'Instrumenter',
    linjer: { k1: { soknadLinjeId: 'a', antall: 3, rekkefolge: 1 }, h: { soknadLinjeId: 'b', antall: 1, rekkefolge: 2 }, k2: { soknadLinjeId: 'a', antall: 1, rekkefolge: 1.5 } },
    leverandorer: { x: { frakt: 0 }, y: { frakt: 0 } },
    priser: { k1: { x: { raa: '1000' }, y: { raa: '900' } }, k2: { x: { raa: '1000' }, y: { raa: '900' } }, h: { x: { raa: '500' } } },
    valgt: { k1: 'x', k2: 'y', h: 'x' },
  };
  const behov = [{ id: 'kornett' }, { id: 'horn' }];
  assert.deepEqual(grupperInnkjopslinjer(i, s, behov)[0].linjer.map(l => l.id), ['k1', 'k2', 'h']);
  assert.equal(innkjopsberegning(i).total, 3 * 1000 + 900 + 500);
  const valg = { tittelFor: (_, l) => 'Linje ' + (l?.id ?? _.id), levNavn: (_, sid) => sid };
  assert.deepEqual(revisjonsposter(s, [i], valg).map(p => [p.id, p.tilbudt]), [['i1/k1', 3000], ['i1/k2', 900], ['i1/h', 500]]);
  assert.deepEqual(bestilling(i, 'y', { tittelFor: l => l.id }).linjer.map(l => [l.vare, l.antall, l.sum]), [['k2', 1, 900]]);
  assert.equal(anskaffetPerBehov([s], [i], []).get('kornett'), 4);
  assert.deepEqual(ikkeFordelte(s, [i]), []);
});

test('linjer uten valgt leverandør er ikke poster, men listes for seg', async () => {
  const { linjerUtenValg, revisjonsposter } = await import('../app/data/beregning.js');
  const i = { id: 'i1', linjer: { a: { antall: 1 }, b: { antall: 1 }, c: { antall: 1 } }, leverandorer: { x: {} }, priser: { a: { x: { raa: '100' } }, b: { x: { raa: '100' } } }, valgt: { a: 'x', c: 'x' } };
  // c peker på en leverandør uten pris – da er ingenting valgt.
  assert.deepEqual(linjerUtenValg([i]).map(x => x.linje.id), ['b', 'c']);
  assert.deepEqual(revisjonsposter({}, [i], { tittelFor: (_, l) => l.id, levNavn: () => '' }).map(p => p.id), ['i1/a']);
});

test('beløp med øre: visning, tolking og avvik uten flyttallsstøy', async () => {
  const { belop, tolkBelop, tolkTall } = await import('../app/ui/format.js');
  const { fakturaavvik, sumFakturert, revisjonsoppsummering, sumUtgifter } = await import('../app/data/beregning.js');
  assert.equal(belop(8060.8), '8 060,80');
  assert.equal(belop(30600), '30 600,00');
  assert.equal(belop(0.1 + 0.2), '0,30');
  assert.equal(belop(-1234.5), '−1 234,50');
  assert.equal(tolkBelop('1 234,56'), 1234.56);
  assert.equal(tolkBelop('1.234,56'), 1234.56);
  assert.equal(tolkBelop('8060,8 kr'), 8060.8);
  assert.equal(tolkBelop(''), null);
  assert.equal(tolkBelop('−500'), -500); // kreditnota
  assert.ok(Number.isNaN(tolkTall('-5'))); // antall og estimater kan ikke være negative
  assert.ok(Number.isNaN(tolkBelop('abc')));
  assert.equal(tolkTall('1 234,56'), 1235); // antall og estimater er fortsatt hele tall
  const poster = [{ id: 'a', tilbudt: 8060.8 }, { id: 'b', tilbudt: 0.1 }, { id: 'c', tilbudt: 0.2 }];
  assert.deepEqual(fakturaavvik({ belop: 8061.1, dekker: { a: true, b: true, c: true } }, poster), { tilbudt: 8061.1, avvik: 0, koblet: true });
  assert.equal(fakturaavvik({ belop: 8060.85, dekker: { a: true } }, poster).avvik, 0.05);
  const fakturaer = [{ soknadId: 's', belop: 0.1 }, { soknadId: 's', belop: 0.2 }];
  assert.equal(sumFakturert(fakturaer, 's'), 0.3);
  assert.equal(revisjonsoppsummering(fakturaer, []).fakturert, 0.3);
  assert.equal(sumUtgifter({ utgifter: { a: { belop: 0.1 }, b: { belop: 0.2 } } }), 0.3);
});

test('kreditnota: avvik per post, faktura med negativt beløp', async () => {
  const { fakturaavvik, fakturertPerPost, revisjonsoppsummering, sumFakturert } = await import('../app/data/beregning.js');
  const poster = [{ id: 'kornett', tilbudt: 30600 }, { id: 'stativ', tilbudt: 1000 }, { id: 'noter', tilbudt: 500 }];
  const fakturaer = [
    { id: 'f1', soknadId: 's', lopenummer: 1, belop: 30600, dekker: { kornett: true } },
    { id: 'f2', soknadId: 's', lopenummer: 2, belop: 1100, dekker: { stativ: true } },
    { id: 'f3', soknadId: 's', lopenummer: 2, belop: -500, dekker: { kornett: true } }, // kreditnota på samme dokument
    { id: 'f4', soknadId: 's', lopenummer: 3, belop: 1500, dekker: { stativ: true, noter: true } }, // dekker to poster
  ];
  assert.deepEqual(fakturertPerPost(fakturaer, poster), { kornett: 30100, stativ: 2100, noter: 500 });
  const o = revisjonsoppsummering(fakturaer, poster);
  assert.deepEqual(o.perPost.kornett, { nr: [1, 2], fakturert: 30100, avvik: -500 });
  assert.deepEqual(o.perPost.stativ, { nr: [2, 3], fakturert: 2100, avvik: 1100 });
  assert.deepEqual([o.fakturert, o.avvikSum, o.avvikAntall, o.manglerFaktura], [32700, 600, 2, 0]);
  assert.equal(sumFakturert(fakturaer, 's'), 32700);
  // Avvik per faktura gjelder bare når fakturaen er alene om postene sine.
  assert.equal(fakturaavvik(fakturaer[0], poster, fakturaer).alene, false);
  assert.equal(fakturaavvik(fakturaer[2], poster, fakturaer).alene, false);
  const alene = [fakturaer[0], fakturaer[3]];
  assert.deepEqual(fakturaavvik(fakturaer[0], poster, alene), { tilbudt: 30600, avvik: 0, koblet: true, alene: true });
});

test('egenandel: trekkes fra søkt beløp, og kan følge beløpet eller andelen etter tildeling', async () => {
  const { soktForslag, soktBelop, egenandel, egenandelSomAndel, giverbehov, pott } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'sendt', { l: { antall: 1, estPris: 560000 } }, { egenandel: 40000 });
  assert.equal(soktForslag(s), 520000);
  assert.equal(egenandel(s), 40000);
  assert.equal(pott(s).egenandel, 40000);
  assert.equal(pott(s).gjenstar, null); // ikke innvilget ennå

  // Innvilget 430 000: samme beløp gir 470 000 å handle for, samme andel 463 077.
  const belop = { ...s, status: 'innvilget', innvilget: 430000 };
  assert.equal(egenandel(belop), 40000);
  assert.equal(pott(belop).gjenstar, 470000);
  assert.equal(pott(belop).ramme, 470000);
  assert.equal(giverbehov(belop), 520000); // estimatet er 90 000 over innvilget
  const andel = { ...belop, egenandelValg: 'andel' };
  assert.equal(egenandelSomAndel(andel), 33077);
  assert.equal(egenandel(andel), 33077);
  assert.equal(pott(andel).ramme, 463077);
  // Rammen følger valget også når det ligger et større beløp på en vare.
  const medVare = [{ soknadId: 's1', linjer: { t: { antall: 1, egneMidler: 40000 } }, leverandorer: { x: {} }, priser: { t: { x: { raa: '50580' } } }, valgt: { t: 'x' } }];
  assert.equal(pott(belop, medVare).ramme, 470000);
  assert.equal(pott(andel, medVare).ramme, 463077);
  assert.equal(pott(andel, medVare).gjenstar, 463077 - 50580);
  assert.equal(pott(andel).egenandelPlanlagt, 40000);
  assert.equal(soktBelop(andel), 520000); // det vi søkte om endres ikke av valget

  // Uten egenandel er alt som før.
  assert.equal(egenandel(soknad('s2', 'utkast', {})), 0);
  assert.equal(egenandel({ ...andel, egenandel: null }), 0);
});

test('pott med egne midler på en vare: bare resten belaster søknaden', async () => {
  const { pott, fordelteEgneMidler, innkjopsberegning } = await import('../app/data/beregning.js');
  // Tenorsaksofon til 50 580, vi dekker 40 000 selv. Ingen egenandel er lovet.
  const s = soknad('s1', 'innvilget', {}, { innvilget: 100000 });
  const sax = { soknadId: 's1', linjer: { t: { antall: 1, egneMidler: 40000 }, a: { antall: 1, egneMidler: 500 } }, leverandorer: { x: {} }, priser: { t: { x: { raa: '50580' } }, a: { x: { raa: '1000' } } }, valgt: { t: 'x' } };
  assert.equal(innkjopsberegning(sax).perLinje.t.egne, 40000);
  assert.equal(innkjopsberegning(sax).perLinje.a.egne, 0); // ikke valgt, teller ikke
  assert.equal(fordelteEgneMidler(s, [sax]), 40000);
  const p = pott(s, [sax]);
  assert.deepEqual([p.disponertFull, p.egne, p.egenBrukt, p.disponert, p.gjenstar], [50580, 40000, 40000, 10580, 89420]);
  assert.equal(pott(s, [{ ...sax, linjer: { ...sax.linjer, t: { antall: 1 } } }]).gjenstar, 49420); // uten egne midler

  // Med 8 % moms deles de 10 580 mellom giver og momskompensasjon.
  const pm = pott({ ...s, momsProsent: 8 }, [sax]);
  assert.deepEqual([pm.disponert, pm.moms, pm.gjenstar], [9734, 846, 90266]);

  assert.deepEqual([p.ramme, p.disponertRamme], [140000, 50580]);

  // Har søknaden en egenandel, er det den som bestemmer rammen. Beløpene på
  // varene viser bare hvor den går, også når de er større eller mindre.
  const mindre = pott({ ...s, egenandel: 10000 }, [sax]);
  assert.deepEqual([mindre.egne, mindre.fordelt, mindre.ramme, mindre.disponert, mindre.gjenstar], [10000, 40000, 110000, 40580, 59420]);
  const mer = pott({ ...s, egenandel: 45000 }, [sax]);
  assert.deepEqual([mer.egne, mer.fordelt, mer.ramme, mer.disponert, mer.gjenstar], [45000, 40000, 145000, 5580, 94420]);
  // Egne midler på en løs utgift teller også.
  assert.equal(fordelteEgneMidler({ utgifter: { u: { belop: 800, egneMidler: 300 } } }, [sax]), 40300);
});

test('pott med lovet egenandel: brukes først, og er utenfor momsfordelingen', async () => {
  const { pott, soktForslag } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', { l: { antall: 1, estPris: 560000 } }, { egenandel: 40000, innvilget: 430000, utgifter: { u: { belop: 300000 } } });
  const p = pott(s);
  assert.equal(p.disponert, 260000); // det som belaster giveren
  assert.equal(p.gjenstar, 170000);
  assert.equal(p.moms, 0);

  // Med 8 % moms: giveren dekker 92 % av det som er igjen etter egenandelen.
  const m = { ...s, momsProsent: 8, utgifter: { u: { belop: 500000 } } };
  assert.equal(soktForslag(m), 478400);
  const pm = pott(m);
  assert.equal(pm.disponert, 423200);
  assert.equal(pm.moms, 36800);
  assert.equal(pm.gjenstar, 6800);

  // Er det brukt mindre enn egenandelen, er ingenting tatt fra giveren, og
  // resten av egenandelen er med i det som gjenstår.
  const lite = pott({ ...m, utgifter: { u: { belop: 25000 } } });
  assert.equal(lite.disponert, 0);
  assert.equal(lite.moms, 0);
  assert.equal(lite.gjenstar, 445000);
});

test('egne midler fordeles per post og summeres per kategori', async () => {
  const { revisjonsposter, revisjonsoppsummering, fordelingPerKategori, sumEgneMidler, giverandelOre, typeliste } = await import('../app/data/beregning.js');
  const behovliste = [{ id: 'b1', type: 'Instrument' }];
  const s = soknad('s1', 'innvilget', { x: { behovId: 'b1' }, y: { behovId: 'b1', type: 'Inventar' } }, {
    utgifter: { u1: { beskrivelse: 'Parkering', belop: 800, egneMidler: 800, rekkefolge: 1 } },
  });
  const i = {
    id: 'i1', navn: 'Instrumenter', ...innkjop,
    linjer: { l1: { soknadLinjeId: 'x', antall: 4, rekkefolge: 1, egneMidler: 1000.5 }, l2: { soknadLinjeId: 'y', antall: 2, rekkefolge: 2 }, l3: { antall: 1, rekkefolge: 3, egneMidler: 50 } },
  };
  const poster = revisjonsposter(s, [i], { tittelFor: (_, l) => l.id, levNavn: () => '', behovliste });
  assert.deepEqual(poster.map(p => [p.id, p.kategori, p.egne]), [['i1/l1', 'Instrument', 1000.5], ['i1/l2', 'Inventar', 0], ['utgift/u1', '', 800]]);
  assert.equal(sumEgneMidler(poster), 1800.5); // l3 er ikke valgt og teller ikke

  const fakturaer = [{ lopenummer: 1, belop: 4000, dekker: { 'i1|l1': true } }];
  const f = fordelingPerKategori(poster, revisjonsoppsummering(fakturaer, poster).perPost, 8, ['Inventar']);
  assert.deepEqual(f.grupper.map(g => g.navn), ['Inventar', 'Instrument', 'Andre utgifter']);
  const instrument = f.grupper[1];
  assert.equal(instrument.tilbudt, 3800);
  assert.equal(instrument.kostnad, 4000); // fakturert går foran tilbudt
  assert.equal(instrument.egne, 1000.5);
  assert.equal(instrument.giver, 2759.54); // 92 % av 2 999,50
  assert.equal(instrument.moms, 239.96);
  assert.deepEqual([f.grupper[0].kostnad, f.grupper[0].giver, f.grupper[0].moms], [1000, 920, 80]);
  assert.deepEqual([f.grupper[2].kostnad, f.grupper[2].egne, f.grupper[2].giver], [800, 800, 0]);
  assert.deepEqual(f.sum, { tilbudt: 5600, fakturert: 4000, kostnad: 5800, egne: 1800.5, giver: 3679.54, moms: 319.96 });
  assert.equal(giverandelOre(1000.55, null), 1000.55);

  // En løs utgift kan merkes med en type. Da regnes den inn i den kategorien.
  const medType = { ...s, utgifter: { u1: { ...s.utgifter.u1, type: ' Instrument ' } } };
  const typet = revisjonsposter(medType, [i], { tittelFor: (_, l) => l.id, levNavn: () => '', behovliste });
  assert.equal(typet[2].kategori, 'Instrument');
  const ft = fordelingPerKategori(typet, revisjonsoppsummering(fakturaer, typet).perPost, 8, ['Inventar']);
  assert.deepEqual(ft.grupper.map(g => [g.navn, g.kostnad, g.egne]), [['Inventar', 1000, 0], ['Instrument', 4800, 1800.5]]);
  assert.deepEqual(typeliste(behovliste, [medType]), ['Instrument', 'Inventar']);

  // En fri linje i innkjøpet (ikke i søknaden) får kategorien den er merket med.
  const fri = { ...i, linjer: { ...i.linjer, l2: { antall: 2, rekkefolge: 2, type: ' Konsert ' } } };
  const friPoster = revisjonsposter(s, [fri], { tittelFor: (_, l) => l.id, levNavn: () => '', behovliste });
  assert.deepEqual(friPoster.map(p => p.kategori), ['Instrument', 'Konsert', '']);
});

test('egeninnsats: løs utgift uten faktura, hele beløpet er egne midler', async () => {
  const { pott, revisjonsposter, revisjonsoppsummering, fordelteEgneMidler, utgiftEgne } = await import('../app/data/beregning.js');
  const s = soknad('s1', 'innvilget', {}, {
    innvilget: 100000, egenandel: 20000,
    utgifter: {
      d: { beskrivelse: 'Dugnad, 60 timer à 300 kr', belop: 18000, egeninnsats: true, egneMidler: 5, rekkefolge: 1 },
      u: { beskrivelse: 'Frakt', belop: 2000, rekkefolge: 2 },
    },
  });
  assert.equal(utgiftEgne(s.utgifter.d), 18000); // hele beløpet, uansett hva som står i egneMidler
  assert.equal(fordelteEgneMidler(s), 18000);
  const poster = revisjonsposter(s, [], { tittelFor: () => '', levNavn: () => '' });
  assert.deepEqual(poster.map(p => [p.id, p.egeninnsats, p.egne, p.under]), [['utgift/d', true, 18000, 'Egeninnsats'], ['utgift/u', false, 0, 'Løs utgift']]);
  const o = revisjonsoppsummering([], poster);
  assert.equal(o.manglerFaktura, 1); // bare frakten – dugnaden skal ikke ha faktura
  assert.equal(o.egeninnsats, 18000);
  // Potten: dugnaden er en del av egenandelen, så giveren belastes ikke for den.
  const p = pott(s);
  assert.deepEqual([p.ramme, p.disponertFull, p.egenBrukt, p.disponert, p.gjenstar], [120000, 20000, 20000, 0, 100000]);
});

test('utenExif fjerner bare EXIF-segmentet fra en JPEG', async () => {
  const { utenExif } = await import('../app/ui/bildekrymp.js');
  const segment = (merke, data) => [0xff, merke, (data.length + 2) >> 8, (data.length + 2) & 0xff, ...data];
  const jfif = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), exif = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3]);
  const xmp = segment(0xe1, [0x68, 0x74, 0x74, 0x70]), tabell = segment(0xdb, [1, 2, 3]);
  // Etter SOS (ff da) kommer bildedata, som kan inneholde «ff e1» uten at det er et segment.
  const data = [0xff, 0xda, 0, 2, 9, 0xff, 0xe1, 0x45, 0x78, 0x69, 0x66, 0xff, 0xd9];
  const med = Uint8Array.from([0xff, 0xd8, ...jfif, ...exif, ...xmp, ...tabell, ...data]);
  assert.deepEqual([...utenExif(med)], [0xff, 0xd8, ...jfif, ...xmp, ...tabell, ...data]);
  const uten = Uint8Array.from([0xff, 0xd8, ...jfif, ...tabell, ...data]);
  assert.equal(utenExif(uten), uten); // ingenting å fjerne: samme bytes tilbake
  assert.deepEqual([...utenExif(new Uint8Array([1, 2, 3]).buffer)], [1, 2, 3]); // ikke JPEG
});

test('utenPrediktor gir de rå punktene tilbake', async () => {
  const { utenPrediktor } = await import('../app/ui/bildekrymp.js');
  // 3 punkter RGB per rad, to rader.
  const punkter = [10, 20, 30, 12, 25, 31, 200, 3, 90, 11, 22, 33, 250, 0, 7, 9, 9, 9];
  const rad = 9, kanaler = 3;
  // PNG-filtrene 0–4, brukt rad for rad slik en PDF-skriver gjør det.
  for (const filtre of [[0, 0], [1, 2], [3, 4], [4, 1], [2, 3]]) {
    const pakket = [];
    filtre.forEach((filter, r) => {
      pakket.push(filter);
      for (let i = 0; i < rad; i++) {
        const o = r * rad + i;
        const a = i >= kanaler ? punkter[o - kanaler] : 0, b = r ? punkter[o - rad] : 0, c = r && i >= kanaler ? punkter[o - rad - kanaler] : 0;
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const gjett = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
        pakket.push((punkter[o] - gjett) & 255);
      }
    });
    assert.deepEqual([...utenPrediktor(Uint8Array.from(pakket), 15, 3, kanaler)], punkter, `filtre ${filtre}`);
  }
  // TIFF-prediktoren: forskjell mot punktet til venstre.
  const tiff = punkter.map((v, o) => (o % rad >= kanaler ? v - punkter[o - kanaler] : v) & 255);
  assert.deepEqual([...utenPrediktor(Uint8Array.from(tiff), 2, 3, kanaler)], punkter);
  const raa = Uint8Array.from(punkter);
  assert.equal(utenPrediktor(raa, 1, 3, kanaler), raa);
});

test('erLast: søknaden er låst når den ikke lenger er et utkast', async () => {
  const { erLast } = await import('../app/data/beregning.js');
  assert.equal(erLast({ status: 'utkast' }), false);
  assert.equal(erLast({}), false); // gamle søknader uten status regnes som utkast
  for (const status of ['sendt', 'innvilget', 'avslatt', 'avsluttet']) assert.equal(erLast({ status }), true);
});

test('partiturplass: første instrument i navnet avgjør, ukjente kommer sist', async () => {
  const { partiturplass } = await import('../app/data/beregning.js');
  const rekke = ['Piccolo', 'Fløyter', 'Obo', 'Fagott', 'Bassklarinett', 'Barytonsaksofon', 'Kornett', 'Flygelhorn', 'Valthorn', 'Basstrombone', 'Baryton', 'Tuba', 'Skarptromme', 'Flexatone'];
  const plasser = rekke.map(partiturplass);
  assert.deepEqual(plasser, [...plasser].sort((a, b) => a - b));
  assert.equal(partiturplass('Altsax/Kornett/Horn'), partiturplass('Saksofon'));
  assert.equal(partiturplass('Flygelhorn'), partiturplass('Trompet'));
  assert.equal(partiturplass('Horn'), partiturplass('Althorn'));
  assert.equal(partiturplass('Barytonsax'), partiturplass('Tenorsaksofon'));
  assert.ok(partiturplass('Baryton') > partiturplass('Trombone'));
  assert.ok(partiturplass('Kubjelle') > partiturplass('Pauker'));
});

test('grupperFakturaposter: typer som på forsiden, instrumenter i partiturrekkefølge, resten alfabetisk', async () => {
  const { grupperFakturaposter } = await import('../app/data/beregning.js');
  const post = (navn, kategori, type = 'linje') => ({ id: navn, type, navn, tittel: `1 × ${navn}`, kategori, tilbudt: 100 });
  const poster = [
    post('Ventilolje', 'Utstyr'), post('Tuba', 'Instrumenter'), post('Agogo Bell', 'Instrumenter'), post('Horn', 'Instrumenter'),
    post('Klarinett', 'Instrumenter'), post('Bøylefett', 'Utstyr'), post('Kornett', 'Instrumenter'), post('Altsax/Kornett/Horn', 'Instrumenter'),
    post('Fri linje', ''), { id: 'u', type: 'utgift', tittel: 'Porto', kategori: '', tilbudt: 50 }, post('Fløyte', 'Instrumenter'), post('Horn', 'Instrumenter'),
  ];
  const grupper = grupperFakturaposter(poster, ['Utstyr', 'Instrumenter']);
  assert.deepEqual(grupper.map(g => g.navn), ['Utstyr', 'Instrumenter', 'Uten type', 'Andre utgifter']);
  assert.deepEqual(grupper[0].poster.map(p => p.navn), ['Bøylefett', 'Ventilolje']);
  assert.deepEqual(grupper[1].poster.map(p => p.navn), ['Fløyte', 'Klarinett', 'Altsax/Kornett/Horn', 'Kornett', 'Horn', 'Horn', 'Tuba', 'Agogo Bell']);
  // Typen «Instrument» (entall) gjelder også, uten manuell rekkefølge.
  const en = grupperFakturaposter([post('Tuba', 'Instrument'), post('Fløyte', 'Instrument')]);
  assert.deepEqual(en[0].poster.map(p => p.navn), ['Fløyte', 'Tuba']);
});

test('revisjonsposter: innkjøpslinjer har varenavn, antall og netto stykkpris', async () => {
  const { revisjonsposter } = await import('../app/data/beregning.js');
  const i = { id: 'i1', linjer: { l1: { antall: 3 } }, leverandorer: { a: {} }, priser: { l1: { a: { raa: '100 -10%' } } }, valgt: { l1: 'a' } };
  const s = { utgifter: { u1: { beskrivelse: 'Porto', belop: 59 } } };
  const [linje, utgift] = revisjonsposter(s, [i], { tittelFor: () => 'Bøylefett', levNavn: () => 'L' });
  assert.deepEqual([linje.navn, linje.antall, linje.stykkpris, linje.tilbudt], ['Bøylefett', 3, 90, 270]);
  assert.equal(utgift.stykkpris, undefined);
});

// ——— Revisor og godkjenning ———

function revisjonsgrunnlag() {
  const soknad = {
    id: 's1', status: 'avsluttet', tittel: 'Instrumenter', innvilget: 50000, egenandel: 2000, momsProsent: 8,
    linjer: { l1: { behovId: null, tittel: 'Kornett', antall: 2, estPris: 8000, rekkefolge: 1 } },
    utgifter: { u1: { beskrivelse: 'Frakt', belop: 500, rekkefolge: 1 } },
    tilgang: ['rita.r@revisor.no', 'olav@revisor.no'],
  };
  const innkjop = [{
    id: 'i1', soknadId: 's1', navn: 'Innkjøp 1',
    linjer: { k1: { soknadLinjeId: 'l1', tittel: 'Kornett', antall: 2, rekkefolge: 1 } },
    leverandorer: { a: { leverandorId: 'mh', frakt: 300, rekkefolge: 1 }, b: { leverandorId: 'nb', frakt: 0, rekkefolge: 2 } },
    priser: { k1: { a: { raa: '8000 -10%' }, b: { raa: '7500' } } },
    valgt: { k1: 'a' },
  }];
  const fakturaer = [
    { id: 'f1', soknadId: 's1', lopenummer: 1, leverandor: 'Musikkhuset', fakturanr: '100', dato: '2026-05-01', belop: 14700, fil: { sti: 'a/b.pdf' }, dekker: { 'i1|k1': true }, merknad: '' },
    { id: 'fx', soknadId: 's2', lopenummer: 1, belop: 999, dekker: {} },
  ];
  return { soknad, innkjop, fakturaer };
}

test('revisjonsavtrykk endres av tall, bilag og koblinger', async () => {
  const { revisjonsavtrykk } = await import('../app/data/beregning.js');
  const g = revisjonsgrunnlag();
  const for_ = revisjonsavtrykk(g.soknad, g.innkjop, g.fakturaer);
  assert.match(for_, /^v1:/);
  assert.equal(revisjonsavtrykk(structuredClone(g.soknad), structuredClone(g.innkjop), structuredClone(g.fakturaer)), for_);
  const endringer = {
    innvilget: x => { x.soknad.innvilget = 60000; },
    egenandel: x => { x.soknad.egenandel = 3000; },
    egenandelsvalg: x => { x.soknad.egenandelValg = 'andel'; },
    momsprosent: x => { x.soknad.momsProsent = 10; },
    'søkt': x => { x.soknad.soktOverstyrt = 12345; },
    utgiftsbeløp: x => { x.soknad.utgifter.u1.belop = 500.5; },
    egeninnsats: x => { x.soknad.utgifter.u1.egeninnsats = true; },
    'ny utgift': x => { x.soknad.utgifter.u2 = { beskrivelse: 'Mer', belop: 1, rekkefolge: 2 }; },
    antall: x => { x.innkjop[0].linjer.k1.antall = 3; },
    'valgt leverandør': x => { x.innkjop[0].valgt.k1 = 'b'; },
    'valgt pris': x => { x.innkjop[0].priser.k1.a.raa = '8000 -11%'; },
    frakt: x => { x.innkjop[0].leverandorer.a.frakt = 400; },
    'egne midler': x => { x.innkjop[0].linjer.k1.egneMidler = 1000; },
    fakturabeløp: x => { x.fakturaer[0].belop = 14700.01; },
    fakturanummer: x => { x.fakturaer[0].fakturanr = '101'; },
    fakturadato: x => { x.fakturaer[0].dato = '2026-05-02'; },
    fakturaleverandør: x => { x.fakturaer[0].leverandor = 'Nordic Brass'; },
    'løpenummer': x => { x.fakturaer[0].lopenummer = 2; },
    vedlegg: x => { x.fakturaer[0].fil = { sti: 'a/c.pdf' }; },
    kobling: x => { x.fakturaer[0].dekker = {}; },
    'ny faktura': x => { x.fakturaer.push({ id: 'f2', soknadId: 's1', lopenummer: 2, belop: 100, dekker: {} }); },
    'slettet faktura': x => { x.fakturaer.shift(); },
  };
  for (const [hva, endre] of Object.entries(endringer)) {
    const x = structuredClone(g);
    endre(x);
    assert.notEqual(revisjonsavtrykk(x.soknad, x.innkjop, x.fakturaer), for_, `${hva} skal endre avtrykket`);
  }
});

test('revisjonsavtrykk endres ikke av merknader, titler, typer, status og priser som ikke er valgt', async () => {
  const { revisjonsavtrykk } = await import('../app/data/beregning.js');
  const g = revisjonsgrunnlag();
  const for_ = revisjonsavtrykk(g.soknad, g.innkjop, g.fakturaer);
  const endringer = {
    fakturamerknad: x => { x.fakturaer[0].merknad = 'Delfaktura'; },
    tittel: x => { x.soknad.tittel = 'Ny tittel'; },
    status: x => { x.soknad.status = 'innvilget'; },
    dokumenter: x => { x.soknad.dokumenter = { d1: { navn: 'Brev.pdf', sti: 'x' } }; },
    'frist og sendt': x => { x.soknad.frist = '2027-01-01'; x.soknad.sendt = '2026-01-01'; },
    'neste frist': x => { x.soknad.nesteFrist = '2027-03-01'; x.soknad.nesteFristHva = 'Sluttrapport'; },
    utgiftsbeskrivelse: x => { x.soknad.utgifter.u1.beskrivelse = 'Frakt og porto'; },
    'type på utgift': x => { x.soknad.utgifter.u1.type = 'Utstyr'; },
    linjetittel: x => { x.innkjop[0].linjer.k1.tittel = 'Kornett Bb'; },
    'type på linje': x => { x.innkjop[0].linjer.k1.type = 'Instrument'; },
    rekkefølge: x => { x.innkjop[0].linjer.k1.rekkefolge = 9; x.soknad.utgifter.u1.rekkefolge = 9; },
    'pris som ikke er valgt': x => { x.innkjop[0].priser.k1.b.raa = '7000'; },
    'frakt hos leverandør uten valg': x => { x.innkjop[0].leverandorer.b.frakt = 900; },
    alternativ: x => { x.innkjop[0].priser.k1.a.alternativ = 'Annen modell'; },
    'revisorens merknad': x => { x.soknad.revisorer = { olav_revisor_no: { epost: 'olav@revisor.no', merknad: 'Ok', kommentarer: { f1: { tekst: 'Hei' } } } }; },
    tildeling: x => { x.soknad.tilgang = []; },
    'faktura på en annen søknad': x => { x.fakturaer[1].belop = 5; },
  };
  for (const [hva, endre] of Object.entries(endringer)) {
    const x = structuredClone(g);
    endre(x);
    assert.equal(revisjonsavtrykk(x.soknad, x.innkjop, x.fakturaer), for_, `${hva} skal ikke endre avtrykket`);
  }
});

test('revisorstatus: godkjent, endret og ikke godkjent per tildelt revisor', async () => {
  const { revisjonsavtrykk, revisorstatus, revisjonGodkjent, revisornokkel } = await import('../app/data/beregning.js');
  const g = revisjonsgrunnlag();
  const avtrykk = revisjonsavtrykk(g.soknad, g.innkjop, g.fakturaer);
  assert.equal(revisornokkel('Rita.R@revisor.no'), 'rita_r_revisor_no');
  const brukere = [
    { id: 'rita.r@revisor.no', epost: 'rita.r@revisor.no', navn: 'Rita Revisor', rolle: 'revisor' },
    { id: 'olav@revisor.no', epost: 'olav@revisor.no', navn: '', rolle: 'revisor' },
    { id: 'kari@korpset.no', epost: 'kari@korpset.no', navn: 'Kari', rolle: 'administrator' },
  ];
  // Ingen har godkjent. Navnet hentes fra brukerlisten, ellers e-posten.
  let st = revisorstatus(g.soknad, avtrykk, brukere);
  assert.deepEqual(st.map(r => [r.navn, r.status]), [['olav@revisor.no', 'ikke'], ['Rita Revisor', 'ikke']]);
  assert.equal(revisjonGodkjent(st), false);

  // Én av to har godkjent.
  g.soknad.revisorer = { rita_r_revisor_no: { epost: 'rita.r@revisor.no', navn: 'Rita Revisor', godkjent: { tid: 1000, avtrykk }, merknad: ' Bilag 2 mangler ' } };
  st = revisorstatus(g.soknad, avtrykk, brukere);
  const rita = st.find(r => r.epost === 'rita.r@revisor.no');
  assert.deepEqual([rita.status, rita.tid, rita.merknad], ['godkjent', 1000, 'Bilag 2 mangler']);
  assert.equal(revisjonGodkjent(st), false);

  // Begge har godkjent.
  g.soknad.revisorer.olav_revisor_no = { epost: 'olav@revisor.no', navn: 'Olav', godkjent: { tid: 2000, avtrykk } };
  st = revisorstatus(g.soknad, avtrykk, brukere);
  assert.equal(revisjonGodkjent(st), true);

  // Tallene endres etterpå: godkjenningene gjelder ikke lenger.
  g.fakturaer[0].belop = 15000;
  st = revisorstatus(g.soknad, revisjonsavtrykk(g.soknad, g.innkjop, g.fakturaer), brukere);
  assert.deepEqual(st.map(r => r.status), ['endret', 'endret']);
  assert.equal(revisjonGodkjent(st), false);
  g.fakturaer[0].belop = 14700;

  // En revisor som fjernes fra søknaden teller ikke, selv om oppføringen ligger igjen.
  g.soknad.tilgang = ['olav@revisor.no'];
  st = revisorstatus(g.soknad, avtrykk, brukere);
  assert.deepEqual(st.map(r => r.epost), ['olav@revisor.no']);
  assert.equal(revisjonGodkjent(st), true);

  // En som ikke lenger har rollen Revisor regnes ikke som tildelt.
  g.soknad.tilgang = ['olav@revisor.no', 'kari@korpset.no', 'ukjent@x.no'];
  assert.deepEqual(revisorstatus(g.soknad, avtrykk, brukere).map(r => r.epost), ['olav@revisor.no']);
  // Uten brukerliste (revisorens egen visning) vises alle i tilgangslisten.
  assert.equal(revisorstatus(g.soknad, avtrykk, null).length, 3);
  // Ingen tildelte: ikke godkjent.
  assert.equal(revisjonGodkjent(revisorstatus({ id: 'x' }, avtrykk, brukere)), false);
});

test('datoKl gir dato og klokkeslett', async () => {
  const { datoKl } = await import('../app/ui/format.js');
  assert.equal(datoKl(new Date(2026, 9, 3, 14, 5).getTime()), '03.10.2026 kl. 14.05');
  assert.equal(datoKl(null), '');
});

test('fakturakommentarer: bare tildelte revisorer, tomme kommentarer teller ikke', async () => {
  const { fakturakommentarer, revisjonsavtrykk } = await import('../app/data/beregning.js');
  const g = revisjonsgrunnlag();
  const brukere = [
    { epost: 'rita.r@revisor.no', navn: 'Rita Revisor', rolle: 'revisor' },
    { epost: 'olav@revisor.no', navn: 'Olav Berg', rolle: 'revisor' },
  ];
  const for_ = revisjonsavtrykk(g.soknad, g.innkjop, g.fakturaer);
  g.soknad.revisorer = {
    rita_r_revisor_no: { epost: 'rita.r@revisor.no', navn: 'Rita Revisor', kommentarer: { f1: { tekst: ' Mangler spesifikasjon ', tid: 5 }, f9: { tekst: 'Slettet faktura', tid: 6 } } },
    olav_revisor_no: { epost: 'olav@revisor.no', navn: 'Olav Berg', kommentarer: { f1: { tekst: '  ', tid: 7 } } },
  };
  assert.deepEqual(fakturakommentarer(g.soknad, 'f1', brukere), [{ epost: 'rita.r@revisor.no', navn: 'Rita Revisor', tekst: 'Mangler spesifikasjon', tid: 5 }]);
  assert.deepEqual(fakturakommentarer(g.soknad, 'f2', brukere), []);
  // To revisorer på samme faktura: begge står, hver med sitt navn.
  g.soknad.revisorer.olav_revisor_no.kommentarer.f1.tekst = 'Enig';
  assert.deepEqual(fakturakommentarer(g.soknad, 'f1', brukere).map(k => k.navn), ['Olav Berg', 'Rita Revisor']);
  // Kommentarer gjør ikke en godkjenning ugyldig.
  assert.equal(revisjonsavtrykk(g.soknad, g.innkjop, g.fakturaer), for_);
  // En revisor som fjernes fra søknaden: kommentarene vises ikke lenger.
  g.soknad.tilgang = ['olav@revisor.no'];
  assert.deepEqual(fakturakommentarer(g.soknad, 'f1', brukere).map(k => k.navn), ['Olav Berg']);
});

test('kopistatus: grønn under 26 timer, gul til 50, rød over, grå når status er ukjent', async () => {
  const { kopistatus } = await import('../app/data/beregning.js');
  const na = Date.parse('2026-10-05T12:00:00Z');
  const for_ = timer => ({ kopi: { tatt: new Date(na - timer * 3600000).toISOString(), dokumenter: 122, filer: 24 } });
  assert.equal(kopistatus(for_(5), na).farge, 'gronn');
  assert.equal(kopistatus(for_(26), na).farge, 'gronn');
  assert.equal(kopistatus(for_(26.1), na).farge, 'gul');
  assert.equal(kopistatus(for_(50), na).farge, 'gul');
  assert.equal(kopistatus(for_(50.1), na).farge, 'rod');
  assert.deepEqual([kopistatus(for_(5), na).dokumenter, kopistatus(for_(5), na).filer], [122, 24]);
  for (const ukjent of [null, {}, { kopi: {} }, { kopi: { tatt: 'tull' } }]) {
    const k = kopistatus(ukjent, na);
    assert.deepEqual([k.farge, k.tatt, k.dokumenter, k.restore.farge], ['gra', null, null, 'gra']);
  }
});

test('kopistatus: restore-testen er gul når den er over 35 dager gammel eller ikke bestått, og styrer ikke lampen', async () => {
  const { kopistatus } = await import('../app/data/beregning.js');
  const na = Date.parse('2026-10-05T12:00:00Z');
  const med = (dager, bestatt) => kopistatus({
    kopi: { tatt: new Date(na - 3600000).toISOString(), dokumenter: 1, filer: 1 },
    restoreTest: { kjort: new Date(na - dager * 86400000).toISOString(), bestatt },
  }, na);
  assert.equal(med(4, true).restore.farge, 'gronn');
  assert.equal(med(36, true).restore.farge, 'gul');
  assert.equal(med(1, false).restore.farge, 'gul');
  assert.equal(med(36, false).farge, 'gronn');
});

// ——— Planlagte utgifter (kort 0006) ———

const utgiftssoknad = (ekstra = {}) => soknad('s1', 'innvilget', {
  a: { behovId: null, type: 'Honorar', tittel: 'Dirigent', antall: 2, estPris: 20000, rekkefolge: 1 },
  b: { behovId: null, tittel: 'Leie av lokale', antall: 1, estPris: 8000, rekkefolge: 2 },
  c: { behovId: 'b1', antall: 1, estPris: 5000, rekkefolge: 3 },
  d: { behovId: null, tittel: 'Kom i tillegg', antall: 1, estPris: 900, rekkefolge: 4, etterSoknad: true },
  e: { behovId: null, tittel: 'Noter', antall: 1, estPris: 3000, rekkefolge: 5 },
}, { innvilget: 60000, ...ekstra });

test('kanBliUtgift: bare frie, søkte linjer som verken er i innkjøp eller ført som utgift', async () => {
  const { kanBliUtgift, ikkeFordelte, linjerMedUtgift } = await import('../app/data/beregning.js');
  const iInnkjop = [{ linjer: { q: { soknadLinjeId: 'e' } } }];
  assert.deepEqual(kanBliUtgift(utgiftssoknad(), []).map(l => l.id), ['a', 'b', 'e']);
  assert.deepEqual(kanBliUtgift(utgiftssoknad(), iInnkjop).map(l => l.id), ['a', 'b']);
  const s = utgiftssoknad({ utgifter: { u1: { soknadLinjeId: 'a', belop: 42500 }, u2: { beskrivelse: 'Løs', belop: 100 }, u3: { soknadLinjeId: 'finnesikke', belop: 1 } } });
  assert.deepEqual(kanBliUtgift(s, iInnkjop).map(l => l.id), ['b']);
  assert.deepEqual([...linjerMedUtgift(s)], ['a']);
  // En linje følges opp ett sted: plukket som utgift er den ikke lenger «ikke fordelt».
  assert.deepEqual(ikkeFordelte(s, iInnkjop).map(l => l.id), ['b', 'c', 'd']);
});

test('planlagt utgift får beskrivelse og type fra linjen, og står først i søknadens rekkefølge', async () => {
  const { utgiftsliste, sumUtgifter, revisjonsposter, kategorigrupper } = await import('../app/data/beregning.js');
  const s = utgiftssoknad({ utgifter: {
    u1: { beskrivelse: 'Kaffe', belop: 640, rekkefolge: 1 },
    u2: { soknadLinjeId: 'b', type: 'Leie', belop: 8000, rekkefolge: 2 },
    u3: { soknadLinjeId: 'a', beskrivelse: 'Gammel tekst', type: 'Gammel', belop: 42500, dato: '2026-09-20', rekkefolge: 3 },
  } });
  assert.deepEqual(utgiftsliste(s).map(u => [u.id, u.beskrivelse, u.type || '', !!u.planlagt, u.sokt]), [
    ['u3', 'Dirigent', 'Honorar', true, 40000], ['u2', 'Leie av lokale', 'Leie', true, 8000], ['u1', 'Kaffe', '', false, undefined],
  ]);
  assert.equal(sumUtgifter(s), 51140);
  const poster = revisjonsposter(s, [], { tittelFor: () => '', levNavn: () => '' });
  assert.deepEqual(poster.map(p => [p.id, p.tittel, p.under, p.kategori, p.tilbudt]), [
    ['utgift/u3', 'Dirigent', 'Utgift fra søknaden · 20.09.2026', 'Honorar', 42500],
    ['utgift/u2', 'Leie av lokale', 'Utgift fra søknaden', 'Leie', 8000],
    ['utgift/u1', 'Kaffe', 'Løs utgift', '', 640],
  ]);
  assert.deepEqual(kategorigrupper(poster).map(g => [g.navn, g.poster.length]), [['Honorar', 1], ['Leie', 1], ['Andre utgifter', 1]]);
  // Retter vi tittelen på linjen, følger utgiften med.
  s.linjer.a.tittel = 'Dirigenthonorar';
  assert.equal(utgiftsliste(s)[0].beskrivelse, 'Dirigenthonorar');
});

test('å koble en utgift til en søknadslinje endrer verken det søkte, potten eller avtrykket', async () => {
  const { pott, revisjonsavtrykk } = await import('../app/data/beregning.js');
  const los = utgiftssoknad({ utgifter: { u1: { beskrivelse: 'Dirigent vår og høst', belop: 42500, rekkefolge: 1 } } });
  const koblet = utgiftssoknad({ utgifter: { u1: { beskrivelse: 'Dirigent vår og høst', belop: 42500, rekkefolge: 1, soknadLinjeId: 'a' } } });
  const fakturaer = [{ id: 'f1', soknadId: 's1', lopenummer: 1, belop: 42500, dekker: { 'utgift|u1': true } }];
  assert.equal(sumEstimert(koblet), sumEstimert(los));
  assert.deepEqual(pott(koblet, []), pott(los, []));
  assert.equal(revisjonsavtrykk(koblet, [], fakturaer), revisjonsavtrykk(los, [], fakturaer));
});

test('leverandorIRegister: sammenligner uten hensyn til store/små bokstaver og mellomrom i endene', async () => {
  const { leverandorIRegister } = await import('../app/data/beregning.js');
  const register = [{ id: 'a', navn: 'Musikkhuset AS' }, { id: 'b', navn: '' }];
  assert.equal(leverandorIRegister('musikkhuset as ', register), true);
  assert.equal(leverandorIRegister('Musikhuset AS', register), false);
  assert.equal(leverandorIRegister('Musikk', register), false); // delvis treff er ikke nok
  assert.equal(leverandorIRegister('', register), true); // tomt felt: ingenting å legge inn
  assert.equal(leverandorIRegister('  ', register), true);
  assert.equal(leverandorIRegister('Ny AS', []), false);
});

test('erTomPost: urørt post slik «+ Ny …» lager den, og ikke når noe er fylt ut', async () => {
  const { erTomPost } = await import('../app/data/beregning.js');
  const faktura = { id: 'f', soknadId: 's', lopenummer: 4, leverandor: '', fakturanr: '', dato: null, belop: null, fil: null, dekker: {}, merknad: '', tid: 1 };
  assert.equal(erTomPost('fakturaer', faktura), true);
  assert.equal(erTomPost('fakturaer', { ...faktura, leverandor: '  ' }), true);
  assert.equal(erTomPost('fakturaer', { ...faktura, leverandor: 'Nordic Brass' }), false);
  assert.equal(erTomPost('fakturaer', { ...faktura, belop: 0 }), false); // 0 kr er skrevet inn
  assert.equal(erTomPost('fakturaer', { ...faktura, fil: { navn: 'a.pdf', sti: 'x' } }), false);
  assert.equal(erTomPost('fakturaer', { ...faktura, dekker: { 'i1|l1': true } }), false);
  assert.equal(erTomPost('fakturaer', { ...faktura, merknad: 'delfaktura' }), false);

  const behov = { id: 'b', type: '', tittel: '', beskrivelse: '', antall: 1, estPris: 0, statusOverstyring: null };
  assert.equal(erTomPost('behov', behov), true);
  assert.equal(erTomPost('behov', { ...behov, tittel: 'Kornett' }), false);
  assert.equal(erTomPost('behov', { ...behov, antall: 3 }), false);
  assert.equal(erTomPost('behov', { ...behov, estPris: 500 }), false);
  assert.equal(erTomPost('behov', { ...behov, statusOverstyring: 'anskaffet' }), false);

  assert.equal(erTomPost('leverandorer', { id: 'l', navn: '', kontakt: '' }), true);
  assert.equal(erTomPost('leverandorer', { id: 'l', navn: '', kontakt: 'Kari' }), false);
  assert.equal(erTomPost('givere', { id: 'g', navn: '', kontakt: '', momsTrekk: false, momsProsent: 8 }), true);
  assert.equal(erTomPost('givere', { id: 'g', navn: '', kontakt: '', momsTrekk: true, momsProsent: 8 }), false);

  // Kontaktfeltene (kort 0014): bare ett av dem utfylt teller som rørt.
  assert.equal(erTomPost('leverandorer', { id: 'l', navn: '', kontakt: '', nettadresse: 'musikkhuset.no' }), false);
  assert.equal(erTomPost('leverandorer', { id: 'l', navn: '', kontakt: '', kontaktperson: 'Ola' }), false);
  assert.equal(erTomPost('leverandorer', { id: 'l', navn: '', kontakt: '', epost: '  ' }), true);
  assert.equal(erTomPost('givere', { id: 'g', navn: '', kontakt: '', momsTrekk: false, momsProsent: 8, telefon: '77 60 10 20' }), false);
  assert.equal(erTomPost('givere', { id: 'g', navn: '', kontakt: '', momsTrekk: false, momsProsent: 8, epost: 'nina@sbnord.no' }), false);
});

test('kontaktinfo på giver og leverandør (kort 0014): linjer, kort tekst og lenke', async () => {
  const { kontaktinfo, kontaktlinjer, kontaktkort, kontaktsammendrag, notatlinje, leverandorKontaktinfo } = await import('../app/data/beregning.js');
  const { nettlenke } = await import('../app/ui/format.js');
  const mh = { id: 'mh', navn: 'Musikkhuset', kontakt: 'Kundenr. 4471\nSpør etter rabatt', nettadresse: ' musikkhuset.no ', kontaktperson: 'Ola Berg', epost: 'ola@musikkhuset.no', telefon: '' };
  const gammel = { id: 'nb', navn: 'Nordic Brass', kontakt: 'Anne Lie\nanne@nordicbrass.no' };

  // Eldre dokumenter mangler feltene – alltid strenger.
  assert.deepEqual(kontaktinfo(gammel), { kontaktperson: '', epost: '', telefon: '', nettadresse: '' });
  assert.deepEqual(kontaktinfo(mh), { kontaktperson: 'Ola Berg', epost: 'ola@musikkhuset.no', telefon: '', nettadresse: 'musikkhuset.no' });

  assert.deepEqual(kontaktlinjer(mh), ['Ola Berg', 'ola@musikkhuset.no', 'musikkhuset.no']);
  assert.deepEqual(kontaktlinjer(mh, { medNett: false }), ['Ola Berg', 'ola@musikkhuset.no']);
  assert.deepEqual(kontaktlinjer(gammel), []);

  // Listene og velgeren: navn · telefon · e-post, ellers første linje av notatet.
  assert.equal(kontaktsammendrag(mh), 'Ola Berg · ola@musikkhuset.no');
  assert.equal(kontaktsammendrag({ ...mh, telefon: '22 33 44 55' }), 'Ola Berg · 22 33 44 55 · ola@musikkhuset.no');
  assert.equal(kontaktsammendrag(gammel), '');
  assert.equal(notatlinje(gammel), 'Anne Lie');
  assert.equal(kontaktkort(mh), 'Ola Berg · ola@musikkhuset.no');
  assert.equal(kontaktkort(gammel), 'Anne Lie');
  assert.equal(kontaktkort({ kontakt: '' }), '');

  // Innkjøp: registerleverandør får feltene, fri leverandør bare notatet.
  const register = [mh, gammel];
  assert.deepEqual(leverandorKontaktinfo({ leverandorId: 'mh', frakt: 0 }, register), { kontaktperson: 'Ola Berg', epost: 'ola@musikkhuset.no', telefon: '', nettadresse: 'musikkhuset.no', notat: 'Kundenr. 4471\nSpør etter rabatt' });
  assert.deepEqual(leverandorKontaktinfo({ navn: 'Fri', kontakt: 'post@fri.no', kontaktperson: 'Skal ikke brukes' }, register), { kontaktperson: '', epost: '', telefon: '', nettadresse: '', notat: 'post@fri.no' });

  // Lenken får https:// når protokollen mangler; det lagrede feltet røres ikke.
  assert.equal(nettlenke('musikkhuset.no'), 'https://musikkhuset.no');
  assert.equal(nettlenke(' http://soknad.sbnord.no/ '), 'http://soknad.sbnord.no/');
  assert.equal(nettlenke(''), '');
  assert.equal(nettlenke(null), '');
});

test('nesteFrist: egen frist, utledet fra søknadsfristen for utkast, ingen for lukkede (kort 0010)', async () => {
  const { nesteFrist } = await import('../app/data/beregning.js');
  const iDag = '2026-10-05';
  // Egen frist med tekst
  assert.deepEqual(nesteFrist({ status: 'innvilget', frist: '2026-03-15', nesteFrist: '2026-10-20', nesteFristHva: 'Sluttrapport til giver' }, iDag),
    { dato: '2026-10-20', dager: 15, hva: 'Sluttrapport til giver', tilstand: 'naer' });
  // Grensen: 30 dager er nær, 31 er senere, i dag er nær, i går er forfalt
  assert.equal(nesteFrist({ status: 'sendt', nesteFrist: '2026-11-04' }, iDag).tilstand, 'naer');
  assert.equal(nesteFrist({ status: 'sendt', nesteFrist: '2026-11-05' }, iDag).tilstand, 'senere');
  assert.equal(nesteFrist({ status: 'sendt', nesteFrist: '2026-10-05' }, iDag).tilstand, 'naer');
  assert.equal(nesteFrist({ status: 'sendt', nesteFrist: '2026-10-04' }, iDag).tilstand, 'forfalt');
  // Dato uten tekst
  assert.equal(nesteFrist({ status: 'sendt', nesteFrist: '2026-12-01' }, iDag).hva, '');
  // Utkast uten egen frist: søknadsfristen, også når den er passert
  assert.deepEqual(nesteFrist({ status: 'utkast', frist: '2026-10-15' }, iDag), { dato: '2026-10-15', dager: 10, hva: 'Send søknaden', tilstand: 'naer' });
  assert.equal(nesteFrist({ status: 'utkast', frist: '2026-09-01' }, iDag).tilstand, 'forfalt');
  // Egen frist på et utkast går foran søknadsfristen
  assert.equal(nesteFrist({ status: 'utkast', frist: '2026-10-15', nesteFrist: '2026-10-08', nesteFristHva: 'Hent tilbud' }, iDag).hva, 'Hent tilbud');
  // Sendt/innvilget uten egen frist, tekst uten dato, og utkast uten frist: ingen
  assert.equal(nesteFrist({ status: 'sendt', frist: '2026-10-15' }, iDag), null);
  assert.equal(nesteFrist({ status: 'innvilget', frist: '2026-10-15', nesteFristHva: 'Rapport' }, iDag), null);
  assert.equal(nesteFrist({ status: 'utkast', frist: null }, iDag), null);
  // Avsluttet og avslått: ingen, selv om feltet står igjen
  assert.equal(nesteFrist({ status: 'avsluttet', nesteFrist: '2026-10-20' }, iDag), null);
  assert.equal(nesteFrist({ status: 'avslatt', nesteFrist: '2026-10-20' }, iDag), null);
});

test('sorterSoknader: neste frist øverst (nærmeste først), resten som før (kort 0010)', async () => {
  const { sorterSoknader } = await import('../app/data/beregning.js');
  const soknader = [
    { id: 'gammel', status: 'sendt', frist: '2025-06-01' },
    { id: 'jan', status: 'innvilget', frist: '2026-03-15', nesteFrist: '2027-01-15' },
    { id: 'nyUtenFrist', status: 'utkast', frist: null },
    { id: 'forfalt', status: 'innvilget', frist: '2026-02-01', nesteFrist: '2026-10-01' },
    { id: 'lukket', status: 'avsluttet', frist: '2026-09-01', nesteFrist: '2026-10-02' },
    { id: 'utkast', status: 'utkast', frist: '2026-10-20' },
    { id: 'nyere', status: 'sendt', frist: '2026-06-01' },
  ];
  assert.deepEqual(sorterSoknader(soknader, '2026-10-05').map(s => s.id),
    ['forfalt', 'utkast', 'jan', 'nyUtenFrist', 'lukket', 'nyere', 'gammel']);
});

test('velgbareSoknader: bare aktive pluss den man står i, sortert som listen (kort 0016)', async () => {
  const { velgbareSoknader } = await import('../app/data/beregning.js');
  const soknader = [
    { id: 'gammel', status: 'sendt', frist: '2025-06-01' },
    { id: 'avslatt', status: 'avslatt', frist: '2026-04-01' },
    { id: 'forfalt', status: 'innvilget', frist: '2026-02-01', nesteFrist: '2026-10-01' },
    { id: 'lukket', status: 'avsluttet', frist: '2026-09-01' },
    { id: 'utkast', status: 'utkast', frist: '2026-10-20' },
    { id: 'nyere', status: 'sendt', frist: '2026-06-01' },
  ];
  // Fra en aktiv søknad: ingen lukkede.
  assert.deepEqual(velgbareSoknader(soknader, 'nyere', '2026-10-05').map(s => s.id),
    ['forfalt', 'utkast', 'nyere', 'gammel']);
  // Fra en avsluttet søknad: den er med, de andre lukkede ikke.
  assert.deepEqual(velgbareSoknader(soknader, 'lukket', '2026-10-05').map(s => s.id),
    ['forfalt', 'utkast', 'lukket', 'nyere', 'gammel']);
  // Ingen aktive: bare den man står i.
  const bareLukkede = soknader.filter(s => ['avslatt', 'lukket'].includes(s.id));
  assert.deepEqual(velgbareSoknader(bareLukkede, 'avslatt', '2026-10-05').map(s => s.id), ['avslatt']);
});

test('iDag gir lokal dato som ÅÅÅÅ-MM-DD', async () => {
  const { iDag } = await import('../app/ui/format.js');
  assert.equal(iDag(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});

test('årshjul: tolv måneder fra forrige måned, årlige frister én gang, engangsfrister til måneden etter (kort 0009)', async () => {
  const { aarshjul } = await import('../app/data/beregning.js');
  const givere = [
    { id: 'g1', navn: 'Stiftelsen', frister: {
      a: { dato: '2024-03-15', tekst: 'Ordinær', arlig: true },
      b: { dato: '2024-09-15', tekst: 'Ordinær', arlig: true },
      c: { dato: '2026-12-01', tekst: 'Ekstra', arlig: false },
      d: { dato: null, tekst: 'Uten dato', arlig: true },
    } },
    { id: 'g2', navn: 'Fondet', frister: {
      e: { dato: '2026-10-01', tekst: 'Tidligere i måneden', arlig: false },
      f: { dato: '2026-11-04', tekst: '30 dager', arlig: false },
      g: { dato: '2026-11-05', tekst: '31 dager', arlig: false },
      h: { dato: '2026-08-31', tekst: 'For gammel', arlig: false },
      i: { dato: '2027-09-01', tekst: 'For langt fram', arlig: false },
    } },
    { id: 'g3', navn: 'Uten frister' },
  ];
  const hjul = aarshjul(givere, [], '2026-10-05');
  assert.deepEqual(hjul.map(m => `${m.aar}-${m.maaned}`), ['2026-9', '2026-10', '2026-11', '2026-12', '2027-1', '2027-2', '2027-3', '2027-4', '2027-5', '2027-6', '2027-7', '2027-8']);
  assert.deepEqual(hjul.map(m => m.forrige), [true, ...Array(11).fill(false)]);
  assert.equal(hjul[1].denne, true);
  const i = (aar, mnd) => hjul.find(m => m.aar === aar && m.maaned === mnd).poster.map(p => `${p.dato} ${p.navn} ${p.tekst} ${p.tilstand}`);
  assert.deepEqual(i(2027, 3), ['2027-03-15 Stiftelsen Ordinær senere']);
  assert.deepEqual(i(2026, 9), ['2026-09-15 Stiftelsen Ordinær passert']);
  assert.deepEqual(i(2026, 12), ['2026-12-01 Stiftelsen Ekstra senere']);
  assert.deepEqual(i(2026, 10), ['2026-10-01 Fondet Tidligere i måneden passert']);
  assert.deepEqual(i(2026, 11), ['2026-11-04 Fondet 30 dager naer', '2026-11-05 Fondet 31 dager senere']);
  assert.equal(hjul.flatMap(m => m.poster).length, 6);
  // Engangsfristen 01.12.2026 står til og med januar 2027 og er borte i februar
  assert.equal(aarshjul(givere, [], '2027-01-20')[0].poster.some(p => p.fristId === 'c'), true);
  assert.equal(aarshjul(givere, [], '2027-02-01').flatMap(m => m.poster).some(p => p.fristId === 'c'), false);
});

test('årshjul: 29.02 står på 28.02 uten skuddår, og søknadene vises med neste frist (kort 0009)', async () => {
  const { aarshjul, arligDato } = await import('../app/data/beregning.js');
  assert.equal(arligDato('2024-02-29', 2027), '2027-02-28');
  assert.equal(arligDato('2024-02-29', 2028), '2028-02-29');
  const givere = [{ id: 'g', navn: 'Skuddår', frister: { a: { dato: '2024-02-29', tekst: '', arlig: true } } }];
  const soknader = [
    { id: 'u', tittel: 'Klarinetter 2027', status: 'utkast', frist: '2027-06-01' },
    { id: 'i', tittel: 'Uniformer', status: 'innvilget', frist: '2026-02-01', nesteFrist: '2027-03-01', nesteFristHva: 'Sluttrapport til giver' },
    { id: 'f', tittel: 'Forfalt', status: 'innvilget', nesteFrist: '2026-09-20', nesteFristHva: 'Delrapport' },
    { id: 'gammel', tittel: 'Lenge forfalt', status: 'innvilget', nesteFrist: '2026-07-01' },
    { id: 's', tittel: 'Sendt uten neste frist', status: 'sendt', frist: '2026-11-01' },
    { id: 'a', tittel: 'Avsluttet', status: 'avsluttet', nesteFrist: '2026-11-01' },
  ];
  const poster = aarshjul(givere, soknader, '2026-10-05').flatMap(m => m.poster);
  assert.deepEqual(poster.map(p => `${p.type} ${p.dato} ${p.navn} · ${p.tekst} · ${p.tilstand}`), [
    'soknad 2026-09-20 Forfalt · Delrapport · forfalt',
    'giver 2027-02-28 Skuddår ·  · senere',
    'soknad 2027-03-01 Uniformer · Sluttrapport til giver · senere',
    'soknad 2027-06-01 Klarinetter 2027 · Send søknaden · senere',
  ]);
});

test('fristliste og nesteForekomst: årlig går til neste år når datoen er passert (kort 0009)', async () => {
  const { fristliste, nesteForekomst } = await import('../app/data/beregning.js');
  const iDag = '2026-10-05';
  assert.equal(nesteForekomst({ dato: '2024-03-15', arlig: true }, iDag), '2027-03-15');
  assert.equal(nesteForekomst({ dato: '2024-10-05', arlig: true }, iDag), '2026-10-05');
  assert.equal(nesteForekomst({ dato: '2024-12-01', arlig: true }, iDag), '2026-12-01');
  assert.equal(nesteForekomst({ dato: '2026-12-01', arlig: false }, iDag), '2026-12-01');
  assert.equal(nesteForekomst({ dato: '2026-10-04', arlig: false }, iDag), null);
  assert.equal(nesteForekomst({ dato: null, arlig: true }, iDag), null);
  assert.deepEqual(fristliste({ frister: { a: { dato: '2026-09-15' }, b: { dato: null }, c: { dato: '2024-03-15' } } }).map(f => f.id), ['c', 'a', 'b']);
  assert.deepEqual(fristliste({}), []);
});

// ——— Momskompensasjon per år (kort 0012) ———
test('momsPerAr fordeler momskompensasjonen etter fakturert beløp per kjøpsår', async () => {
  const { momsPerAr } = await import('../app/data/beregning.js');
  // 8 %, fakturert 60 000 + 40 000, egne midler 20 000 → 6 400 i alt.
  const f = [{ dato: '2026-11-03', belop: 35000 }, { dato: '2027-02-10', belop: 40000 }, { dato: '2026-12-28', belop: 25000 }];
  assert.deepEqual(momsPerAr(f, 6400), [
    { ar: 2026, mottas: 2027, fakturert: 60000, moms: 3840 },
    { ar: 2027, mottas: 2028, fakturert: 40000, moms: 2560 },
  ]);
});

test('momsPerAr: ett år gir én rad, uten fakturaer ingen', async () => {
  const { momsPerAr } = await import('../app/data/beregning.js');
  assert.deepEqual(momsPerAr([{ dato: '2026-05-12', belop: 1000 }, { dato: '2026-06-01', belop: 500 }], 120),
    [{ ar: 2026, mottas: 2027, fakturert: 1500, moms: 120 }]);
  assert.deepEqual(momsPerAr([], 0), []);
});

test('momsPerAr: faktura uten dato får egen rad sist, uten mottaksår', async () => {
  const { momsPerAr } = await import('../app/data/beregning.js');
  const rader = momsPerAr([{ dato: null, belop: 2500 }, { dato: '2026-05-12', belop: 7500 }], 800);
  assert.deepEqual(rader, [
    { ar: 2026, mottas: 2027, fakturert: 7500, moms: 600 },
    { ar: null, mottas: null, fakturert: 2500, moms: 200 },
  ]);
});

test('momsPerAr: kreditnota trekker ned sitt eget år, også til negativt', async () => {
  const { momsPerAr } = await import('../app/data/beregning.js');
  const rader = momsPerAr([{ dato: '2026-12-01', belop: 10000 }, { dato: '2027-01-15', belop: -2000 }], 640);
  assert.deepEqual(rader, [
    { ar: 2026, mottas: 2027, fakturert: 10000, moms: 800 },
    { ar: 2027, mottas: 2028, fakturert: -2000, moms: -160 },
  ]);
});

test('momsPerAr: øreresten legges på siste rad så radene summerer til totalen', async () => {
  const { momsPerAr } = await import('../app/data/beregning.js');
  const rader = momsPerAr([{ dato: '2025-03-01', belop: 100 }, { dato: '2026-03-01', belop: 100 }, { dato: '2027-03-01', belop: 100 }], 100);
  assert.deepEqual(rader.map(r => r.moms), [33.33, 33.33, 33.34]);
  assert.equal(Math.round(rader.reduce((s, r) => s + r.moms, 0) * 100), 10000);
});

// ——— Fakturert erstatter estimatet post for post (B-31, kort 0013) ———
test('pott: en post teller det fakturerte når den har faktura, ellers estimatet', async () => {
  const { pott } = await import('../app/data/beregning.js');
  const s = { id: 's', status: 'innvilget', innvilget: 40000, egenandel: 12322, linjer: {}, utgifter: { u1: { belop: 10000 }, u2: { belop: 5000 } } };
  const for_ = pott(s, [], []);
  assert.equal(for_.disponertFull, 15000);
  assert.equal(for_.gjenstar, 52322 - 15000);
  // Faktura lavere enn estimatet: «Gjenstår» øker med 1 500
  const lavere = pott(s, [], [{ id: 'f1', soknadId: 's', belop: 8500, dekker: { 'utgift|u1': true } }]);
  assert.equal(lavere.disponertFull, 13500);
  assert.equal(lavere.gjenstar, for_.gjenstar + 1500);
  // Høyere enn estimatet teller også
  assert.equal(pott(s, [], [{ id: 'f1', soknadId: 's', belop: 11000, dekker: { 'utgift|u1': true } }]).disponertFull, 16000);
  // «Flere fakturaer kommer»: estimatet gjelder
  const venter = { ...s, utgifter: { ...s.utgifter, u1: { belop: 10000, venterFlere: true } } };
  assert.equal(pott(venter, [], [{ id: 'f1', soknadId: 's', belop: 4000, dekker: { 'utgift|u1': true } }]).disponertFull, 15000);
  // Ukoblet faktura teller ikke
  assert.equal(pott(s, [], [{ id: 'f9', soknadId: 's', belop: 999, dekker: {} }]).disponertFull, 15000);
  // Egeninnsats har ingen faktura og teller estimatet
  const dugnad = { ...s, utgifter: { u1: { belop: 3000, egeninnsats: true } } };
  assert.equal(pott(dugnad, [], []).disponertFull, 3000);
});

test('pott: innkjøpslinje med faktura teller fakturert, og frakten teller til første faktura fra leverandøren', async () => {
  const { pott, fordelingPerKategori, revisjonsposter, revisjonsoppsummering } = await import('../app/data/beregning.js');
  const s = { id: 's', status: 'innvilget', innvilget: 100000, linjer: {} };
  const i = { id: 'i1', linjer: { l1: { antall: 2, rekkefolge: 1 }, l2: { antall: 1, rekkefolge: 2 } }, leverandorer: { a: { frakt: 500 } }, priser: { l1: { a: { raa: '11160' } }, l2: { a: { raa: '5000' } } }, valgt: { l1: 'a', l2: 'a' } };
  assert.equal(pott(s, [i], []).disponertFull, 22320 + 5000 + 500);
  const f = [{ id: 'f1', soknadId: 's', belop: 23000, dekker: { 'i1|l1': true } }];
  const p = pott(s, [i], f);
  assert.equal(p.disponertFull, 23000 + 5000); // frakten ligger i fakturaen
  // Sluttoppgjøret per type regner likt (uten frakt, som før)
  const poster = revisjonsposter(s, [i], { tittelFor: () => 'x', levNavn: () => 'A' });
  const kostnad = fordelingPerKategori(poster, revisjonsoppsummering(f, poster).perPost, null).sum.kostnad;
  assert.equal(kostnad, 28000);
  // Med krysset satt teller linjen tilbudt igjen – både i potten og i oppgjøret
  const venter = { ...i, linjer: { ...i.linjer, l1: { ...i.linjer.l1, venterFlere: true } } };
  assert.equal(pott(s, [venter], f).disponertFull, 22320 + 5000);
  const poster2 = revisjonsposter(s, [venter], { tittelFor: () => 'x', levNavn: () => 'A' });
  assert.equal(fordelingPerKategori(poster2, revisjonsoppsummering(f, poster2).perPost, null).sum.kostnad, 27320);
});

test('postkostnad tåler begge formene på perPost', async () => {
  const { postkostnad } = await import('../app/data/beregning.js');
  const post = { id: 'p', tilbudt: 100 };
  assert.equal(postkostnad(post, {}), 100);
  assert.equal(postkostnad(post, { p: 80 }), 80);
  assert.equal(postkostnad(post, { p: { fakturert: 80 } }), 80);
  assert.equal(postkostnad(post, { p: { fakturert: null } }), 100);
  assert.equal(postkostnad({ ...post, venterFlere: true }, { p: 80 }), 100);
});

// ——— Skrivestøtte (kort 0018) ———

test('tellTekst og tellerTekst: ord og tegn (kort 0018)', async () => {
  const { tellTekst, tellerTekst } = await import('../app/data/beregning.js');
  assert.equal(tellTekst('  Vi søker  om\nmidler ', 'ord'), 4);
  assert.equal(tellTekst('', 'ord'), 0);
  assert.equal(tellTekst('  abc de ', 'tegn'), 6);
  assert.equal(tellerTekst(12, 150, 'ord'), '12 av maks 150 ord');
  assert.equal(tellerTekst(12, null, 'tegn'), '12 tegn');
});

test('skjemafelt sorteres på rekkefølge, og tekstfelt gir tekst, teller og fjernede felt (kort 0018)', async () => {
  const { skjemafelt, tekstfelt, tekststatus } = await import('../app/data/beregning.js');
  const giver = { skjema: {
    b: { navn: 'Beskrivelse', hjelp: 'Hva', maks: 3, enhet: 'ord', rekkefolge: 2 },
    a: { navn: 'Om søkeren', maks: 20, enhet: 'tegn', rekkefolge: 1 },
  } };
  assert.deepEqual(skjemafelt(giver).map(f => f.id), ['a', 'b']);
  const soknad = { tekster: { a: 'Skiens Skolemusikk', b: 'fire kornetter til aspirantene', gammel: 'Tekst i et felt som er slettet', tom: '  ' } };
  const felt = tekstfelt(soknad, giver);
  assert.deepEqual(felt.map(f => [f.id, f.antall, f.over, f.utfylt, f.fjernet]), [
    ['a', 18, false, true, false], ['b', 4, true, true, false], ['gammel', 7, false, true, true],
  ]);
  const status = tekststatus(felt);
  assert.equal(status.tekst, '2 av 2 felt utfylt · 1 over grensen');
  // Uten skjema: ett fritt felt. Tekst skrevet mens giveren hadde skjema vises som fjernet.
  const fri = tekstfelt({ tekster: { a: 'gammel' } }, {});
  assert.deepEqual(fri.map(f => [f.id, f.fjernet]), [['fri', false], ['a', true]]);
  assert.equal(tekststatus(fri).tekst, '0 av 1 felt utfylt');
  // Det som står i feltene nå kan gis inn.
  assert.equal(tekstfelt(soknad, giver, { b: 'en to' })[1].over, false);
});

test('giverhistorikk: tidligere søknader til samme giver, nyeste først, uten utkast og uten søknaden selv (kort 0018)', async () => {
  const { giverhistorikk } = await import('../app/data/beregning.js');
  const soknader = [
    { id: 's1', giverId: 'g', tittel: 'Nå', status: 'utkast', frist: '2026-09-15', linjer: {} },
    { id: 's2', giverId: 'g', tittel: 'I fjor', status: 'innvilget', sendt: '2025-03-01', innvilget: 20000, soktOverstyrt: 25000, linjer: {} },
    { id: 's3', giverId: 'g', tittel: 'Eldre', status: 'avslatt', frist: '2024-03-15', soktOverstyrt: 9000, linjer: {} },
    { id: 's4', giverId: 'g', tittel: 'Påbegynt', status: 'utkast', linjer: {} },
    { id: 's5', giverId: 'annen', tittel: 'Annen giver', status: 'innvilget', sendt: '2025-01-01', linjer: {} },
  ];
  assert.deepEqual(giverhistorikk(soknader, 'g', 's1').map(h => [h.aar, h.tittel, h.sokt, h.innvilget, h.status]), [
    ['2025', 'I fjor', 25000, 20000, 'innvilget'], ['2024', 'Eldre', 9000, null, 'avslatt'],
  ]);
});

test('skrivunderlag tar med Om korpset, skjemaet med grenser, behovene per type, beløpene, historikken og det som står i feltene (kort 0018)', async () => {
  const { skrivunderlag } = await import('../app/data/beregning.js');
  const behov = [{ id: 'b1', type: 'Instrument', tittel: 'Kornett Bb', beskrivelse: 'Til aspirantene' }];
  const giver = { navn: 'Stiftelsen', kontakt: 'Krever rapport', skjema: {
    sf1: { navn: 'Om søkeren', hjelp: 'Hvem dere er', maks: 150, enhet: 'ord', rekkefolge: 1 },
    sf2: { navn: 'Tiltaket', hjelp: '', maks: 800, enhet: 'tegn', rekkefolge: 2 },
  } };
  const soknad = { id: 's1', giverId: 'g', tittel: 'Instrumenter 2026', frist: '2026-09-15', status: 'utkast', momsProsent: 8, egenandel: 5000,
    linjer: { l1: { behovId: 'b1', antall: 4, estPris: 8500, rekkefolge: 1 }, l2: { behovId: null, tittel: 'Notestativ', type: 'Utstyr', antall: 10, estPris: 400, rekkefolge: 2 }, l3: { behovId: null, tittel: 'Etter søknaden', antall: 1, estPris: 999, etterSoknad: true } },
    tekster: { sf1: 'Vi er et skolekorps.' } };
  const soknader = [soknad, { id: 's0', giverId: 'g', tittel: 'I fjor', status: 'innvilget', sendt: '2025-03-01', innvilget: 20000, soktOverstyrt: 25000, linjer: {} }];
  const organisasjon = { omKorpset: 'Skiens Skolemusikk, stiftet 1952.', omOkonomi: '', typeRekkefolge: ['Utstyr', 'Instrument'] };
  const u = skrivunderlag({ organisasjon, giver, soknad, behov, soknader });
  for (const bit of [
    '## Om korpset', '**Kort om korpset**', 'Skiens Skolemusikk, stiftet 1952.',
    '## Giver: Stiftelsen', 'Notat om giveren: Krever rapport',
    '1. Om søkeren (maks 150 ord)', '   Hvem dere er', '2. Tiltaket (maks 800 tegn)',
    'Tittel: Instrumenter 2026', 'Søknadsfrist: 2026-09-15',
    '- 4 × Kornett Bb à 8 500 kr = 34 000 kr – Til aspirantene', '- 10 × Notestativ à 400 kr = 4 000 kr',
    'Sum estimert: 38 000 kr', 'Egenandel (det vi dekker selv): 5 000 kr', 'momskompensasjon: 8 %', 'Søkt beløp: 30 360 kr',
    '- 2025: «I fjor» – søkt 25 000 kr, innvilget 20 000 kr (Innvilget)',
    '## Det som allerede står i feltene', '**Om søkeren**', 'Vi er et skolekorps.',
  ]) assert.ok(u.includes(bit), `mangler: ${bit}`);
  assert.ok(!u.includes('**Økonomi**'), 'tomme felt i Om korpset skal ikke med');
  assert.ok(!u.includes('Etter søknaden'), 'linjer lagt til etter søknaden skal ikke med');
  assert.ok(u.indexOf('Utstyr:') < u.indexOf('Instrument:'), 'typerekkefølgen fra innstillingene gjelder');
  assert.ok(!u.includes('**Tiltaket**'), 'tomme felt tas ikke med under «står i feltene»');
  // Uten skjema og uten innhold sier underlaget fra.
  const tomt = skrivunderlag({ soknad: { id: 'x', linjer: {} } });
  assert.ok(tomt.includes('Ingenting er fylt ut under Innstillinger'));
  assert.ok(tomt.includes('1. Søknadstekst'));
  assert.ok(tomt.includes('Behov: ingen linjer i søknaden enda.'));
});
