// Tar en sikkerhetskopi av prod (alle samlinger + alle filer) til arkivet på
// ProISP og rydder bort kopier som er for gamle. Kjøres hver natt av
// .github/workflows/sikkerhetskopi.yml. Trenger bare leserett hos Google.
import { FirebaseMal, PROD } from './lib/firebase.mjs';
import { taKopi, rydd, tell } from './lib/kjerne.mjs';
import { arkiv, krev, skrivTabell, kjor } from './lib/oppsett.mjs';
import { meldStatus } from './lib/status.mjs';

kjor(async () => {
  const passord = krev('KOPI_PASSORD');
  const lager = arkiv();
  try {
    console.log(`Tar kopi av ${PROD} til ${lager.navn} …`);
    const { navn, bilde, nyeFiler } = await taKopi({ mal: new FirebaseMal(PROD), lager, passord, logg: console.log });
    console.log(`\nKopi ${navn}:`);
    skrivTabell([['Samling', 'Dokumenter'], ...Object.entries(tell(bilde.dokumenter)), ['Filer i Storage', bilde.filer.length], ['– nye siden sist', nyeFiler]]);
    const r = await rydd({ lager, passord, logg: console.log });
    console.log(`\nRyddet bort ${r.slettedeKopier} gamle kopier og ${r.slettedeFiler} filer ingen kopi viser til lenger.`);
    // Kopien er lagret før lampen i portalen får vite om den.
    await lager.lukk();
    await meldStatus({ kopi: { tatt: bilde.tatt, dokumenter: bilde.dokumenter.length, filer: bilde.filer.length } });
  } finally {
    await lager.lukk();
  }
});
