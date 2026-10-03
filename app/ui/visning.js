// Bindeledd mellom sidene og appskallet (app.js), så sidene kan be om ny
// tegning eller fokus uten å importere app.js (det ville gitt en sirkel).
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
  fil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  pluss: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  fjern: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  las: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
};

// Avkrysningsboks som knapp (lagres ved klikk).
export function avkryss(pa, etikett, handling, data = '', ekstraKlasse = '') {
  return `<button type="button" class="avkryss ${ekstraKlasse}" data-handling="${handling}" ${data} aria-pressed="${pa}"><span class="boks ${pa ? 'pa' : ''}">${IKON.hak}</span>${etikett}</button>`;
}

// Sidepanel-ramme. `nytt` gir panelet fokus når det åpnes.
export function sidepanel(innhold, { nytt = false, rull = 'panel' } = {}) {
  return `<aside class="sidepanel" tabindex="-1" data-rull="${rull}" data-nytt="${nytt ? 'ja' : 'nei'}">${innhold}</aside>`;
}

export function lukkeknapp(handling = 'lukk-panel') {
  return `<button type="button" class="ikonknapp" data-handling="${handling}" title="Lukk (Esc)">${IKON.lukk}</button>`;
}
