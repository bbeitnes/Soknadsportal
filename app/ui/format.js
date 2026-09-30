// Formatering og tolking av tall og datoer. Rene funksjoner uten DOM eller
// Firebase, så de kan testes med node (se test/).

const NBSP = ' ';

export function escapeHtml(tekst) {
  return String(tekst ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Hele tall med tusenskille: 12000 → «12 000» (hardt mellomrom, så tallet
// aldri brytes over to linjer). Brukes for antall og i redigerbare tallfelt.
export function heltall(n) {
  const tall = Math.round(Number(n) || 0);
  const tegn = tall < 0 ? '−' : '';
  return tegn + String(Math.abs(tall)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

// Beløp, alltid med to desimaler: 8060.8 → «8 060,80», 12000 → «12 000,00».
// Alle summer i portalen vises slik.
export function kr(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100;
  const [hele, ore] = Math.abs(r).toFixed(2).split('.');
  return (r < 0 ? '−' : '') + heltall(Number(hele)) + ',' + ore;
}

export const belop = kr;

// Beløp/antall fra et tekstfelt. Tåler mellomrom som tusenskille og «kr».
// Tomt felt gir null, slik at kallstedet kan skille «tomt» fra 0.
// Hele kroner; tolkBelop() beholder ørene.
export function tolkTall(tekst) {
  const n = tolkBelop(tekst);
  return n == null || Number.isNaN(n) ? n : n < 0 ? NaN : Math.round(n);
}

// «1 234,56» → 1234.56. Punktum regnes som tusenskille, komma som desimal.
// Negativt beløp («−500») er lov: en kreditnota.
export function tolkBelop(tekst) {
  const renset = String(tekst ?? '').replace(/[\s kr.]/gi, '').replace(',', '.').replace('−', '-');
  if (renset === '') return null;
  const n = Number(renset);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

// «15.3.26», «15.03.2026», «150326», «15032026» og «2026-03-15» → «2026-03-15».
// Tomt gir null, ugyldig gir NaN (kallstedet viser da feil og lagrer ikke).
export function tolkDato(tekst) {
  const t = String(tekst ?? '').trim();
  if (t === '') return null;
  let d, m, a;
  let treff = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (treff) [, a, m, d] = treff.map(Number);
  else if ((treff = t.match(/^(\d{2})(\d{2})(\d{2}|\d{4})$/))) {
    // Bare sifre, uten skilletegn: ddmmåå eller ddmmåååå.
    [, d, m, a] = treff.map(Number);
    if (a < 100) a += 2000;
  } else {
    treff = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/);
    if (!treff) return NaN;
    [, d, m, a] = treff.map(Number);
    if (a < 100) a += 2000;
  }
  const dato = new Date(Date.UTC(a, m - 1, d));
  if (dato.getUTCFullYear() !== a || dato.getUTCMonth() !== m - 1 || dato.getUTCDate() !== d) return NaN;
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// «2026-03-15» → «15.03.2026». Brukes i redigerbare felt.
export function datoFelt(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}.${m}.${a}`;
}

const MANEDER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

// Tidspunkt for «sist endret»: «i dag 14:02», «i går 09:10», «12. juni»,
// «3. desember 2025». `naa` kan settes i tester.
export function tidspunkt(ms, naa = Date.now()) {
  if (!ms) return '';
  const t = new Date(ms), n = new Date(naa);
  const kl = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  const dag = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((dag(n) - dag(t)) / 86400000);
  if (diff === 0) return `i dag ${kl}`;
  if (diff === 1) return `i går ${kl}`;
  const tekst = `${t.getDate()}. ${MANEDER[t.getMonth()]}`;
  return t.getFullYear() === n.getFullYear() ? tekst : `${tekst} ${t.getFullYear()}`;
}

// «Kari Nordmann» → «Kari». E-post uten navn → delen før @.
export function fornavn(navn, epost) {
  if (navn && navn.trim()) return navn.trim().split(/\s+/)[0];
  return (epost || '').split('@')[0] || 'ukjent';
}
