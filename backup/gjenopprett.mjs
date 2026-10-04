// Legger en kopi tilbake i en database og kontrollerer resultatet.
//
//   node gjenopprett.mjs                      RESTORE-TEST: nyeste kopi legges i
//                                             soknadsportal-restore (tømmes først)
//   node gjenopprett.mjs --dato 2026-10-01    en eldre kopi
//   node gjenopprett.mjs --fra ./kopier       fra en mappe hentet med hent.mjs
//   node gjenopprett.mjs --mal soknadsportal  EKTE GJENOPPRETTING av prod: tar
//                                             fersk kopi, viser hva som endres og
//                                             krever at databasenavnet skrives inn
//
// Uten --mal skrives det aldri andre steder enn soknadsportal-restore.
import { createInterface } from 'node:readline/promises';
import { FirebaseMal, PROD, RESTORE } from './lib/firebase.mjs';
import { velgKopi, lesKopi, taKopi, planlegg, gjenopprett, kontroller } from './lib/kjerne.mjs';
import { arkiv, argumenter, krev, skrivTabell, kjor } from './lib/oppsett.mjs';

kjor(async () => {
  const arg = argumenter({ dato: 'verdi', fra: 'verdi', mal: 'verdi' });
  const database = arg.mal || RESTORE;
  if (![RESTORE, PROD].includes(database)) throw new Error(`--mal må være ${RESTORE} eller ${PROD}.`);
  const passord = krev('KOPI_PASSORD');
  const lager = arkiv(arg.fra);
  try {
    // Kopien velges FØR det tas en fersk kopi av prod – ellers ville «nyeste» vært den ferske.
    const navn = await velgKopi(lager, arg.dato);
    const bilde = await lesKopi({ lager, passord, navn });
    const mal = new FirebaseMal(database);
    console.log(`Kopi: ${navn} (tatt ${bilde.tatt}) fra ${lager.navn}\nMål:  ${database} og ${mal.prefiks}/ i Storage\n`);

    if (database === PROD) {
      const fersk = await taKopi({ mal, lager, passord });
      console.log(`Tok først en fersk kopi av prod slik den er nå: ${fersk.navn}\n`);
      const plan = await planlegg({ mal, bilde });
      console.log('Dette vil skje med prod:');
      skrivTabell([['', 'Nye', 'Endres', 'Uendret', 'SLETTES'],
        ...Object.entries(plan.samlinger).map(([s, r]) => [s, r.nye, r.endret, r.like, r.slettes]),
        ['Filer', plan.filer.nye, plan.filer.endret, plan.filer.like, plan.filer.slettes]]);
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const svar = await rl.question(`\nProd blir nøyaktig som kopien fra ${bilde.tatt}. Skriv «${PROD}» for å fortsette: `);
      rl.close();
      if (svar.trim() !== PROD) { console.log('Avbrutt. Ingenting er endret.'); return; }
    }

    const r = await gjenopprett({ mal, lager, passord, bilde, tomForst: database === RESTORE, logg: console.log });
    console.log(`\nLa tilbake ${r.dokumenter} dokumenter og ${r.filerSkrevet} filer. Kontroll mot kopien:`);
    const k = await kontroller({ mal, bilde });
    skrivTabell([['', 'I kopien', 'Lagt tilbake', 'Avvik'],
      ...Object.entries(k.samlinger).map(([s, x]) => [s, x.kopi, x.lagtTilbake, x.avvik]),
      ['Filer', k.filer.kopi, k.filer.lagtTilbake, k.filer.avvik]]);
    if (!k.ok) throw new Error('Det som ble lagt tilbake stemmer ikke med kopien.');
    console.log(database === RESTORE
      ? '\nRestore-testen er bestått. Se på dataene: http://localhost:8430/?restore'
      : '\nProd er gjenopprettet og stemmer med kopien.');
  } finally {
    await lager.lukk();
  }
});
