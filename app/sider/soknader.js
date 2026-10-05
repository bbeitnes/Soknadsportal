// Søknader: én rad per søknad. «+ Ny søknad» åpner et sidepanel.
// Innvilget, disponert og gjenstår fylles ut fra trinn b (pott).
import { tilstand, opprettSoknad, innkjopFor } from '../data/index.js';
import { SOKNADSFILTRE, soktBelop, statusNavn, pott, erInnvilget, nesteFrist, sorterSoknader } from '../data/beregning.js';
import { escapeHtml, kr, tidspunkt, fornavn, datoFelt, tolkDato, iDag } from '../ui/format.js';
import { lagre, visMelding } from '../ui/lagring.js';
import { tegn, gaaTil, sidepanel, lukkeknapp, fristdato } from '../ui/visning.js';

const ui = { filter: 'aktive', nySoknad: false, nyttPanel: false, utkast: { giverId: null, tittel: '', frist: '' } };

const FILTRE = [['aktive', 'Aktive'], ['innvilget', 'Innvilget'], ['venter', 'Utkast og sendt'], ['lukket', 'Avsluttet og avslått'], ['alle', 'Alle']];
const MED_ANTALL = new Set(['aktive', 'lukket']);

const giver = id => tilstand.givere.find(g => g.id === id);
const STREK = '–';

export function sistEndret(s) {
  if (!s.endretAv) return '';
  return `${fornavn(s.endretAv.navn, s.endretAv.epost)}, ${tidspunkt(s.endretTid)}`;
}

function sortert() {
  return sorterSoknader(tilstand.soknader, iDag());
}

function fristcelle(s) {
  const n = nesteFrist(s, iDag());
  if (!n) return STREK;
  return `<div>${fristdato(n)}</div>${n.hva ? `<div class="celleunder">${escapeHtml(n.hva)}</div>` : ''}`;
}

function rad(s) {
  const g = giver(s.giverId);
  const sokt = soktBelop(s);
  const p = pott(s, innkjopFor(s.id));
  const innvilget = erInnvilget(s) && p.innvilget != null;
  return `
    <tr class="klikkbar" data-handling="apne" data-id="${s.id}">
      <td><div class="celletittel">${escapeHtml(s.tittel || 'Uten tittel')}</div><div class="celleunder">${escapeHtml(g?.navn || 'Ukjent giver')}</div></td>
      <td class="smal" style="font-size:14px">${fristcelle(s)}</td>
      <td class="smal"><span class="merkelapp m-${s.status}">${statusNavn(s.status)}</span></td>
      <td class="tall">${sokt ? kr(sokt) : STREK}</td>
      <td class="tall fet">${innvilget ? kr(p.innvilget) : STREK}</td>
      <td class="tall">${innvilget ? kr(p.disponert) : STREK}</td>
      <td class="tall fet ${p.gjenstar < 0 ? 'aksent' : ''}" ${p.egne > 0 ? `title="Av rammen ${kr(p.ramme)} (innvilget + egne midler ${kr(p.egne)})"` : ''}>${innvilget && s.status === 'innvilget' ? kr(p.gjenstar) : STREK}</td>
      <td class="smal dempet">${escapeHtml(sistEndret(s))}</td>
    </tr>`;
}

function nyPanel() {
  const u = ui.utkast;
  const klar = !!u.giverId && u.tittel.trim().length > 0;
  const givere = [...tilstand.givere].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Ny søknad</h2><div class="ingress" style="margin-top:4px">Opprettes som utkast. Behov og dokumenter legges til inne i søknaden.</div></div>
      ${lukkeknapp()}
    </div>
    <div class="felt"><span class="etikett">Giver</span>
      <div class="valgliste">
        ${givere.map(g => `<button type="button" data-handling="velg-giver" data-id="${g.id}" aria-pressed="${u.giverId === g.id}"><span class="fyll">${escapeHtml(g.navn || 'Uten navn')}</span><span class="undertekst smal">${g.momsTrekk ? `Trekker ut momskompensasjon ${g.momsProsent ?? 0} %` : 'Ingen momsfradrag'}</span></button>`).join('')
          || '<div class="tomt">Ingen givere enda. En administrator legger dem inn under Givere.</div>'}
      </div>
    </div>
    <label class="felt"><span class="etikett">Tittel</span><input class="inndata" id="ny-tittel" value="${escapeHtml(u.tittel)}" placeholder="F.eks. Instrumenter 2027"></label>
    <label class="felt" style="max-width:180px"><span class="etikett">Frist</span><input class="inndata" id="ny-frist" value="${escapeHtml(u.frist)}" placeholder="dd.mm.åååå"></label>
    <div style="display:flex; align-items:center; gap:12px">
      <button type="button" class="knapp knapp-primar" data-handling="opprett" ${klar ? '' : 'disabled'}>Opprett og åpne</button>
      <span class="undertekst" id="ny-hint">${klar ? 'Behov, dokumenter og beløp fylles inn i søknaden.' : 'Velg giver og skriv en tittel.'}</span>
    </div>`, { nytt: ui.nyttPanel });
}

// Feltene i «Ny søknad» er ikke lagret ennå, så de har ikke data-felt.
// Vi leser dem direkte (og holder knappen oppdatert mens man skriver).
function lesUtkast() {
  const t = document.getElementById('ny-tittel'), f = document.getElementById('ny-frist');
  if (t) ui.utkast.tittel = t.value;
  if (f) ui.utkast.frist = f.value;
}

document.addEventListener('input', e => {
  if (e.target.id !== 'ny-tittel') return;
  lesUtkast();
  const klar = !!ui.utkast.giverId && ui.utkast.tittel.trim().length > 0;
  const knapp = document.querySelector('[data-handling="opprett"]');
  if (knapp) knapp.disabled = !klar;
  const hint = document.getElementById('ny-hint');
  if (hint) hint.textContent = klar ? 'Behov, dokumenter og beløp fylles inn i søknaden.' : 'Velg giver og skriv en tittel.';
});

export const soknaderSide = {
  tegn() {
    lesUtkast();
    const alle = sortert();
    const synlig = alle.filter(SOKNADSFILTRE[ui.filter]);
    const antall = Object.fromEntries(FILTRE.map(([id]) => [id, alle.filter(SOKNADSFILTRE[id]).length]));
    const sumSokt = synlig.reduce((s, x) => s + soktBelop(x), 0);
    // Innvilget/disponert telles for innvilgede og avsluttede; gjenstår bare
    // for dem som fortsatt er åpne (innvilget). «I år» = året søknaden ble
    // sendt (frist hvis sendt mangler).
    const medPott = liste => liste.filter(x => erInnvilget(x) && x.innvilget != null).map(x => ({ s: x, p: pott(x, innkjopFor(x.id)) }));
    const sum = (liste, f) => liste.reduce((a, x) => a + f(x), 0);
    const synligPott = medPott(synlig), synligApne = synligPott.filter(x => x.s.status === 'innvilget');
    const iAar = String(new Date().getFullYear());
    const iAarPott = medPott(alle).filter(x => (x.s.sendt || x.s.frist || '').startsWith(iAar));
    const allePott = medPott(alle).filter(x => x.s.status === 'innvilget');
    const html = `
      <header class="sidehode">
        <div>
          <h1>Søknader</h1>
          <div class="ingress">Alle søknader til stiftelser og andre givere. Klikk en rad for å åpne.</div>
        </div>
        <div class="nokkeltall">
          <div><div class="etikett">Innvilget i år</div><div class="tall">${kr(sum(iAarPott, x => x.p.innvilget))}</div></div>
          <div><div class="etikett">Gjenstår i potter</div><div class="tall">${kr(sum(allePott, x => x.p.gjenstar))}</div></div>
          <div><div class="etikett">Venter på svar</div><div class="tall">${antall.venter}</div></div>
        </div>
      </header>
      <main class="innhold">
        <div class="verktoyrad">
          <div class="segment">${FILTRE.map(([id, navn]) => `<button type="button" data-handling="filter" data-id="${id}" aria-pressed="${ui.filter === id}">${navn}${MED_ANTALL.has(id) ? ` (${antall[id]})` : ''}</button>`).join('')}</div>
          <button type="button" class="knapp knapp-primar" data-handling="ny">+ Ny søknad</button>
        </div>
        <div class="tabellramme" data-rull="soknader">
          <table class="liste">
            <thead><tr><th>Søknad</th><th>Neste frist</th><th>Status</th><th class="tall">Søkt</th><th class="tall">Innvilget</th><th class="tall">Disponert</th><th class="tall">Gjenstår</th><th>Sist endret</th></tr></thead>
            <tbody>${synlig.map(rad).join('') || '<tr class="tom-rad"><td colspan="8">Ingen søknader i dette utvalget.</td></tr>'}</tbody>
            <tfoot><tr><td colspan="3" class="dempet">${synlig.length} søknader vist</td><td class="tall fet">${kr(sumSokt)}</td><td class="tall sum">${kr(sum(synligPott, x => x.p.innvilget))}</td><td class="tall fet">${kr(sum(synligPott, x => x.p.disponert))}</td><td class="tall sum">${kr(sum(synligApne, x => x.p.gjenstar))}</td><td></td></tr></tfoot>
          </table>
        </div>
      </main>
      ${ui.nySoknad ? nyPanel() : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    if (handling === 'filter') { ui.filter = el.dataset.id; tegn(); }
    else if (handling === 'apne') gaaTil(`#/soknad/${el.dataset.id}`);
    else if (handling === 'ny') { ui.nySoknad = true; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { lesUtkast(); ui.nySoknad = false; tegn(); }
    else if (handling === 'velg-giver') { lesUtkast(); ui.utkast.giverId = el.dataset.id; tegn(); }
    else if (handling === 'opprett') {
      lesUtkast();
      const u = ui.utkast;
      const frist = tolkDato(u.frist);
      if (Number.isNaN(frist)) { visMelding(`«${u.frist}» er ikke en gyldig dato (dd.mm.åååå)`); return; }
      el.disabled = true;
      const id = await lagre(() => opprettSoknad({ giverId: u.giverId, tittel: u.tittel.trim(), frist }));
      if (!id) { el.disabled = false; return; }
      ui.nySoknad = false;
      ui.utkast = { giverId: null, tittel: '', frist: '' };
      gaaTil(`#/soknad/${id}/soknad`);
    }
  },

  escape() {
    if (!ui.nySoknad) return false;
    lesUtkast();
    ui.nySoknad = false;
    return true;
  },
};
