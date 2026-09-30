// Redigerbare felt. Ingen lagreknapper: et felt lagres når man forlater
// det (focusout), og bare hvis verdien er endret.
//
// Markering i HTML:
//   data-felt="samling/dokumentId/feltsti"   hva som skal lagres
//   data-verdi="…"                           verdien som ble tegnet
//   data-type="tekst|tall|belop|dato|prosent" hvordan verdien tolkes (belop = med øre)
//   data-paakrevd                            tomt felt godtas ikke
import { escapeHtml, kr, belop, tolkTall, tolkBelop, tolkDato, datoFelt } from './format.js';

// Verdien slik den vises i feltet.
export function visVerdi(verdi, type) {
  if (verdi == null || verdi === '') return '';
  if (type === 'tall') return kr(verdi);
  if (type === 'belop') return belop(verdi);
  if (type === 'dato') return datoFelt(verdi);
  return String(verdi);
}

// Attributtene et redigerbart felt trenger. `verdi` er lagret verdi.
export function feltAttr(nokkel, verdi, type = 'tekst', { paakrevd = false } = {}) {
  const vist = escapeHtml(visVerdi(verdi, type));
  return `data-felt="${escapeHtml(nokkel)}" data-type="${type}" data-verdi="${vist}" value="${vist}"${paakrevd ? ' data-paakrevd' : ''}`;
}

// For <textarea>, der verdien står mellom taggene.
export function tekstomrade(nokkel, verdi, ekstra = '') {
  const v = escapeHtml(verdi ?? '');
  return `<textarea data-felt="${escapeHtml(nokkel)}" data-type="tekst" data-verdi="${v}" ${ekstra}>${v}</textarea>`;
}

// Tolker feltets innhold. { ok, verdi } eller { ok: false, melding }.
export function tolkFelt(el) {
  const type = el.dataset.type || 'tekst';
  const raa = el.value;
  if (el.hasAttribute('data-paakrevd') && raa.trim() === '') {
    return { ok: false, melding: 'Feltet kan ikke være tomt' };
  }
  if (type === 'tall' || type === 'belop') {
    const n = type === 'tall' ? tolkTall(raa) : tolkBelop(raa);
    return Number.isNaN(n) ? { ok: false, melding: `«${raa}» er ikke et gyldig ${type === 'tall' ? 'tall' : 'beløp'}` } : { ok: true, verdi: n };
  }
  if (type === 'prosent') {
    const n = tolkTall(raa.replace('%', ''));
    if (Number.isNaN(n) || n > 100) return { ok: false, melding: 'Prosent må være et tall mellom 0 og 100' };
    return { ok: true, verdi: n };
  }
  if (type === 'dato') {
    const d = tolkDato(raa);
    return Number.isNaN(d) ? { ok: false, melding: `«${raa}» er ikke en gyldig dato (dd.mm.åååå)` } : { ok: true, verdi: d };
  }
  return { ok: true, verdi: raa.trim() };
}

export function tolkNokkel(nokkel) {
  const [samling, id, ...sti] = nokkel.split('/');
  return { samling, id, sti: sti.join('/') };
}
