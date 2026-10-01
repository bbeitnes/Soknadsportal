// Kvittering fra mobil: velg søknad → ta bilde → beløp → ferdig. Laget for
// telefon, men virker også på PC. Kvitteringen blir en faktura med
// løpenummer under Revisjon, «ikke koblet» til den kobles på PC.
import { tilstand, innkjopFor, opprettKvittering } from '../data/index.js';
import { pott, erInnvilget } from '../data/beregning.js';
import { escapeHtml, kr, belop, tolkBelop, tidspunkt, fornavn } from '../ui/format.js';
import { lagre, visMelding } from '../ui/lagring.js';
import { tegn, gaaTil } from '../ui/visning.js';
import { klargjorBilde, bildeTilPdf } from '../ui/bilde.js';

const ui = { steg: 1, soknadId: null, fil: null, pdf: null, forhandsvisning: null, belop: '', fakturanr: '', lagrer: false, ferdig: null };

const PIL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
const HAK = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-100)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const giverNavn = s => tilstand.givere.find(g => g.id === s.giverId)?.navn || '';
const soknad = () => tilstand.soknader.find(s => s.id === ui.soknadId);

function hode(tittel, tilbake) {
  return `<div class="kv-hode">
    ${tilbake ? `<button type="button" class="kv-tilbake" data-handling="${tilbake}">‹ Tilbake</button>` : '<div class="etikett">Søknadsportal</div>'}
    <h1>${tittel}</h1>
  </div>`;
}

function stegVelg() {
  const liste = tilstand.soknader.filter(erInnvilget).filter(s => s.status === 'innvilget')
    .sort((a, b) => (b.frist || '').localeCompare(a.frist || ''));
  return `${hode('Ny kvittering')}
    <div class="kv-hint">Hvilken søknad gjelder den?</div>
    <div class="kv-liste">
      ${liste.map(s => { const p = pott(s, innkjopFor(s.id)); return `
        <button type="button" data-handling="velg" data-id="${s.id}">
          <span style="flex:1; min-width:0"><span class="kv-tittel">${escapeHtml(s.tittel || 'Uten tittel')}</span><span class="kv-under">${escapeHtml(giverNavn(s))} · gjenstår ${p.gjenstar == null ? '–' : kr(p.gjenstar)}</span></span>${PIL}
        </button>`; }).join('') || '<div class="kv-hint">Ingen innvilgede søknader.</div>'}
    </div>
    <div class="kv-hint">Bare innvilgede søknader vises.</div>
    <a href="#/soknader" class="kv-lenke">Til portalen →</a>`;
}

function stegBilde() {
  const s = soknad();
  return `${hode(escapeHtml(s?.tittel || ''), 'tilbake-velg')}
    <div class="kv-hint">Ta bilde av kvitteringen eller fakturaen, eller velg en fil.</div>
    <div class="kv-knapper">
      <label class="kv-stor primar">Ta bilde<input type="file" accept="image/*" capture="environment" hidden></label>
      <label class="kv-stor">Velg fra bilder<input type="file" accept="image/*" hidden></label>
      <label class="kv-stor">PDF fra filer<input type="file" accept="application/pdf,image/*" hidden></label>
    </div>
    ${ui.lagrer ? '<div class="kv-hint">Klargjør bildet …</div>' : ''}`;
}

function stegBelop() {
  const s = soknad();
  return `${hode('Beløp', 'tilbake-bilde')}
    <div class="kv-forhand">
      ${ui.forhandsvisning ? `<img src="${ui.forhandsvisning}" alt="">` : `<div class="kv-pdf">PDF</div>`}
      <div style="min-width:0"><div class="etikett">Kvittering til</div><div class="kv-tittel">${escapeHtml(s?.tittel || '')}</div><div class="undertekst">${escapeHtml((ui.fil?.name || '').replace(/\.(jpe?g|png)$/i, '.pdf'))}</div><button type="button" class="kv-tilbake" style="padding:0; margin-top:2px" data-handling="tilbake-bilde">Ta bildet på nytt</button></div>
    </div>
    <form class="kv-skjema" id="kv-skjema">
      <label class="felt"><span class="etikett">Beløp</span><div class="kv-belop"><input id="kv-belop" inputmode="decimal" autocomplete="off" value="${escapeHtml(ui.belop)}" placeholder="0,00"><span>kr</span></div></label>
      <label class="felt"><span class="etikett">Fakturanummer</span><input class="inndata" id="kv-fakturanr" inputmode="numeric" autocomplete="off" value="${escapeHtml(ui.fakturanr)}" placeholder="Valgfritt" style="height:44px; font-size:17px"></label>
      <div class="hint">Leverandør og kobling gjøres på PC.</div>
      <button type="submit" class="kv-stor primar" ${ui.lagrer ? 'disabled' : ''}>${ui.lagrer ? 'Legger inn …' : 'Legg inn kvittering'}</button>
    </form>`;
}

function stegFerdig() {
  const f = ui.ferdig;
  return `<div class="kv-ferdig">
      <div style="width:56px; height:56px; background:var(--color-text); display:flex; align-items:center; justify-content:center">${HAK}</div>
      <h1>Kvittering ${f.lopenummer} er lagt inn</h1>
      <div style="font-size:15px; color:var(--color-neutral-700); line-height:1.45">${belop(f.belop)} kr på <span class="fet" style="color:var(--color-text)">${escapeHtml(f.tittel)}</span>. Den ligger nå under Revisjon som «ikke koblet», klar til å kobles mot linjer eller utgifter på PC.</div>
      <div style="border-top:2px solid var(--color-divider); padding-top:14px" class="undertekst">Lagt inn av ${escapeHtml(fornavn(tilstand.meg.navn, tilstand.meg.epost))}, ${tidspunkt(Date.now())}</div>
    </div>
    <div class="kv-knapper" style="padding-bottom:40px">
      <button type="button" class="kv-stor primar" data-handling="ny-samme">Ny kvittering til samme søknad</button>
      <button type="button" class="kv-stor" data-handling="ferdig">Ferdig</button>
    </div>`;
}

document.addEventListener('submit', async e => {
  if (e.target.id !== 'kv-skjema') return;
  e.preventDefault();
  const s = soknad();
  if (!s || ui.lagrer) return;
  ui.belop = document.getElementById('kv-belop').value;
  ui.fakturanr = document.getElementById('kv-fakturanr').value.trim();
  const sum = tolkBelop(ui.belop);
  if (sum == null || Number.isNaN(sum) || sum <= 0) { visMelding('Skriv inn beløpet på kvitteringen'); document.getElementById('kv-belop').focus(); return; }
  // På telefon flytter ikke et trykk på knappen fokus ut av feltet, og da
  // ville tegningen ventet på det. Vi tar fokus ut selv.
  document.activeElement?.blur?.();
  ui.lagrer = true; tegn();
  const lopenummer = await lagre(async () => opprettKvittering(s.id, { belop: sum, fakturanr: ui.fakturanr, fil: await ui.pdf }));
  ui.lagrer = false;
  if (lopenummer) { ui.ferdig = { lopenummer, belop: sum, tittel: s.tittel }; ui.steg = 4; ui.fil = null; ui.pdf = null; ui.forhandsvisning = null; ui.belop = ''; ui.fakturanr = ''; }
  tegn();
});

export const kvitteringSide = {
  mobil: true,

  tegn([soknadId] = []) {
    if (soknadId && ui.steg === 1 && tilstand.soknader.some(s => s.id === soknadId)) { ui.soknadId = soknadId; ui.steg = 2; }
    const innhold = ui.steg === 1 ? stegVelg() : ui.steg === 2 ? stegBilde() : ui.steg === 3 ? stegBelop() : stegFerdig();
    return `<div class="kvittering">${innhold}</div>`;
  },

  klikk(handling, el) {
    if (handling === 'velg') { ui.soknadId = el.dataset.id; ui.steg = 2; tegn(); }
    else if (handling === 'tilbake-velg') { ui.steg = 1; tegn(); }
    else if (handling === 'tilbake-bilde') { ui.steg = 2; ui.fil = null; ui.pdf = null; ui.forhandsvisning = null; tegn(); }
    else if (handling === 'ny-samme') { ui.steg = 2; ui.ferdig = null; tegn(); }
    else if (handling === 'ferdig') { ui.steg = 1; ui.ferdig = null; gaaTil('#/soknader'); }
  },

  async filer(el, filer) {
    const fil = filer[0];
    if (!fil) return;
    ui.lagrer = true; tegn();
    try {
      // Bildet vises i neste steg; det som lastes opp er en PDF. Den lages
      // (med tekstgjenkjenning) mens brukeren skriver inn beløpet.
      ui.fil = await klargjorBilde(fil, { rett: true });
      ui.forhandsvisning = ui.fil.type.startsWith('image/') ? URL.createObjectURL(ui.fil) : null;
      ui.pdf = bildeTilPdf(ui.fil);
      ui.steg = 3;
    } catch (err) {
      visMelding(err.message || 'Kunne ikke lese filen');
    }
    ui.lagrer = false;
    if (el.type === 'file') el.value = '';
    tegn();
    setTimeout(() => document.getElementById('kv-belop')?.focus(), 50);
  },

  escape() { return false; },
  forlat() { ui.steg = 1; ui.fil = null; ui.pdf = null; ui.forhandsvisning = null; ui.ferdig = null; },
};
