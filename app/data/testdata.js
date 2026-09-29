// Legger demodataene (demodata.js) inn i databasen portalen kjører mot.
// Kjøres én gang fra nettleserkonsollen på TEST-siden, som innlogget bruker:
//
//   (await import('./data/testdata.js')).leggInnTestdata()
//
// Brukere legges ikke inn (det er bare ekte, inviterte brukere som skal
// finnes der), og dokumenter hoppes over siden filene ikke finnes i Storage.
import { lager } from './lager.js';
import { lagDemodata } from './demodata.js';

export async function leggInnTestdata() {
  const data = lagDemodata();
  const finnes = await new Promise((ok, feil) => {
    const stopp = lager.lytt('givere', liste => { stopp(); ok(liste); }, feil);
  });
  if (finnes.some(g => g.navn === 'Sparebankstiftelsen Nord')) {
    console.warn('Testdataene ligger der allerede – ingenting lagt inn.');
    return;
  }

  // Demodataene bruker korte ID-er (g1, b1 …). Databasen gir nye, så vi
  // holder et kart fra gammel til ny ID for koblingene i søknadene.
  const giverId = {}, behovId = {};
  for (const [id, g] of Object.entries(data.givere)) giverId[id] = await lager.opprett('givere', g);
  for (const [id, b] of Object.entries(data.behov)) behovId[id] = await lager.opprett('behov', b);
  for (const s of Object.values(data.soknader)) {
    const linjer = {};
    for (const [lid, l] of Object.entries(s.linjer)) linjer[lid] = { ...l, behovId: l.behovId ? behovId[l.behovId] : null };
    await lager.opprett('soknader', { ...s, giverId: giverId[s.giverId], linjer, dokumenter: {} });
  }
  console.log(`Lagt inn ${Object.keys(giverId).length} givere, ${Object.keys(behovId).length} behov og ${Object.keys(data.soknader).length} søknader.`);
}
