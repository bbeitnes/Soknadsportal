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
