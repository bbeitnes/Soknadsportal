// Innstillinger: samler alt oppsett. Denne siden har organisasjonens
// kontaktinfo (den står på bestillinger til leverandører). Givere,
// Leverandører og Brukere er egne sider som deler undermenyen herfra.
import { erAdmin, organisasjon } from '../data/index.js';
import { ORGANISASJON_ID } from '../config/app-config.js';
import { escapeHtml } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';

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
      </main>`;
  },
};
