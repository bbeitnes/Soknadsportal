// Oppdiktede data for demomodus (?demo på localhost). Hentet fra prototypene.
import { ORGANISASJON_ID as org } from '../config/app-config.js';
import { revisornokkel, revisjonsavtrykk } from './beregning.js';

export function lagDemodata() {
  const naa = Date.now();
  const dagerSiden = d => naa - d * 86400000;
  const datoOm = d => new Date(naa + d * 86400000).toISOString().slice(0, 10);
  const av = (epost, navn, dager) => ({ endretAv: { epost, navn }, endretTid: dagerSiden(dager) });
  const kari = ['kari@korpset.no', 'Kari Nordmann'];
  const per = ['per@korpset.no', 'Per Hansen'];

  const brukere = {
    'kari@korpset.no': { organisasjonId: org, epost: 'kari@korpset.no', navn: 'Kari Nordmann', rolle: 'administrator', status: 'aktiv' },
    'per@korpset.no': { organisasjonId: org, epost: 'per@korpset.no', navn: 'Per Hansen', rolle: 'bruker', status: 'aktiv' },
    // ?demo=revisor logger inn som Rita.
    'rita@revisor.no': { organisasjonId: org, epost: 'rita@revisor.no', navn: 'Rita Revisor', rolle: 'revisor', status: 'aktiv' },
    'olav@revisor.no': { organisasjonId: org, epost: 'olav@revisor.no', navn: 'Olav Berg', rolle: 'revisor', status: 'aktiv' },
  };

  const givere = {
    g1: { organisasjonId: org, navn: 'Sparebankstiftelsen Nord', kontakt: 'Søknadsportal på nett. Frister 15. mars og 15. september.\nKontakt: Nina Hauge, nina@sbnord.no', momsTrekk: true, momsProsent: 8, ...av(...kari, 40) },
    g2: { organisasjonId: org, navn: 'Kulturrådet', kontakt: 'Instrumentfondet. Frist 1. juni.', momsTrekk: false, momsProsent: 8, ...av(...kari, 40) },
    g3: { organisasjonId: org, navn: 'Gjensidigestiftelsen', kontakt: 'Løpende søknader. Krever revisjonsrapport ved avslutning.', momsTrekk: true, momsProsent: 8, ...av(...per, 30) },
    g4: { organisasjonId: org, navn: 'Kommunen – kulturmidler', kontakt: 'Kultursjef Ole Vik, ole.vik@kommune.no', momsTrekk: false, momsProsent: 8, ...av(...per, 20) },
  };

  const behov = {
    b1: { organisasjonId: org, type: 'Instrument', tittel: 'Kornett Bb', beskrivelse: 'Til nye aspiranter. Studentmodell med etui.', antall: 6, estPris: 8500, statusOverstyring: null, ...av(...kari, 12) },
    b2: { organisasjonId: org, type: 'Instrument', tittel: 'Althorn Eb', beskrivelse: 'Erstatter to instrumenter med sprukne ventiler.', antall: 2, estPris: 12000, statusOverstyring: null, ...av(...kari, 60) },
    b3: { organisasjonId: org, type: 'Instrument', tittel: 'Trombone, tenor', beskrivelse: 'Yamaha YSL-354 eller tilsvarende.', antall: 2, estPris: 10000, statusOverstyring: null, ...av(...per, 62) },
    b4: { organisasjonId: org, type: 'Instrument', tittel: 'Baryton', beskrivelse: '', antall: 1, estPris: 21000, statusOverstyring: null, ...av(...per, 62) },
    b6: { organisasjonId: org, type: 'Utstyr', tittel: 'Notestativ', beskrivelse: 'Sammenleggbare, til øvingslokalet.', antall: 12, estPris: 450, statusOverstyring: null, ...av(...kari, 60) },
    b7: { organisasjonId: org, type: 'Instrument', tittel: 'Klarinett Bb', beskrivelse: '', antall: 4, estPris: 6500, statusOverstyring: null, ...av(...kari, 45) },
    b8: { organisasjonId: org, type: 'Utstyr', tittel: 'Dirigentpodium', beskrivelse: 'Kulturskolen låner oss sitt.', antall: 1, estPris: 4800, statusOverstyring: 'trengs-ikke', ...av(...per, 15) },
    b9: { organisasjonId: org, type: 'Uniform', tittel: 'Uniformsjakker', beskrivelse: 'Marineblå, blandede størrelser.', antall: 30, estPris: 1400, statusOverstyring: null, ...av(...per, 90) },
    b10: { organisasjonId: org, type: 'Instrument', tittel: 'Marsjtrommer', beskrivelse: 'To tenortrommer med bæresele.', antall: 2, estPris: 5200, statusOverstyring: null, ...av(...kari, 3) },
  };

  const linje = (behovId, antall, estPris, rekkefolge) => ({ behovId, tittel: '', antall, estPris, rekkefolge });

  const soknader = {
    s1: {
      organisasjonId: org, giverId: 'g1', tittel: 'Instrumenter til aspirantkorpset 2026', frist: '2026-03-15', sendt: '2026-03-03',
      nesteFrist: datoOm(-5), nesteFristHva: 'Delrapport til stiftelsen',
      status: 'innvilget', soktOverstyrt: null, innvilget: 150000, momsProsent: 8, revisjon: true,
      tilgang: ['rita@revisor.no', 'olav@revisor.no'],
      linjer: {
        l1: linje('b1', 4, 8500, 1), l2: linje('b2', 2, 12000, 2), l3: linje('b3', 2, 10000, 3),
        l4: linje('b4', 1, 21000, 4), l6: { ...linje('b6', 12, 450, 5), type: 'Inventar' }, l7: linje('b7', 2, 6500, 6),
        l8: { ...linje('b10', 2, 5200, 7), etterSoknad: true, notat: 'I stedet for klarinettene – to nye slagverkere i høst' },
      },
      utgifter: {
        u1: { beskrivelse: 'Frakt av notestativ fra lager', belop: 1200, dato: '2026-05-12', lagtInnAv: { epost: kari[0], navn: kari[1] }, rekkefolge: 1 },
        u2: { beskrivelse: 'Rekvisita til øvingslokalet', belop: 1850, dato: '2026-05-20', lagtInnAv: { epost: per[0], navn: per[1] }, rekkefolge: 2 },
        u3: { beskrivelse: 'Parkering ved henting av instrumenter', belop: 800, dato: '2026-06-02', lagtInnAv: { epost: kari[0], navn: kari[1] }, rekkefolge: 3 },
      },
      dokumenter: {
        d1: { navn: 'Søknad Sparebankstiftelsen 2026.pdf', sti: 'demo/d1', lastetOppAv: { epost: kari[0], navn: kari[1] }, tid: dagerSiden(200) },
        d2: { navn: 'Tilsagnsbrev.pdf', sti: 'demo/d2', lastetOppAv: { epost: per[0], navn: per[1] }, tid: dagerSiden(150) },
      },
      ...av(...kari, 0),
    },
    s2: {
      organisasjonId: org, giverId: 'g2', tittel: 'Klarinetter og kornetter', frist: '2026-06-01', sendt: '2026-05-28',
      nesteFrist: datoOm(60), nesteFristHva: 'Svar ventes',
      status: 'sendt', soktOverstyrt: 43000, momsProsent: null, revisjon: false,
      linjer: { l1: linje('b1', 2, 8500, 1), l2: linje('b7', 4, 6500, 2) },
      dokumenter: {}, ...av(...kari, 124),
    },
    s3: {
      organisasjonId: org, giverId: 'g3', tittel: 'Uniformer 2026', frist: '2026-02-01', sendt: '2026-01-20',
      nesteFrist: datoOm(14), nesteFristHva: 'Sluttrapport til giver',
      status: 'innvilget', soktOverstyrt: null, innvilget: 42000, momsProsent: 8, revisjon: true,
      linjer: { l1: linje('b9', 30, 1400, 1) },
      dokumenter: {}, ...av(...per, 109),
    },
    s4: {
      organisasjonId: org, giverId: 'g4', tittel: 'Seminarhelg høsten 2026', frist: datoOm(10), sendt: null,
      status: 'utkast', soktOverstyrt: null, momsProsent: null, revisjon: false,
      // Bare utgifter, ingen innkjøp: instruktørene er plukket inn i Utgifter.
      linjer: {
        l1: { behovId: null, type: 'Honorar', tittel: 'Instruktørhonorar', antall: 2, estPris: 6000, rekkefolge: 1 },
        l2: { behovId: null, type: 'Leie', tittel: 'Leie av seminarlokale', antall: 1, estPris: 8000, rekkefolge: 2 },
        l3: { behovId: null, type: 'Reise', tittel: 'Buss tur/retur', antall: 1, estPris: 9500, rekkefolge: 3 },
      },
      utgifter: {
        u1: { soknadLinjeId: 'l1', belop: 12500, dato: '2026-09-20', lagtInnAv: { epost: per[0], navn: per[1] }, rekkefolge: 1 },
        u2: { beskrivelse: 'Kaffe og frukt til pausene', belop: 640, dato: '2026-09-21', lagtInnAv: { epost: per[0], navn: per[1] }, rekkefolge: 2 },
      },
      dokumenter: {}, ...av(...per, 7),
    },
    // Avsluttet, med revisorer: Olav har godkjent, Rita (?demo=revisor) ikke.
    s5: {
      organisasjonId: org, giverId: 'g4', tittel: 'Noteskap og notemapper 2025', frist: '2025-03-01', sendt: '2025-02-20',
      status: 'avsluttet', soktOverstyrt: null, innvilget: 20000, momsProsent: null, revisjon: true,
      tilgang: ['rita@revisor.no', 'olav@revisor.no'],
      linjer: { l1: { behovId: null, tittel: 'Noteskap', antall: 2, estPris: 7000, rekkefolge: 1 }, l2: { behovId: null, tittel: 'Notemapper', antall: 40, estPris: 150, rekkefolge: 2 } },
      utgifter: {
        u1: { beskrivelse: 'Noteskap, 2 stk', belop: 13800, dato: '2025-05-06', type: 'Inventar', lagtInnAv: { epost: per[0], navn: per[1] }, rekkefolge: 1 },
        u2: { beskrivelse: 'Notemapper, 40 stk', belop: 5960, dato: '2025-05-14', type: 'Utstyr', lagtInnAv: { epost: per[0], navn: per[1] }, rekkefolge: 2 },
      },
      dokumenter: { d1: { navn: 'Tilsagn kulturmidler 2025.pdf', sti: 'demo/d5', lastetOppAv: { epost: per[0], navn: per[1] }, tid: dagerSiden(500) } },
      ...av(...per, 300),
    },
    s6: {
      organisasjonId: org, giverId: 'g2', tittel: 'Nye noter og arrangementer', frist: '2025-06-01', sendt: '2025-05-20',
      status: 'avslatt', soktOverstyrt: 25000, momsProsent: null, revisjon: false,
      linjer: {}, dokumenter: {}, ...av(...per, 405),
    },
  };

  const leverandorer = {
    mh: { organisasjonId: org, navn: 'Musikkhuset AS', kontakt: 'Ola Berg\nola@musikkhuset.no · 22 33 44 55', ...av(...kari, 30) },
    nb: { organisasjonId: org, navn: 'Nordic Brass', kontakt: 'Anne Lie\nanne@nordicbrass.no', ...av(...kari, 30) },
    to: { organisasjonId: org, navn: 'Tono Instrumenter', kontakt: 'post@tono.no · 55 12 34 56', ...av(...per, 25) },
    us: { organisasjonId: org, navn: 'Uniformsenteret', kontakt: 'ordre@uniformsenteret.no', ...av(...per, 90) },
    cl: { organisasjonId: org, navn: 'Clas Ohlson', kontakt: '', ...av(...per, 90) },
  };
  const pris = raa => ({ raa });
  const innkjop = {
    i1: {
      organisasjonId: org, soknadId: 's1', navn: 'Instrumenter', status: 'innhenter', rekkefolge: 1,
      linjer: {
        k1: { soknadLinjeId: 'l1', tittel: 'Kornett Bb', antall: 4, rekkefolge: 1 },
        k2: { soknadLinjeId: 'l2', tittel: 'Althorn Eb', antall: 2, rekkefolge: 2 },
        k3: { soknadLinjeId: 'l3', tittel: 'Trombone, tenor', antall: 2, rekkefolge: 3 },
        k4: { soknadLinjeId: 'l4', tittel: 'Baryton', antall: 1, rekkefolge: 4, egneMidler: 6000 },
        k6: { soknadLinjeId: 'l6', tittel: 'Notestativ', antall: 12, rekkefolge: 5 },
        k8: { soknadLinjeId: 'l8', tittel: 'Marsjtrommer', antall: 2, rekkefolge: 6 },
      },
      leverandorer: {
        mh: { leverandorId: 'mh', frakt: 1500, rekkefolge: 1, vedlegg: { v1: { navn: 'Tilbud 2026-0412.pdf', sti: 'demo/v1', tid: dagerSiden(20), lastetOppAv: { epost: kari[0], navn: kari[1] } } } },
        nb: { leverandorId: 'nb', frakt: 0, rekkefolge: 2, vedlegg: { v2: { navn: 'Tilbud messing.pdf', sti: 'demo/v2', tid: dagerSiden(18), lastetOppAv: { epost: kari[0], navn: kari[1] } }, v3: { navn: 'Tilbud trommer.pdf', sti: 'demo/v3', tid: dagerSiden(17), lastetOppAv: { epost: kari[0], navn: kari[1] } } } },
        to: { leverandorId: 'to', frakt: 2400, rekkefolge: 3, vedlegg: {} },
      },
      priser: {
        k1: { mh: pris('8900 -10%'), nb: pris('7650'), to: pris('8200 -500') },
        k2: { mh: pris('12400 -10%'), nb: pris('11900') },
        k3: { mh: pris('9800'), nb: { raa: '10200 -8%', alternativ: 'Jupiter JTB700 (i stedet for Yamaha)' }, to: pris('9600') },
        k4: { mh: pris('21500 -10%'), nb: pris('19900'), to: pris('20400') },
        k6: { mh: pris('420'), to: pris('390') },
        k8: { mh: pris('5400'), nb: pris('4950') },
      },
      valgt: { k1: 'nb', k2: 'mh', k3: 'nb', k4: 'mh', k6: 'to', k8: 'nb' },
      ...av(...kari, 1),
    },
    i2: {
      organisasjonId: org, soknadId: 's3', navn: 'Uniformer', status: 'valgt', rekkefolge: 1,
      linjer: { k1: { soknadLinjeId: 'l1', tittel: 'Uniformsjakker', antall: 30, rekkefolge: 1 } },
      leverandorer: { u1: { leverandorId: 'us', frakt: 300, rekkefolge: 1, vedlegg: {} } },
      priser: { k1: { u1: pris('1400') } },
      valgt: { k1: 'u1' },
      ...av(...per, 40),
    },
  };

  const fakturaer = {
    f1: { organisasjonId: org, soknadId: 's1', lopenummer: 1, leverandor: 'Nordic Brass', fakturanr: '2026-118', dato: '2026-05-12', belop: 30600, fil: null, dekker: { 'i1|k1': true }, lagtInnAv: { epost: kari[0], navn: kari[1] }, tid: dagerSiden(20), ...av(...kari, 20) },
    f2: { organisasjonId: org, soknadId: 's1', lopenummer: 2, leverandor: 'Clas Ohlson', fakturanr: 'Kvittering', dato: '2026-05-20', belop: 1850, fil: null, dekker: { 'utgift|u2': true }, lagtInnAv: { epost: per[0], navn: per[1] }, tid: dagerSiden(12), ...av(...per, 12) },
    f3: { organisasjonId: org, soknadId: 's1', lopenummer: 3, leverandor: 'Tono Instrumenter', fakturanr: '88123', dato: '2026-05-28', belop: 5900, fil: null, dekker: {}, lagtInnAv: { epost: kari[0], navn: kari[1] }, tid: dagerSiden(4), ...av(...kari, 4) },
  };

  Object.assign(fakturaer, {
    f4: { organisasjonId: org, soknadId: 's5', lopenummer: 1, leverandor: 'Kontormøbler AS', fakturanr: '55012', dato: '2025-05-06', belop: 13800, fil: null, dekker: { 'utgift|u1': true }, merknad: '', lagtInnAv: { epost: per[0], navn: per[1] }, tid: dagerSiden(310), ...av(...per, 310) },
    f5: { organisasjonId: org, soknadId: 's5', lopenummer: 2, leverandor: 'Clas Ohlson', fakturanr: 'Kvittering', dato: '2025-05-14', belop: 5960, fil: null, dekker: { 'utgift|u2': true }, merknad: '', lagtInnAv: { epost: per[0], navn: per[1] }, tid: dagerSiden(305), ...av(...per, 305) },
  });
  // Olavs godkjenning gjelder tallene slik de står i demodataene.
  soknader.s5.revisorer = {
    [revisornokkel('olav@revisor.no')]: {
      epost: 'olav@revisor.no', navn: 'Olav Berg',
      kommentarer: { f5: { tekst: 'Kassalappen viser ikke hva som er kjøpt. Har dere en spesifikasjon?', tid: dagerSiden(290) } },
      merknad: 'Bilag 2 er en kassalapp uten spesifikasjon; beløpet er kontrollert mot kontoutskrift.',
      godkjent: { tid: dagerSiden(280), avtrykk: revisjonsavtrykk({ id: 's5', ...soknader.s5 }, [], Object.entries(fakturaer).map(([id, f]) => ({ id, ...f }))) },
    },
  };

  return { brukere, givere, behov, soknader, innkjop, leverandorer, fakturaer };
}
