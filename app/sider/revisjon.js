// Revisjon-fanen: fakturaer med løpenummer, hva potten er brukt på, og
// revisjonsrapporten (PDF). Brukes av sider/soknad.js.
import {
  tilstand, innkjopFor, fakturaerFor, oppdaterSoknad, opprettFaktura, slettFaktura,
  settDekker, lastOppFakturafil, dokumentUrl, fellesTyperekkefolge,
} from '../data/index.js';
import {
  revisjonsposter, fakturaavvik, fakturaDekker, revisjonsoppsummering, pott, sumFakturert,
  leverandorNavn, posttittel, linjerUtenValg, fordelingPerKategori, sumEgneMidler, typerekkefolgeFor,
} from '../data/beregning.js';
import { escapeHtml, kr, belop, datoFelt, tidspunkt, fornavn } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre, visMelding } from '../ui/lagring.js';
import { tegn, fokuser, sidepanel, lukkeknapp, IKON } from '../ui/visning.js';
import { lagRevisjonsrapport } from '../ui/rapport.js';

const ui = { panel: null, nyttPanel: false, lagerRapport: false };

// Linjetittel for en innkjøpslinje: fra søknaden/behovet, ellers kopien.
function tittelFor(s) {
  return (i, l) => {
    const sl = l.soknadLinjeId ? s.linjer?.[l.soknadLinjeId] : null;
    if (sl) return sl.behovId ? (tilstand.behov.find(b => b.id === sl.behovId)?.tittel || l.tittel) : sl.tittel;
    return l.tittel || 'Uten tittel';
  };
}

// Linjer i innkjøpene som ikke har fått valgt leverandør: de er ikke med i
// postene, og nevnes så de ikke blir glemt.
function utenValgTekst(s) {
  const uten = linjerUtenValg(innkjopFor(s.id));
  if (!uten.length) return '';
  const navn = uten.map(x => tittelFor(s)(x.innkjop, x.linje));
  return `<div class="hint" title="${escapeHtml(navn.join('\n'))}">${uten.length} ${uten.length === 1 ? 'linje' : 'linjer'} i innkjøpene har ingen valgt leverandør og er ikke med: ${escapeHtml(navn.slice(0, 3).join(', '))}${uten.length > 3 ? ' …' : ''}. Velg pris i <a href="#/soknad/${s.id}/innkjop">Innkjøp</a>.</div>`;
}

export function posterFor(s) {
  return revisjonsposter(s, innkjopFor(s.id), {
    tittelFor: tittelFor(s),
    levNavn: (i, sid) => leverandorNavn(i.leverandorer?.[sid], tilstand.leverandorer) || 'Ukjent leverandør',
    behovliste: tilstand.behov,
  });
}

// Sluttoppgjøret per kategori, i søknadens typerekkefølge.
export function fordelingFor(s, poster, perPost, prosent) {
  return fordelingPerKategori(poster, perPost, prosent, typerekkefolgeFor(s, fellesTyperekkefolge()));
}

// Feltet der egne midler fordeles på en post: på innkjøpslinjen eller utgiften.
function egneFelt(s, post) {
  return post.type === 'utgift' ? `soknader/${s.id}/utgifter.${post.utgiftId}.egneMidler` : `innkjop/${post.innkjopId}/linjer.${post.linjeId}.egneMidler`;
}

function avvikTekst(avvik) {
  if (!avvik) return '';
  return (avvik > 0 ? '+' : '−') + belop(Math.abs(avvik));
}

function fakturaPanel(s, f, poster) {
  const n = felt => `fakturaer/${f.id}/${felt}`;
  const alle = fakturaerFor(s.id);
  const a = fakturaavvik(f, poster, alle);
  const dekker = new Set(fakturaDekker(f));
  const andre = alle.filter(x => x.id !== f.id);
  const kreditnota = Number(f.belop) < 0;
  const register = [...tilstand.leverandorer].map(l => l.navn).filter(Boolean).sort((x, y) => x.localeCompare(y, 'nb'));
  return sidepanel(`
    <div class="panelhode">
      <div><h2>${kreditnota ? 'Kreditnota' : 'Faktura'} ${f.lopenummer}</h2><div class="ingress" style="margin-top:4px">${f.leverandor ? `${escapeHtml(f.leverandor)} · ${escapeHtml(f.fakturanr || 'uten nummer')}` : 'Ny faktura – feltene lagres fortløpende'}</div></div>
      ${lukkeknapp()}
    </div>
    <div class="to-kol">
      <label class="felt" style="grid-column:1 / -1"><span class="etikett">Leverandør</span><input class="inndata" list="leverandorliste" ${feltAttr(n('leverandor'), f.leverandor)}><datalist id="leverandorliste">${register.map(x => `<option value="${escapeHtml(x)}">`).join('')}</datalist></label>
      <label class="felt"><span class="etikett">Fakturanr</span><input class="inndata" ${feltAttr(n('fakturanr'), f.fakturanr)}></label>
      <label class="felt"><span class="etikett">Dato</span><input class="inndata" placeholder="dd.mm.åååå" ${feltAttr(n('dato'), f.dato, 'dato')}></label>
      <label class="felt"><span class="etikett">Beløp</span><input class="inndata tall" inputmode="decimal" placeholder="0,00" title="Negativt beløp = kreditnota" ${feltAttr(n('belop'), f.belop, 'belop')}><span class="undertekst">Negativt = kreditnota</span></label>
      <div class="felt"><span class="etikett">Vedlegg</span>
        ${f.fil
          ? `<div style="display:flex; align-items:center; gap:6px; height:36px; padding:0 10px; border:2px solid var(--color-divider); min-width:0">${IKON.fil}<button type="button" data-handling="apne-fil" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border:0; background:transparent; padding:0; text-align:left; cursor:pointer; font-size:13px; font-weight:600">${escapeHtml(f.fil.navn)}</button><label class="ikonknapp" style="width:24px; height:24px; cursor:pointer" title="Bytt fil">${IKON.pluss}<input type="file" accept="application/pdf,image/*" hidden data-faktura="${f.id}"></label></div>`
          : `<label class="knapp knapp-ramme" style="height:36px; border-style:dashed; cursor:pointer">+ Last opp PDF eller bilde<input type="file" accept="application/pdf,image/*" hidden data-faktura="${f.id}"></label>`}
      </div>
    </div>
    <div>
      <div style="display:flex; justify-content:space-between; align-items:baseline"><span class="etikett">Gjelder</span><span class="hint">${a.koblet && !a.alene ? 'Flere fakturaer på samme linje – avviket står per linje under «Hva potten er brukt på»' : `Tilbudt ${belop(a.tilbudt)} · avvik <span class="fet ${a.avvik ? 'aksent' : ''}">${a.koblet ? (a.avvik ? avvikTekst(a.avvik) : '0') : '–'}</span>`}</span></div>
      <div class="valgliste" style="margin-top:8px">
        ${poster.map(p => {
          const pa = dekker.has(p.id);
          const annen = andre.find(x => fakturaDekker(x).includes(p.id));
          return `<button type="button" data-handling="dekker" data-post="${escapeHtml(p.id)}" aria-pressed="${pa}" style="${annen && !pa ? 'color:var(--color-neutral-500)' : ''}"><span class="boks ${pa ? 'pa' : ''}" style="width:16px; height:16px">${IKON.hak}</span><span class="fyll">${escapeHtml(posttittel(p))}${annen ? ` <span class="undertekst">(faktura ${annen.lopenummer})</span>` : ''}</span><span class="smal" style="font-variant-numeric:tabular-nums">${belop(p.tilbudt)}</span></button>`;
        }).join('') || '<div class="tomt">Ingen valgte tilbudslinjer eller utgifter enda.</div>'}
      </div>
      <span class="undertekst">En faktura kan dekke flere linjer. Sjekk av det den gjelder.</span>
      ${utenValgTekst(s)}
    </div>
    <label class="felt"><span class="etikett">Merknad</span>${tekstomrade(n('merknad'), f.merknad, 'class="inndata" rows="2" placeholder="F.eks. hvorfor beløpet avviker fra tilbudet, eller «delfaktura – resten kommer i oktober»"')}<span class="undertekst">Vises i fakturalisten og i revisjonsrapporten.</span></label>
    <div class="panelbunn"><span>Lagt inn av ${escapeHtml(fornavn(f.lagtInnAv?.navn, f.lagtInnAv?.epost))}, ${tidspunkt(f.tid)}</span><button type="button" class="knapp knapp-fare" data-handling="slett-faktura">Slett faktura</button></div>`, { nytt: ui.nyttPanel });
}

export const revisjonFane = {
  tegn(s) {
    if (!s.revisjon) {
      return `<div style="display:flex; align-items:center; gap:16px; color:var(--color-neutral-700)">Revisjon er slått av for denne søknaden.<button type="button" class="knapp knapp-ramme knapp-liten" data-handling="revisjon-pa">Slå på</button></div>`;
    }
    const fakturaer = fakturaerFor(s.id);
    const poster = posterFor(s);
    const o = revisjonsoppsummering(fakturaer, poster);
    const p = pott(s, innkjopFor(s.id));
    const valgt = fakturaer.find(f => f.id === ui.panel);
    if (ui.panel && !valgt) ui.panel = null;
    // Egne midler per post (lagt inn i Innkjøp, kan rettes her). Da grupperes
    // postene per kategori med delsum, så det går fram hvor mye vi dekker selv
    // i hver. Har vi lovet giveren en egenandel, måles fordelingen mot den.
    const fordelt = sumEgneMidler(poster);
    const visEgne = p.egenandel > 0 || fordelt > 0;
    const somLovet = !p.egenandel || fordelt === p.egenandel;
    const grupper = visEgne ? fordelingFor(s, poster, o.perPost, p.prosent).grupper : [{ poster }];
    const postrad = x => {
      const { nr, fakturert, avvik } = o.perPost[x.id];
      return `<tr><td>${escapeHtml(x.tittel)}<div class="celleunder">${escapeHtml(x.under)}</div>${x.etterSoknad ? `<div class="celleunder" style="color:var(--color-text)" title="${escapeHtml(x.notat)}">Lagt til etter søknaden${x.notat ? `: ${escapeHtml(x.notat)}` : ''}</div>` : ''}${x.alternativ ? `<div class="celleunder aksent" style="font-weight:600" title="Leverandøren tilbød et annet produkt enn det vi ba om">Alternativt produkt: ${escapeHtml(x.alternativ)}</div>` : ''}</td><td class="tall">${belop(x.tilbudt)}</td><td class="tall fet">${fakturert == null ? '–' : belop(fakturert)}</td><td class="tall fet smal aksent">${avvik ? avvikTekst(avvik) : ''}</td>${visEgne ? `<td class="tall"><input class="celleinn" inputmode="decimal" placeholder="–" title="Egne midler brukt på denne posten" ${feltAttr(egneFelt(s, x), x.egne || null, 'belop')}></td>` : ''}<td class="smal"><span class="merkelapp ${nr.length ? 'm-pa' : 'm-varsel'}">${nr.length ? `Faktura ${nr.join(', ')}` : 'Mangler faktura'}</span></td></tr>`;
    };
    const html = `
      <div class="verktoyrad">
        <div class="hint" style="flex:1 1 auto; min-width:0">Fakturert <span class="fet" style="color:var(--color-text)">${belop(o.fakturert)}</span> av disponert ${belop(p.disponertFull)} · ${o.manglerFaktura ? `${o.manglerFaktura} ${o.manglerFaktura === 1 ? 'linje' : 'linjer'} mangler faktura` : 'alt er fakturert'} · ${o.avvikAntall ? `${o.avvikAntall} avvik fra tilbud` : 'ingen avvik'}${o.ikkeKoblet ? ` · ${o.ikkeKoblet} ${o.ikkeKoblet === 1 ? 'faktura' : 'fakturaer'} ikke koblet` : ''}</div>
        <div class="grupper">
          <button type="button" class="knapp knapp-ramme" data-handling="ny-faktura">+ Ny faktura</button>
          <button type="button" class="knapp knapp-primar" data-handling="rapport" ${ui.lagerRapport ? 'disabled' : ''}>${ui.lagerRapport ? 'Lager rapport …' : 'Revisjonsrapport (PDF)'}</button>
        </div>
      </div>
      <div style="flex:1 1 auto; min-height:0; display:grid; grid-template-columns:${visEgne ? 'minmax(0,6fr) minmax(0,7fr)' : 'minmax(0,1fr) minmax(0,1fr)'}; gap:0 28px">
        <div style="min-height:0; display:flex; flex-direction:column; gap:8px">
          <div class="etikett">Fakturaer</div>
          <div class="tabellramme" data-rull="fakturaer">
            <table class="liste">
              <thead><tr><th>Nr</th><th>Leverandør</th><th>Fakturanr</th><th>Dato</th><th class="tall">Beløp</th><th class="tall">Avvik</th></tr></thead>
              <tbody>${fakturaer.map(f => {
                const a = fakturaavvik(f, poster, fakturaer);
                const navn = fakturaDekker(f).map(id => poster.find(x => x.id === id)).filter(Boolean).map(posttittel);
                return `<tr class="klikkbar ${f.id === ui.panel ? 'valgt' : ''}" data-handling="apne-faktura" data-id="${f.id}">
                  <td style="font-weight:700">${f.lopenummer}${Number(f.belop) < 0 ? '<div class="undertekst" style="font-weight:600">kreditnota</div>' : ''}</td>
                  <td>${escapeHtml(f.leverandor || '–')}<div class="celleunder" style="max-width:200px" title="${escapeHtml(navn.join(', '))}">${navn.length ? escapeHtml(navn.join(', ')) : '<span class="aksent">Ikke koblet til noe</span>'}</div></td>
                  <td class="smal" style="font-size:13px">${escapeHtml(f.fakturanr || '–')}</td>
                  <td class="smal" style="font-size:13px">${f.dato ? datoFelt(f.dato) : '–'}</td>
                  <td class="tall fet">${f.belop == null ? '–' : belop(f.belop)}</td>
                  <td class="tall fet smal aksent">${a.koblet ? (a.alene ? avvikTekst(a.avvik) : '<span class="undertekst" style="font-weight:400" title="Flere fakturaer på samme linje – se avvik per linje">se linje</span>') : ''}${f.merknad ? `<div class="celleunder" style="font-weight:400; max-width:220px; white-space:normal" title="${escapeHtml(f.merknad)}">${escapeHtml(f.merknad)}</div>` : ''}</td>
                </tr>`; }).join('') || '<tr class="tom-rad"><td colspan="6">Ingen fakturaer enda. Kvitteringer fra mobil dukker også opp her.</td></tr>'}</tbody>
              <tfoot><tr><td colspan="4" class="dempet">Sum fakturert</td><td class="tall sum">${belop(o.fakturert)}</td><td class="tall fet aksent">${avvikTekst(o.avvikSum)}</td></tr></tfoot>
            </table>
          </div>
        </div>
        <div style="min-height:0; display:flex; flex-direction:column; gap:8px">
          <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px"><span class="etikett">Hva potten er brukt på</span>${visEgne ? `<span class="hint" title="Egne midler legges på varen i Innkjøp og kan rettes i kolonnen «Egne midler». Fordelingen vises per kategori i revisjonsrapporten.">Egne midler <span class="fet ${somLovet ? '' : 'aksent'}" style="${somLovet ? 'color:var(--color-text)' : ''}">${belop(fordelt)}</span>${p.egenandel ? ` av egenandelen ${belop(p.egenandel)}` : ''}</span>` : ''}</div>
          <div class="tabellramme" data-rull="poster">
            <table class="liste ${visEgne ? 'med-egne' : ''}">
              <thead><tr><th>Gjelder</th><th class="tall">Tilbudt</th><th class="tall">Fakturert</th><th class="tall">Avvik</th>${visEgne ? '<th class="tall">Egne midler</th>' : ''}<th>Faktura</th></tr></thead>
              <tbody>${poster.length ? grupper.map(g => `
                ${visEgne ? `<tr class="gruppe"><td>${escapeHtml(g.navn)}</td><td class="tall">${belop(g.tilbudt)}</td><td class="tall">${g.fakturert ? belop(g.fakturert) : '–'}</td><td></td><td class="tall">${g.egne ? belop(g.egne) : '–'}</td><td></td></tr>` : ''}
                ${g.poster.map(postrad).join('')}`).join('') : `<tr class="tom-rad"><td colspan="${visEgne ? 6 : 5}">Ingen valgte tilbudslinjer eller utgifter enda.</td></tr>`}</tbody>
            </table>
          </div>
          ${utenValgTekst(s)}
        </div>
      </div>
      ${valgt ? fakturaPanel(s, valgt, poster) : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el, e, s) {
    const f = fakturaerFor(s.id).find(x => x.id === ui.panel);
    switch (handling) {
      case 'revisjon-pa': lagre(() => oppdaterSoknad(s.id, { revisjon: true })); return true;
      case 'ny-faktura': {
        const id = await lagre(() => opprettFaktura(s.id));
        if (id) { ui.panel = id; ui.nyttPanel = true; fokuser(`fakturaer/${id}/leverandor`); tegn(); }
        return true;
      }
      case 'apne-faktura': ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); return true;
      case 'lukk-panel': ui.panel = null; tegn(); return true;
      case 'dekker': if (f) lagre(() => settDekker(f, el.dataset.post, el.getAttribute('aria-pressed') !== 'true')); return true;
      case 'apne-fil': {
        if (!f?.fil) return true;
        const vindu = window.open('', '_blank');
        try { const url = await dokumentUrl(f.fil.sti); if (vindu) vindu.location = url; }
        catch (err) { console.error(err); vindu?.close(); alert('Kunne ikke åpne filen.'); }
        return true;
      }
      case 'slett-faktura':
        if (f && confirm(`Slette faktura ${f.lopenummer}${f.leverandor ? ` fra ${f.leverandor}` : ''}?`)) { ui.panel = null; lagre(() => slettFaktura(f)); }
        return true;
      case 'rapport': {
        ui.lagerRapport = true; tegn();
        try { await lagRevisjonsrapport(s); }
        catch (err) { console.error(err); visMelding('Kunne ikke lage rapporten: ' + (err.message || err)); }
        ui.lagerRapport = false; tegn();
        return true;
      }
    }
    return false;
  },

  async filer(el, filer, s) {
    if (!el.dataset.faktura) return false;
    const f = fakturaerFor(s.id).find(x => x.id === el.dataset.faktura);
    const fil = filer[0];
    if (f && fil) {
      if (!/^(application\/pdf|image\/)/.test(fil.type)) { visMelding('Vedlegget må være PDF eller bilde'); return true; }
      await lagre(() => lastOppFakturafil(f, fil));
    }
    if (el.type === 'file') el.value = '';
    return true;
  },

  escape() {
    if (ui.panel) { ui.panel = null; return true; }
    return false;
  },

  forlat() { ui.panel = null; },
};
