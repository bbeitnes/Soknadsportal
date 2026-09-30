// Én søknad: fast topp + faner. Trinn a: Søknad-fanen (behov, søkt beløp,
// grunndata, status, revisjon av/på og dokumenter). Innkjøp, Utgifter og
// Revisjon kommer i senere trinn.
import {
  tilstand, oppdaterSoknad, oppdaterLinje, leggBehovISoknad, leggFriLinjeISoknad, fjernLinje,
  lastOppDokument, slettDokument, dokumentUrl, slettSoknad, innkjopFor,
  leggTilUtgift, oppdaterUtgift, fjernUtgift,
} from '../data/index.js';
import {
  SOKNADSSTATUSER, statusNavn, linjeliste, linjekostnad, sumEstimert, soktBelop, soktForslag, velgbareBehov,
  pott, giverandel, momsProsent, utgiftsliste, sumUtgifter, sumFakturert,
} from '../data/beregning.js';
import { escapeHtml, kr, datoFelt, tidspunkt, fornavn, tolkTall, tolkDato } from '../ui/format.js';
import { feltAttr } from '../ui/felt.js';
import { lagre, visMelding } from '../ui/lagring.js';
import { tegn, fokuser, gaaTil, avkryss, sidepanel, lukkeknapp, IKON } from '../ui/visning.js';
import { utskrift } from '../ui/utskrift.js';
import { innkjopFane } from './innkjop.js';
import { revisjonFane } from './revisjon.js';

const FANER = [['soknad', 'Søknad'], ['innkjop', 'Innkjøp'], ['utgifter', 'Utgifter'], ['revisjon', 'Revisjon']];

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
      ${pottlinje(s)}
    </header>
    <nav style="flex:0 0 auto; padding:14px 40px 0; display:flex; gap:4px; align-items:center">
      ${FANER.map(([id, navn]) => `<a href="#/soknad/${s.id}/${id}" style="height:36px; display:inline-flex; align-items:center; padding:0 18px; font-weight:600; font-size:15px; text-decoration:none; background:${fane === id ? 'var(--color-surface)' : 'transparent'}; color:${fane === id ? 'var(--color-text)' : 'var(--color-neutral-700)'}">${navn}</a>`).join('')}
    </nav>`;
}

// Pottlinjen: søkt / innvilget / disponert / gjenstår. Med momskompensasjon
// er «disponert» giverens andel, og en linje under viser full kostnad og
// hva som forventes fra momskompensasjonen neste år.
function pottlinje(s) {
  const p = pott(s, innkjopFor(s.id));
  const strek = '–';
  const negativ = p.gjenstar != null && p.gjenstar < 0;
  return `
    <div>
      <div class="nokkeltall">
        <div><div class="etikett">Søkt</div><div class="tall">${kr(p.sokt)}</div></div>
        <div><div class="etikett">Innvilget</div><div class="tall">${p.innvilget == null ? strek : kr(p.innvilget)}</div></div>
        <div><div class="etikett">${p.harMoms ? 'Disponert (giverandel)' : 'Disponert'}</div><div class="tall">${kr(p.disponert)}</div></div>
        <div><div class="etikett">Fakturert</div><div class="tall">${kr(sumFakturert(tilstand.fakturaer, s.id))}</div></div>
        <div><div class="etikett">Gjenstår</div><div class="tall ${negativ ? 'aksent' : ''}">${p.gjenstar == null ? strek : kr(p.gjenstar)}</div></div>
      </div>
      ${p.harMoms ? `<div class="hint" style="margin-top:8px">Giver dekker ${p.giverProsent} % av det vi faktisk betaler (${kr(p.disponertFull)}). Momskompensasjon ${p.prosent} %: <span style="color:var(--color-text); font-variant-numeric:tabular-nums">${kr(p.moms)}</span>, forventes mottatt neste år.</div>` : ''}
    </div>`;
}

// ——— Søknad-fanen ———

function behovstabell(s) {
  const linjer = linjeliste(s);
  const prosent = momsProsent(s);
  const moms = prosent != null;
  const n = (l, f) => `soknader/${s.id}/linjer.${l.id}.${f}`;
  const finansieres = linjer.filter(l => l.finansieres).length;
  const sum = sumEstimert(s), sumGiver = giverandel(sum, prosent);
  const rader = linjer.map(l => {
    const b = l.behovId ? behovMedId(l.behovId) : null;
    const kostnad = linjekostnad(l), fraGiver = giverandel(kostnad, prosent);
    return `
      <tr>
        <td>${l.behovId
          ? `<span class="fet">${escapeHtml(linjetittel(l))}</span>${b?.beskrivelse ? `<div class="celleunder">${escapeHtml(b.beskrivelse)}</div>` : ''}`
          : `<input class="celleinn tekst" ${feltAttr(n(l, 'tittel'), l.tittel)} placeholder="Beskriv linjen">`}</td>
        <td class="tall"><input class="celleinn antall" inputmode="numeric" ${feltAttr(n(l, 'antall'), l.antall, 'tall')}></td>
        <td class="tall"><input class="celleinn" inputmode="numeric" ${feltAttr(n(l, 'estPris'), l.estPris, 'tall')}></td>
        <td class="tall fet">${kr(kostnad)}</td>
        ${moms ? `<td class="tall">${kr(fraGiver)}</td><td class="tall dempet">${kr(kostnad - fraGiver)}</td>` : ''}
        <td>${avkryss(!!l.finansieres, l.finansieres ? 'Ja' : 'Nei', 'finansieres', `data-linje="${l.id}"`)}</td>
        <td style="width:40px; padding-left:0"><button type="button" class="ikonknapp" data-handling="fjern-linje" data-linje="${l.id}" title="Fjern fra søknaden">${IKON.fjern}</button></td>
      </tr>`;
  }).join('');
  const kolonner = moms ? 8 : 6;
  return `
    <div class="tabellramme" data-rull="soknad-behov">
      <table class="liste">
        <thead><tr>
          <th>Behov</th><th class="tall">Antall</th><th class="tall">Est. stk.pris</th><th class="tall">Kostnad</th>
          ${moms ? `<th class="tall">Fra giver (${100 - prosent} %)</th><th class="tall">Fra momskomp. (${prosent} %)</th>` : ''}
          <th>Finansieres</th><th></th>
        </tr></thead>
        <tbody>${rader || `<tr class="tom-rad"><td colspan="${kolonner}">Ingen behov i søknaden enda. Legg til fra behovslisten eller som fri linje.</td></tr>`}</tbody>
        <tfoot><tr>
          <td colspan="3" class="dempet">Sum estimert</td>
          <td class="tall sum">${kr(sum)}</td>
          ${moms ? `<td class="tall sum">${kr(sumGiver)}</td><td class="tall fet dempet">${kr(sum - sumGiver)}<div class="undertekst" style="font-weight:400">forventes mottatt neste år</div></td>` : ''}
          <td colspan="2" class="dempet smal">${finansieres} av ${linjer.length} finansieres</td>
        </tr></tfoot>
      </table>
    </div>`;
}

// Hint under «Innvilget beløp»: er estimatet (giverandelen) over eller under?
function innvilgetHint(s) {
  const p = pott(s, innkjopFor(s.id));
  if (p.innvilget == null) return 'Fylles inn når svaret kommer';
  const estimat = soktForslag(s);
  const hva = p.harMoms ? 'Estimatet (giverandel)' : 'Estimatet';
  if (estimat > p.innvilget) return `${hva} er ${kr(estimat - p.innvilget)} over innvilget – juster antall`;
  if (estimat < p.innvilget) return `${kr(p.innvilget - estimat)} til overs mot estimatet`;
  return 'Innvilget som søkt';
}

// ——— Utgifter-fanen ———

function utgiftsfane(s) {
  const liste = utgiftsliste(s);
  const n = (u, f) => `soknader/${s.id}/utgifter.${u.id}.${f}`;
  const rader = liste.map(u => `
    <tr>
      <td><input class="celleinn tekst" style="font-weight:400" ${feltAttr(n(u, 'beskrivelse'), u.beskrivelse, 'tekst', { paakrevd: true })}></td>
      <td><input class="celleinn tekst" style="min-width:110px; font-weight:400" placeholder="dd.mm.åååå" ${feltAttr(n(u, 'dato'), u.dato, 'dato')}></td>
      <td class="tall"><input class="celleinn" style="width:110px; font-weight:600" inputmode="numeric" ${feltAttr(n(u, 'belop'), u.belop, 'tall')}></td>
      <td class="smal dempet">${escapeHtml(fornavn(u.lagtInnAv?.navn, u.lagtInnAv?.epost))}</td>
      <td style="width:44px; padding-left:0; text-align:center"><button type="button" class="ikonknapp" data-handling="fjern-utgift" data-id="${u.id}" title="Slett utgiften">${IKON.fjern}</button></td>
    </tr>`).join('');
  return `
    <div class="verktoyrad">
      <div class="etikett">Løse utgifter</div>
      <div class="hint">Trekkes fra potten. Kobles til faktura under Revisjon.</div>
    </div>
    <div class="tabellramme" data-rull="utgifter" style="flex:0 1 auto">
      <table class="liste">
        <thead><tr><th>Beskrivelse</th><th style="width:130px">Dato</th><th class="tall" style="width:140px">Beløp</th><th style="width:150px">Lagt inn av</th><th style="width:44px"></th></tr></thead>
        <tbody>
          ${rader}
          <tr class="ny-utgift">
            <td><input class="celleinn tekst ny" id="ny-utgift-beskrivelse" placeholder="Ny utgift – beskrivelse"></td>
            <td><input class="celleinn tekst ny" id="ny-utgift-dato" placeholder="dd.mm.åååå"></td>
            <td class="tall"><input class="celleinn ny" id="ny-utgift-belop" inputmode="numeric" placeholder="0" style="width:110px"></td>
            <td colspan="2" class="undertekst">Lagres når beskrivelse og beløp er fylt ut</td>
          </tr>
        </tbody>
        <tfoot><tr>
          <td colspan="2" class="dempet">Sum løse utgifter</td>
          <td class="tall sum">${kr(sumUtgifter(s))}</td>
          <td colspan="2" class="dempet">${liste.length} ${liste.length === 1 ? 'utgift' : 'utgifter'}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

// Den nederste raden er alltid en tom ny utgift. Den lagres når man forlater
// raden og både beskrivelse og beløp er fylt ut.
async function lagreNyUtgift(s) {
  const felt = ['beskrivelse', 'dato', 'belop'].map(f => document.getElementById(`ny-utgift-${f}`));
  if (felt.some(el => !el)) return;
  const [b, d, k] = felt;
  const beskrivelse = b.value.trim(), belop = tolkTall(k.value), dato = tolkDato(d.value);
  if (!beskrivelse || belop == null) return;
  if (Number.isNaN(belop)) { visMelding(`«${k.value}» er ikke et gyldig beløp`); return; }
  if (Number.isNaN(dato)) { visMelding(`«${d.value}» er ikke en gyldig dato (dd.mm.åååå)`); return; }
  // Tøm raden FØR lagringen, så et nytt focusout underveis finner en tom rad
  // og ikke lagrer den samme utgiften én gang til.
  const gamle = felt.map(el => el.value);
  felt.forEach(el => { el.value = ''; });
  const id = await lagre(() => leggTilUtgift(s, { beskrivelse, belop, dato }));
  if (id) tegn();
  else felt.forEach((el, i) => { el.value = gamle[i]; });
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
  const forslag = soktForslag(s);
  const overstyrt = s.soktOverstyrt != null;
  const p = pott(s, innkjopFor(s.id));
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
            <span class="undertekst">${overstyrt ? `Overstyrt. Foreslått ${kr(forslag)} – tøm feltet for å bruke forslaget.` : (p.harMoms ? `Foreslått: giverens andel (${p.giverProsent} %) av estimatet` : 'Foreslått: sum av estimatene')}</span>
          </label>
          <label class="felt"><span class="etikett">Innvilget beløp</span>
            <input class="inndata tall" style="text-align:left" inputmode="numeric" ${feltAttr(n('innvilget'), s.innvilget, 'tall')}>
            <span class="undertekst">${escapeHtml(innvilgetHint(s))}</span>
          </label>
          ${p.harMoms ? `
          <label class="felt"><span class="etikett">Momskompensasjon</span>
            <div style="display:flex; align-items:center; gap:8px"><input class="inndata prosent" style="height:36px; font-size:16px" inputmode="numeric" ${feltAttr(n('momsProsent'), p.prosent, 'prosent')}><span>%</span></div>
            <span class="undertekst">Arvet fra giveren, kan justeres her</span>
          </label>` : ''}
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
        <div style="display:flex; justify-content:flex-end; flex:0 0 auto"><button type="button" class="knapp knapp-fare" data-handling="slett-soknad">Slett søknad</button></div>
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
    if (id !== ui.soknadId) { ui.soknadId = id; ui.panel = null; ui.velger = false; innkjopFane.forlat(); revisjonFane.forlat(); }
    if (fane !== 'innkjop') innkjopFane.forlat();
    if (fane !== 'revisjon') revisjonFane.forlat();
    const s = gjeldende();
    if (!s) return `<div class="laster">Fant ikke søknaden. <a href="#/soknader" style="margin-left:6px">Til alle søknader</a></div>`;
    const aktivFane = FANER.some(([f]) => f === fane) ? fane : 'soknad';
    const html = `
      ${topp(s, aktivFane)}
      <main class="innhold" style="padding-top:12px">
        ${aktivFane === 'soknad' ? soknadsfane(s) : aktivFane === 'utgifter' ? utgiftsfane(s) : aktivFane === 'innkjop' ? innkjopFane.tegn(s) : revisjonFane.tegn(s)}
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
    if (sti === 'soktOverstyrt' && s && (verdi == null || verdi === soktForslag(s))) return { soktOverstyrt: null };
    // Tomt momsfelt betyr 0 %, ikke «ingen innstilling» — den styres av giveren.
    if (sti === 'momsProsent' && verdi == null) return { momsProsent: 0 };
    return null;
  },

  // Den tomme utgiftsraden har ikke data-felt; den lagres når man forlater
  // et av feltene i raden.
  dobbeltklikk(el, e) { const s = gjeldende(); if (s) innkjopFane.dobbeltklikk(el, e, s); },
  limInn(el, tekst, e) { const s = gjeldende(); if (s) innkjopFane.limInn(el, tekst, e, s); },

  fokusUt(el, e) {
    const s = gjeldende();
    if (!s) return;
    if (innkjopFane.fokusUt(el, e, s)) return;
    if (!el.id?.startsWith('ny-utgift-')) return;
    // relatedTarget er feltet som får fokus; innenfor raden gjør vi ingenting.
    if (e.relatedTarget?.id?.startsWith('ny-utgift-')) return;
    lagreNyUtgift(s);
  },

  klikkOveralt(e) {
    if (ui.velger && !e.target.closest('.velgerliste, [data-handling="velger"]')) { ui.velger = false; tegn(); }
  },

  async klikk(handling, el, e) {
    const s = gjeldende();
    if (!s) return;
    if (location.hash.includes('/innkjop') && await innkjopFane.klikk(handling, el, e, s)) return;
    if (location.hash.includes('/revisjon') && await revisjonFane.klikk(handling, el, e, s)) return;
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
      case 'fjern-utgift': lagre(() => fjernUtgift(s.id, el.dataset.id)); break;
      case 'slett-soknad': {
        const antallUtgifter = utgiftsliste(s).length;
        const antallFakturaer = tilstand.fakturaer.filter(f => f.soknadId === s.id).length;
        const hva = [linjeliste(s).length && `${linjeliste(s).length} behov`, antallUtgifter && `${antallUtgifter} utgifter`, Object.keys(s.dokumenter || {}).length && `${Object.keys(s.dokumenter).length} dokumenter`, antallFakturaer && `${antallFakturaer} fakturaer`].filter(Boolean).join(', ');
        if (!confirm(`Slette søknaden «${s.tittel || 'Uten tittel'}»?${hva ? `\n\nDen har ${hva}. Behovene forblir i behovslisten.` : ''}\n\nDette kan ikke angres.`)) break;
        const ok = await lagre(() => slettSoknad(s).then(() => true));
        if (ok) gaaTil('#/soknader');
        break;
      }
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
    if (await innkjopFane.filer(el, filer, s)) return;
    if (await revisjonFane.filer(el, filer, s)) return;
    ui.laster++;
    tegn();
    for (const fil of filer) await lagre(() => lastOppDokument(s.id, fil));
    ui.laster--;
    if (el.type === 'file') el.value = '';
    tegn();
  },

  escape() {
    if (innkjopFane.escape()) return true;
    if (revisjonFane.escape()) return true;
    if (ui.velger) { ui.velger = false; return true; }
    if (ui.panel) { ui.panel = null; return true; }
    return false;
  },
};
