// Bindeledd mellom sidene og appskallet (app.js), så sidene kan be om ny
// tegning eller fokus uten å importere app.js (det ville gitt en sirkel).
import { datoFelt, escapeHtml, nettlenke } from './format.js';
import { feltAttr } from './felt.js';
import { kontaktsammendrag, notatlinje } from '../data/beregning.js';

let skall = { tegn() {}, fokuser() {} };

export function registrerSkall(funksjoner) {
  skall = funksjoner;
}

export const tegn = () => skall.tegn();
export const fokuser = nokkel => skall.fokuser(nokkel);
export const gaaTil = hash => { location.hash = hash; };

// Felles SVG-ikoner (Lucide).
export const IKON = {
  lukk: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  hak: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-100)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  ned: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  opp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
  fil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  pluss: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  fjern: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  las: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
};

// Dato for neste frist (`nesteFrist()` i beregning.js): aksentfarge når den
// nærmer seg, fet og merket «Forfalt» når den er passert.
export function fristdato(n) {
  if (n.tilstand === 'forfalt') return `<span class="frist-forfalt">${datoFelt(n.dato)}</span><span class="fristmerke">Forfalt</span>`;
  return `<span class="${n.tilstand === 'naer' ? 'aksent' : ''}">${datoFelt(n.dato)}</span>`;
}

// Avkrysningsboks som knapp (lagres ved klikk).
export function avkryss(pa, etikett, handling, data = '', ekstraKlasse = '') {
  return `<button type="button" class="avkryss ${ekstraKlasse}" data-handling="${handling}" ${data} aria-pressed="${pa}"><span class="boks ${pa ? 'pa' : ''}">${IKON.hak}</span>${etikett}</button>`;
}

// Sidepanel-ramme. `nytt` gir panelet fokus når det åpnes.
export function sidepanel(innhold, { nytt = false, rull = 'panel' } = {}) {
  return `<aside class="sidepanel" tabindex="-1" data-rull="${rull}" data-nytt="${nytt ? 'ja' : 'nei'}">${innhold}</aside>`;
}

// «+ Ny …» nederst i et panel som viser en post: åpner en ny tom post uten
// å gå veien om verktøyraden. ⌘/Ctrl+Enter trykker på den (se app.js).
const MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '');
export function nesteknapp(tekst) {
  return `<button type="button" class="knapp knapp-ramme" style="align-self:flex-start" data-handling="neste" title="Åpner en ny tom i panelet (${MAC ? '⌘' : 'Ctrl'} + Enter)">${tekst}</button>`;
}

export function lukkeknapp(handling = 'lukk-panel') {
  return `<button type="button" class="ikonknapp" data-handling="${handling}" title="Lukk (Esc)">${IKON.lukk}</button>`;
}

// De frivillige kontaktfeltene på en giver eller leverandør (kort 0014):
// nettadresse, kontaktperson, e-post og telefon. `nokkel(felt)` gir
// data-felt-nøkkelen. Nettadresse og e-post får en liten lenke ved siden av
// etiketten; lenkene virker også for leseren.
export function kontaktfelt(nokkel, post, { nettEtikett = 'Nettside' } = {}) {
  const lenke = (href, tekst) => href ? `<a class="undertekst" href="${escapeHtml(href)}" target="_blank" rel="noopener" style="text-transform:none; letter-spacing:0; font-weight:600">${tekst}</a>` : '';
  const etikett = (tekst, l = '') => `<span class="etikett" style="display:flex; justify-content:space-between; gap:8px">${tekst}${l}</span>`;
  const felt = (id, tekst, plass, l = '') => `<label class="felt">${etikett(tekst, l)}<input class="inndata" placeholder="${plass}" ${feltAttr(nokkel(id), post[id])}></label>`;
  const epost = String(post.epost || '').trim();
  return `
    ${felt('nettadresse', nettEtikett, 'https://…', lenke(nettlenke(post.nettadresse), 'Åpne ↗'))}
    ${felt('kontaktperson', 'Kontaktperson', 'Navn')}
    <div class="to-kol">
      ${felt('epost', 'E-post', 'navn@eksempel.no', lenke(epost && `mailto:${epost}`, 'Skriv e-post'))}
      ${felt('telefon', 'Telefon', '')}
    </div>`;
}

// Innholdet i kolonnen «Kontakt» i giver- og leverandørlisten: kontaktpersonen
// (navn · telefon · e-post) og første linje av notatet under, når det er
// utfylt. Begge på én linje hver, avkortet med «…».
export function kontaktcelle(post) {
  const linje = (tekst, klasse = '') => `<div class="${klasse}" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml(tekst)}</div>`;
  const sammendrag = kontaktsammendrag(post), notat = notatlinje(post);
  if (!sammendrag && !notat) return linje('–');
  return (sammendrag ? linje(sammendrag) : '') + (notat ? linje(notat, sammendrag ? 'undertekst' : '') : '');
}
