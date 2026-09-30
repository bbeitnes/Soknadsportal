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
    console.warn('Testdataene ligger der allerede – legger bare inn innkjøp som mangler.');
    return leggInnInnkjop(data);
  }

  // Demodataene bruker korte ID-er (g1, b1 …). Databasen gir nye, så vi
  // holder et kart fra gammel til ny ID for koblingene i søknadene.
  const giverId = {}, behovId = {};
  for (const [id, g] of Object.entries(data.givere)) giverId[id] = await lager.opprett('givere', g);
  for (const [id, b] of Object.entries(data.behov)) behovId[id] = await lager.opprett('behov', b);
  const soknadId = {};
  for (const [id, s] of Object.entries(data.soknader)) {
    const linjer = {};
    for (const [lid, l] of Object.entries(s.linjer)) linjer[lid] = { ...l, behovId: l.behovId ? behovId[l.behovId] : null };
    soknadId[id] = await lager.opprett('soknader', { ...s, giverId: giverId[s.giverId], linjer, dokumenter: {} });
  }
  await leggInnInnkjop(data, soknadId);
  console.log(`Lagt inn ${Object.keys(giverId).length} givere, ${Object.keys(behovId).length} behov, ${Object.keys(data.soknader).length} søknader og ${Object.keys(data.innkjop || {}).length} innkjøp.`);
}

const hentAlle = samling => new Promise((ok, feil) => {
  const stopp = lager.lytt(samling, liste => { stopp(); ok(liste); }, feil);
});

// Innkjøpene kobles til søknadene på tittel når ID-kartet mangler (data
// som alt lå i databasen). Søknader som allerede har innkjøp hoppes over.
async function leggInnInnkjop(data, soknadId = null) {
  const soknader = await hentAlle('soknader');
  const innkjop = await hentAlle('innkjop');
  // Leverandørregisteret: finnes på navn, ellers opprettes.
  const register = await hentAlle('leverandorer');
  const leverandorId = {};
  for (const [id, lev] of Object.entries(data.leverandorer || {})) {
    leverandorId[id] = register.find(r => r.navn === lev.navn)?.id || await lager.opprett('leverandorer', lev);
  }
  let antall = 0;
  for (const i of Object.values(data.innkjop || {})) {
    const id = soknadId ? soknadId[i.soknadId] : soknader.find(s => s.tittel === data.soknader[i.soknadId].tittel)?.id;
    if (!id || innkjop.some(x => x.soknadId === id)) continue;
    const leverandorer = {};
    for (const [sid, lev] of Object.entries(i.leverandorer)) leverandorer[sid] = { ...lev, leverandorId: leverandorId[lev.leverandorId] || null, vedlegg: {} };
    const innkjopId = await lager.opprett('innkjop', { ...i, soknadId: id, leverandorer });
    antall++;
    // Fakturaene til denne søknaden, med koblinger oversatt til de nye ID-ene.
    const gammelInnkjopId = Object.keys(data.innkjop).find(k => data.innkjop[k] === i);
    for (const f of Object.values(data.fakturaer || {}).filter(x => x.soknadId === i.soknadId)) {
      const dekker = {};
      for (const k of Object.keys(f.dekker || {})) dekker[k.startsWith(gammelInnkjopId + '|') ? k.replace(gammelInnkjopId + '|', innkjopId + '|') : k] = true;
      await lager.opprett('fakturaer', { ...f, soknadId: id, dekker });
    }
  }
  if (!soknadId) console.log(`Lagt inn ${antall} innkjøp.`);
}
