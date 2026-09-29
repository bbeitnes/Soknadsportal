// Én søknad: fast topp + faner. Trinn a: Søknad-fanen (behov, søkt beløp,
// grunndata, status, revisjon av/på og dokumenter). Innkjøp, Utgifter og
// Revisjon kommer i senere trinn.
import {
  tilstand, oppdaterSoknad, oppdaterLinje, leggBehovISoknad, leggFriLinjeISoknad, fjernLinje,
  lastOppDokument, slettDokument, dokumentUrl,
} from '../data/index.js';
import {
  SOKNADSSTATUSER, statusNavn, linjeliste, linjekostnad, sumEstimert, soktBelop, velgbareBehov,
} from '../data/beregning.js';
import { escapeHtml, kr, datoFelt, tidspunkt, fornavn } from '../ui/format.js';
import { feltAttr } from '../ui/felt.js';
import { lagre } from '../ui/lagring.js';
import { tegn, fokuser, gaaTil, avkryss, sidepanel, lukkeknapp, IKON } from '../ui/visning.js';
import { utskrift } from '../ui/utskrift.js';

const FANER = [['soknad', 'Søknad'], ['innkjop', 'Innkjøp'], ['utgifter', 'Utgifter'], ['revisjon', 'Revisjon']];
const KOMMER = { innkjop: 'Innkjøp og tilbudsmatrisen kommer i trinn c.', utgifter: 'Løse utgifter kommer i trinn b.', revisjon: 'Fakturaer og revisjon kommer i trinn d.' };

const ui = { soknadId: null, panel: null, nyttPanel: false, velger: false, laster: 0 };

const giver = id => tilstand.givere.find(g => g.id === id);
const behovMedId = id => tilstand.behov.find(b => b.id === id);

function linjetittel(l) {
  return l.behovId ? (behovMedId(l.behovId)?.tittel || 'Slettet behov') : l.tittel;
}

function sistEndret(s) {
  if (!s.endretAv) return '';
  return `Sist endret av ${escapeHtml(s.endretAv.navn || s.endretAv.epost)}, ${tidspunkt(s.endretTid)}`;
}

// ——— Fast topp ———

function velger(s) {
  const andre = [...tilstand.soknader].sort((a, b) => (b.frist || '9999').localeCompare(a.frist || '9999'));
  return `
    <div class="velgerliste" style="position:absolute; top:100%; left:0; margin-top:6px; width:420px; max-width:90vw; background:var(--color-neutral-100); border:2px solid var(--color-divider); box-shadow:var(--shadow-lg); z-index:30; display:flex; flex-direction:column; max-height:60vh; overflow:auto">
      ${andre.map(a => `<button type="button" data-handling="bytt" data-id="${a.id}" style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:0; border-bottom:1px solid var(--color-neutral-300); background:${a.id === s.id ? 'var(--color-surface)' : 'transparent'}; cursor:pointer; text-align:left">
        <span style="flex:1; min-width:0"><span style="font-weight:600; font-size:14px">${escapeHtml(a.tittel || 'Uten tittel')}</span><br><span class="undertekst">${escapeHtml(giver(a.giverId)?.navn || '')}</span></span>
        <span class="smal" style="font-size:12px; font-weight:600; color:var(--color-neutral-700)">${statusNavn(a.status)}</span></button>`).join('')}
      <a href="#/soknader" style="padding:10px 14px; font-size:13px; font-weight:600; text-decoration:none">Alle søknader →</a>
    </div>`;
}

function topp(s, fane) {
  const g = giver(s.giverId);
  const detaljer = [
    escapeHtml(g?.navn || 'Ukjent giver'),
    `Frist ${s.frist ? datoFelt(s.frist) : '–'}`,
    `Sendt ${s.sendt ? datoFelt(s.sendt) : '–'}`,
    sistEndret(s),
  ].filter(Boolean).join(' · ');
  return `
    <header class="sidehode" style="padding-top:20px; align-items:flex-start">
      <div style="min-width:0; flex:1 1 380px">
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; position:relative">
          <button type="button" data-handling="velger" title="Bytt søknad" style="display:inline-flex; align-items:center; gap:12px; padding:0 8px 0 0; margin-left:-2px; border:2px solid transparent; background:transparent; cursor:pointer; text-align:left">
            <h1>${escapeHtml(s.tittel || 'Uten tittel')}</h1>
            <span style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border:2px solid var(--color-divider); flex:0 0 auto">${IKON.ned}</span>
          </button>
          ${ui.velger ? velger(s) : ''}
          <span class="merkelapp m-stor m-${s.status}">${statusNavn(s.status)}</span>
        </div>
        <div class="ingress" style="margin-top:8px">${detaljer}</div>
      </div>
      <div class="nokkeltall">
        <div><div class="etikett">Søkt</div><div class="tall">${kr(soktBelop(s))}</div></div>
      </div>
    </header>
    <nav style="flex:0 0 auto; padding:14px 40px 0; display:flex; gap:4px; align-items:center">
      ${FANER.map(([id, navn]) => `<a href="#/soknad/${s.id}/${id}" style="height:36px; display:inline-flex; align-items:center; padding:0 18px; font-weight:600; font-size:15px; text-decoration:none; background:${fane === id ? 'var(--color-surface)' : 'transparent'}; color:${fane === id ? 'var(--color-text)' : 'var(--color-neutral-700)'}">${navn}</a>`).join('')}
    </nav>`;
}

// ——— Søknad-fanen ———

function behovstabell(s) {
  const linjer = linjeliste(s);
  const n = (l, f) => `soknader/${s.id}/linjer.${l.id}.${f}`;
  const finansieres = linjer.filter(l => l.finansieres).length;
  const rader = linjer.map(l => {
    const b = l.behovId ? behovMedId(l.behovId) : null;
    return `
      <tr>
        <td>${l.behovId
          ? `<span class="fet">${escapeHtml(linjetittel(l))}</span>${b?.beskrivelse ? `<div class="celleunder">${escapeHtml(b.beskrivelse)}</div>` : ''}`
          : `<input class="celleinn tekst" ${feltAttr(n(l, 'tittel'), l.tittel)} placeholder="Beskriv linjen">`}</td>
        <td class="tall"><input class="celleinn antall" inputmode="numeric" ${feltAttr(n(l, 'antall'), l.antall, 'tall')}></td>
        <td class="tall"><input class="celleinn" inputmode="numeric" ${feltAttr(n(l, 'estPris'), l.estPris, 'tall')}></td>
        <td class="tall fet">${kr(linjekostnad(l))}</td>
        <td>${avkryss(!!l.finansieres, l.finansieres ? 'Ja' : 'Nei', 'finansieres', `data-linje="${l.id}"`)}</td>
        <td style="width:40px; padding-left:0"><button type="button" class="ikonknapp" data-handling="fjern-linje" data-linje="${l.id}" title="Fjern fra søknaden">${IKON.fjern}</button></td>
      </tr>`;
  }).join('');
  return `
    <div class="tabellramme" data-rull="soknad-behov">
      <table class="liste">
        <thead><tr><th>Behov</th><th class="tall">Antall</th><th class="tall">Est. stk.pris</th><th class="tall">Kostnad</th><th>Finansieres</th><th></th></tr></thead>
        <tbody>${rader || '<tr class="tom-rad"><td colspan="6">Ingen behov i søknaden enda. Legg til fra behovslisten eller som fri linje.</td></tr>'}</tbody>
        <tfoot><tr>
          <td colspan="3" class="dempet">Sum estimert</td>
          <td class="tall sum">${kr(sumEstimert(s))}</td>
          <td colspan="2" class="dempet smal">${finansieres} av ${linjer.length} finansieres</td>
        </tr></tfoot>
      </table>
    </div>`;
}

function dokumenter(s) {
  const dok = Object.entries(s.dokumenter || {}).map(([id, d]) => ({ id, ...d })).sort((a, b) => (a.tid || 0) - (b.tid || 0));
  return `
    <div style="flex:1 1 auto; min-height:140px; display:flex; flex-direction:column; gap:6px">
      <div style="display:flex; justify-content:space-between; align-items:center"><span class="etikett">Dokumenter</span><span class="undertekst">${ui.laster ? 'Laster opp …' : `${dok.length} ${dok.length === 1 ? 'fil' : 'filer'}`}</span></div>
      <div class="valgliste slippsone" data-slipp style="flex:1 1 auto; min-height:0; overflow:auto" data-rull="dokumenter">
        ${dok.map(d => `
          <div style="cursor:default; font-size:14px">
            ${IKON.fil}
            <button type="button" data-handling="apne-dok" data-id="${d.id}" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; border:0; background:transparent; padding:0; text-align:left; cursor:pointer" title="Åpne">${escapeHtml(d.navn)}</button>
            <span class="undertekst smal">${escapeHtml(fornavn(d.lastetOppAv?.navn, d.lastetOppAv?.epost))} · ${tidspunkt(d.tid)}</span>
            <button type="button" class="ikonknapp" style="width:24px; height:24px" data-handling="slett-dok" data-id="${d.id}" title="Slett dokumentet">${IKON.fjern}</button>
          </div>`).join('')}
        <label style="font-size:14px; font-weight:600; padding:12px">${IKON.pluss}Last opp fil<span style="font-weight:400; color:var(--color-neutral-600)">· eller slipp her</span>
          <input type="file" multiple hidden></label>
      </div>
      <span class="undertekst">F.eks. søknadsteksten, budsjett og tilsagnsbrev.</span>
    </div>`;
}

function soknadsfane(s) {
  const n = f => `soknader/${s.id}/${f}`;
  const forslag = sumEstimert(s);
  const overstyrt = s.soktOverstyrt != null;
  const givere = [...tilstand.givere].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
  return `
    <div style="flex:1 1 auto; min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:0 28px">
      <div style="min-height:0; display:flex; flex-direction:column; gap:12px">
        <div class="verktoyrad">
          <div class="etikett">Behov i søknaden</div>
          <div class="grupper">
            <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="skriv-ut">Skriv ut</button>
            <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="fra-listen">+ Behov fra listen</button>
            <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="fri-linje">+ Fri linje</button>
          </div>
        </div>
        ${behovstabell(s)}
        <div class="tre-kol" style="flex:0 0 auto">
          <label class="felt"><span class="etikett">Søkt beløp</span>
            <input class="inndata tall" style="text-align:left" inputmode="numeric" ${feltAttr(n('soktOverstyrt'), soktBelop(s), 'tall')}>
            <span class="undertekst">${overstyrt ? `Overstyrt. Foreslått ${kr(forslag)} – tøm feltet for å bruke forslaget.` : 'Foreslått: sum av estimatene'}</span>
          </label>
        </div>
      </div>
      <div style="min-height:0; display:flex; flex-direction:column; gap:14px; border-left:2px solid var(--color-divider); padding-left:24px; overflow:auto">
        <label class="felt"><span class="etikett">Giver</span>
          <select class="inndata" data-felt="${n('giverId')}" data-verdi="${s.giverId}">
            ${givere.map(g => `<option value="${g.id}" ${g.id === s.giverId ? 'selected' : ''}>${escapeHtml(g.navn || 'Uten navn')}</option>`).join('')}
          </select>
        </label>
        <label class="felt"><span class="etikett">Tittel</span><input class="inndata" ${feltAttr(n('tittel'), s.tittel, 'tekst', { paakrevd: true })}></label>
        <div class="to-kol" style="gap:14px">
          <label class="felt"><span class="etikett">Frist</span><input class="inndata" placeholder="dd.mm.åååå" ${feltAttr(n('frist'), s.frist, 'dato')}></label>
          <label class="felt"><span class="etikett">Sendt</span><input class="inndata" placeholder="dd.mm.åååå" ${feltAttr(n('sendt'), s.sendt, 'dato')}></label>
        </div>
        <div class="felt"><span class="etikett">Status</span>
          <div class="segment fyll">${SOKNADSSTATUSER.map(st => `<button type="button" data-handling="status" data-id="${st.id}" aria-pressed="${s.status === st.id}">${st.navn}</button>`).join('')}</div>
        </div>
        ${avkryss(!!s.revisjon, 'Revisjon på denne søknaden', 'revisjon')}
        ${dokumenter(s)}
      </div>
    </div>`;
}

function fraListenPanel(s) {
  const valg = velgbareBehov(tilstand.behov, tilstand.soknader, s)
    .sort((a, b) => (a.behov.tittel || '').localeCompare(b.behov.tittel || '', 'nb'));
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Behov fra listen</h2><div class="ingress" style="margin-top:4px">Åpne behov som ikke er med i søknaden. Antall settes til det som gjenstår.</div></div>
      ${lukkeknapp()}
    </div>
    <div style="display:flex; flex-direction:column; gap:8px">
      ${valg.map(({ behov: b, info }) => `
        <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--color-neutral-200)">
          <div style="flex:1; min-width:0">
            <div class="fet">${escapeHtml(b.tittel || 'Uten tittel')}</div>
            <div class="dempet">Gjenstår ${info.gjenstar} av ${info.total} · est. ${kr(b.estPris)} kr/stk</div>
          </div>
          <button type="button" class="knapp knapp-primar knapp-liten" data-handling="legg-til" data-id="${b.id}">Legg til</button>
        </div>`).join('') || '<div class="dempet">Ingen åpne behov å velge. Nye behov legges inn under Behov.</div>'}
    </div>`, { nytt: ui.nyttPanel });
}

function skrivUt(s) {
  const rader = linjeliste(s).map(l => `<tr><td>${escapeHtml(linjetittel(l))}</td><td class="n">${l.antall ?? 0}</td><td class="n">${kr(l.estPris)}</td><td class="n">${kr(linjekostnad(l))}</td></tr>`).join('');
  utskrift(s.tittel || 'Søknad', `<p>${escapeHtml(giver(s.giverId)?.navn || '')} · Behovsliste · skrevet ut ${new Date().toLocaleDateString('nb-NO')}</p>
    <table><thead><tr><th>Behov</th><th class="n">Antall</th><th class="n">Est. stk.pris</th><th class="n">Kostnad</th></tr></thead>
    <tbody>${rader}</tbody><tfoot><tr><td colspan="3">Sum estimert</td><td class="n">${kr(sumEstimert(s))}</td></tr></tfoot></table>`);
}

function gjeldende() {
  return tilstand.soknader.find(s => s.id === ui.soknadId);
}

export const soknadSide = {
  meny: 'soknader',

  tegn([id, fane = 'soknad'] = []) {
    if (id !== ui.soknadId) { ui.soknadId = id; ui.panel = null; ui.velger = false; }
    const s = gjeldende();
    if (!s) return `<div class="laster">Fant ikke søknaden. <a href="#/soknader" style="margin-left:6px">Til alle søknader</a></div>`;
    const aktivFane = FANER.some(([f]) => f === fane) ? fane : 'soknad';
    const html = `
      ${topp(s, aktivFane)}
      <main class="innhold" style="padding-top:12px">
        ${aktivFane === 'soknad' ? soknadsfane(s) : `<div class="laster">${KOMMER[aktivFane]}</div>`}
      </main>
      ${ui.panel === 'fra-listen' ? fraListenPanel(s) : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  // Giveren styrer momsprosenten: bytter man giver, arves prosenten på nytt.
  // Søkt beløp lik forslaget (eller tomt) betyr «ikke overstyrt».
  forLagring(samling, id, sti, verdi) {
    if (samling !== 'soknader') return null;
    const s = tilstand.soknader.find(x => x.id === id);
    if (sti === 'giverId') {
      const g = giver(verdi);
      return { giverId: verdi, momsProsent: g?.momsTrekk ? (g.momsProsent ?? 0) : null };
    }
    if (sti === 'soktOverstyrt' && s && (verdi == null || verdi === sumEstimert(s))) return { soktOverstyrt: null };
    return null;
  },

  klikkOveralt(e) {
    if (ui.velger && !e.target.closest('.velgerliste, [data-handling="velger"]')) { ui.velger = false; tegn(); }
  },

  async klikk(handling, el) {
    const s = gjeldende();
    if (!s) return;
    const linje = el.dataset.linje;
    switch (handling) {
      case 'velger': ui.velger = !ui.velger; tegn(); break;
      case 'bytt': ui.velger = false; gaaTil(`#/soknad/${el.dataset.id}`); tegn(); break;
      case 'lukk-panel': ui.panel = null; tegn(); break;
      case 'skriv-ut': skrivUt(s); break;
      case 'fra-listen': ui.panel = 'fra-listen'; ui.nyttPanel = true; tegn(); break;
      case 'legg-til': {
        const b = behovMedId(el.dataset.id);
        const info = velgbareBehov(tilstand.behov, tilstand.soknader, s).find(x => x.behov.id === b?.id)?.info;
        if (b && info) lagre(() => leggBehovISoknad(s, b, info.gjenstar));
        break;
      }
      case 'fri-linje': {
        const linjeId = await lagre(() => leggFriLinjeISoknad(s));
        if (linjeId) { fokuser(`soknader/${s.id}/linjer.${linjeId}.tittel`); tegn(); }
        break;
      }
      case 'fjern-linje': lagre(() => fjernLinje(s.id, linje)); break;
      case 'finansieres': lagre(() => oppdaterLinje(s.id, linje, { finansieres: !s.linjer[linje]?.finansieres })); break;
      case 'status': lagre(() => oppdaterSoknad(s.id, { status: el.dataset.id })); break;
      case 'revisjon': lagre(() => oppdaterSoknad(s.id, { revisjon: !s.revisjon })); break;
      case 'apne-dok': {
        const d = s.dokumenter?.[el.dataset.id];
        if (!d) break;
        const vindu = window.open('', '_blank'); // åpnes før await, ellers stopper popup-blokkeringen det
        try { const url = await dokumentUrl(d.sti); if (vindu) vindu.location = url; }
        catch (err) { console.error(err); vindu?.close(); alert('Kunne ikke åpne dokumentet.'); }
        break;
      }
      case 'slett-dok': {
        const d = s.dokumenter?.[el.dataset.id];
        if (d && confirm(`Slette «${d.navn}»?`)) lagre(() => slettDokument(s.id, el.dataset.id, d.sti));
        break;
      }
    }
  },

  async filer(el, filer) {
    const s = gjeldende();
    if (!s || !filer.length) return;
    ui.laster++;
    tegn();
    for (const fil of filer) await lagre(() => lastOppDokument(s.id, fil));
    ui.laster--;
    if (el.type === 'file') el.value = '';
    tegn();
  },

  escape() {
    if (ui.velger) { ui.velger = false; return true; }
    if (ui.panel) { ui.panel = null; return true; }
    return false;
  },
};
