// Én søknad: fast topp + faner. Trinn a: Søknad-fanen (behov, søkt beløp,
// grunndata, status, revisjon av/på og dokumenter). Innkjøp, Utgifter og
// Revisjon kommer i senere trinn.
import {
  tilstand, oppdaterSoknad, leggBehovISoknad, leggFlereBehovISoknad, leggFriLinjeISoknad, fjernLinje,
  lastOppDokument, slettDokument, dokumentUrl, slettSoknad, innkjopFor,
  leggTilUtgift, oppdaterUtgift, fjernUtgift,
  fellesTyperekkefolge, settLinjerekkefolge, settSoknadTyperekkefolge, anskaffet, erRevisor, settRevisor, revisorfelt,
} from '../data/index.js';
import {
  SOKNADSSTATUSER, statusNavn, linjeliste, linjekostnad, sumEstimert, soktBelop, soktForslag, velgbareBehov,
  pott, giverandel, momsProsent, utgiftsliste, sumUtgifter, sumFakturert,
  egenandelPlanlagt, egenandelSomAndel, giverbehov, erLast, erInnvilget,
  linjetype, grupperPerType, typeliste, flyttIListe, typerekkefolgeFor, soktLinjer, tilleggslinjer, etterRekkefolgeOgTittel,
} from '../data/beregning.js';
import { escapeHtml, kr, belop, heltall, datoFelt, tidspunkt, fornavn, tolkBelop, tolkDato } from '../ui/format.js';
import { feltAttr } from '../ui/felt.js';
import { lagre, visMelding } from '../ui/lagring.js';
import { tegn, fokuser, gaaTil, avkryss, sidepanel, lukkeknapp, IKON } from '../ui/visning.js';
import { utskrift } from '../ui/utskrift.js';
import { innkjopFane } from './innkjop.js';
import { revisjonFane } from './revisjon.js';

const FANER = [['soknad', 'Søknad'], ['innkjop', 'Innkjøp'], ['utgifter', 'Utgifter'], ['revisjon', 'Revisjon']];

const ui = { soknadId: null, panel: null, nyttPanel: false, velger: false, laster: 0, leggerTil: false };

const giver = id => tilstand.givere.find(g => g.id === id);

// Hengelåsen (erLast): det vi søkte om er skrivebeskyttet når søknaden ikke
// lenger er et utkast. Linjer lagt til etter søknaden er ikke låst.
const LAST_TITTEL = 'Låst: søknaden er sendt. Sett status tilbake til Utkast for å endre.';
const skrivevern = last => last ? ` readonly title="${LAST_TITTEL}"` : '';
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
      ${FANER.map(([id, navn]) => `<a href="#/soknad/${s.id}/${id}" style="height:36px; display:inline-flex; align-items:center; padding:0 18px; font-weight:600; font-size:15px; text-decoration:none; background:${fane === id ? 'var(--color-surface)' : 'transparent'}; color:${fane === id ? 'var(--color-text)' : 'var(--color-neutral-700)'}"${id === 'soknad' && erLast(s) ? ` title="${LAST_TITTEL}"` : ''}>${navn}${id === 'soknad' && erLast(s) ? `<span style="display:inline-flex; margin-left:8px">${IKON.las}</span>` : ''}</a>`).join('')}
    </nav>`;
}

// Pottlinjen: søkt / innvilget / disponert / gjenstår. Med egne midler er
// rammen innvilget + egne midler, og «disponert» og «gjenstår» gjelder rammen.
// Med momskompensasjon eller egne midler viser linjen under regnestykket: hva
// vi betaler, og hvem som dekker det.
function pottlinje(s) {
  const p = pott(s, innkjopFor(s.id));
  const strek = '–';
  const negativ = p.gjenstar != null && p.gjenstar < 0;
  const egne = p.egne > 0, lovet = p.egenandel > 0;
  const tall = n => `<span style="color:var(--color-text); font-variant-numeric:tabular-nums">${kr(n)}</span>`;
  const deler = [
    egne ? `egne midler ${tall(p.egenBrukt)}` : '',
    p.harMoms || egne ? `giver${p.harMoms ? ` ${p.giverProsent} %${egne ? ' av resten' : ''}` : ''} ${tall(p.disponert)}` : '',
    p.harMoms ? `momskompensasjon ${p.prosent} % ${tall(p.moms)}, som forventes mottatt neste år` : '',
  ].filter(Boolean).join(' + ');
  // Egenandelen bestemmer rammen. Ligger det et annet beløp på varene, sier vi fra.
  const plassert = !lovet || p.fordelt === p.egenandel ? ''
    : p.fordelt > p.egenandel ? ` <span class="aksent">Det ligger ${kr(p.fordelt)} i egne midler på varene – ${kr(p.fordelt - p.egenandel)} mer enn egenandelen. Rammen følger egenandelen.</span>`
      : ` Av egenandelen er ${tall(p.fordelt)} plassert på varer.`;
  return `
    <div>
      <div class="nokkeltall" ${egne ? 'style="column-gap:24px"' : ''}>
        <div><div class="etikett">Søkt</div><div class="tall">${kr(p.sokt)}</div></div>
        <div><div class="etikett">Innvilget</div><div class="tall">${p.innvilget == null ? strek : kr(p.innvilget)}</div></div>
        ${egne ? `<div title="${lovet ? 'Egenandelen på søknaden' : 'Egne midler lagt på varer i Innkjøp'}"><div class="etikett">${lovet ? 'Egenandel' : 'Egne midler'}</div><div class="tall">${kr(p.egne)}</div></div>
        <div title="Innvilget + ${lovet ? 'egenandel' : 'egne midler'}"><div class="etikett">Ramme</div><div class="tall">${p.ramme == null ? strek : kr(p.ramme)}</div></div>` : ''}
        <div title="${egne ? 'Brukt av rammen: egne midler + det som belaster giveren' : 'Det som belaster giveren'}"><div class="etikett">${egne ? 'Disponert' : p.harMoms ? 'Disponert (giverandel)' : 'Disponert'}</div><div class="tall">${kr(egne ? p.disponertRamme : p.disponert)}</div></div>
        <div><div class="etikett">Fakturert</div><div class="tall">${kr(sumFakturert(tilstand.fakturaer, s.id))}</div></div>
        <div ${egne ? 'title="Ramme − disponert"' : ''}><div class="etikett">Gjenstår</div><div class="tall ${negativ ? 'aksent' : ''}">${p.gjenstar == null ? strek : kr(p.gjenstar)}</div></div>
      </div>
      ${deler ? `<div class="hint" style="margin-top:8px">Vi betaler ${kr(p.disponertFull)}: ${deler}.${plassert}</div>` : ''}
    </div>`;
}

// Revisor ser ikke fanene og kan ikke bytte til andre søknader: bare
// tittelen, pottlinjen og dokumentene på søknaden (som kan åpnes).
function revisortopp(s) {
  const g = giver(s.giverId);
  const dok = Object.entries(s.dokumenter || {}).map(([id, d]) => ({ id, ...d })).sort((a, b) => (a.tid || 0) - (b.tid || 0));
  return `
    <header class="sidehode" style="padding-top:20px; align-items:flex-start">
      <div style="min-width:0; flex:1 1 380px">
        <a href="#/revisor" class="hint" style="text-decoration:none; font-weight:600">‹ Søknadene du reviderer</a>
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:4px">
          <h1>${escapeHtml(s.tittel || 'Uten tittel')}</h1>
          <span class="merkelapp m-stor m-${s.status}">${statusNavn(s.status)}</span>
        </div>
        <div class="ingress" style="margin-top:8px">${escapeHtml(g?.navn || 'Ukjent giver')} · Sendt ${s.sendt ? datoFelt(s.sendt) : '–'}</div>
        <div class="hint" style="margin-top:8px; display:flex; align-items:center; gap:6px 14px; flex-wrap:wrap"><span class="etikett">Dokumenter</span>${dok.map(d => `<button type="button" data-handling="apne-dok" data-id="${d.id}" title="Åpne" style="display:inline-flex; align-items:center; gap:6px; border:0; background:transparent; padding:0; cursor:pointer; font-size:13px; font-weight:600; color:var(--color-text)">${IKON.fil}${escapeHtml(d.navn)}</button>`).join('') || 'Ingen dokumenter på søknaden.'}</div>
      </div>
      ${pottlinje(s)}
    </header>`;
}

// Revisorene på søknaden: de med rollen Revisor kan krysses av. Bare de som
// er krysset av her, ser søknaden.
function revisorvalg(s) {
  const revisorer = tilstand.brukere.filter(b => b.rolle === 'revisor').sort((a, b) => (a.navn || a.epost).localeCompare(b.navn || b.epost, 'nb'));
  const tildelt = new Set(s.tilgang || []);
  return `
    <div class="felt"><span class="etikett">Revisorer</span>
      ${revisorer.length ? `<div class="valgliste">${revisorer.map(b => `<button type="button" data-handling="revisor" data-id="${escapeHtml(b.epost)}" aria-pressed="${tildelt.has(b.epost)}"><span class="boks ${tildelt.has(b.epost) ? 'pa' : ''}" style="width:16px; height:16px">${IKON.hak}</span><span class="fyll">${escapeHtml(b.navn || b.epost)}</span></button>`).join('')}</div>
      <span class="undertekst">Revisorene ser bare søknadene de er krysset av på, og godkjenner under Revisjon når søknaden er Avsluttet.</span>`
      : '<span class="undertekst">Ingen har rollen Revisor. En administrator inviterer revisorer under Innstillinger → Brukere.</span>'}
    </div>`;
}

async function apneDokument(s, id) {
  const d = s.dokumenter?.[id];
  if (!d) return;
  const vindu = window.open('', '_blank'); // åpnes før await, ellers stopper popup-blokkeringen det
  try { const url = await dokumentUrl(d.sti); if (vindu) vindu.location = url; }
  catch (err) { console.error(err); vindu?.close(); alert('Kunne ikke åpne dokumentet.'); }
}

// ——— Søknad-fanen ———

function behovstabell(s) {
  const linjer = soktLinjer(s), tillegg = tilleggslinjer(s);
  const prosent = momsProsent(s);
  const moms = prosent != null;
  const n = (l, f) => `soknader/${s.id}/linjer.${l.id}.${f}`;
  const sum = sumEstimert(s), sumGiver = giverandel(sum, prosent);
  // Med egenandel står det vi søker om (estimatet minus egenandelen) under summen.
  const egen = egenandelPlanlagt(s), etterEgen = Math.max(0, sum - egen), etterEgenGiver = giverandel(etterEgen, prosent);
  const under = tekst => egen ? `<div class="undertekst" style="font-weight:400">${tekst}</div>` : '';
  const last = erLast(s);
  const rad = l => {
    const b = l.behovId ? behovMedId(l.behovId) : null;
    const kostnad = linjekostnad(l), fraGiver = giverandel(kostnad, prosent);
    const arvet = (b?.type || '').trim();
    // Låst søknad: linjene vi søkte om er skrivebeskyttet.
    const vern = skrivevern(last && !l.etterSoknad);
    // Linjer lagt til etter søknaden har et notat i stedet for drahåndtak;
    // de står i den rekkefølgen de ble lagt til.
    return `
      <tr ${l.etterSoknad || last ? '' : `data-slippmal="linje:${l.id}"`}>
        <td><div style="display:flex; align-items:center">${l.etterSoknad || last ? '<span class="dra" style="visibility:hidden">⠿</span>' : `<span class="dra" draggable="true" data-dra="linje:${l.id}" title="Dra for å endre rekkefølge, eller flytt til en annen type">⠿</span>`}<div style="min-width:0; flex:1">${l.behovId
          ? `<span class="fet">${escapeHtml(linjetittel(l))}</span>${b?.beskrivelse ? `<div class="celleunder">${escapeHtml(b.beskrivelse)}</div>` : ''}`
          : `<input class="celleinn tekst" ${feltAttr(n(l, 'tittel'), l.tittel)} placeholder="Beskriv linjen"${vern}>`}${l.etterSoknad
          ? `<input class="celleinn tekst notat" title="${escapeHtml(l.notat || 'Hvorfor ble dette lagt til?')}" ${feltAttr(n(l, 'notat'), l.notat)} placeholder="Notat – f.eks. «i stedet for klarinett»">` : ''}</div></div></td>
        <td><input class="celleinn tekst" style="min-width:0; width:104px; font-weight:400" ${vern ? `placeholder="–"${vern}` : `list="typer" placeholder="${escapeHtml(arvet || 'Type')}" title="${arvet ? `Behovet har typen «${escapeHtml(arvet)}». Skriv en annen for denne søknaden, eller tøm feltet for å bruke behovets.` : 'Type for denne søknaden'}"`} ${feltAttr(n(l, 'type'), linjetype(l, tilstand.behov))}></td>
        <td class="tall"><input class="celleinn antall" inputmode="numeric" ${feltAttr(n(l, 'antall'), l.antall, 'tall')}${vern}></td>
        <td class="tall"><input class="celleinn" inputmode="numeric" ${feltAttr(n(l, 'estPris'), l.estPris, 'tall')}${vern}></td>
        <td class="tall fet">${kr(kostnad)}</td>
        ${moms ? `<td class="tall">${kr(fraGiver)}</td><td class="tall dempet">${kr(kostnad - fraGiver)}</td>` : ''}
        <td style="width:40px; padding-left:0">${vern ? '' : `<button type="button" class="ikonknapp" data-handling="fjern-linje" data-linje="${l.id}" title="Fjern fra søknaden">${IKON.fjern}</button>`}</td>
      </tr>`;
  };
  // Gruppert på type med delsum per gruppe (giverens kategorier).
  const rader = grupperPerType(linjer, l => linjetype(l, tilstand.behov), typerekkefolgeFor(s, fellesTyperekkefolge())).map(g => {
    const delsum = g.elementer.reduce((a, l) => a + linjekostnad(l), 0), delGiver = giverandel(delsum, prosent);
    return `
      <tr class="gruppe" ${last ? '' : `data-slippmal="type:${escapeHtml(g.type)}"`}><td colspan="4">${last ? '<span class="dra" style="visibility:hidden">⠿</span>' : `<span class="dra" draggable="true" data-dra="type:${escapeHtml(g.type)}" title="Dra for å flytte hele typen i denne søknaden">⠿</span>`}${escapeHtml(g.type || 'Uten type')}<span style="font-weight:400; letter-spacing:0; text-transform:none; font-size:12px; color:var(--color-neutral-600)"> · ${g.elementer.length} ${g.elementer.length === 1 ? 'linje' : 'linjer'}</span></td><td class="tall">${kr(delsum)}</td>${moms ? `<td class="tall">${kr(delGiver)}</td><td class="tall">${kr(delsum - delGiver)}</td>` : ''}<td></td></tr>
      ${g.elementer.map(rad).join('')}`;
  }).join('');
  const tilleggSum = tillegg.reduce((a, l) => a + linjekostnad(l), 0), tilleggGiver = giverandel(tilleggSum, prosent);
  const tilleggsrader = tillegg.length ? `
      <tr class="gruppe tillegg"><td colspan="4">Lagt til etter søknaden <span>· ${tillegg.length} ${tillegg.length === 1 ? 'linje' : 'linjer'} · teller ikke i søkt beløp</span></td><td class="tall">${kr(tilleggSum)}</td>${moms ? `<td class="tall">${kr(tilleggGiver)}</td><td class="tall">${kr(tilleggSum - tilleggGiver)}</td>` : ''}<td></td></tr>
      ${tillegg.map(rad).join('')}` : '';
  const kolonner = moms ? 8 : 6;
  return `
    <div class="tabellramme" data-rull="soknad-behov">
      <table class="liste tett">
        <thead><tr>
          <th>Behov</th><th>Type</th><th class="tall">Antall</th><th class="tall">Est. stk.pris</th><th class="tall">Kostnad</th>
          ${moms ? `<th class="tall">Fra giver<br>(${100 - prosent} %)</th><th class="tall">Fra moms-<br>komp. (${prosent} %)</th>` : ''}
          <th></th>
        </tr></thead>
        <tbody>${rader || `<tr class="tom-rad"><td colspan="${kolonner}">Ingen behov i søknaden enda. Legg til fra behovslisten eller som fri linje.</td></tr>`}${tilleggsrader}</tbody>
        <tfoot><tr>
          <td colspan="4" class="dempet">Sum estimert${under(`Etter egenandel ${kr(egen)}`)}</td>
          <td class="tall sum">${kr(sum)}${under(kr(etterEgen))}</td>
          ${moms ? `<td class="tall sum">${kr(sumGiver)}${under(kr(etterEgenGiver))}</td><td class="tall fet dempet">${kr(sum - sumGiver)}<div class="undertekst" style="font-weight:400">${egen ? kr(etterEgen - etterEgenGiver) : 'forventes mottatt neste år'}</div></td>` : ''}
          <td></td>
        </tr></tfoot>
      </table>
      <datalist id="typer">${typeliste(tilstand.behov, tilstand.soknader, tilstand.innkjop).map(t => `<option value="${escapeHtml(t)}">`).join('')}</datalist>
    </div>`;
}

// Hint under «Innvilget beløp»: er estimatet (giverandelen, etter
// egenandelen som gjelder nå) over eller under?
function innvilgetHint(s) {
  const p = pott(s, innkjopFor(s.id));
  if (p.innvilget == null) return 'Fylles inn når svaret kommer';
  const estimat = giverbehov(s);
  const hva = (p.harMoms ? 'Estimatet (giverandel)' : 'Estimatet') + (p.egenandel > 0 ? ' etter egenandel' : '');
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
      <td><input class="celleinn tekst" style="min-width:0; font-weight:400" list="utgiftstyper" placeholder="–" title="Valgfritt. Med type regnes utgiften inn i den kategorien i Revisjon og rapporten." ${feltAttr(n(u, 'type'), u.type)}></td>
      <td><input class="celleinn tekst" style="min-width:110px; font-weight:400" placeholder="dd.mm.åååå" ${feltAttr(n(u, 'dato'), u.dato, 'dato')}></td>
      <td class="tall"><input class="celleinn" style="width:110px; font-weight:600" inputmode="decimal" ${feltAttr(n(u, 'belop'), u.belop, 'belop')}></td>
      <td>${avkryss(!!u.egeninnsats, u.egeninnsats ? 'Ja' : 'Nei', 'egeninnsats', `data-id="${u.id}" title="Dugnad og annen egeninnsats: estimert verdi uten faktura. Hele beløpet regnes som egne midler."`)}</td>
      <td class="smal dempet">${escapeHtml(fornavn(u.lagtInnAv?.navn, u.lagtInnAv?.epost))}</td>
      <td style="width:44px; padding-left:0; text-align:center"><button type="button" class="ikonknapp" data-handling="fjern-utgift" data-id="${u.id}" title="Slett utgiften">${IKON.fjern}</button></td>
    </tr>`).join('');
  return `
    <div class="verktoyrad">
      <div class="etikett">Løse utgifter</div>
      <div class="hint">Trekkes fra potten. Kobles til faktura under Revisjon. Dugnad og annen egeninnsats uten faktura krysses av som egeninnsats – da er hele beløpet egne midler. Type er valgfritt.</div>
    </div>
    <div class="tabellramme" data-rull="utgifter" style="flex:0 1 auto">
      <table class="liste">
        <thead><tr><th>Beskrivelse</th><th style="width:150px">Type</th><th style="width:130px">Dato</th><th class="tall" style="width:140px">Beløp</th><th style="width:130px">Egeninnsats</th><th style="width:150px">Lagt inn av</th><th style="width:44px"></th></tr></thead>
        <tbody>
          ${rader}
          <tr class="ny-utgift">
            <td><input class="celleinn tekst ny" id="ny-utgift-beskrivelse" placeholder="Ny utgift – beskrivelse"></td>
            <td></td>
            <td><input class="celleinn tekst ny" id="ny-utgift-dato" placeholder="dd.mm.åååå"></td>
            <td class="tall"><input class="celleinn ny" id="ny-utgift-belop" inputmode="decimal" placeholder="0,00" style="width:110px"></td>
            <td colspan="3" class="undertekst">Lagres når beskrivelse og beløp er fylt ut</td>
          </tr>
        </tbody>
        <tfoot><tr>
          <td colspan="3" class="dempet">Sum løse utgifter</td>
          <td class="tall sum">${belop(sumUtgifter(s))}</td>
          <td colspan="3" class="dempet">${liste.length} ${liste.length === 1 ? 'utgift' : 'utgifter'}</td>
        </tr></tfoot>
      </table>
      <datalist id="utgiftstyper">${typeliste(tilstand.behov, tilstand.soknader, tilstand.innkjop).map(t => `<option value="${escapeHtml(t)}">`).join('')}</datalist>
    </div>`;
}

// Den nederste raden er alltid en tom ny utgift. Den lagres når man forlater
// raden og både beskrivelse og beløp er fylt ut.
async function lagreNyUtgift(s) {
  const felt = ['beskrivelse', 'dato', 'belop'].map(f => document.getElementById(`ny-utgift-${f}`));
  if (felt.some(el => !el)) return;
  const [b, d, k] = felt;
  const beskrivelse = b.value.trim(), sum = tolkBelop(k.value), dato = tolkDato(d.value);
  if (!beskrivelse || sum == null) return;
  if (Number.isNaN(sum)) { visMelding(`«${k.value}» er ikke et gyldig beløp`); return; }
  if (Number.isNaN(dato)) { visMelding(`«${d.value}» er ikke en gyldig dato (dd.mm.åååå)`); return; }
  // Tøm raden FØR lagringen, så et nytt focusout underveis finner en tom rad
  // og ikke lagrer den samme utgiften én gang til.
  const gamle = felt.map(el => el.value);
  felt.forEach(el => { el.value = ''; });
  const id = await lagre(() => leggTilUtgift(s, { beskrivelse, belop: sum, dato }));
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

// Egenandel: det vi har sagt i søknaden at vi dekker selv. Blir innvilget et
// annet beløp enn søkt, velger vi om vi holder på beløpet eller på andelen.
// Rammen er innvilget + egenandel. Hvilke varer den går til, settes i Innkjøp.
function egenandelfelt(s, p, last) {
  const planlagt = egenandelPlanlagt(s);
  const andel = (egen, giver) => egen + giver > 0 ? `${(egen / (egen + giver) * 100).toFixed(1).replace('.', ',')} %` : '–';
  const kanVelge = planlagt > 0 && p.innvilget != null && p.innvilget !== p.sokt;
  const valg = s.egenandelValg === 'andel' ? 'andel' : 'belop';
  let hint = 'Det vi dekker selv. Trekkes fra søkt beløp, og legges til rammen.';
  if (planlagt > 0 && p.innvilget == null) hint = `${andel(planlagt, p.sokt)} av ${kr(planlagt + p.sokt)}. Trekkes fra søkt beløp.`;
  else if (planlagt > 0) hint = `${andel(p.egenandel, p.innvilget)} av rammen ${kr(p.ramme)}${kanVelge ? ` · i søknaden ${andel(planlagt, p.sokt)}` : ''} · <span class="${p.fordelt > p.egenandel ? 'aksent' : ''}">plassert på varer ${kr(p.fordelt)}</span>`;
  return `
          <div class="felt"><span class="etikett">Egenandel</span>
            <input class="inndata tall" style="text-align:left" inputmode="numeric" placeholder="0" ${feltAttr(`soknader/${s.id}/egenandel`, s.egenandel, 'tall')}${skrivevern(last)}>
            ${kanVelge ? `<div class="segment fyll">
              <button type="button" data-handling="egenandel-valg" data-id="belop" aria-pressed="${valg === 'belop'}" title="Innvilget er et annet beløp enn søkt. Behold egenandelen som samme beløp som i søknaden.">Beløp ${heltall(planlagt)}</button>
              <button type="button" data-handling="egenandel-valg" data-id="andel" aria-pressed="${valg === 'andel'}" title="Innvilget er et annet beløp enn søkt. Behold egenandelen som samme andel av rammen som i søknaden.">Andel ${heltall(egenandelSomAndel(s))}</button>
            </div>` : ''}
            <span class="undertekst">${hint}</span>
          </div>`;
}

function soknadsfane(s) {
  const n = f => `soknader/${s.id}/${f}`;
  const forslag = soktForslag(s);
  const overstyrt = s.soktOverstyrt != null;
  const p = pott(s, innkjopFor(s.id));
  const last = erLast(s);
  const tilInnkjop = 'Søknaden er låst. Endret behov legges til under Innkjøp.';
  const givere = [...tilstand.givere].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
  return `
    <div style="flex:1 1 auto; min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:0 28px">
      <div style="min-height:0; display:flex; flex-direction:column; gap:12px">
        <div class="verktoyrad">
          <div class="etikett">Behov i søknaden</div>
          ${last ? `<div class="hint" style="flex:1 1 auto; display:flex; align-items:center; gap:8px" title="${LAST_TITTEL}">${IKON.las}<span><b>Låst</b> – søknaden er sendt. Endret behov legges til under <a href="#/soknad/${s.id}/innkjop">Innkjøp</a>.</span></div>` : ''}
          <div class="grupper">
            <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="skriv-ut">Skriv ut</button>
            <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="fra-listen" ${last ? `disabled title="${tilInnkjop}"` : ''}>+ Behov fra listen</button>
            <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="fri-linje" ${last ? `disabled title="${tilInnkjop}"` : ''}>+ Fri linje</button>
          </div>
        </div>
        ${behovstabell(s)}
        <div class="tre-kol" style="flex:0 0 auto; align-items:start${p.harMoms ? '; grid-template-columns:repeat(4, minmax(0, 1fr))' : ''}">
          ${egenandelfelt(s, p, last)}
          <label class="felt"><span class="etikett">Søkt beløp</span>
            <input class="inndata tall" style="text-align:left" inputmode="numeric" ${feltAttr(n('soktOverstyrt'), soktBelop(s), 'tall')}${skrivevern(last)}>
            <span class="undertekst">${overstyrt ? `Overstyrt. Foreslått ${kr(forslag)}${last ? '.' : ' – tøm feltet for å bruke forslaget.'}` : (p.harMoms ? `Foreslått: giverens andel (${p.giverProsent} %) av estimatet` : 'Foreslått: sum av estimatene') + (p.egenandelPlanlagt > 0 ? ' etter egenandel' : '')}</span>
          </label>
          <label class="felt"><span class="etikett">Innvilget beløp</span>
            <input class="inndata tall" style="text-align:left" inputmode="numeric" ${feltAttr(n('innvilget'), s.innvilget, 'tall')}>
            <span class="undertekst">${escapeHtml(innvilgetHint(s))}</span>
          </label>
          ${p.harMoms ? `
          <label class="felt"><span class="etikett">Momskompensasjon</span>
            <div style="display:flex; align-items:center; gap:8px"><input class="inndata prosent" style="height:36px; font-size:16px" inputmode="numeric" ${feltAttr(n('momsProsent'), p.prosent, 'prosent')}${skrivevern(last)}><span>%</span></div>
            <span class="undertekst">${last ? 'Arvet fra giveren' : 'Arvet fra giveren, kan justeres her'}</span>
          </label>` : ''}
        </div>
      </div>
      <div style="min-height:0; display:flex; flex-direction:column; gap:14px; border-left:2px solid var(--color-divider); padding-left:24px; overflow:auto">
        <label class="felt"><span class="etikett">Giver</span>
          <select class="inndata" data-felt="${n('giverId')}" data-verdi="${s.giverId}"${last ? ` disabled title="${LAST_TITTEL}"` : ''}>
            ${givere.map(g => `<option value="${g.id}" ${g.id === s.giverId ? 'selected' : ''}>${escapeHtml(g.navn || 'Uten navn')}</option>`).join('')}
          </select>
        </label>
        <label class="felt"><span class="etikett">Tittel</span><input class="inndata" ${feltAttr(n('tittel'), s.tittel, 'tekst', { paakrevd: true })}></label>
        <div class="to-kol" style="gap:14px">
          <label class="felt"><span class="etikett">Frist</span><input class="inndata" placeholder="dd.mm.åååå" ${feltAttr(n('frist'), s.frist, 'dato')}></label>
          <label class="felt"><span class="etikett">Sendt</span><input class="inndata" placeholder="dd.mm.åååå" ${feltAttr(n('sendt'), s.sendt, 'dato')}></label>
        </div>
        <div class="felt"><span class="etikett">Status</span>
          <div class="segment fyll">${SOKNADSSTATUSER.map(st => `<button type="button" data-handling="status" data-id="${st.id}" aria-pressed="${s.status === st.id}"${st.id === 'utkast' && last ? ' title="Låser opp søknaden"' : ''}>${st.navn}</button>`).join('')}</div>
          ${last ? '' : '<span class="undertekst">Søknaden låses når den settes til Sendt.</span>'}
        </div>
        ${avkryss(!!s.revisjon, 'Revisjon på denne søknaden', 'revisjon')}
        ${s.revisjon ? revisorvalg(s) : ''}
        ${dokumenter(s)}
        <div style="display:flex; justify-content:flex-end; flex:0 0 auto"><button type="button" class="knapp knapp-fare" data-handling="slett-soknad">Slett søknad</button></div>
      </div>
    </div>`;
}

// Åpne behov som kan legges i søknaden, gruppert og ordnet som i behovslisten.
function valgFraListen(s) {
  const valg = velgbareBehov(tilstand.behov, tilstand.soknader, s, anskaffet())
    .sort((a, b) => etterRekkefolgeOgTittel(a.behov, b.behov));
  return grupperPerType(valg, x => x.behov.type, fellesTyperekkefolge());
}

function fraListenPanel(s) {
  const grupper = valgFraListen(s);
  const antall = grupper.reduce((sum, g) => sum + g.elementer.length, 0);
  const visOverskrift = grupper.length > 1 || (grupper[0]?.type ?? '') !== '';
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Behov fra listen</h2><div class="ingress" style="margin-top:4px">Åpne behov som ikke er med i søknaden. Antall settes til det som gjenstår.${s.status === 'utkast' ? '' : ' Søknaden er ikke lenger et utkast, så behovet merkes «lagt til etter søknaden» og endrer ikke søkt beløp.'}</div></div>
      ${lukkeknapp()}
    </div>
    ${antall > 1 ? `<button type="button" class="knapp knapp-primar" style="align-self:flex-start" data-handling="legg-til-alle">Legg til alle ${antall}</button>` : ''}
    <div style="display:flex; flex-direction:column; gap:6px">
      ${grupper.map(g => `
        ${visOverskrift ? `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:8px"><span class="etikett">${escapeHtml(g.type || 'Uten type')}</span>${g.elementer.length > 1 ? `<button type="button" class="knapp knapp-ramme knapp-liten" style="height:26px; font-size:12px" data-handling="legg-til-type" data-type="${escapeHtml(g.type)}">Legg til alle ${g.elementer.length}</button>` : ''}</div>` : ''}
        ${g.elementer.map(({ behov: b, info }) => `
        <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:var(--color-neutral-200)">
          <div style="flex:1; min-width:0">
            <div class="fet">${escapeHtml(b.tittel || 'Uten tittel')}</div>${b.beskrivelse ? `<div class="celleunder" title="${escapeHtml(b.beskrivelse)}">${escapeHtml(b.beskrivelse)}</div>` : ''}
            <div class="dempet">Gjenstår ${info.gjenstar} av ${info.total} · est. ${kr(b.estPris)} kr/stk</div>
          </div>
          <button type="button" class="knapp knapp-primar knapp-liten" data-handling="legg-til" data-id="${b.id}">Legg til</button>
        </div>`).join('')}`).join('') || '<div class="dempet">Ingen åpne behov å velge. Nye behov legges inn under Behov.</div>'}
    </div>`, { nytt: ui.nyttPanel });
}

function skrivUt(s) {
  const rad = l => `<tr><td>${escapeHtml(linjetittel(l))}</td><td class="n">${l.antall ?? 0}</td><td class="n">${kr(l.estPris)}</td><td class="n">${kr(linjekostnad(l))}</td></tr>`;
  const grupper = grupperPerType(soktLinjer(s), l => linjetype(l, tilstand.behov), typerekkefolgeFor(s, fellesTyperekkefolge()));
  const tillegg = tilleggslinjer(s);
  const tilleggsrader = tillegg.length
    ? `<tr class="g"><td colspan="3">Lagt til etter søknaden (ikke med i summen)</td><td class="n">${kr(tillegg.reduce((a, l) => a + linjekostnad(l), 0))}</td></tr>${tillegg.map(l => rad(l).replace('</td>', `${l.notat ? `<div class="d">${escapeHtml(l.notat)}</div>` : ''}</td>`)).join('')}` : '';
  // Er alt uten type, skrives lista ut som før, uten gruppeoverskrift.
  const rader = grupper.length === 1 && !grupper[0].type
    ? grupper[0].elementer.map(rad).join('')
    : grupper.map(g => `<tr class="g"><td colspan="3">${escapeHtml(g.type || 'Uten type')}</td><td class="n">${kr(g.elementer.reduce((a, l) => a + linjekostnad(l), 0))}</td></tr>${g.elementer.map(rad).join('')}`).join('');
  utskrift(s.tittel || 'Søknad', `<p>${escapeHtml(giver(s.giverId)?.navn || '')} · Behovsliste · skrevet ut ${new Date().toLocaleDateString('nb-NO')}</p>
    <table><thead><tr><th>Behov</th><th class="n">Antall</th><th class="n">Est. stk.pris</th><th class="n">Kostnad</th></tr></thead>
    <tbody>${rader}${tilleggsrader}</tbody><tfoot><tr><td colspan="3">Sum estimert</td><td class="n">${kr(sumEstimert(s))}</td></tr></tfoot></table>`);
}

function gjeldende() {
  return tilstand.soknader.find(s => s.id === ui.soknadId);
}

export const soknadSide = {
  meny: 'soknader',

  tegn([id, fane = 'soknad'] = []) {
    if (id !== ui.soknadId) { ui.soknadId = id; ui.panel = null; ui.velger = false; innkjopFane.forlat(); revisjonFane.forlat(); }
    if (fane !== 'innkjop') innkjopFane.forlat();
    if (fane !== 'revisjon' && !erRevisor()) revisjonFane.forlat(); // revisor har ingen faner i ruten
    const s = gjeldende();
    if (!s && erRevisor()) { gaaTil('#/revisor'); return ''; }
    if (!s) return `<div class="laster">Fant ikke søknaden. <a href="#/soknader" style="margin-left:6px">Til alle søknader</a></div>`;
    if (erRevisor()) return `${revisortopp(s)}<main class="innhold" style="padding-top:12px">${revisjonFane.tegn(s)}</main>`;
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
    if (erRevisor()) return revisorfelt(sti, verdi);
    const s = tilstand.soknader.find(x => x.id === id);
    if (sti === 'giverId') {
      const g = giver(verdi);
      return { giverId: verdi, momsProsent: g?.momsTrekk ? (g.momsProsent ?? 0) : null };
    }
    if (sti === 'soktOverstyrt' && s && (verdi == null || verdi === soktForslag(s))) return { soktOverstyrt: null };
    // Type lik behovets (eller tomt felt) betyr «ikke overstyrt».
    const typeTreff = sti.match(/^linjer\.([^.]+)\.type$/);
    if (typeTreff && s) {
      const l = s.linjer?.[typeTreff[1]];
      const arvet = l?.behovId ? (behovMedId(l.behovId)?.type || '').trim() : '';
      return { [sti]: !verdi || verdi === arvet ? null : verdi };
    }
    // Tomt momsfelt betyr 0 %, ikke «ingen innstilling» — den styres av giveren.
    if (sti === 'momsProsent' && verdi == null) return { momsProsent: 0 };
    return null;
  },

  // Den tomme utgiftsraden har ikke data-felt; den lagres når man forlater
  // et av feltene i raden.
  // Dra og slipp i behovstabellen. Rekkefølgen gjelder bare denne søknaden.
  slipp(kilde, mal, posisjon) {
    const s = gjeldende();
    if (!s || erLast(s) || erRevisor()) return;
    const del = nokkel => { const i = nokkel.indexOf(':'); return [nokkel.slice(0, i), nokkel.slice(i + 1)]; };
    const [kHva, kId] = del(kilde), [mHva, mId] = del(mal);
    const typeAv = l => linjetype(l, tilstand.behov);
    const linjer = soktLinjer(s);
    const malLinje = mHva === 'linje' ? linjer.find(l => l.id === mId) : null;
    const malType = mHva === 'type' ? mId : (malLinje ? typeAv(malLinje) : '');
    if (kHva === 'type') {
      if (kId === malType) return;
      const typer = grupperPerType(linjer, typeAv, typerekkefolgeFor(s, fellesTyperekkefolge())).map(g => g.type);
      lagre(() => settSoknadTyperekkefolge(s.id, flyttIListe(typer, kId, malType, posisjon)));
      return;
    }
    if (kId === mId) return;
    const gruppe = linjer.filter(l => typeAv(l) === malType).map(l => l.id);
    const ny = mHva === 'type' ? flyttIListe(gruppe, kId, null) : flyttIListe(gruppe, kId, mId, posisjon);
    lagre(() => settLinjerekkefolge(s, ny, { flyttetId: kId, nyType: malType }));
  },

  dobbeltklikk(el, e) { const s = gjeldende(); if (s && !erRevisor()) innkjopFane.dobbeltklikk(el, e, s); },
  limInn(el, tekst, e) { const s = gjeldende(); if (s && !erRevisor()) innkjopFane.limInn(el, tekst, e, s); },

  fokusUt(el, e) {
    const s = gjeldende();
    if (!s || erRevisor()) return;
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
    // Revisor: bare revisjonen og å åpne dokumenter.
    if (erRevisor()) {
      if (!(await revisjonFane.klikk(handling, el, e, s)) && handling === 'apne-dok') apneDokument(s, el.dataset.id);
      return;
    }
    if (location.hash.includes('/innkjop') && await innkjopFane.klikk(handling, el, e, s)) return;
    if (location.hash.includes('/revisjon') && await revisjonFane.klikk(handling, el, e, s)) return;
    const linje = el.dataset.linje;
    switch (handling) {
      case 'velger': ui.velger = !ui.velger; tegn(); break;
      case 'bytt': ui.velger = false; gaaTil(`#/soknad/${el.dataset.id}`); tegn(); break;
      case 'lukk-panel': ui.panel = null; tegn(); break;
      case 'skriv-ut': skrivUt(s); break;
      case 'fra-listen': if (erLast(s)) break; ui.panel = 'fra-listen'; ui.nyttPanel = true; tegn(); break;
      case 'legg-til': {
        const b = behovMedId(el.dataset.id);
        const info = velgbareBehov(tilstand.behov, tilstand.soknader, s, anskaffet()).find(x => x.behov.id === b?.id)?.info;
        if (b && info) lagre(() => leggBehovISoknad(s, b, info.gjenstar));
        break;
      }
      case 'legg-til-alle':
      case 'legg-til-type': {
        const valg = valgFraListen(s)
          .filter(g => handling === 'legg-til-alle' || g.type === el.dataset.type)
          .flatMap(g => g.elementer.map(x => ({ behov: x.behov, antall: x.info.gjenstar })));
        // Et dobbeltklikk skal ikke legge inn alt to ganger.
        if (ui.leggerTil) break;
        ui.leggerTil = true;
        await lagre(() => leggFlereBehovISoknad(s, valg));
        ui.leggerTil = false;
        break;
      }
      case 'fri-linje': {
        if (erLast(s)) break;
        const linjeId = await lagre(() => leggFriLinjeISoknad(s));
        if (linjeId) { fokuser(`soknader/${s.id}/linjer.${linjeId}.tittel`); tegn(); }
        break;
      }
      case 'fjern-linje': if (!erLast(s) || s.linjer?.[linje]?.etterSoknad) lagre(() => fjernLinje(s.id, linje)); break;
      case 'fjern-utgift': lagre(() => fjernUtgift(s.id, el.dataset.id)); break;
      case 'egeninnsats': lagre(() => oppdaterUtgift(s.id, el.dataset.id, { egeninnsats: !s.utgifter?.[el.dataset.id]?.egeninnsats })); break;
      case 'slett-soknad': {
        const antallUtgifter = utgiftsliste(s).length;
        const antallFakturaer = tilstand.fakturaer.filter(f => f.soknadId === s.id).length;
        const hva = [linjeliste(s).length && `${linjeliste(s).length} behov`, antallUtgifter && `${antallUtgifter} utgifter`, Object.keys(s.dokumenter || {}).length && `${Object.keys(s.dokumenter).length} dokumenter`, antallFakturaer && `${antallFakturaer} fakturaer`].filter(Boolean).join(', ');
        if (!confirm(`Slette søknaden «${s.tittel || 'Uten tittel'}»?${hva ? `\n\nDen har ${hva}. Behovene forblir i behovslisten.` : ''}\n\nDette kan ikke angres.`)) break;
        const ok = await lagre(() => slettSoknad(s).then(() => true));
        if (ok) gaaTil('#/soknader');
        break;
      }
      case 'status': {
        const ny = el.dataset.id;
        if (ny === s.status) break;
        // Utkast låser opp. En innvilget søknad låses bare opp med aktiv bekreftelse.
        if (ny === 'utkast' && erInnvilget(s) && !confirm(`Søknaden er ${s.status === 'avsluttet' ? 'avsluttet' : 'innvilget'} og låst.\n\nRiktig måte å håndtere et endret behov etter at en søknad er innvilget, er å legge det til på innkjøpslisten (Innkjøp-fanen: «+ Behov fra listen» eller «+ Fri linje»). Da står det vi søkte om urørt.\n\nVil du likevel låse opp søknaden og sette den tilbake til Utkast?`)) break;
        if (ny !== 'utkast') ui.panel = null;
        lagre(() => oppdaterSoknad(s.id, { status: ny }));
        break;
      }
      case 'egenandel-valg': lagre(() => oppdaterSoknad(s.id, { egenandelValg: el.dataset.id })); break;
      case 'revisjon': lagre(() => oppdaterSoknad(s.id, { revisjon: !s.revisjon })); break;
      case 'revisor': lagre(() => settRevisor(s, el.dataset.id, el.getAttribute('aria-pressed') !== 'true')); break;
      case 'apne-dok': apneDokument(s, el.dataset.id); break;
      case 'slett-dok': {
        const d = s.dokumenter?.[el.dataset.id];
        if (d && confirm(`Slette «${d.navn}»?`)) lagre(() => slettDokument(s.id, el.dataset.id, d.sti));
        break;
      }
    }
  },

  async filer(el, filer) {
    const s = gjeldende();
    if (!s || !filer.length || erRevisor()) return;
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
    if (erRevisor()) return revisjonFane.escape();
    if (innkjopFane.escape()) return true;
    if (revisjonFane.escape()) return true;
    if (ui.velger) { ui.velger = false; return true; }
    if (ui.panel) { ui.panel = null; return true; }
    return false;
  },
};
