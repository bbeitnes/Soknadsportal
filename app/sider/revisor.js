// Revisorens startside: søknadene hen er satt som revisor for. Reglene i
// Firestore slipper ikke revisoren til andre søknader, så listen er alt som
// er lastet. Klikk åpner revisjonen av søknaden (sider/soknad.js).
import { tilstand, innkjopFor, revisorerFor, pottFor } from '../data/index.js';
import { statusNavn, sumFakturert } from '../data/beregning.js';
import { escapeHtml, kr, datoKl } from '../ui/format.js';
import { gaaTil } from '../ui/visning.js';

const STREK = '–';

// Innlogget revisors egen godkjenning av søknaden, som merkelapp.
export function godkjenningsmerke(r) {
  if (!r || r.status === 'ikke') return '<span class="merkelapp m-av">Ikke godkjent</span>';
  if (r.status === 'endret') return `<span class="merkelapp m-varsel" title="Tallene er endret etter at du godkjente ${datoKl(r.tid)}">Endret etter godkjenningen</span>`;
  return `<span class="merkelapp m-pa">Godkjent ${datoKl(r.tid)}</span>`;
}

function rad(s) {
  const p = pottFor(s);
  const min = revisorerFor(s).find(r => r.epost === tilstand.meg.epost);
  return `
    <tr class="klikkbar" data-handling="apne" data-id="${s.id}">
      <td><div class="celletittel">${escapeHtml(s.tittel || 'Uten tittel')}</div><div class="celleunder">${escapeHtml(tilstand.givere.find(g => g.id === s.giverId)?.navn || 'Ukjent giver')}</div></td>
      <td class="smal"><span class="merkelapp m-${s.status}">${statusNavn(s.status)}</span></td>
      <td class="tall fet">${p.innvilget == null ? STREK : kr(p.innvilget)}</td>
      <td class="tall">${kr(sumFakturert(tilstand.fakturaer, s.id))}</td>
      <td class="smal">${godkjenningsmerke(min)}</td>
    </tr>`;
}

export const revisorSide = {
  tegn() {
    const liste = [...tilstand.soknader].sort((a, b) => (a.tittel || '').localeCompare(b.tittel || '', 'nb'));
    return `
      <header class="sidehode">
        <div>
          <h1>Revisjon</h1>
          <div class="ingress">Søknadene du er satt som revisor for. Klikk en rad for å se regnskapet og bilagene.</div>
        </div>
      </header>
      <main class="innhold">
        ${liste.length ? `
        <div class="tabellramme" data-rull="revisor">
          <table class="liste">
            <thead><tr><th>Søknad</th><th>Status</th><th class="tall">Innvilget</th><th class="tall">Fakturert</th><th>Din godkjenning</th></tr></thead>
            <tbody>${liste.map(rad).join('')}</tbody>
          </table>
        </div>` : '<div class="hint" style="font-size:15px">Du er ikke satt som revisor for noen søknader ennå.</div>'}
      </main>`;
  },

  klikk(handling, el) {
    if (handling === 'apne') gaaTil(`#/soknad/${el.dataset.id}`);
  },
};
