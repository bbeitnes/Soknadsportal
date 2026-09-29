// Oppdiktede data for demomodus (?demo på localhost). Hentet fra prototypene.
import { ORGANISASJON_ID as org } from '../config/app-config.js';

export function lagDemodata() {
  const naa = Date.now();
  const dagerSiden = d => naa - d * 86400000;
  const av = (epost, navn, dager) => ({ endretAv: { epost, navn }, endretTid: dagerSiden(dager) });
  const kari = ['kari@korpset.no', 'Kari Nordmann'];
  const per = ['per@korpset.no', 'Per Hansen'];

  const brukere = {
    'kari@korpset.no': { organisasjonId: org, epost: 'kari@korpset.no', navn: 'Kari Nordmann', rolle: 'administrator', status: 'aktiv' },
    'per@korpset.no': { organisasjonId: org, epost: 'per@korpset.no', navn: 'Per Hansen', rolle: 'bruker', status: 'aktiv' },
  };

  const givere = {
    g1: { organisasjonId: org, navn: 'Sparebankstiftelsen Nord', kontakt: 'Søknadsportal på nett. Frister 15. mars og 15. september.\nKontakt: Nina Hauge, nina@sbnord.no', momsTrekk: true, momsProsent: 8, ...av(...kari, 40) },
    g2: { organisasjonId: org, navn: 'Kulturrådet', kontakt: 'Instrumentfondet. Frist 1. juni.', momsTrekk: false, momsProsent: 8, ...av(...kari, 40) },
    g3: { organisasjonId: org, navn: 'Gjensidigestiftelsen', kontakt: 'Løpende søknader. Krever revisjonsrapport ved avslutning.', momsTrekk: true, momsProsent: 8, ...av(...per, 30) },
    g4: { organisasjonId: org, navn: 'Kommunen – kulturmidler', kontakt: 'Kultursjef Ole Vik, ole.vik@kommune.no', momsTrekk: false, momsProsent: 8, ...av(...per, 20) },
  };

  const behov = {
    b1: { organisasjonId: org, tittel: 'Kornett Bb', beskrivelse: 'Til nye aspiranter. Studentmodell med etui.', antall: 6, estPris: 8500, statusOverstyring: null, ...av(...kari, 12) },
    b2: { organisasjonId: org, tittel: 'Althorn Eb', beskrivelse: 'Erstatter to instrumenter med sprukne ventiler.', antall: 2, estPris: 12000, statusOverstyring: null, ...av(...kari, 60) },
    b3: { organisasjonId: org, tittel: 'Trombone, tenor', beskrivelse: '', antall: 2, estPris: 10000, statusOverstyring: null, ...av(...per, 62) },
    b4: { organisasjonId: org, tittel: 'Baryton', beskrivelse: '', antall: 1, estPris: 21000, statusOverstyring: null, ...av(...per, 62) },
    b6: { organisasjonId: org, tittel: 'Notestativ', beskrivelse: 'Sammenleggbare, til øvingslokalet.', antall: 12, estPris: 450, statusOverstyring: null, ...av(...kari, 60) },
    b7: { organisasjonId: org, tittel: 'Klarinett Bb', beskrivelse: '', antall: 4, estPris: 6500, statusOverstyring: null, ...av(...kari, 45) },
    b8: { organisasjonId: org, tittel: 'Dirigentpodium', beskrivelse: 'Kulturskolen låner oss sitt.', antall: 1, estPris: 4800, statusOverstyring: 'trengs-ikke', ...av(...per, 15) },
    b9: { organisasjonId: org, tittel: 'Uniformsjakker', beskrivelse: 'Marineblå, blandede størrelser.', antall: 30, estPris: 1400, statusOverstyring: null, ...av(...per, 90) },
    b10: { organisasjonId: org, tittel: 'Marsjtrommer', beskrivelse: 'To tenortrommer med bæresele.', antall: 2, estPris: 5200, statusOverstyring: null, ...av(...kari, 3) },
  };

  const linje = (behovId, antall, estPris, finansieres, rekkefolge) => ({ behovId, tittel: '', antall, estPris, finansieres, rekkefolge });

  const soknader = {
    s1: {
      organisasjonId: org, giverId: 'g1', tittel: 'Instrumenter til aspirantkorpset 2026', frist: '2026-03-15', sendt: '2026-03-03',
      status: 'innvilget', soktOverstyrt: null, innvilget: 150000, momsProsent: 8, revisjon: true,
      linjer: {
        l1: linje('b1', 4, 8500, true, 1), l2: linje('b2', 2, 12000, true, 2), l3: linje('b3', 2, 10000, true, 3),
        l4: linje('b4', 1, 21000, true, 4), l6: linje('b6', 12, 450, true, 5), l7: linje('b7', 2, 6500, false, 6),
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
      status: 'sendt', soktOverstyrt: 43000, momsProsent: null, revisjon: false,
      linjer: { l1: linje('b1', 2, 8500, false, 1), l2: linje('b7', 4, 6500, false, 2) },
      dokumenter: {}, ...av(...kari, 124),
    },
    s3: {
      organisasjonId: org, giverId: 'g3', tittel: 'Uniformer 2026', frist: '2026-02-01', sendt: '2026-01-20',
      status: 'innvilget', soktOverstyrt: null, innvilget: 42000, momsProsent: 8, revisjon: true,
      linjer: { l1: linje('b9', 30, 1400, true, 1) },
      dokumenter: {}, ...av(...per, 109),
    },
    s4: {
      organisasjonId: org, giverId: 'g4', tittel: 'Seminarhelg høsten 2026', frist: '2026-10-15', sendt: null,
      status: 'utkast', soktOverstyrt: null, momsProsent: null, revisjon: false,
      linjer: { l1: { behovId: null, tittel: 'Instruktørhonorar', antall: 2, estPris: 6000, finansieres: false, rekkefolge: 1 } },
      dokumenter: {}, ...av(...per, 7),
    },
    s6: {
      organisasjonId: org, giverId: 'g2', tittel: 'Nye noter og arrangementer', frist: '2025-06-01', sendt: '2025-05-20',
      status: 'avslatt', soktOverstyrt: 25000, momsProsent: null, revisjon: false,
      linjer: {}, dokumenter: {}, ...av(...per, 405),
    },
  };

  const pris = raa => ({ raa });
  const innkjop = {
    i1: {
      organisasjonId: org, soknadId: 's1', navn: 'Instrumenter', status: 'innhenter', rekkefolge: 1,
      linjer: {
        k1: { soknadLinjeId: 'l1', tittel: 'Kornett Bb', antall: 4, rekkefolge: 1 },
        k2: { soknadLinjeId: 'l2', tittel: 'Althorn Eb', antall: 2, rekkefolge: 2 },
        k3: { soknadLinjeId: 'l3', tittel: 'Trombone, tenor', antall: 2, rekkefolge: 3 },
        k4: { soknadLinjeId: 'l4', tittel: 'Baryton', antall: 1, rekkefolge: 4 },
        k6: { soknadLinjeId: 'l6', tittel: 'Notestativ', antall: 12, rekkefolge: 5 },
      },
      leverandorer: {
        mh: { navn: 'Musikkhuset AS', kontakt: 'Ola Berg\nola@musikkhuset.no · 22 33 44 55', frakt: 1500, rekkefolge: 1, vedlegg: { v1: { navn: 'Tilbud 2026-0412.pdf', sti: 'demo/v1', tid: dagerSiden(20), lastetOppAv: { epost: kari[0], navn: kari[1] } } } },
        nb: { navn: 'Nordic Brass', kontakt: 'Anne Lie\nanne@nordicbrass.no', frakt: 0, rekkefolge: 2, vedlegg: { v2: { navn: 'Tilbud messing.pdf', sti: 'demo/v2', tid: dagerSiden(18), lastetOppAv: { epost: kari[0], navn: kari[1] } }, v3: { navn: 'Tilbud trommer.pdf', sti: 'demo/v3', tid: dagerSiden(17), lastetOppAv: { epost: kari[0], navn: kari[1] } } } },
        to: { navn: 'Tono Instrumenter', kontakt: 'post@tono.no · 55 12 34 56', frakt: 2400, rekkefolge: 3, vedlegg: {} },
      },
      priser: {
        k1: { mh: pris('8900 -10%'), nb: pris('7650'), to: pris('8200 -500') },
        k2: { mh: pris('12400 -10%'), nb: pris('11900') },
        k3: { mh: pris('9800'), nb: pris('10200 -8%'), to: pris('9600') },
        k4: { mh: pris('21500 -10%'), nb: pris('19900'), to: pris('20400') },
        k6: { mh: pris('420'), to: pris('390') },
      },
      valgt: { k1: 'nb', k2: 'mh', k3: 'nb', k4: 'mh', k6: 'to' },
      ...av(...kari, 1),
    },
    i2: {
      organisasjonId: org, soknadId: 's3', navn: 'Uniformer', status: 'valgt', rekkefolge: 1,
      linjer: { k1: { soknadLinjeId: 'l1', tittel: 'Uniformsjakker', antall: 30, rekkefolge: 1 } },
      leverandorer: { u1: { navn: 'Uniformsenteret', kontakt: '', frakt: 300, rekkefolge: 1, vedlegg: {} } },
      priser: { k1: { u1: pris('1400') } },
      valgt: { k1: 'u1' },
      ...av(...per, 40),
    },
  };

  return { brukere, givere, behov, soknader, innkjop };
}
