// Behovslisten: alt korpset trenger, uavhengig av søknad.
import { tilstand, opprettBehov, oppdaterBehov, slettBehov } from '../data/index.js';
import { behovsinfo, statusNavn } from '../data/beregning.js';
import { escapeHtml, kr, tidspunkt, fornavn } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre } from '../ui/lagring.js';
import { tegn, fokuser, sidepanel, lukkeknapp } from '../ui/visning.js';
import { utskrift } from '../ui/utskrift.js';

const ui = { filter: 'apne', panel: null, nyttPanel: false };

const FILTRE = [['apne', 'Åpne'], ['lukket', 'Anskaffet og lukket'], ['alle', 'Alle']];

function merkeklasse(info) {
  if (info.overstyrt) return 'm-dempet';
  if (info.status === 'Anskaffet') return 'm-ferdig';
  if (info.status === 'Ikke søkt') return 'm-varsel';
  return 'm-apen';
}

function giverNavn(id) {
  return tilstand.givere.find(g => g.id === id)?.navn || 'Ukjent giver';
}

function endretTekst(b) {
  if (!b.endretAv) return '';
  return `Sist endret av ${fornavn(b.endretAv.navn, b.endretAv.epost)}, ${tidspunkt(b.endretTid)}`;
}

function sortert() {
  return [...tilstand.behov].sort((a, b) => (a.tittel || '').localeCompare(b.tittel || '', 'nb'));
}

function beregn() {
  const alle = sortert().map(b => ({ b, info: behovsinfo(b, tilstand.soknader) }));
  const synlig = alle.filter(({ info }) => ui.filter === 'alle' || (ui.filter === 'apne' ? info.erApent : !info.erApent));
  const apne = alle.filter(x => x.info.erApent);
  return {
    alle, synlig,
    antallApne: apne.length,
    gjenstarKr: apne.reduce((s, x) => s + x.info.gjenstarKr, 0),
    ikkeSokt: apne.filter(x => !x.info.bruk.length).length,
    synligKr: synlig.reduce((s, x) => s + (x.info.erApent ? x.info.gjenstarKr : 0), 0),
  };
}

function soknadsbrikker(info) {
  if (!info.bruk.length) return '<span class="undertekst">–</span>';
  return `<div class="brikker">${info.bruk.map(x => {
    const tittel = `${x.soknad.tittel} (${statusNavn(x.soknad.status)})`;
    return `<span class="brikke ${info.finansiertI(x) ? 'fylt' : ''}" title="${escapeHtml(tittel)}">${escapeHtml(giverNavn(x.soknad.giverId))} · ${x.linje.antall ?? 0}</span>`;
  }).join('')}</div>`;
}

function rad({ b, info }) {
  const prosent = info.total ? Math.min(100, Math.round(info.anskaffet / info.total * 100)) : 0;
  return `
    <tr class="klikkbar ${b.id === ui.panel ? 'valgt' : ''}" data-handling="apne" data-id="${b.id}">
      <td><div class="celletittel">${escapeHtml(b.tittel || 'Uten tittel')}</div><div class="celleunder">${escapeHtml(b.beskrivelse || '') || '&nbsp;'}</div></td>
      <td style="width:200px"><div class="fremdrift"><span class="smal fet">${info.erApent ? `${info.gjenstar} av ${info.total}` : `${info.anskaffet} av ${info.total}`}</span><span class="stolpe"><span style="width:${prosent}%"></span></span></div></td>
      <td class="tall">${kr(b.estPris)}</td>
      <td class="tall fet">${info.erApent ? kr(info.gjenstarKr) : '–'}</td>
      <td style="padding-top:7px; padding-bottom:7px">${soknadsbrikker(info)}</td>
      <td class="smal"><span class="merkelapp ${merkeklasse(info)}">${escapeHtml(info.status)}</span></td>
    </tr>`;
}

function panel(b) {
  const info = behovsinfo(b, tilstand.soknader);
  const n = f => `behov/${b.id}/${f}`;
  const valg = [[null, 'Automatisk'], ['trengs-ikke', 'Trengs ikke'], ['anskaffet', 'Anskaffet']];
  const statusNotat = info.overstyrt
    ? `Overstyrt manuelt. Automatisk ville vært «${info.autostatus}».`
    : `Beregnes fra søknader og fakturerte innkjøp: ${info.autostatus.toLowerCase()}.`;
  return sidepanel(`
    <div class="panelhode">
      <div><div class="etikett">Behov</div><input class="tittelfelt" ${feltAttr(n('tittel'), b.tittel)} placeholder="Tittel"></div>
      ${lukkeknapp()}
    </div>
    <label class="felt"><span class="etikett">Beskrivelse</span>${tekstomrade(n('beskrivelse'), b.beskrivelse, 'class="inndata" rows="3" placeholder="Hva og hvorfor"')}</label>
    <div class="to-kol">
      <label class="felt"><span class="etikett">Antall totalt</span><input class="inndata tall" inputmode="numeric" ${feltAttr(n('antall'), b.antall, 'tall')}></label>
      <label class="felt"><span class="etikett">Est. stykkpris</span><input class="inndata tall" inputmode="numeric" ${feltAttr(n('estPris'), b.estPris, 'tall')}></label>
    </div>
    <div class="rute3">
      <div><div class="etikett">Anskaffet</div><div class="tall">${info.anskaffet}</div></div>
      <div><div class="etikett">I søknader</div><div class="tall">${info.iSoknader}</div></div>
      <div><div class="etikett">Gjenstår</div><div class="tall">${info.gjenstar}</div></div>
    </div>
    <div class="felt"><span class="etikett">Status</span>
      <div class="segment fyll">${valg.map(([v, navn]) => `<button type="button" data-handling="overstyr" data-verdi="${v ?? ''}" aria-pressed="${(b.statusOverstyring ?? null) === v}">${navn}</button>`).join('')}</div>
      <span class="undertekst">${escapeHtml(statusNotat)}</span>
    </div>
    <div class="felt"><span class="etikett">Søknader</span>
      <div class="valgliste">
        ${info.bruk.map(x => `<a href="#/soknad/${x.soknad.id}"><span class="fyll"><span style="font-weight:600">${escapeHtml(x.soknad.tittel)}</span><br><span class="undertekst">${escapeHtml(giverNavn(x.soknad.giverId))} · ${statusNavn(x.soknad.status)}</span></span><span class="smal">${x.linje.antall ?? 0} stk${info.finansiertI(x) ? ' · finansiert' : ''}</span></a>`).join('')
          || '<div class="tomt">Ikke med i noen søknad enda. Behovet kan velges når du lager en søknad.</div>'}
      </div>
    </div>
    <div class="panelbunn"><span>${escapeHtml(endretTekst(b))}</span>
      ${info.bruk.length ? '' : '<button type="button" class="knapp knapp-fare" data-handling="slett">Slett behov</button>'}
    </div>`, { nytt: ui.nyttPanel });
}

function skrivUt(d) {
  const navn = { apne: 'Åpne behov', lukket: 'Anskaffede og lukkede behov', alle: 'Alle behov' }[ui.filter];
  const rader = d.synlig.map(({ b, info }) => `<tr><td>${escapeHtml(b.tittel)}${b.beskrivelse ? `<div class="d">${escapeHtml(b.beskrivelse)}</div>` : ''}</td><td class="n">${info.anskaffet} / ${info.total}</td><td class="n">${kr(b.estPris)}</td><td class="n">${info.erApent ? kr(info.gjenstarKr) : '–'}</td><td>${escapeHtml(info.bruk.map(x => `${giverNavn(x.soknad.giverId)} (${x.linje.antall ?? 0})`).join(', ')) || '–'}</td><td>${escapeHtml(info.status)}</td></tr>`).join('');
  utskrift(navn, `<p>Behovsliste · skrevet ut ${new Date().toLocaleDateString('nb-NO')} · ${d.synlig.length} behov</p>
    <table><thead><tr><th>Behov</th><th class="n">Anskaffet / totalt</th><th class="n">Est. stk.pris</th><th class="n">Gjenstår, kr</th><th>Søknader</th><th>Status</th></tr></thead>
    <tbody>${rader}</tbody><tfoot><tr><td colspan="3">Gjenstående estimert</td><td class="n">${kr(d.synligKr)}</td><td colspan="2"></td></tr></tfoot></table>`, 'landscape');
}

export const behovSide = {
  tegn() {
    const d = beregn();
    const valgt = tilstand.behov.find(b => b.id === ui.panel);
    if (ui.panel && !valgt) ui.panel = null;
    const antall = { apne: d.antallApne, lukket: d.alle.length - d.antallApne };
    const html = `
      <header class="sidehode">
        <div>
          <h1>Behov</h1>
          <div class="ingress">Alt korpset trenger, uavhengig av søknad. Anskaffet antall summeres fra fakturerte innkjøp.</div>
        </div>
        <div class="nokkeltall">
          <div><div class="etikett">Åpne behov</div><div class="tall">${d.antallApne}</div></div>
          <div><div class="etikett">Gjenstår, estimert</div><div class="tall">${kr(d.gjenstarKr)}</div></div>
          <div><div class="etikett">Ikke i noen søknad</div><div class="tall aksent">${d.ikkeSokt}</div></div>
        </div>
      </header>
      <main class="innhold">
        <div class="verktoyrad">
          <div class="segment">${FILTRE.map(([id, navn]) => `<button type="button" data-handling="filter" data-id="${id}" aria-pressed="${ui.filter === id}">${navn}${antall[id] != null ? ` (${antall[id]})` : ''}</button>`).join('')}</div>
          <div class="grupper">
            <button type="button" class="knapp knapp-ramme" data-handling="skriv-ut">Skriv ut</button>
            <button type="button" class="knapp knapp-primar" data-handling="ny">+ Nytt behov</button>
          </div>
        </div>
        <div class="tabellramme" data-rull="behov">
          <table class="liste">
            <thead><tr><th>Behov</th><th>Gjenstår</th><th class="tall">Est. stk.pris</th><th class="tall">Gjenstår, kr</th><th>Søknader</th><th>Status</th></tr></thead>
            <tbody>${d.synlig.map(rad).join('') || '<tr class="tom-rad"><td colspan="6">Ingen behov i dette utvalget.</td></tr>'}</tbody>
            <tfoot><tr><td colspan="3" class="dempet">${d.synlig.length} behov vist · gjenstående estimert</td><td class="tall sum">${kr(d.synligKr)}</td><td colspan="2"></td></tr></tfoot>
          </table>
        </div>
      </main>
      ${valgt ? panel(valgt) : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    const b = tilstand.behov.find(x => x.id === ui.panel);
    if (handling === 'filter') { ui.filter = el.dataset.id; tegn(); }
    else if (handling === 'apne') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else if (handling === 'skriv-ut') skrivUt(beregn());
    else if (handling === 'ny') {
      const id = await lagre(() => opprettBehov());
      if (id) {
        if (ui.filter === 'lukket') ui.filter = 'apne';
        ui.panel = id;
        fokuser(`behov/${id}/tittel`);
        tegn();
      }
    } else if (handling === 'overstyr' && b) {
      lagre(() => oppdaterBehov(b.id, { statusOverstyring: el.dataset.verdi || null }));
    } else if (handling === 'slett' && b) {
      if (!confirm(`Slette behovet «${b.tittel || 'Uten tittel'}»?`)) return;
      ui.panel = null;
      lagre(() => slettBehov(b.id));
    }
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
