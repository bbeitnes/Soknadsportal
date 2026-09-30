// Kjøres med: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kr, tolkTall, tolkDato, datoFelt, tidspunkt, fornavn } from '../app/ui/format.js';
import {
  linjeliste, sumEstimert, soktBelop, behovsinfo, velgbareBehov, SOKNADSFILTRE, nesteRekkefolge,
} from '../app/data/beregning.js';

test('kr bruker hardt mellomrom som tusenskille', () => {
  assert.equal(kr(12000), '12 000');
  assert.equal(kr(1234567), '1 234 567');
  assert.equal(kr(0), '0');
  assert.equal(kr(-1500), '−1 500');
  assert.equal(kr(999.6), '1 000');
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

  const sendt = soknad('s1', 'sendt', { l: { behovId: 'k', antall: 4, finansieres: true } });
  const info = behovsinfo(behov, [sendt]);
  assert.equal(info.status, 'Søkt'); // finansieres teller først når søknaden er innvilget
  assert.equal(info.iSoknader, 4);

  const innvilget = { ...sendt, status: 'innvilget' };
  assert.equal(behovsinfo(behov, [innvilget]).status, 'Finansiert');

  const avslatt = soknad('s2', 'avslatt', { l: { behovId: 'k', antall: 6 } });
  const iAvslatt = behovsinfo(behov, [avslatt]);
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
  assert.equal(tolkPris('8900 -10%').under, 'Liste 8 900 −10 %');
  assert.equal(tolkPris('1200 -180').under, 'Liste 1 200 −180');
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
  assert.deepEqual(o.perPost['i1/l1'], [1]);
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
  const { grupperInnkjopslinjer } = await import('../app/data/beregning.js');
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
  assert.equal(tolkPris('1000 -180').rabatt, '180');
  assert.equal(tolkPris('1000').rabatt, '');
  const i = {
    linjer: { a: { antall: 4, rekkefolge: 1 }, b: { antall: 2, rekkefolge: 2 }, c: { antall: 1, rekkefolge: 3 } },
    leverandorer: { x: { frakt: 500, vedlegg: { v1: { navn: 'Tilbud.pdf', tid: 1 } } }, y: { frakt: 100 }, z: { frakt: 900 } },
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
    { vare: 'Linje c', varLinje: '', antall: 1, liste: 50, rabatt: '5', netto: 45, sum: 45 },
    { vare: '100 Acme kornett', varLinje: 'Linje a', antall: 4, liste: 1000, rabatt: '10 %', netto: 900, sum: 3600 },
  ]);
  assert.deepEqual([x.sum, x.frakt, x.total, x.dokumenter], [3645, 500, 4145, ['Tilbud.pdf']]);
  const y = bestilling(i, 'y', valg);
  assert.deepEqual([y.linjer.map(l => l.vare), y.total, y.dokumenter], [['Linje b'], 400, []]);
  // Ingenting valgt hos leverandøren: tom bestilling, og frakten teller ikke.
  assert.deepEqual([bestilling(i, 'z', valg).linjer.length, bestilling(i, 'z', valg).total], [0, 0]);
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
