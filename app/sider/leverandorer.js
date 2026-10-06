// Leverandørregisteret. Alle brukere kan legge til og endre; bare
// administrator kan slette, og bare når leverandøren ikke er brukt i noe
// innkjøp. Innkjøpene henter navn og kontakt herfra.
import { tilstand, erAdmin, opprettLeverandor, slettLeverandor } from '../data/index.js';
import { innkjopMedLeverandor, erTomPost } from '../data/beregning.js';
import { escapeHtml, tidspunkt, fornavn } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre, ferdigLagret } from '../ui/lagring.js';
import { tegn, fokuser, sidepanel, lukkeknapp, nesteknapp, kontaktfelt, kontaktcelle } from '../ui/visning.js';
import { innstillingsmeny } from './innstillinger.js';

const ui = { panel: null, nyttPanel: false };

function sortert() {
  return [...tilstand.leverandorer].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
}

// Brukes også fra søknaden (Innkjøp og Revisjon), som håndterer
// «lukk-panel» og «slett» selv. `neste` gir «+ Ny leverandør» nederst – bare
// i registeret, for fra søknaden skal en tilbake dit en kom fra.
export function leverandorpanel(lev, nytt = false, neste = false) {
  const brukt = innkjopMedLeverandor(lev.id, tilstand.innkjop);
  const nokkel = f => `leverandorer/${lev.id}/${f}`;
  return sidepanel(`
    <div class="panelhode">
      <div><div class="etikett">Leverandør</div><input class="tittelfelt" placeholder="Navn" ${feltAttr(nokkel('navn'), lev.navn)}></div>
      ${lukkeknapp()}
    </div>
    ${kontaktfelt(nokkel, lev)}
    <label class="felt"><span class="etikett">Notat</span>${tekstomrade(nokkel('kontakt'), lev.kontakt, 'class="inndata" rows="4" placeholder="Kundenummer, andre kontakter …"')}</label>
    <div class="felt"><span class="etikett">Brukt i innkjøp</span>
      <div class="valgliste">
        ${brukt.map(i => {
          const s = tilstand.soknader.find(x => x.id === i.soknadId);
          return `<a href="#/soknad/${i.soknadId}/innkjop"><span class="fyll"><span style="font-weight:600">${escapeHtml(i.navn || 'Uten navn')}</span><br><span class="undertekst">${escapeHtml(s?.tittel || 'Slettet søknad')}</span></span></a>`;
        }).join('') || '<div class="tomt">Ikke brukt i noe innkjøp enda.</div>'}
      </div>
    </div>
    ${neste ? nesteknapp('+ Ny leverandør') : ''}
    <div class="panelbunn"><span>${lev.endretAv ? `Sist endret av ${escapeHtml(fornavn(lev.endretAv.navn, lev.endretAv.epost))}, ${tidspunkt(lev.endretTid)}` : ''}</span>
      ${erAdmin() && !brukt.length ? '<button type="button" class="knapp knapp-fare" data-handling="slett">Slett leverandør</button>' : ''}
    </div>`, { nytt });
}

export const leverandorerSide = {
  meny: 'innstillinger',

  tegn() {
    const liste = sortert();
    const valgt = liste.find(l => l.id === ui.panel);
    if (ui.panel && !valgt) ui.panel = null;
    const html = `
      <header class="sidehode">
        <div>
          <h1>Leverandører</h1>
          <div class="ingress">Leverandører dere henter tilbud fra. Velges inn i innkjøpene fra denne listen.</div>
        </div>
      </header>
      ${innstillingsmeny('leverandorer')}
      <main class="innhold">
        <div class="verktoyrad">
          <div class="hint bare-skriv">Klikk en leverandør for å endre kontaktinfo.</div>
          <button type="button" class="knapp knapp-primar" data-handling="ny">+ Ny leverandør</button>
        </div>
        <div class="tabellramme" data-rull="leverandorer">
          <table class="liste">
            <thead><tr><th>Leverandør</th><th>Kontakt</th><th class="tall">Innkjøp</th></tr></thead>
            <tbody>
              ${liste.map(l => `
                <tr class="klikkbar ${l.id === ui.panel ? 'valgt' : ''}" data-handling="apne" data-id="${l.id}">
                  <td class="fet">${escapeHtml(l.navn || 'Uten navn')}</td>
                  <td class="dempet" style="max-width:420px; overflow:hidden">${kontaktcelle(l)}</td>
                  <td class="tall">${innkjopMedLeverandor(l.id, tilstand.innkjop).length}</td>
                </tr>`).join('') || '<tr class="tom-rad"><td colspan="3">Ingen leverandører enda.</td></tr>'}
            </tbody>
          </table>
        </div>
      </main>
      ${valgt ? leverandorpanel(valgt, ui.nyttPanel, true) : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    const lev = tilstand.leverandorer.find(x => x.id === ui.panel);
    if (handling === 'apne') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else if (handling === 'ny' || handling === 'neste') {
      if (handling === 'neste') {
        if (!(await ferdigLagret())) return;
        const apen = tilstand.leverandorer.find(x => x.id === ui.panel);
        if (apen && erTomPost('leverandorer', apen)) { fokuser(`leverandorer/${apen.id}/navn`); tegn(); return; }
      }
      const id = await lagre(() => opprettLeverandor());
      if (id) { ui.panel = id; fokuser(`leverandorer/${id}/navn`); tegn(); }
    } else if (handling === 'slett' && lev) {
      if (!confirm(`Slette leverandøren «${lev.navn || 'Uten navn'}»?`)) return;
      ui.panel = null;
      lagre(() => slettLeverandor(lev.id));
    }
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
