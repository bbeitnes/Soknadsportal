// Henter en kopi fra ProISP til Mac-en og kontrollerer at den er hel.
//   node hent.mjs                       nyeste kopi
//   node hent.mjs --dato 2026-10-01     nyeste kopi fra den dagen
//   node hent.mjs --til ~/Kopier        annen mappe (standard: backup/kopier/)
//   node hent.mjs --lesbar              legger også en dekryptert utgave i <mappe>/lesbar/
// Mappa kan brukes som kilde for gjenoppretting: node gjenopprett.mjs --fra <mappe>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LokalLager } from './lib/lager.mjs';
import { velgKopi, hentKopi, lesFilFraKopi, tell } from './lib/kjerne.mjs';
import { arkiv, argumenter, krev, skrivTabell, kjor } from './lib/oppsett.mjs';

kjor(async () => {
  const arg = argumenter({ dato: 'verdi', til: 'verdi', lesbar: 'ja' });
  const passord = krev('KOPI_PASSORD');
  const mappe = path.resolve(arg.til || path.join(path.dirname(fileURLToPath(import.meta.url)), 'kopier'));
  const fra = arkiv(), til = new LokalLager(mappe);
  try {
    const navn = await velgKopi(fra, arg.dato);
    console.log(`Henter ${navn} fra ${fra.navn} til ${mappe} …`);
    const bilde = await hentKopi({ fra, til, passord, navn, logg: console.log });
    if (arg.lesbar) {
      const ut = `lesbar/${navn.slice(0, 18)}`;
      await til.skriv(`${ut}/database.json`, JSON.stringify(bilde.dokumenter, null, 2));
      for (const fil of bilde.filer) await til.skriv(`${ut}/filer/${fil.sti}`, await lesFilFraKopi({ lager: til, passord, fil }));
      console.log(`Dekryptert utgave: ${path.join(mappe, ut)}`);
    }
    console.log(`\nKopien fra ${bilde.tatt} er hentet og kontrollert:`);
    skrivTabell([['Samling', 'Dokumenter'], ...Object.entries(tell(bilde.dokumenter)), ['Filer', bilde.filer.length]]);
  } finally {
    await fra.lukk();
  }
});
