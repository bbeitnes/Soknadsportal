// Innkjøp-fanen i en søknad: tilbudsmatrisen. Linjer nedover, leverandører
// bortover, netto stykkpris i cellene. Brukes av sider/soknad.js, som
// sender klikk, tastatur og filer hit.
//
// Ingen moduser: klikk på en celle velger den, dobbeltklikk redigerer,
// klikk på leverandørnavnet velger alt fra den, «Billigst per linje» velger
// laveste netto per linje. Etterpå kan enkeltceller justeres med ett klikk.
import {
  tilstand, innkjopFor, opprettInnkjop, oppdaterInnkjop, slettInnkjop,
  leggSoknadslinjeIInnkjop, leggFriLinjeIInnkjop, fjernInnkjopslinje,
  leggTilLeverandor, fjernLeverandor, settPris, settPriser, velgPris, settValgt,
  lastOppVedlegg, slettVedlegg, dokumentUrl, opprettLeverandor,
  leggSoknadslinjerIInnkjop, fellesTyperekkefolge, leggBehovISoknadOgInnkjop, anskaffet,
} from '../data/index.js';
import {
  INNKJOPSSTATUSER, innkjopsstatusNavn, innkjopsberegning, billigstPerLinje, tolkRutenett,
  ikkeFordelte, vedleggsliste, momsProsent, giverandel, leverandorNavn, leverandorKontakt,
  grupperInnkjopslinjer, grupperPerType, linjetype, typerekkefolgeFor, tolkPris, velgbareBehov,
} from '../data/beregning.js';
import { escapeHtml, kr, tidspunkt, fornavn } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre } from '../ui/lagring.js';
import { tegn, fokuser, sidepanel, lukkeknapp, IKON } from '../ui/visning.js';

const ui = { aktiv: {}, panel: null, nyttPanel: false, redigerer: null, sok: '', limTekst: false };

const navn = lev => leverandorNavn(lev, tilstand.leverandorer);

const MER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
const KLIPS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
const HAK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function aktivtInnkjop(s) {
  const liste = innkjopFor(s.id);
  return liste.find(i => i.id === ui.aktiv[s.id]) || liste[0] || null;
}

// Linjetittelen hentes levende fra søknaden (og behovet), med kopien i
// innkjøpet som reserve hvis linjen er fjernet fra søknaden.
function linjetittel(s, l) {
  if (l.soknadLinjeId) {
    const sl = s.linjer?.[l.soknadLinjeId];
    if (sl) return sl.behovId ? (tilstand.behov.find(b => b.id === sl.behovId)?.tittel || l.tittel) : sl.tittel;
  }
  return l.tittel;
}

// Beskrivelsen følger behovet, som i søknadens behovstabell.
const behovsbeskrivelse = sl => sl?.behovId ? (tilstand.behov.find(b => b.id === sl.behovId)?.beskrivelse || '') : '';
const linjebeskrivelse = (s, l) => behovsbeskrivelse(l.soknadLinjeId ? s.linjer?.[l.soknadLinjeId] : null);
const under = tekst => tekst ? `<div class="celleunder" title="${escapeHtml(tekst)}">${escapeHtml(tekst)}</div>` : '';

function soktAntall(s, l) {
  return l.soknadLinjeId ? s.linjer?.[l.soknadLinjeId]?.antall ?? null : null;
}

// Innkjøpet viser linjene slik de står i søknaden: samme typer og samme
// rekkefølge. Typen hentes fra søknaden og endres der, ikke her.
const typerekkefolge = s => typerekkefolgeFor(s, fellesTyperekkefolge());
const linjegrupper = (s, i) => grupperInnkjopslinjer(i, s, tilstand.behov, typerekkefolge(s));
const soknadslinjeTittel = l => l.behovId ? (tilstand.behov.find(b => b.id === l.behovId)?.tittel || 'Slettet behov') : l.tittel;

// ——— Tegning ———

function chips(s, liste, aktiv, ikkeFordelt) {
  return `
    <div class="verktoyrad">
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap">
        ${liste.map(i => `<button type="button" class="chip ${i.id === aktiv?.id ? 'aktiv' : ''}" data-handling="innkjop-velg" data-id="${i.id}" title="${i.id === aktiv?.id ? 'Klikk igjen for navn, status og sletting' : 'Vis dette innkjøpet'}"><span>${escapeHtml(i.navn || 'Uten navn')}</span><span class="chip-sum">${kr(innkjopsberegning(i).total)}</span></button>`).join('')}
        ${aktiv ? `<button type="button" class="merkelapp m-sendt" style="margin-left:6px; cursor:pointer; border:0" data-handling="innkjop-status" title="Klikk for å endre status">${innkjopsstatusNavn(aktiv.status)}</button>` : ''}
        <button type="button" class="ikonknapp" style="border:2px solid var(--color-neutral-400); width:34px; height:34px" data-handling="innkjop-ny" title="Nytt innkjøp">${IKON.pluss}</button>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap">
        ${ikkeFordelt.length && aktiv ? `<button type="button" class="knapp knapp-ramme" data-handling="ikke-fordelt">${ikkeFordelt.length} behov ikke fordelt</button>` : ''}
        ${aktiv ? `
          <button type="button" class="knapp knapp-ramme" data-handling="behov-fra-listen" title="Behovet har endret seg: legg et behov fra behovslisten inn i søknaden og dette innkjøpet">+ Behov fra listen</button>
          <button type="button" class="knapp knapp-ramme" data-handling="fri-linje">+ Fri linje</button>
          <button type="button" class="knapp knapp-ramme" data-handling="leverandor-ny">+ Leverandør</button>
          <button type="button" class="knapp knapp-primar" data-handling="billigst">Billigst per linje</button>` : ''}
      </div>
    </div>`;
}

function celle(s, i, b, l, lev) {
  const p = b.celle[l.id][lev.id];
  const valgt = b.perLinje[l.id].valgtSid === lev.id;
  const redigerer = ui.redigerer === `${l.id}|${lev.id}`;
  const raa = i.priser?.[l.id]?.[lev.id]?.raa || '';
  const vedlegg = vedleggsliste(lev);
  const alternativ = (i.priser?.[l.id]?.[lev.id]?.alternativ || '').trim();
  let innhold;
  if (redigerer) {
    innhold = `<input class="m-inn" data-pris="${l.id}|${lev.id}" data-autofokus data-blur-ved-enter value="${escapeHtml(raa)}" placeholder="f.eks. 1200 -15%">`;
  } else if (p) {
    innhold = `<div class="m-netto">${kr(p.netto)}</div><div class="m-under">${escapeHtml(p.under)}</div>${alternativ ? `<div class="m-alt" title="Alternativt produkt: ${escapeHtml(alternativ)}">Alt.: ${escapeHtml(alternativ)}</div>` : ''}`;
  } else {
    innhold = `<div class="m-tom">ikke gitt pris</div>`;
  }
  const klips = p && !redigerer && vedlegg.length
    ? `<button type="button" class="m-klips" data-handling="vedlegg-celle" data-lid="${l.id}" data-sid="${lev.id}" title="${vedlegg.length === 1 ? 'Åpne tilbudsdokumentet' : 'Velg vedlegg og side'}">${KLIPS}</button>` : '';
  const mer = p && !redigerer
    ? `<button type="button" class="m-mer" data-handling="tilbud-celle" data-lid="${l.id}" data-sid="${lev.id}" title="Om tilbudet: alternativt produkt og tilbudsdokument">${MER}</button>` : '';
  return `<td class="m-td"><div class="m-celle ${valgt ? 'valgt' : ''} ${redigerer ? 'redigerer' : ''}" ${redigerer ? '' : 'tabindex="0"'} data-handling="celle" data-dobbelt data-lid="${l.id}" data-sid="${lev.id}">
    ${valgt ? `<span class="m-hak">${HAK}</span>` : ''}${innhold}${mer}${klips}</div></td>`;
}

function matrise(s, i) {
  const b = innkjopsberegning(i);
  const n = f => `innkjop/${i.id}/${f}`;
  const prosent = momsProsent(s);
  // Linjer lagt til etter søknaden har notatet sitt her også (samme felt som
  // i Søknad-fanen), så man kan skrive hvorfor der man legger dem til.
  const rad = l => { const sl = l.soknadLinjeId ? s.linjer?.[l.soknadLinjeId] : null; return `
    <tr>
      <td class="m-linje">
        ${l.soknadLinjeId
          ? `<div class="fet">${escapeHtml(linjetittel(s, l) || 'Uten tittel')}</div>${under(linjebeskrivelse(s, l))}`
          : `<input class="celleinn tekst" style="width:100%" placeholder="Beskriv linjen" ${feltAttr(n(`linjer.${l.id}.tittel`), l.tittel)}>`}
        ${sl?.etterSoknad ? `<input class="celleinn tekst notat" style="width:100%" placeholder="Notat – f.eks. «i stedet for klarinett»" ${feltAttr(`soknader/${s.id}/linjer.${l.soknadLinjeId}.notat`, sl.notat)}>` : ''}
        <div class="m-antall">
          <input class="celleinn antall" style="width:52px; text-align:center" inputmode="numeric" ${feltAttr(n(`linjer.${l.id}.antall`), l.antall, 'tall')}>
          <span>stk${sl?.etterSoknad ? ' · <span class="aksent" style="font-weight:600">lagt til etter søknaden</span>' : soktAntall(s, l) != null ? ` · søkt ${soktAntall(s, l)}` : ''}</span>
          <button type="button" class="ikonknapp m-fjern" data-handling="fjern-linje" data-lid="${l.id}" title="Fjern linjen fra innkjøpet">${IKON.fjern}</button>
        </div>
      </td>
      ${b.leverandorer.map(lev => celle(s, i, b, l, lev)).join('')}
      <td class="m-valgt ${b.perLinje[l.id].sum == null ? 'dempet' : ''}">${b.perLinje[l.id].sum == null ? '—' : kr(b.perLinje[l.id].sum)}</td>
    </tr>`; };
  // Gruppert som i søknaden. Har ingen linjer type, vises ingen overskrift.
  const grupper = linjegrupper(s, i);
  const visOverskrift = grupper.length > 1 || (grupper[0]?.type ?? '') !== '';
  const rader = grupper.map(g => {
    const valgtSum = g.linjer.reduce((sum, l) => sum + (b.perLinje[l.id].sum || 0), 0);
    return `${visOverskrift ? `<tr class="m-gruppe"><td class="m-linje">${escapeHtml(g.type || 'Uten type')}</td>${b.leverandorer.map(() => '<td></td>').join('')}${!b.leverandorer.length ? '<td></td>' : ''}<td class="m-valgt">${kr(valgtSum)}</td></tr>` : ''}${g.linjer.map(rad).join('')}`;
  }).join('');
  const tomt = !b.linjer.length
    ? `<tr><td class="m-linje dempet" style="padding:24px 24px">Ingen linjer enda. Bruk «behov ikke fordelt» eller «+ Fri linje».</td>${b.leverandorer.map(() => '<td></td>').join('')}<td class="m-valgt"></td></tr>` : '';
  return `
    <div class="hint" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">Klikk en pris for å velge, dobbeltklikk for å endre (<code>1200 -15%</code> eller <code>1200 -180</code>). <span style="letter-spacing:1px">•••</span> i cellen: alternativt produkt og tilbudsdokument. Be leverandøren om pris per linje – vi sammenligner netto stykkpris. Lim inn fra regneark for å fylle flere celler.</div>
    <div class="tabellramme" data-rull="matrise">
      <table class="matrise">
        <thead><tr>
          <th class="m-linje m-th">Linje · antall</th>
          ${b.leverandorer.map(lev => `
            <th class="m-lev">
              <div style="display:flex; justify-content:flex-end; align-items:center; gap:6px">
                <button type="button" class="ikonknapp" style="width:26px; height:26px; color:var(--color-neutral-500)" data-handling="leverandor" data-sid="${lev.id}" title="Detaljer og vedlegg">${KLIPS}</button>
                <button type="button" class="m-levnavn" data-handling="velg-alt" data-sid="${lev.id}" title="Velg alt fra denne leverandøren">${escapeHtml(navn(lev) || 'Uten navn')}</button>
              </div>
              <div class="undertekst" style="padding-right:12px">${vedleggsliste(lev).length} vedlegg</div>
            </th>`).join('')}
          ${!b.leverandorer.length ? '<th class="m-lev dempet" style="font-weight:400; text-align:left">Ingen leverandører enda – bruk «+ Leverandør».</th>' : ''}
          <th class="m-valgt m-th">Valgt</th>
        </tr></thead>
        <tbody>${rader || tomt}</tbody>
        <tfoot>
          <tr class="m-frakt">
            <td class="m-linje dempet" style="font-size:13px">Frakt og faste kostnader</td>
            ${b.leverandorer.map(lev => `<td style="text-align:right"><input class="celleinn" style="width:96px; background:transparent; ${b.brukt.has(lev.id) ? '' : 'color:var(--color-neutral-500)'}" inputmode="numeric" ${feltAttr(n(`leverandorer.${lev.id}.frakt`), lev.frakt, 'tall')}></td>`).join('')}
            ${!b.leverandorer.length ? '<td></td>' : ''}
            <td class="m-valgt dempet" style="font-size:14px; font-weight:400">${kr(b.frakt)}</td>
          </tr>
          <tr class="m-sum">
            <td class="m-linje dempet" style="font-size:13px">Alt hos én leverandør <span style="color:var(--color-neutral-500)">· inkl. frakt</span></td>
            ${b.leverandorer.map(lev => { const t = b.perLeverandor[lev.id]; return `<td style="text-align:right; vertical-align:top"><div style="font-weight:600; ${t.mangler ? 'color:var(--color-neutral-500)' : ''}">${kr(t.total)}</div><div class="undertekst">${t.mangler ? `mangler ${t.mangler} ${t.mangler === 1 ? 'pris' : 'priser'}` : 'alle linjer priset'}</div></td>`; }).join('')}
            ${!b.leverandorer.length ? '<td></td>' : ''}
            <td class="m-valgt m-kombo">
              <div class="etikett" style="color:var(--color-accent-700)">Valgt kombinasjon</div>
              <div style="font-size:20px; font-weight:700; color:var(--color-accent-800); line-height:1.2">${kr(b.total)}</div>
              ${prosent != null ? `<div class="undertekst" style="color:var(--color-neutral-700)">Fra giver ${100 - prosent} %: <span class="fet" style="color:var(--color-text)">${kr(giverandel(b.total, prosent))}</span></div>` : ''}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function leverandorPanel(s, i, lev) {
  const b = innkjopsberegning(i);
  const n = f => `innkjop/${i.id}/leverandorer.${lev.id}.${f}`;
  const vedlegg = vedleggsliste(lev);
  const t = b.perLeverandor[lev.id];
  return sidepanel(`
    <div class="panelhode">
      <div><div class="etikett">Leverandør</div>${lev.leverandorId
        ? `<h2>${escapeHtml(navn(lev) || 'Uten navn')}</h2>`
        : `<input class="tittelfelt" placeholder="Navn" ${feltAttr(n('navn'), lev.navn)}>`}</div>
      ${lukkeknapp()}
    </div>
    <div class="hint">Frakt ${kr(lev.frakt)} kr · alt hos én: ${kr(t.total)} kr${t.mangler ? ` (mangler ${t.mangler} ${t.mangler === 1 ? 'pris' : 'priser'})` : ''}</div>
    ${lev.leverandorId
      ? `<div class="felt"><span class="etikett">Kontakt</span><div style="white-space:pre-line; font-size:14px">${escapeHtml(leverandorKontakt(lev, tilstand.leverandorer) || '–')}</div><a href="#/leverandorer" class="undertekst">Endres i leverandørregisteret →</a></div>`
      : `<label class="felt"><span class="etikett">Kontakt</span>${tekstomrade(n('kontakt'), lev.kontakt, 'class="inndata" rows="3" placeholder="Kontaktperson, e-post, telefon"')}</label>`}
    <div class="felt"><span class="etikett">Vedlegg (tilbudsdokumenter)</span>
      <div class="valgliste">
        ${vedlegg.map(v => `<div style="cursor:default">${IKON.fil}<button type="button" class="fyll" style="border:0; background:transparent; padding:0; text-align:left; cursor:pointer; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" data-handling="apne-vedlegg" data-sid="${lev.id}" data-vid="${v.id}" title="Åpne">${escapeHtml(v.navn)}</button><span class="undertekst smal">${escapeHtml(fornavn(v.lastetOppAv?.navn, v.lastetOppAv?.epost))} · ${tidspunkt(v.tid)}</span><button type="button" class="ikonknapp" style="width:24px; height:24px" data-handling="slett-vedlegg" data-sid="${lev.id}" data-vid="${v.id}" title="Slett vedlegget">${IKON.fjern}</button></div>`).join('')}
        <label style="font-weight:600">${IKON.pluss}Last opp tilbud<input type="file" multiple hidden data-sid="${lev.id}"></label>
        ${limTekstKnapp()}
      </div>
      ${tekstinnliming(lev.id)}
      <span class="undertekst">${vedlegg.length === 1 ? 'Ett vedlegg: alle prisene fra denne leverandøren peker automatisk til dette dokumentet.' : vedlegg.length > 1 ? 'Flere vedlegg: velg dokument og eventuelt side via ••• i hver celle.' : 'Last opp tilbudet, eller lim inn teksten fra e-posten, så kan hver pris åpnes i dokumentet.'}</span>
    </div>
    <button type="button" class="knapp knapp-primar" style="align-self:flex-start" data-handling="velg-alt" data-sid="${lev.id}">Velg alt fra ${escapeHtml(navn(lev) || 'denne')}</button>
    <div class="panelbunn"><span></span><button type="button" class="knapp knapp-fare" data-handling="slett-leverandor" data-sid="${lev.id}">Fjern fra innkjøpet</button></div>`, { nytt: ui.nyttPanel });
}

function innkjopPanel(s, i) {
  const n = f => `innkjop/${i.id}/${f}`;
  return sidepanel(`
    <div class="panelhode">
      <div><div class="etikett">Innkjøp</div><input class="tittelfelt" placeholder="Navn" ${feltAttr(n('navn'), i.navn, 'tekst', { paakrevd: true })}></div>
      ${lukkeknapp()}
    </div>
    <div class="felt"><span class="etikett">Status</span>
      <div class="segment fyll">${INNKJOPSSTATUSER.map(st => `<button type="button" data-handling="innkjop-sett-status" data-id="${st.id}" aria-pressed="${i.status === st.id}">${st.navn}</button>`).join('')}</div>
      <span class="undertekst">Innhenter tilbud → valgt → fakturert.</span>
    </div>
    <div class="hint">${innkjopsberegning(i).linjer.length} linjer · ${innkjopsberegning(i).leverandorer.length} leverandører</div>
    <div class="panelbunn"><span>${i.endretAv ? `Sist endret av ${escapeHtml(fornavn(i.endretAv.navn, i.endretAv.epost))}, ${tidspunkt(i.endretTid)}` : ''}</span><button type="button" class="knapp knapp-fare" data-handling="slett-innkjop">Slett innkjøp</button></div>`, { nytt: ui.nyttPanel });
}

function ikkeFordeltPanel(s, i, liste) {
  const navn = escapeHtml(i.navn || 'innkjøpet');
  const grupper = grupperPerType(liste, l => linjetype(l, tilstand.behov), typerekkefolge(s));
  const visOverskrift = grupper.length > 1 || (grupper[0]?.type ?? '') !== '';
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Ikke fordelt</h2><div class="ingress" style="margin-top:4px">Behov i søknaden som ennå ikke ligger i et innkjøp – gruppert som i søknaden.</div></div>
      ${lukkeknapp()}
    </div>
    ${liste.length > 1 ? `<button type="button" class="knapp knapp-primar" style="align-self:flex-start" data-handling="legg-alle">Legg alle ${liste.length} i ${navn}</button>` : ''}
    <div style="display:flex; flex-direction:column; gap:6px">
      ${grupper.map(g => `
        ${visOverskrift ? `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:8px"><span class="etikett">${escapeHtml(g.type || 'Uten type')}</span>${g.elementer.length > 1 ? `<button type="button" class="knapp knapp-ramme knapp-liten" style="height:26px; font-size:12px" data-handling="legg-gruppe" data-type="${escapeHtml(g.type)}">Legg alle ${g.elementer.length}</button>` : ''}</div>` : ''}
        ${g.elementer.map(l => `<div style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:var(--color-neutral-200)">
          <div style="flex:1; min-width:0"><div class="fet">${escapeHtml(soknadslinjeTittel(l) || 'Uten tittel')}</div>${under(behovsbeskrivelse(l))}<div class="dempet">${l.antall ?? 0} stk ${l.etterSoknad ? 'lagt til etter søknaden' : 'i søknaden'}${l.finansieres ? ' · finansieres' : ''}</div></div>
          <button type="button" class="knapp knapp-primar knapp-liten" data-handling="legg-i-innkjop" data-lid="${l.id}">Legg til</button>
        </div>`).join('')}`).join('') || '<div class="dempet">Alle behov i søknaden ligger i et innkjøp.</div>'}
    </div>
    <div class="hint">Linjene havner i matrisen under samme type og i samme rekkefølge som i søknaden. Behov som ikke legges i et innkjøp forblir åpne i behovslisten.</div>`, { nytt: ui.nyttPanel });
}

// Tilbud som kom som tekst i en e-post limes inn og lagres som et
// tekstvedlegg. Da kobles det til priser på lik linje med en PDF.
const limTekstKnapp = () => `<button type="button" style="font-weight:600" data-handling="lim-tekst">${IKON.pluss}Lim inn tekst fra e-post</button>`;

function tekstinnliming(sid, lid = '') {
  if (!ui.limTekst) return '';
  return `<textarea class="inndata" id="tilbudstekst" rows="8" data-autofokus data-sid="${sid}" data-lid="${lid}" placeholder="Lim inn teksten fra e-posten"></textarea>
    <span class="undertekst">Lagres som vedlegg når du forlater feltet. Esc avbryter.</span>`;
}

// Alt om ett tilbud (én celle): hva leverandøren faktisk tilbyr, og hvilket
// dokument som dokumenterer prisen. Åpnes med ••• i cellen.
function tilbudPanel(s, i, lid, sid) {
  const lev = i.leverandorer?.[sid];
  const vedlegg = vedleggsliste(lev);
  const pris = i.priser?.[lid]?.[sid] || {};
  const p = tolkPris(pris.raa);
  const valgtVid = pris.vedleggId || (vedlegg.length === 1 ? vedlegg[0].id : null);
  const l = { id: lid, ...i.linjer[lid] };
  const antall = Number(l.antall) || 0;
  const n = f => `innkjop/${i.id}/priser.${lid}.${sid}.${f}`;
  const beskrivelse = linjebeskrivelse(s, l);
  return sidepanel(`
    <div class="panelhode">
      <div><div class="etikett">Tilbud fra ${escapeHtml(navn(lev) || 'leverandøren')}</div><h2>${escapeHtml(linjetittel(s, l) || 'Uten tittel')}</h2>${beskrivelse ? `<div class="ingress" style="margin-top:4px">${escapeHtml(beskrivelse)}</div>` : ''}</div>
      ${lukkeknapp()}
    </div>
    ${p ? `<div class="hint">${kr(p.netto)} per stk${p.liste !== p.netto ? ` (${escapeHtml(p.under)})` : ''} · ${antall} stk = ${kr(antall * p.netto)}</div>` : ''}
    <label class="felt"><span class="etikett">Alternativt produkt</span>
      <input class="inndata" placeholder="F.eks. merke og modell" ${feltAttr(n('alternativ'), pris.alternativ)}>
      <span class="undertekst">Fylles ut når leverandøren tilbyr noe annet enn det vi ba om. Vises i matrisen og i revisjonen.</span>
    </label>
    <div class="felt"><span class="etikett">Tilbudsdokument</span>
      <div class="valgliste">
        ${vedlegg.map(v => `<button type="button" data-handling="velg-vedlegg" data-lid="${lid}" data-sid="${sid}" data-vid="${v.id}" aria-pressed="${valgtVid === v.id}"><span class="fyll">${escapeHtml(v.navn)}</span></button>`).join('')}
        <label style="font-weight:600">${IKON.pluss}Last opp tilbud<input type="file" multiple hidden data-sid="${sid}" data-lid="${lid}"></label>
        ${limTekstKnapp()}
      </div>
      ${tekstinnliming(sid, lid)}
      <span class="undertekst">${vedlegg.length ? 'Dokumentet som viser denne prisen. Nye vedlegg legges på leverandøren og kobles til denne linjen.' : 'Last opp tilbudet (PDF), eller lim inn teksten fra e-posten.'}</span>
    </div>
    ${valgtVid ? `
    <label class="felt" style="max-width:120px"><span class="etikett">Sidetall</span><input class="inndata tall" inputmode="numeric" placeholder="valgfritt" ${feltAttr(n('side'), pris.side, 'tall')}></label>
    <button type="button" class="knapp knapp-ramme" style="align-self:flex-start" data-handling="apne-vedlegg" data-sid="${sid}" data-vid="${valgtVid}">Åpne dokumentet${pris.side ? ` (side ${pris.side})` : ''}</button>` : ''}`, { nytt: ui.nyttPanel });
}

// «+ Behov fra listen»: behovet har endret seg etter at søknaden ble sendt.
// Et åpent behov legges i søknaden og rett inn i dette innkjøpet.
function behovFraListenPanel(s, i) {
  const valg = velgbareBehov(tilstand.behov, tilstand.soknader, s, anskaffet())
    .sort((a, b) => (a.behov.tittel || '').localeCompare(b.behov.tittel || '', 'nb'));
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Behov fra listen</h2><div class="ingress" style="margin-top:4px">Åpne behov som ikke er med i søknaden. Behovet legges i søknaden${s.status === 'utkast' ? '' : ', merket «lagt til etter søknaden»,'} og i ${escapeHtml(i.navn || 'innkjøpet')}.</div></div>
      ${lukkeknapp()}
    </div>
    <div style="display:flex; flex-direction:column; gap:8px">
      ${valg.map(({ behov: b, info }) => `
        <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--color-neutral-200)">
          <div style="flex:1; min-width:0">
            <div class="fet">${escapeHtml(b.tittel || 'Uten tittel')}</div>${under(b.beskrivelse)}
            <div class="dempet">Gjenstår ${info.gjenstar} av ${info.total} · est. ${kr(b.estPris)} kr/stk</div>
          </div>
          <button type="button" class="knapp knapp-primar knapp-liten" data-handling="nytt-behov" data-id="${b.id}">Legg til</button>
        </div>`).join('') || '<div class="dempet">Ingen åpne behov å velge.</div>'}
    </div>
    <div class="hint">Står det ikke på listen? Legg det inn under <a href="#/behov">Behov</a> først, eller bruk «+ Fri linje» for noe som ikke er et behov.${s.status === 'utkast' ? '' : ' Søkt beløp endres ikke.'}</div>`, { nytt: ui.nyttPanel });
}

// «+ Leverandør»: velg fra registeret, eller opprett en ny med navnet du
// skrev. Leverandører som alt er med i innkjøpet vises ikke.
function velgLeverandorPanel(i) {
  const brukt = new Set(Object.values(i.leverandorer || {}).map(l => l.leverandorId).filter(Boolean));
  const sok = ui.sok.trim().toLowerCase();
  const liste = [...tilstand.leverandorer]
    .filter(l => !brukt.has(l.id) && (!sok || (l.navn || '').toLowerCase().includes(sok)))
    .sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
  const eksakt = tilstand.leverandorer.some(l => (l.navn || '').toLowerCase() === sok);
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Legg til leverandør</h2><div class="ingress" style="margin-top:4px">Fra leverandørregisteret. Kontaktinfo vedlikeholdes der.</div></div>
      ${lukkeknapp()}
    </div>
    <input class="inndata" id="lev-sok" value="${escapeHtml(ui.sok)}" placeholder="Søk eller skriv nytt navn" autocomplete="off">
    <div class="valgliste" data-rull="lev-liste" style="max-height:50vh; overflow:auto">
      ${liste.map(l => `<button type="button" data-handling="velg-leverandor" data-id="${l.id}" data-navn="${escapeHtml(l.navn || '')}"><span class="fyll" style="font-weight:600">${escapeHtml(l.navn || 'Uten navn')}</span><span class="undertekst smal">${escapeHtml((l.kontakt || '').split('\n')[0])}</span></button>`).join('')}
      <div class="tomt" id="lev-tom" ${liste.length ? 'hidden' : ''}>${sok ? 'Ingen treff i registeret.' : 'Alle leverandørene i registeret er alt med.'}</div>
    </div>
    <button type="button" class="knapp knapp-primar" style="align-self:flex-start" data-handling="ny-leverandor" ${sok && !eksakt ? '' : 'hidden'}>+ Opprett «${escapeHtml(ui.sok.trim())}» og legg til</button>`, { nytt: ui.nyttPanel });
}

async function apneVedlegg(i, sid, vid) {
  const v = i.leverandorer?.[sid]?.vedlegg?.[vid];
  if (!v) return;
  const vindu = window.open('', '_blank'); // før await, ellers stopper popup-blokkeringen det
  try { const url = await dokumentUrl(v.sti); if (vindu) vindu.location = url; }
  catch (err) { console.error(err); vindu?.close(); alert('Kunne ikke åpne dokumentet.'); }
}

// Søkefeltet filtrerer listen på stedet (uten ny tegning, så markøren
// blir stående).
document.addEventListener('input', e => {
  if (e.target.id !== 'lev-sok') return;
  ui.sok = e.target.value;
  const sok = ui.sok.trim().toLowerCase();
  let treff = 0, eksakt = false;
  document.querySelectorAll('[data-handling="velg-leverandor"]').forEach(b => {
    const n = b.dataset.navn.toLowerCase();
    b.hidden = !!sok && !n.includes(sok);
    if (!b.hidden) treff++;
    if (n === sok) eksakt = true;
  });
  const tom = document.getElementById('lev-tom');
  if (tom) { tom.hidden = treff > 0; tom.textContent = sok ? 'Ingen treff i registeret.' : 'Alle leverandørene i registeret er alt med.'; }
  const ny = document.querySelector('[data-handling="ny-leverandor"]');
  if (ny) { ny.hidden = !sok || eksakt; ny.textContent = `+ Opprett «${ui.sok.trim()}» og legg til`; }
});

export const innkjopFane = {
  tegn(s) {
    const liste = innkjopFor(s.id);
    const aktiv = aktivtInnkjop(s);
    const ikkeFordelt = ikkeFordelte(s, liste);
    let panel = '';
    if (aktiv && ui.panel?.type === 'leverandor' && aktiv.leverandorer?.[ui.panel.sid]) panel = leverandorPanel(s, aktiv, { id: ui.panel.sid, ...aktiv.leverandorer[ui.panel.sid] });
    else if (aktiv && ui.panel?.type === 'innkjop') panel = innkjopPanel(s, aktiv);
    else if (aktiv && ui.panel?.type === 'ikke-fordelt') panel = ikkeFordeltPanel(s, aktiv, ikkeFordelt);
    else if (aktiv && ui.panel?.type === 'tilbud' && aktiv.leverandorer?.[ui.panel.sid] && aktiv.linjer?.[ui.panel.lid]) panel = tilbudPanel(s, aktiv, ui.panel.lid, ui.panel.sid);
    else if (aktiv && ui.panel?.type === 'velg-leverandor') panel = velgLeverandorPanel(aktiv);
    else if (aktiv && ui.panel?.type === 'behov-fra-listen') panel = behovFraListenPanel(s, aktiv);
    else if (ui.panel) ui.panel = null;
    if (!panel) ui.limTekst = false;
    const html = `
      ${chips(s, liste, aktiv, ikkeFordelt)}
      ${aktiv ? matrise(s, aktiv) : `<div class="laster" style="flex-direction:column; gap:12px">Ingen innkjøp enda.<div class="hint">Et innkjøp samler linjer og leverandører i én matrise. Lag ett per tilbudsrunde, f.eks. «Instrumenter» og «Uniformer».</div><button type="button" class="knapp knapp-primar" data-handling="innkjop-ny">+ Nytt innkjøp</button></div>`}
      ${panel}`;
    ui.nyttPanel = false;
    return html;
  },

  // Returnerer true når klikket var vårt.
  async klikk(handling, el, e, s) {
    const i = aktivtInnkjop(s);
    const lid = el.dataset.lid, sid = el.dataset.sid;
    const apne = type => { ui.panel = { type, lid, sid }; ui.nyttPanel = true; ui.limTekst = false; tegn(); };
    switch (handling) {
      case 'innkjop-ny': {
        const id = await lagre(() => opprettInnkjop(s));
        if (id) { ui.aktiv[s.id] = id; ui.panel = { type: 'innkjop' }; ui.nyttPanel = true; fokuser(`innkjop/${id}/navn`); tegn(); }
        return true;
      }
      case 'innkjop-velg':
        if (ui.aktiv[s.id] === el.dataset.id || (i && i.id === el.dataset.id && ui.aktiv[s.id] == null)) apne('innkjop');
        else { ui.aktiv[s.id] = el.dataset.id; ui.panel = null; ui.redigerer = null; tegn(); }
        return true;
      case 'innkjop-status': {
        if (!i) return true;
        const idx = INNKJOPSSTATUSER.findIndex(x => x.id === i.status);
        lagre(() => oppdaterInnkjop(i.id, { status: INNKJOPSSTATUSER[(idx + 1) % INNKJOPSSTATUSER.length].id }));
        return true;
      }
      case 'innkjop-sett-status': if (i) lagre(() => oppdaterInnkjop(i.id, { status: el.dataset.id })); return true;
      case 'slett-innkjop':
        if (i && confirm(`Slette innkjøpet «${i.navn}» med alle priser og vedlegg?\n\nDette kan ikke angres.`)) {
          ui.panel = null; delete ui.aktiv[s.id];
          lagre(() => slettInnkjop(i));
        }
        return true;
      case 'ikke-fordelt': apne('ikke-fordelt'); return true;
      case 'legg-i-innkjop': {
        const sl = s.linjer?.[lid];
        if (!i || !sl) return true;
        lagre(() => leggSoknadslinjeIInnkjop(i, { id: lid, ...sl }, soknadslinjeTittel(sl) || ''));
        return true;
      }
      case 'legg-alle':
      case 'legg-gruppe': {
        if (!i) return true;
        const ledige = ikkeFordelte(s, innkjopFor(s.id))
          .filter(l => handling === 'legg-alle' || linjetype(l, tilstand.behov) === el.dataset.type);
        lagre(() => leggSoknadslinjerIInnkjop(i, ledige.map(l => ({ soknadLinje: l, tittel: soknadslinjeTittel(l) || '' }))));
        return true;
      }
      case 'behov-fra-listen': apne('behov-fra-listen'); return true;
      case 'nytt-behov': {
        const b = tilstand.behov.find(x => x.id === el.dataset.id);
        const info = velgbareBehov(tilstand.behov, tilstand.soknader, s, anskaffet()).find(x => x.behov.id === b?.id)?.info;
        if (i && b && info) lagre(() => leggBehovISoknadOgInnkjop(s, i, b, info.gjenstar));
        return true;
      }
      case 'fri-linje': {
        if (!i) return true;
        const nyLid = await lagre(() => leggFriLinjeIInnkjop(i));
        if (nyLid) { fokuser(`innkjop/${i.id}/linjer.${nyLid}.tittel`); tegn(); }
        return true;
      }
      case 'fjern-linje': if (i) lagre(() => fjernInnkjopslinje(i, lid)); return true;
      case 'leverandor-ny': ui.sok = ''; apne('velg-leverandor'); return true;
      case 'velg-leverandor': {
        if (!i) return true;
        ui.panel = null;
        lagre(() => leggTilLeverandor(i, el.dataset.id));
        return true;
      }
      case 'ny-leverandor': {
        if (!i) return true;
        const levNavn = (document.getElementById('lev-sok')?.value || ui.sok).trim();
        if (!levNavn) return true;
        ui.panel = null;
        const id = await lagre(() => opprettLeverandor(levNavn));
        if (id) lagre(() => leggTilLeverandor(i, id));
        return true;
      }
      case 'leverandor': apne('leverandor'); return true;
      case 'slett-leverandor': {
        const lev = i?.leverandorer?.[sid];
        if (lev && confirm(`Fjerne «${navn(lev) || 'Uten navn'}» fra innkjøpet, med priser og vedlegg?`)) { ui.panel = null; lagre(() => fjernLeverandor(i, sid)); }
        return true;
      }
      case 'velg-alt': {
        if (!i) return true;
        const b = innkjopsberegning(i);
        const valgt = { ...(i.valgt || {}) };
        for (const l of b.linjer) if (b.celle[l.id][sid]) valgt[l.id] = sid;
        lagre(() => settValgt(i, valgt));
        return true;
      }
      case 'billigst': if (i) lagre(() => settValgt(i, billigstPerLinje(i))); return true;
      case 'celle': {
        if (!i || e.target.closest('input')) return true;
        const nokkel = `${lid}|${sid}`;
        if (ui.redigerer === nokkel) return true;
        if (!innkjopsberegning(i).celle[lid]?.[sid]) { ui.redigerer = nokkel; tegn(); }
        else lagre(() => velgPris(i, lid, sid));
        return true;
      }
      case 'vedlegg-celle': {
        const vedlegg = vedleggsliste(i?.leverandorer?.[sid]);
        const pris = i?.priser?.[lid]?.[sid];
        if (vedlegg.length === 1 && !pris?.side) apneVedlegg(i, sid, vedlegg[0].id);
        else apne('tilbud');
        return true;
      }
      case 'tilbud-celle': apne('tilbud'); return true;
      case 'lim-tekst': ui.limTekst = true; tegn(); return true;
      case 'velg-vedlegg': if (i) lagre(() => oppdaterInnkjop(i.id, { [`priser.${lid}.${sid}.vedleggId`]: el.dataset.vid })); return true;
      case 'apne-vedlegg': if (i) apneVedlegg(i, sid, el.dataset.vid); return true;
      case 'slett-vedlegg': {
        const v = i?.leverandorer?.[sid]?.vedlegg?.[el.dataset.vid];
        if (v && confirm(`Slette «${v.navn}»?`)) lagre(() => slettVedlegg(i, sid, el.dataset.vid, v.sti));
        return true;
      }
      case 'lukk-panel': ui.panel = null; ui.limTekst = false; tegn(); return true;
    }
    return false;
  },

  dobbeltklikk(el, e, s) {
    if (!el.matches('.m-celle') || e.target.closest('input, button')) return;
    ui.redigerer = `${el.dataset.lid}|${el.dataset.sid}`;
    tegn();
  },

  // Prisfeltet i en celle lagres når man forlater det.
  fokusUt(el, e, s) {
    if (el.id === 'lev-sok') { ui.sok = el.value; return true; }
    if (el.id === 'tilbudstekst') {
      // Bytter man vindu for å hente teksten, mister feltet fokus uten at
      // man er ferdig. Da venter vi til man faktisk forlater det.
      if (!document.hasFocus()) return true;
      const tekst = el.dataset.ignorer ? '' : el.value.trim();
      const i = aktivtInnkjop(s);
      ui.limTekst = false;
      if (tekst && i) {
        const fil = new File([tekst], `E-post ${new Date().toLocaleDateString('nb-NO')}.txt`, { type: 'text/plain;charset=utf-8' });
        lagre(() => lastOppVedlegg(i, el.dataset.sid, fil, el.dataset.lid || null));
      }
      tegn();
      return true;
    }
    if (!el.dataset.pris) return false;
    const i = aktivtInnkjop(s);
    if (el.dataset.ignorer) { ui.redigerer = null; tegn(); return true; }
    const [lid, sid] = el.dataset.pris.split('|');
    const raa = el.value;
    ui.redigerer = null;
    if (i && raa.trim() !== (i.priser?.[lid]?.[sid]?.raa || '')) lagre(() => settPris(i, lid, sid, raa));
    else tegn();
    return true;
  },

  // Innliming fra Excel (tabulator/linjeskift) fyller flere celler fra
  // cellen det limes i. Vanlig innliming av ett tall går som før.
  limInn(el, tekst, e, s) {
    const celle = el.dataset?.pris ? el.dataset.pris.split('|') : el.matches?.('.m-celle') ? [el.dataset.lid, el.dataset.sid] : null;
    if (!celle) return false;
    const i = aktivtInnkjop(s);
    if (!i) return false;
    const rutenett = tolkRutenett(tekst);
    // Én verdi i et prisfelt limes inn som vanlig tekst.
    if (el.dataset?.pris && rutenett.length === 1 && rutenett[0].length === 1) return false;
    e.preventDefault();
    const [lid, sid] = celle;
    const b = innkjopsberegning(i);
    // Radene fylles i den rekkefølgen matrisen viser dem (gruppert som søknaden).
    const linjeIder = linjegrupper(s, i).flatMap(g => g.linjer.map(l => l.id));
    const li = linjeIder.indexOf(lid), si = b.leverandorer.findIndex(x => x.id === sid);
    ui.redigerer = null;
    // Prisfeltet skal ikke lagre sin gamle verdi når det mister fokus etterpå.
    if (el.dataset?.pris) { el.dataset.ignorer = '1'; el.blur(); }
    lagre(() => settPriser(i, linjeIder, li, si, rutenett));
    return true;
  },

  async filer(el, filer, s) {
    const i = aktivtInnkjop(s);
    if (!i || !el.dataset.sid) return false;
    for (const fil of filer) await lagre(() => lastOppVedlegg(i, el.dataset.sid, fil, el.dataset.lid || null));
    if (el.type === 'file') el.value = '';
    return true;
  },

  escape() {
    if (ui.limTekst) {
      const el = document.getElementById('tilbudstekst');
      ui.limTekst = false;
      if (el) { el.dataset.ignorer = '1'; el.blur(); }
      return true;
    }
    if (ui.redigerer) { ui.redigerer = null; return true; }
    if (ui.panel) { ui.panel = null; return true; }
    return false;
  },

  forlat() { ui.panel = null; ui.redigerer = null; ui.limTekst = false; },
};
