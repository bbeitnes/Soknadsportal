// Revisjonsrapporten: én samlet PDF laget i nettleseren med pdf-lib.
//   1. Forside: søknad, giver, søkt, innvilget, brukt, gjenstående
//      (+ fordeling giver / momskompensasjon når det gjelder).
//   2. Oversiktstabell over fakturaene. Summen stemmer med forsiden.
//   3. Alle fakturaene i rekkefølge, med løpenummer stamplet i hjørnet.
//      Bilder blir egne sider; PDF-er kopieres inn side for side.
import { tilstand, innkjopFor, fakturaerFor, filBytes } from '../data/index.js';
import { pott, fakturaDekker, giverandel, posttittel } from '../data/beregning.js';
import { posterFor } from '../sider/revisjon.js';
import { belop, datoFelt } from './format.js';

const PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
let lasting = null;

export function hentPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  lasting ||= new Promise((ok, feil) => {
    const s = document.createElement('script');
    s.src = PDF_LIB;
    s.onload = () => ok(window.PDFLib);
    s.onerror = () => { lasting = null; feil(new Error('Kunne ikke laste PDF-biblioteket')); };
    document.head.appendChild(s);
  });
  return lasting;
}

// Standardfontene i PDF dekker WinAnsi (æøå er med), men ikke f.eks. «−»
// og «→». Vi bytter til tegn som finnes.
export const trygg = t => String(t ?? '').replace(/[−–—]/g, '-').replace(/→/g, '->').replace(/ /g, ' ').replace(/[^\x20-\x7e -ÿ]/g, '?');

const A4 = [595.28, 841.89];
const MARG = 56;

export async function lagRevisjonsrapport(s) {
  const { PDFDocument, StandardFonts, rgb } = await hentPdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fet = await doc.embedFont(StandardFonts.HelveticaBold);
  const svart = rgb(0.125, 0.118, 0.114), graa = rgb(0.38, 0.36, 0.36), lys = rgb(0.84, 0.83, 0.83);

  const giver = tilstand.givere.find(g => g.id === s.giverId);
  const fakturaer = fakturaerFor(s.id);
  const poster = posterFor(s);
  const p = pott(s, innkjopFor(s.id));
  const fakturert = fakturaer.reduce((sum, f) => sum + (Number(f.belop) || 0), 0);
  const dato = new Date().toLocaleDateString('nb-NO');

  // ——— Tegnehjelpere ———
  const bredde = (t, st, f = font) => f.widthOfTextAtSize(trygg(t), st);
  function brytTekst(t, st, maks, f = font) {
    const ord = trygg(t).split(/\s+/), linjer = []; let linje = '';
    for (const o of ord) {
      const prov = linje ? `${linje} ${o}` : o;
      if (bredde(prov, st, f) <= maks || !linje) linje = prov; else { linjer.push(linje); linje = o; }
    }
    if (linje) linjer.push(linje);
    return linjer;
  }
  let side, y;
  function nySide() {
    side = doc.addPage(A4);
    y = A4[1] - MARG;
    return side;
  }
  function tekst(t, x, st = 11, f = font, farge = svart) { side.drawText(trygg(t), { x, y, size: st, font: f, color: farge }); }
  function hoyre(t, xSlutt, st = 11, f = font, farge = svart) { side.drawText(trygg(t), { x: xSlutt - bredde(t, st, f), y, size: st, font: f, color: farge }); }
  function strek(tykkelse = 0.75, farge = lys) { side.drawLine({ start: { x: MARG, y: y - 4 }, end: { x: A4[0] - MARG, y: y - 4 }, thickness: tykkelse, color: farge }); }
  function stempel(nr, sidenr) {
    const t = String(nr), st = 20, b = bredde(t, st, fet) + 24, h = 34;
    const x = A4[0] - 40 - b, yy = A4[1] - 40 - h;
    side.drawRectangle({ x, y: yy, width: b, height: h, borderColor: svart, borderWidth: 2, color: rgb(1, 1, 1) });
    side.drawText(t, { x: x + 12, y: yy + 9, size: st, font: fet, color: svart });
    side.drawText(trygg(`Faktura ${nr}${sidenr ? ` · side ${sidenr}` : ''}`), { x: MARG, y: A4[1] - 30, size: 8, font, color: graa });
  }

  // ——— 1. Forside ———
  nySide();
  tekst(s.tittel || 'Søknad', MARG, 24, fet); y -= 20;
  tekst(`${giver?.navn || 'Ukjent giver'} · Revisjonsrapport · ${dato}`, MARG, 11, font, graa); y -= 36;
  const linje = (etikett, verdi, f = font) => { tekst(etikett, MARG, 12, f); hoyre(verdi, A4[0] - MARG, 12, f); y -= 8; strek(); y -= 18; };
  linje('Søkt', belop(p.sokt));
  linje('Innvilget', p.innvilget == null ? '–' : belop(p.innvilget));
  linje('Disponert (tilbud og utgifter)', belop(p.disponertFull));
  linje('Brukt (fakturert)', belop(fakturert), fet);
  linje('Gjenstående av innvilget', p.innvilget == null ? '–' : belop(p.innvilget - (p.harMoms ? giverandel(fakturert, p.prosent) : fakturert)));
  if (p.harMoms) {
    y -= 10;
    tekst('Fordeling av det fakturerte', MARG, 10, fet, graa); y -= 20;
    linje(`Fra giver (${p.giverProsent} %)`, belop(giverandel(fakturert, p.prosent)));
    linje(`Fra momskompensasjon (${p.prosent} %) – forventes mottatt neste år`, belop(fakturert - giverandel(fakturert, p.prosent)));
  }
  y -= 20;
  for (const l of brytTekst(`Rapporten inneholder ${fakturaer.length} ${fakturaer.length === 1 ? 'faktura' : 'fakturaer'} med løpenummer 1–${fakturaer.length}. Løpenummeret er stamplet øverst til høyre på hvert bilag.`, 10, A4[0] - 2 * MARG)) { tekst(l, MARG, 10, font, graa); y -= 14; }

  // ——— 2. Oversiktstabell ———
  nySide();
  tekst('Oversikt over fakturaer', MARG, 18, fet); y -= 30;
  const kol = { nr: MARG, fnr: MARG + 30, dato: MARG + 110, lev: MARG + 175, belop: A4[0] - MARG - 150, gjelder: A4[0] - MARG - 135 };
  const gjelderBredde = A4[0] - MARG - kol.gjelder;
  const tabellhode = () => {
    tekst('NR', kol.nr, 8, fet, graa); tekst('FAKTURANR', kol.fnr, 8, fet, graa); tekst('DATO', kol.dato, 8, fet, graa); tekst('LEVERANDØR', kol.lev, 8, fet, graa); hoyre('BELØP', kol.belop, 8, fet, graa); tekst('GJELDER', kol.gjelder, 8, fet, graa);
    y -= 6; strek(1.5, svart); y -= 16;
  };
  tabellhode();
  for (const f of fakturaer) {
    const gjelder = fakturaDekker(f).map(id => poster.find(x => x.id === id)).filter(Boolean).map(posttittel).join(', ') || 'Ikke koblet';
    const linjer = brytTekst(gjelder, 9, gjelderBredde);
    // Merknaden (f.eks. forklaring på et avvik) står under «Gjelder», i grått.
    const merknad = (f.merknad || '').trim() ? brytTekst(`Merknad: ${f.merknad.trim()}`, 8.5, gjelderBredde) : [];
    const hoyde = Math.max(1, linjer.length) * 12 + merknad.length * 11 + 8;
    if (y - hoyde < MARG + 40) { nySide(); tabellhode(); }
    tekst(String(f.lopenummer), kol.nr, 10, fet);
    tekst(f.fakturanr || '–', kol.fnr, 9);
    tekst(f.dato ? datoFelt(f.dato) : '–', kol.dato, 9);
    for (const l of brytTekst(f.leverandor || '–', 9, kol.belop - 90 - kol.lev).slice(0, 2)) { tekst(l, kol.lev, 9); }
    hoyre(f.belop == null ? '–' : belop(f.belop), kol.belop, 10, fet);
    let yy = y;
    for (const l of linjer) { side.drawText(trygg(l), { x: kol.gjelder, y: yy, size: 9, font, color: svart }); yy -= 12; }
    for (const l of merknad) { side.drawText(trygg(l), { x: kol.gjelder, y: yy, size: 8.5, font, color: graa }); yy -= 11; }
    y -= hoyde - 8; strek(); y -= 16;
  }
  y -= 4; strek(1.5, svart); y -= 16;
  tekst('Sum fakturert', kol.nr, 11, fet); hoyre(belop(fakturert), kol.belop, 12, fet);
  y -= 24;
  tekst('Summen stemmer med «Brukt (fakturert)» på forsiden.', MARG, 9, font, graa);

  // ——— 3. Bilagene ———
  for (const f of fakturaer) {
    const nr = f.lopenummer;
    let lagt = false;
    if (f.fil?.sti) {
      try {
        const bytes = await filBytes(f.fil.sti);
        const type = (f.fil.type || '').toLowerCase();
        if (type === 'application/pdf' || f.fil.navn?.toLowerCase().endsWith('.pdf')) {
          const kilde = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const sider = await doc.copyPages(kilde, kilde.getPageIndices());
          sider.forEach((pg, idx) => { doc.addPage(pg); side = pg; stempel(nr, sider.length > 1 ? idx + 1 : 0); });
          lagt = true;
        } else if (type === 'image/jpeg' || type === 'image/png' || /\.(jpe?g|png)$/i.test(f.fil.navn || '')) {
          const bilde = type === 'image/png' || /\.png$/i.test(f.fil.navn || '') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
          nySide();
          const maksB = A4[0] - 2 * 36, maksH = A4[1] - 36 - 90;
          const skala = Math.min(maksB / bilde.width, maksH / bilde.height, 1);
          const b = bilde.width * skala, h = bilde.height * skala;
          side.drawImage(bilde, { x: (A4[0] - b) / 2, y: 36, width: b, height: h });
          stempel(nr, 0);
          lagt = true;
        }
      } catch (err) {
        console.error('Kunne ikke ta med bilag', f.fil, err);
      }
    }
    if (!lagt) {
      nySide();
      stempel(nr, 0);
      y = A4[1] / 2 + 20;
      const melding = f.fil ? `Vedlegget «${f.fil.navn}» kunne ikke tas med (ukjent format).` : 'Vedlegg mangler.';
      for (const l of brytTekst(melding, 12, A4[0] - 2 * MARG)) { tekst(l, MARG, 12, fet, graa); y -= 16; }
      y -= 8;
      tekst(`${f.leverandor || 'Ukjent leverandør'} · ${f.fakturanr || 'uten nummer'} · ${f.dato ? datoFelt(f.dato) : 'uten dato'} · ${f.belop == null ? '–' : belop(f.belop) + ' kr'}`, MARG, 10, font, graa);
    }
  }

  doc.setTitle(`Revisjonsrapport – ${s.tittel || 'Søknad'}`);
  const ut = await doc.save();
  const blob = new Blob([ut], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Revisjonsrapport ${(s.tittel || 'soknad').replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
