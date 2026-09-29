// Givere. Vedlikeholdes av administrator; andre brukere ser dem lesbart.
// (Brukerlisten og invitasjoner kommer i trinn e.)
import { tilstand, erAdmin, opprettGiver, oppdaterGiver, slettGiver } from '../data/index.js';
import { statusNavn } from '../data/beregning.js';
import { escapeHtml, kr } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre } from '../ui/lagring.js';
import { tegn, fokuser, avkryss, sidepanel, lukkeknapp } from '../ui/visning.js';

const ui = { panel: null, nyttPanel: false };

function momsTekst(g) {
  return g.momsTrekk ? `Trekkes ut, ${g.momsProsent ?? 0} %` : 'Nei';
}

function sortert() {
  return [...tilstand.givere].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
}

function panel(g) {
  const admin = erAdmin();
  const soknader = tilstand.soknader.filter(s => s.giverId === g.id);
  const eksempel = kr(1000 * (100 - (g.momsProsent ?? 0)) / 100);
  const nokkel = f => `givere/${g.id}/${f}`;
  return sidepanel(`
    <div class="panelhode">
      <div>
        <div class="etikett">Giver</div>
        ${admin
          ? `<input class="tittelfelt" ${feltAttr(nokkel('navn'), g.navn)} placeholder="Navn">`
          : `<h2>${escapeHtml(g.navn || 'Uten navn')}</h2>`}
      </div>
      ${lukkeknapp()}
    </div>
    <label class="felt"><span class="etikett">Kontaktinfo og notat</span>
      ${admin
        ? tekstomrade(nokkel('kontakt'), g.kontakt, 'class="inndata" rows="4" placeholder="Kontaktperson, e-post, telefon, søknadsfrister …"')
        : `<div style="white-space:pre-line; font-size:14px">${escapeHtml(g.kontakt || '–')}</div>`}
    </label>
    <div class="boksrute">
      ${admin
        ? avkryss(!!g.momsTrekk, 'Trekk ut momskompensasjon', 'moms', '', 'fet')
        : `<div style="font-weight:600">Momskompensasjon: ${escapeHtml(momsTekst(g))}</div>`}
      ${g.momsTrekk ? `
        ${admin ? `<div class="innrykk" style="display:flex; align-items:center; gap:10px"><span class="dempet">Standardprosent</span><input class="inndata prosent" inputmode="numeric" ${feltAttr(nokkel('momsProsent'), g.momsProsent, 'prosent')}><span>%</span></div>` : ''}
        <div class="innrykk undertekst">Eksempel: en vare til 1 000 kr dekkes med ${eksempel} kr fra giveren; resten dekkes av momskompensasjonen året etter. Kan justeres per søknad.</div>`
      : '<div class="innrykk undertekst">Søknader til denne giveren viser ingen ekstra kolonner.</div>'}
    </div>
    <div class="felt"><span class="etikett">Søknader</span>
      <div class="valgliste">
        ${soknader.map(s => `<a href="#/soknad/${s.id}"><span class="fyll" style="font-weight:600">${escapeHtml(s.tittel)}</span><span class="undertekst">${statusNavn(s.status)}</span></a>`).join('')
          || '<div class="tomt">Ingen søknader enda.</div>'}
      </div>
    </div>
    <div class="panelbunn"><span></span>
      ${admin && !soknader.length ? '<button type="button" class="knapp knapp-fare" data-handling="slett">Slett giver</button>' : ''}
    </div>`, { nytt: ui.nyttPanel });
}

export const givereSide = {
  tegn() {
    const givere = sortert();
    const valgt = givere.find(g => g.id === ui.panel);
    if (ui.panel && !valgt) ui.panel = null;
    const html = `
      <header class="sidehode">
        <div>
          <h1>Givere</h1>
          <div class="ingress">Vedlikeholdes av administrator. Momsinnstillingen arves av nye søknader til giveren.</div>
        </div>
      </header>
      <main class="innhold">
        <div class="verktoyrad">
          <div class="hint">Klikk en giver for å ${erAdmin() ? 'endre kontaktinfo og momsinnstilling' : 'se detaljer'}.</div>
          ${erAdmin() ? '<button type="button" class="knapp knapp-primar" data-handling="ny">+ Ny giver</button>' : ''}
        </div>
        <div class="tabellramme" data-rull="givere">
          <table class="liste">
            <thead><tr><th>Giver</th><th>Kontakt</th><th>Momskompensasjon</th><th class="tall">Søknader</th></tr></thead>
            <tbody>
              ${givere.map(g => `
                <tr class="klikkbar ${g.id === ui.panel ? 'valgt' : ''}" data-handling="apne" data-id="${g.id}">
                  <td class="fet">${escapeHtml(g.navn || 'Uten navn')}</td>
                  <td class="dempet" style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml((g.kontakt || '–').split('\n')[0])}</td>
                  <td class="smal"><span class="merkelapp ${g.momsTrekk ? 'm-pa' : 'm-av'}">${escapeHtml(momsTekst(g))}</span></td>
                  <td class="tall">${tilstand.soknader.filter(s => s.giverId === g.id).length}</td>
                </tr>`).join('') || '<tr class="tom-rad"><td colspan="4">Ingen givere enda.</td></tr>'}
            </tbody>
          </table>
        </div>
      </main>
      ${valgt ? panel(valgt) : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    const g = tilstand.givere.find(x => x.id === ui.panel);
    if (handling === 'apne') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else if (handling === 'ny') {
      const id = await lagre(() => opprettGiver());
      if (id) { ui.panel = id; fokuser(`givere/${id}/navn`); tegn(); }
    } else if (handling === 'moms' && g) {
      lagre(() => oppdaterGiver(g.id, { momsTrekk: !g.momsTrekk }));
    } else if (handling === 'slett' && g) {
      if (!confirm(`Slette giveren «${g.navn || 'Uten navn'}»?`)) return;
      ui.panel = null;
      lagre(() => slettGiver(g.id));
    }
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
