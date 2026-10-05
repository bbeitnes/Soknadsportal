// Årshjul (kort 0009): tolv månedsruter med givernes søknadsfrister og
// søknadenes neste frist. Klikk på en giverfrist åpner giverpanelet.
import { tilstand } from '../data/index.js';
import { aarshjul } from '../data/beregning.js';
import { escapeHtml, iDag } from '../ui/format.js';
import { tegn } from '../ui/visning.js';
import { giverpanel, giverklikk } from './givere.js';

const ui = { panel: null, nyttPanel: false };

const MAANEDER = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

function post(p) {
  const dag = `<span class="aar-dag">${Number(p.dato.slice(8))}.</span>`;
  const tekst = `<span class="aar-tekst"><span class="aar-navn">${escapeHtml(p.navn)}</span>${p.tekst ? `<span class="aar-under">${escapeHtml(p.tekst)}${p.tilstand === 'forfalt' ? ' · Forfalt' : ''}</span>` : p.tilstand === 'forfalt' ? '<span class="aar-under">Forfalt</span>' : ''}</span>`;
  if (p.type === 'soknad') return `<a class="aar-post aar-soknad t-${p.tilstand}" href="#/soknad/${p.soknadId}" title="Åpne søknaden">${dag}${tekst}</a>`;
  return `<button type="button" class="aar-post t-${p.tilstand} ${p.giverId === ui.panel ? 'valgt' : ''}" data-handling="apne-giver" data-id="${p.giverId}" title="Åpne giveren">${dag}${tekst}</button>`;
}

function rute(m) {
  return `
    <section class="aar-rute ${m.forrige ? 'forrige' : ''} ${m.denne ? 'denne' : ''}">
      <h2>${MAANEDER[m.maaned - 1]} <span>${m.aar}</span></h2>
      <div class="aar-poster">${m.poster.map(post).join('')}</div>
    </section>`;
}

export const aarshjulSide = {
  tegn() {
    const valgt = tilstand.givere.find(g => g.id === ui.panel);
    if (ui.panel && !valgt) ui.panel = null;
    const html = `
      <header class="sidehode">
        <div>
          <h1>Årshjul</h1>
          <div class="ingress">Søknadsfrister hos giverne og neste frist på søknadene våre, fra forrige måned og ett år fram.</div>
        </div>
      </header>
      <main class="innhold">
        <div class="verktoyrad">
          <div class="hint">Klikk en frist for å åpne giveren. Nye frister legges inn på giveren under <a href="#/givere">Innstillinger → Givere</a>.</div>
          <div class="hint aar-forklaring"><span class="aar-prove"></span>Frist hos giver<span class="aar-prove soknad"></span>Søknad vi har i gang</div>
        </div>
        <div class="aarshjul">${aarshjul(tilstand.givere, tilstand.soknader, iDag()).map(rute).join('')}</div>
      </main>
      ${valgt ? giverpanel(valgt, { nytt: ui.nyttPanel }) : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    if (handling === 'apne-giver') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else await giverklikk(handling, el, tilstand.givere.find(g => g.id === ui.panel), () => { ui.panel = null; });
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
