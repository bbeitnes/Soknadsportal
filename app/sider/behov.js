// Behovslisten: alt korpset trenger, uavhengig av søknad.
import { tilstand, opprettBehov, oppdaterBehov, slettBehov, importerBehov, fellesTyperekkefolge, settFellesTyperekkefolge, settBehovrekkefolge, anskaffet, finansierte } from '../data/index.js';
import { behovsinfo, statusNavn, erTomPost, tolkBehovimport, IMPORTFELT, grupperPerType, typeliste, etterRekkefolgeOgTittel, flyttIListe } from '../data/beregning.js';
import { escapeHtml, kr, tidspunkt, fornavn } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre, ferdigLagret } from '../ui/lagring.js';
import { tegn, fokuser, sidepanel, lukkeknapp, nesteknapp } from '../ui/visning.js';
import { utskrift } from '../ui/utskrift.js';

const ui = { filter: 'apne', panel: null, nyttPanel: false, importTekst: '', importerer: false };

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

// Manuell rekkefølge (dra og slipp) innenfor typen, ellers alfabetisk.
function sortert() {
  return [...tilstand.behov].sort(etterRekkefolgeOgTittel);
}

const typeAv = b => (b.type || '').trim();
const del = nokkel => { const i = nokkel.indexOf(':'); return [nokkel.slice(0, i), nokkel.slice(i + 1)]; };

function beregn() {
  const kjopt = anskaffet(), valgt = finansierte();
  const alle = sortert().map(b => ({ b, info: behovsinfo(b, tilstand.soknader, kjopt.get(b.id) || 0, valgt) }));
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
    const tittel = `${x.soknad.tittel} (${statusNavn(x.soknad.status)})${x.linje.etterSoknad ? ' – lagt til etter søknaden' : ''}`;
    return `<span class="brikke ${info.finansiertI(x) ? 'fylt' : ''}" title="${escapeHtml(tittel)}">${escapeHtml(giverNavn(x.soknad.giverId))} · ${x.linje.antall ?? 0}</span>`;
  }).join('')}</div>`;
}

function rad({ b, info }) {
  const prosent = info.total ? Math.min(100, Math.round(info.anskaffet / info.total * 100)) : 0;
  return `
    <tr class="klikkbar ${b.id === ui.panel ? 'valgt' : ''}" data-handling="apne" data-id="${b.id}" data-slippmal="behov:${b.id}">
      <td><div style="display:flex; align-items:center"><span class="dra" draggable="true" data-dra="behov:${b.id}" data-handling="ingen" title="Dra for å endre rekkefølge, eller flytt til en annen type">⠿</span><div style="min-width:0"><div class="celletittel">${escapeHtml(b.tittel || 'Uten tittel')}</div><div class="celleunder">${escapeHtml(b.beskrivelse || '') || '&nbsp;'}</div></div></div></td>
      <td style="width:200px"><div class="fremdrift"><span class="smal fet">${info.erApent ? `${info.gjenstar} av ${info.total}` : `${info.anskaffet} av ${info.total}`}</span><span class="stolpe"><span style="width:${prosent}%"></span></span></div></td>
      <td class="tall">${kr(b.estPris)}</td>
      <td class="tall fet">${info.erApent ? kr(info.gjenstarKr) : '–'}</td>
      <td style="padding-top:7px; padding-bottom:7px">${soknadsbrikker(info)}</td>
      <td class="smal"><span class="merkelapp ${merkeklasse(info)}">${escapeHtml(info.status)}</span></td>
    </tr>`;
}

function panel(b) {
  const info = behovsinfo(b, tilstand.soknader, anskaffet().get(b.id) || 0, finansierte());
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
    <label class="felt"><span class="etikett">Type</span><input class="inndata" list="typer" placeholder="F.eks. Instrument, Uniform, Utstyr" ${feltAttr(n('type'), b.type)}><span class="undertekst">Fritt valg. Behovslisten grupperes på type. Kan overstyres per søknad.</span></label>
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
        ${info.bruk.map(x => `<a href="#/soknad/${x.soknad.id}"><span class="fyll"><span style="font-weight:600">${escapeHtml(x.soknad.tittel)}</span><br><span class="undertekst">${escapeHtml(giverNavn(x.soknad.giverId))} · ${statusNavn(x.soknad.status)}</span></span><span class="smal">${x.linje.antall ?? 0} stk${info.finansiertI(x) ? ' · finansiert' : ''}${x.linje.etterSoknad ? '<br><span class="undertekst">lagt til etter søknaden</span>' : ''}</span></a>`).join('')
          || '<div class="tomt">Ikke med i noen søknad enda. Behovet kan velges når du lager en søknad.</div>'}
      </div>
    </div>
    ${nesteknapp('+ Nytt behov')}
    <div class="panelbunn"><span>${escapeHtml(endretTekst(b))}</span>
      ${info.bruk.length ? '' : '<button type="button" class="knapp knapp-fare" data-handling="slett">Slett behov</button>'}
    </div>`, { nytt: ui.nyttPanel });
}

// ——— Import fra Excel / Google Sheets ———

function importForhandsvisning() {
  const i = tolkBehovimport(ui.importTekst, tilstand.behov);
  if (!i.rader.length) return { html: '<div class="undertekst">Ingenting å vise enda.</div>', nye: [] };
  const nye = i.rader.filter(r => r.status === 'ny');
  const hoppet = i.rader.length - nye.length;
  const html = `
    <div class="hint">${i.harOverskrift ? 'Kolonnene ble funnet fra overskriftsraden.' : 'Fant ingen overskriftsrad – antar rekkefølgen Type, Tittel, Beskrivelse, Antall, Est. stykkpris.'}</div>
    <div class="tabellramme" style="flex:0 1 auto; max-height:40vh">
      <table class="liste" style="font-size:13px">
        <thead><tr><th>Type</th><th>Behov</th><th class="tall">Antall</th><th class="tall">Est. pris</th><th></th></tr></thead>
        <tbody>${i.rader.map(r => `<tr style="${r.status === 'ny' ? '' : 'color:var(--color-neutral-500)'}"><td class="smal">${escapeHtml(r.type || '–')}</td><td><div class="celletittel">${escapeHtml(r.tittel || '–')}</div><div class="celleunder" style="max-width:200px">${escapeHtml(r.beskrivelse)}</div></td><td class="tall">${r.antall}</td><td class="tall">${kr(r.estPris)}</td><td class="smal">${r.status === 'ny' ? '' : `<span class="merkelapp ${r.status === 'ugyldig' ? 'm-varsel' : 'm-av'}">${escapeHtml(r.grunn)}</span>`}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="hint">${nye.length} nye behov${hoppet ? ` · ${hoppet} hoppes over` : ''}</div>`;
  return { html, nye };
}

// En tom mal med riktige overskrifter og én eksempelrad. Semikolon og BOM
// gjør at Excel åpner den riktig med norske innstillinger.
function importmal() {
  const csv = '\ufeff' + IMPORTFELT.map(f => f.navn).join(';') + '\r\n' + IMPORTFELT.map(f => f.eksempel).join(';') + '\r\n';
  return 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
}

function importPanel() {
  const f = importForhandsvisning();
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Importer behov</h2><div class="ingress" style="margin-top:4px">Kopier radene i Excel eller Google Sheets og lim dem inn her, eller velg en CSV-fil.</div></div>
      ${lukkeknapp()}
    </div>
    <div class="felt"><span class="etikett">Dette skal lista inneholde</span>
      <table class="liste" style="font-size:13px; border:2px solid var(--color-divider); table-layout:fixed">
        <thead><tr><th style="position:static; width:21%">Kolonne</th><th style="position:static; width:35%">Overskrift</th><th style="position:static; width:24%">Eksempel</th><th style="position:static; width:20%">Hvis tom</th></tr></thead>
        <tbody>${IMPORTFELT.map(f => `<tr><td class="fet smal">${f.navn}${f.paakrevd ? ' <span class="aksent" title="Påkrevd">*</span>' : ''}</td><td>${f.overskrifter.map(escapeHtml).join(', ')}</td><td>${escapeHtml(f.eksempel)}</td><td class="dempet">${f.tomt}</td></tr>`).join('')}</tbody>
      </table>
      <span class="undertekst"><span class="aksent">*</span> Påkrevd. Første rad i regnearket skal være overskriftene: én av de nevnte per kolonne, i valgfri rekkefølge. Andre kolonner (f.eks. Sum, Prioritet) ses bort fra. <a href="${importmal()}" download="behovsliste-mal.csv">Last ned mal (CSV)</a></span>
    </div>
    <textarea class="inndata" id="imp-tekst" rows="6" placeholder="Lim inn her" style="font-family:ui-monospace, Menlo, monospace; font-size:12px; white-space:pre">${escapeHtml(ui.importTekst)}</textarea>
    <label class="knapp knapp-ramme knapp-liten" style="align-self:flex-start; cursor:pointer">Velg CSV-fil<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden data-import></label>
    <div id="imp-forhand" style="display:flex; flex-direction:column; gap:8px; min-height:0">${f.html}</div>
    <div style="display:flex; align-items:center; gap:12px">
      <button type="button" class="knapp knapp-primar" data-handling="importer" ${f.nye.length && !ui.importerer ? '' : 'disabled'}>${ui.importerer ? 'Importerer …' : `Importer ${f.nye.length} behov`}</button>
    </div>`, { nytt: ui.nyttPanel }).replace('class="sidepanel"', 'class="sidepanel" style="width:620px"');
}

// Forhåndsvisningen oppdateres på stedet mens man limer inn eller skriver,
// uten ny tegning av siden (markøren blir stående i tekstfeltet).
function oppdaterImport() {
  const el = document.getElementById('imp-forhand');
  if (!el) return;
  const f = importForhandsvisning();
  el.innerHTML = f.html;
  const knapp = document.querySelector('[data-handling="importer"]');
  if (knapp) { knapp.disabled = !f.nye.length || ui.importerer; knapp.textContent = `Importer ${f.nye.length} behov`; }
}

document.addEventListener('input', e => {
  if (e.target.id !== 'imp-tekst') return;
  ui.importTekst = e.target.value;
  oppdaterImport();
});

function skrivUt(d) {
  const navn = { apne: 'Åpne behov', lukket: 'Anskaffede og lukkede behov', alle: 'Alle behov' }[ui.filter];
  const rad = ({ b, info }) => `<tr><td>${escapeHtml(b.tittel)}${b.beskrivelse ? `<div class="d">${escapeHtml(b.beskrivelse)}</div>` : ''}</td><td class="n">${info.anskaffet} / ${info.total}</td><td class="n">${kr(b.estPris)}</td><td class="n">${info.erApent ? kr(info.gjenstarKr) : '–'}</td><td>${escapeHtml(info.bruk.map(x => `${giverNavn(x.soknad.giverId)} (${x.linje.antall ?? 0})`).join(', ')) || '–'}</td><td>${escapeHtml(info.status)}</td></tr>`;
  const rader = grupperPerType(d.synlig, x => x.b.type, fellesTyperekkefolge()).map(g => `<tr class="g"><td colspan="3">${escapeHtml(g.type || 'Uten type')}</td><td class="n">${kr(g.elementer.reduce((sum, x) => sum + (x.info.erApent ? x.info.gjenstarKr : 0), 0))}</td><td colspan="2"></td></tr>${g.elementer.map(rad).join('')}`).join('');
  utskrift(navn, `<p>Behovsliste · skrevet ut ${new Date().toLocaleDateString('nb-NO')} · ${d.synlig.length} behov</p>
    <table><thead><tr><th>Behov</th><th class="n">Anskaffet / totalt</th><th class="n">Est. stk.pris</th><th class="n">Gjenstår, kr</th><th>Søknader</th><th>Status</th></tr></thead>
    <tbody>${rader}</tbody><tfoot><tr><td colspan="3">Gjenstående estimert</td><td class="n">${kr(d.synligKr)}</td><td colspan="2"></td></tr></tfoot></table>`, 'landscape');
}

export const behovSide = {
  tegn() {
    const d = beregn();
    const valgt = tilstand.behov.find(b => b.id === ui.panel);
    if (ui.panel && !valgt && ui.panel !== 'import') ui.panel = null;
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
            <button type="button" class="knapp knapp-ramme" data-handling="import">Importer</button>
            <button type="button" class="knapp knapp-ramme" data-handling="skriv-ut">Skriv ut</button>
            <button type="button" class="knapp knapp-primar" data-handling="ny">+ Nytt behov</button>
          </div>
        </div>
        <div class="tabellramme" data-rull="behov">
          <table class="liste">
            <thead><tr><th>Behov</th><th>Gjenstår</th><th class="tall">Est. stk.pris</th><th class="tall">Gjenstår, kr</th><th>Søknader</th><th>Status</th></tr></thead>
            <tbody>${grupperPerType(d.synlig, x => x.b.type, fellesTyperekkefolge()).map(g => `
              <tr class="gruppe" data-slippmal="type:${escapeHtml(g.type)}"><td colspan="3"><span class="dra" draggable="true" data-dra="type:${escapeHtml(g.type)}" title="Dra for å flytte hele typen">⠿</span>${escapeHtml(g.type || 'Uten type')}</td><td class="tall">${kr(g.elementer.reduce((sum, x) => sum + (x.info.erApent ? x.info.gjenstarKr : 0), 0))}</td><td colspan="2">${g.elementer.length} behov</td></tr>
              ${g.elementer.map(rad).join('')}`).join('') || '<tr class="tom-rad"><td colspan="6">Ingen behov i dette utvalget.</td></tr>'}</tbody>
            <tfoot><tr><td colspan="3" class="dempet">${d.synlig.length} behov vist · gjenstående estimert</td><td class="tall sum">${kr(d.synligKr)}</td><td colspan="2"></td></tr></tfoot>
          </table>
        </div>
      </main>
      <datalist id="typer">${typeliste(tilstand.behov, tilstand.soknader, tilstand.innkjop).map(t => `<option value="${escapeHtml(t)}">`).join('')}</datalist>
      ${valgt ? panel(valgt) : ui.panel === 'import' ? importPanel() : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    const b = tilstand.behov.find(x => x.id === ui.panel);
    if (handling === 'import') { ui.panel = 'import'; ui.nyttPanel = true; tegn(); return; }
    if (handling === 'importer') {
      const nye = importForhandsvisning().nye;
      if (!nye.length || ui.importerer) return;
      document.activeElement?.blur?.();
      ui.importerer = true; tegn();
      const antall = await lagre(() => importerBehov(nye));
      ui.importerer = false;
      if (antall) { ui.importTekst = ''; ui.panel = null; ui.filter = 'apne'; }
      tegn();
      return;
    }
    if (handling === 'filter') { ui.filter = el.dataset.id; tegn(); }
    else if (handling === 'apne') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else if (handling === 'skriv-ut') skrivUt(beregn());
    else if (handling === 'ny' || handling === 'neste') {
      // «Neste» fra panelet: en urørt post gir ingen ny, bare markøren i første felt.
      if (handling === 'neste') {
        if (!(await ferdigLagret())) return;
        const apen = tilstand.behov.find(x => x.id === ui.panel);
        if (apen && erTomPost('behov', apen)) { fokuser(`behov/${apen.id}/tittel`); tegn(); return; }
      }
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

  // Dra og slipp: et behov flyttes innenfor typen eller over i en annen
  // type (da bytter det type). En typeoverskrift flytter hele gruppen.
  slipp(kilde, mal, posisjon) {
    const [kHva, kId] = del(kilde), [mHva, mId] = del(mal);
    const malBehov = mHva === 'behov' ? tilstand.behov.find(b => b.id === mId) : null;
    const malType = mHva === 'type' ? mId : typeAv(malBehov || {});
    if (kHva === 'type') {
      if (kId === malType) return;
      const typer = grupperPerType(tilstand.behov, typeAv, fellesTyperekkefolge()).map(g => g.type);
      lagre(() => settFellesTyperekkefolge(flyttIListe(typer, kId, malType, posisjon)));
      return;
    }
    if (kId === mId) return;
    const gruppe = sortert().filter(b => typeAv(b) === malType).map(b => b.id);
    const ny = mHva === 'type' ? flyttIListe(gruppe, kId, null) : flyttIListe(gruppe, kId, mId, posisjon);
    lagre(() => settBehovrekkefolge(ny, { flyttetId: kId, nyType: malType }));
  },

  async filer(el, filer) {
    if (!el.hasAttribute?.('data-import') || !filer[0]) return;
    ui.importTekst = await filer[0].text();
    if (el.type === 'file') el.value = '';
    const felt = document.getElementById('imp-tekst');
    if (felt) felt.value = ui.importTekst;
    oppdaterImport();
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
