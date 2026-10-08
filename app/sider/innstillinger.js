// Innstillinger: samler alt oppsett. Denne siden har organisasjonens
// kontaktinfo (den står på bestillinger til leverandører). Givere,
// Leverandører og Brukere er egne sider som deler undermenyen herfra.
import { erAdmin, organisasjon, kopistatusNaa } from '../data/index.js';
import { ORGANISASJON_ID } from '../config/app-config.js';
import { escapeHtml, datoKl, heltall } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { OM_KORPSET } from '../data/beregning.js';

const SEKSJONER = [
  { rute: 'innstillinger', navn: 'Organisasjon' },
  { rute: 'givere', navn: 'Givere' },
  { rute: 'leverandorer', navn: 'Leverandører' },
  { rute: 'givere/brukere', navn: 'Brukere', bareAdmin: true },
];

// Fanene øverst på alle innstillingssidene.
export function innstillingsmeny(aktiv) {
  return `<nav class="faner">${SEKSJONER.filter(s => !s.bareAdmin || erAdmin())
    .map(s => `<a href="#/${s.rute}" ${s.rute === aktiv ? 'aria-current="page"' : ''}>${s.navn}</a>`).join('')}</nav>`;
}

// Feltene ligger flatt på innstillingsdokumentet. `linjer` > 1 gir tekstområde.
const FELT = [
  { id: 'orgNavn', navn: 'Navn på organisasjonen', plass: 'F.eks. Skiens Skolemusikk' },
  { id: 'orgNr', navn: 'Organisasjonsnummer' },
  { id: 'kontaktperson', navn: 'Kontaktperson' },
  { id: 'telefon', navn: 'Telefon' },
  { id: 'epost', navn: 'E-post' },
  { id: 'adresse', navn: 'Postadresse', linjer: 3 },
  { id: 'leveringsadresse', navn: 'Leveringsadresse', linjer: 3, hjelp: 'Tom = samme som postadressen.' },
  { id: 'fakturainfo', navn: 'Faktura sendes til', linjer: 3, hjelp: 'F.eks. e-postadresse for faktura, eller hva fakturaen skal merkes med.' },
];

// Status for sikkerhetskopien (B-26). Fargen på første linje er den samme som prikken i toppmenyen.
function kopistatusHtml() {
  const k = kopistatusNaa(), r = k.restore;
  const antall = k.dokumenter === null ? '' : ` – ${heltall(k.dokumenter)} dokumenter, ${heltall(k.filer)} filer`;
  return `
    <div class="kopistatus">
      <span class="etikett">Sikkerhetskopi</span>
      <div><span class="lampe lampe-${k.farge}"></span>Siste sikkerhetskopi av prod: ${k.tatt ? datoKl(k.tatt) + antall : 'ukjent'}</div>
      <div><span class="lampe lampe-${r.farge}"></span>Siste restore-test: ${r.kjort ? `${datoKl(r.kjort)} – ${r.bestatt ? 'bestått' : 'ikke bestått'}` : 'ukjent'}</div>
    </div>`;
}

export const innstillingerSide = {
  meny: 'innstillinger',

  tegn() {
    const o = organisasjon();
    const admin = erAdmin();
    const n = f => `innstillinger/${ORGANISASJON_ID}/${f}`;
    const felt = f => `
      <label class="felt"><span class="etikett">${f.navn}</span>
        ${!admin ? `<div style="white-space:pre-line; font-size:15px; min-height:22px">${escapeHtml(o[f.id] || '–')}</div>`
          : f.linjer ? tekstomrade(n(f.id), o[f.id], `class="inndata" rows="${f.linjer}"`)
          : `<input class="inndata" placeholder="${escapeHtml(f.plass || '')}" ${feltAttr(n(f.id), o[f.id])}>`}
        ${f.hjelp && admin ? `<span class="undertekst">${f.hjelp}</span>` : ''}
      </label>`;
    return `
      <header class="sidehode">
        <div>
          <h1>Innstillinger</h1>
          <div class="ingress">Oppsett som gjelder hele portalen.</div>
        </div>
      </header>
      ${innstillingsmeny('innstillinger')}
      <main class="innhold" style="overflow:auto">
        <div class="hint">Kontaktinfoen står på bestillinger dere laster ned fra Innkjøp.${admin ? '' : ' Den endres av en administrator.'}</div>
        <div class="to-kol" style="max-width:820px; gap:16px 24px">${FELT.map(felt).join('')}</div>
        <div style="max-width:820px; margin-top:28px; display:flex; flex-direction:column; gap:6px">
          <span class="etikett">Om korpset</span>
          <div class="hint">Standardinfo til søknader. Tas med i underlaget fra Tekst-fanen i en søknad («Kopier underlag»), så skriv det slik en giver skal lese det. Alle brukere kan endre.</div>
        </div>
        <div class="to-kol" style="max-width:820px; gap:16px 24px; margin-top:12px">${OM_KORPSET.map(f => `
          <label class="felt"><span class="etikett">${f.navn}</span>
            ${tekstomrade(n(f.id), o[f.id], 'class="inndata" rows="5"')}
            <span class="undertekst">${f.hjelp}</span>
          </label>`).join('')}</div>
        ${kopistatusHtml()}
      </main>`;
  },
};
