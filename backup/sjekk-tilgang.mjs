// Prøver om nøkkelen som er i bruk kan mer enn den skal (B-25).
//   node sjekk-tilgang.mjs --rolle kopi      skal bare kunne LESE prod
//   node sjekk-tilgang.mjs --rolle restore   skal bare kunne skrive til restore-målet
// Lykkes en skriving som skulle vært avvist, ryddes den bort og kommandoen feiler.
import { FirebaseMal, PROD, RESTORE } from './lib/firebase.mjs';
import { argumenter, kjor } from './lib/oppsett.mjs';

const DOK = '_tilgangstest/sikkerhetskopi';
const FIL = '_tilgangstest.txt';

async function prov(tekst, skalGaa, handling, rydd) {
  let gikk = true, grunn = '';
  try { await handling(); } catch (feil) { gikk = false; grunn = feil.message.split('\n')[0].slice(0, 80); }
  if (gikk && rydd) await rydd().catch(() => {});
  const ok = gikk === skalGaa;
  console.log(`  ${ok ? 'OK  ' : 'FEIL'}  ${tekst}: ${gikk ? 'tillatt' : 'avvist'}${ok ? '' : ` – skulle vært ${skalGaa ? 'tillatt' : 'avvist'}`}${!gikk && skalGaa ? ` (${grunn})` : ''}`);
  return ok;
}

kjor(async () => {
  const { rolle } = argumenter({ rolle: 'verdi' });
  if (!['kopi', 'restore'].includes(rolle)) throw new Error('Bruk --rolle kopi eller --rolle restore.');
  const resultat = [];
  for (const database of [PROD, 'soknadsportal-test', RESTORE]) {
    const mal = new FirebaseMal(database);
    const skrive = rolle === 'restore' && database === RESTORE;
    const lese = skrive || (rolle === 'kopi' && database === PROD);
    console.log(`${database}:`);
    if (lese) {
      resultat.push(await prov('lese dokumenter', true, () => mal.db.listCollections()));
      resultat.push(await prov('liste filer', true, () => mal.botte.getFiles({ prefix: mal.prefiks + '/', maxResults: 1 })));
    }
    resultat.push(await prov('skrive dokument', skrive, () => mal.db.doc(DOK).set({ test: true }), () => mal.db.doc(DOK).delete()));
    resultat.push(await prov('skrive fil', skrive, () => mal.skrivFil(FIL, Buffer.from('test'), 'text/plain'), () => mal.slettFil(FIL)));
  }
  if (resultat.includes(false)) throw new Error('Nøkkelen har ikke de rettighetene den skal ha. Se OPPSETT.md §9.');
  console.log('\nNøkkelen kan akkurat det den skal.');
});
