// Bestilling til én leverandør som PDF (pdf-lib, som revisjonsrapporten):
// hvem vi er, hvem den går til, linjene som er valgt hos leverandøren med
// antall, pris og rabatt, frakt og total. Lastes ned; sendes av brukeren selv.
import { hentPdfLib, trygg } from './rapport.js';
import { belop } from './format.js';

const A4 = [595.28, 841.89];
const MARG = 48;

const linjerAv = tekst => String(tekst || '').split('\n').map(l => l.trim()).filter(Boolean);

// org: innstillingsdokumentet. leverandor: { navn, kontaktperson, epost, telefon, notat }.
// b: resultatet av bestilling() i data/beregning.js.
export async function lagBestilling({ org, leverandor, b, merket }) {
  const { PDFDocument, StandardFonts, rgb } = await hentPdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fet = await doc.embedFont(StandardFonts.HelveticaBold);
  const svart = rgb(0.125, 0.118, 0.114), graa = rgb(0.38, 0.36, 0.36), lys = rgb(0.84, 0.83, 0.83);
  const dato = new Date().toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const bredde = (t, st, f = font) => f.widthOfTextAtSize(trygg(t), st);
  function bryt(t, st, maks, f = font) {
    const ut = []; let linje = '';
    for (const o of trygg(t).split(/\s+/)) {
      const prov = linje ? `${linje} ${o}` : o;
      if (bredde(prov, st, f) <= maks || !linje) linje = prov; else { ut.push(linje); linje = o; }
    }
    if (linje) ut.push(linje);
    return ut;
  }
  let side, y;
  const tekst = (t, x, st = 10, f = font, farge = svart, yy = y) => side.drawText(trygg(t), { x, y: yy, size: st, font: f, color: farge });
  const hoyre = (t, xSlutt, st = 10, f = font, farge = svart, yy = y) => side.drawText(trygg(t), { x: xSlutt - bredde(t, st, f), y: yy, size: st, font: f, color: farge });
  const strek = (tykkelse = 0.75, farge = lys) => side.drawLine({ start: { x: MARG, y }, end: { x: A4[0] - MARG, y }, thickness: tykkelse, color: farge });

  const hoyrekant = A4[0] - MARG;
  const kol = { nr: MARG, vare: MARG + 22, antall: 352, liste: 420, rabatt: 472, sum: hoyrekant };
  const varebredde = kol.antall - 40 - kol.vare;
  function tabellhode() {
    tekst('NR', kol.nr, 7.5, fet, graa); tekst('VARE', kol.vare, 7.5, fet, graa);
    hoyre('ANTALL', kol.antall, 7.5, fet, graa); hoyre('STK.PRIS', kol.liste, 7.5, fet, graa);
    hoyre('RABATT', kol.rabatt, 7.5, fet, graa); hoyre('SUM', kol.sum, 7.5, fet, graa);
    y -= 6; strek(1.25, svart); y -= 14;
  }
  function nySide(medHode) {
    side = doc.addPage(A4);
    y = A4[1] - MARG;
    if (medHode) { tekst(`Bestilling fra ${org.orgNavn || ''} · ${dato} · forts.`, MARG, 8, font, graa); y -= 22; tabellhode(); }
  }

  // ——— Hode ———
  nySide(false);
  tekst('Bestilling', MARG, 24, fet); y -= 18;
  tekst(`${dato}${merket ? ` · ${merket}` : ''}`, MARG, 10, font, graa); y -= 30;

  // To blokker side om side. Gir laveste y etter blokkene.
  function blokker(venstre, hoyreBlokk) {
    const topp = y;
    let lavest = topp;
    [[venstre, MARG], [hoyreBlokk, MARG + 260]].forEach(([blokk, x]) => {
      if (!blokk || !blokk.linjer.length) return;
      let yy = topp;
      tekst(blokk.etikett, x, 7.5, fet, graa, yy); yy -= 14;
      blokk.linjer.forEach((l, i) => {
        for (const del of bryt(l, 10, 230, i === 0 && blokk.fetForst ? fet : font)) {
          tekst(del, x, 10, i === 0 && blokk.fetForst ? fet : font, svart, yy); yy -= 13;
        }
      });
      lavest = Math.min(lavest, yy);
    });
    y = lavest - 12;
  }
  blokker(
    { etikett: 'FRA', fetForst: true, linjer: [org.orgNavn || 'Kontaktinfo mangler – legges inn under Innstillinger', org.orgNr && `Org.nr. ${org.orgNr}`, ...linjerAv(org.adresse), org.kontaktperson && `Kontakt: ${org.kontaktperson}`, [org.telefon, org.epost].filter(Boolean).join(' · ')].filter(Boolean) },
    { etikett: 'TIL', fetForst: true, linjer: [leverandor.navn || 'Leverandør', leverandor.kontaktperson, [leverandor.epost, leverandor.telefon].filter(Boolean).join(' · '), ...linjerAv(leverandor.notat ?? leverandor.kontakt)].filter(Boolean) },
  );
  const levering = linjerAv(org.leveringsadresse || org.adresse), faktura = linjerAv(org.fakturainfo);
  if (levering.length || faktura.length) {
    blokker(
      levering.length ? { etikett: 'LEVERES TIL', linjer: [org.orgNavn, ...levering].filter(Boolean) } : null,
      faktura.length ? { etikett: 'FAKTURA SENDES TIL', linjer: faktura } : null,
    );
  }
  if (b.dokumenter.length) {
    for (const l of bryt(`I henhold til tilbud: ${b.dokumenter.join(', ')}`, 10, hoyrekant - MARG)) { tekst(l, MARG, 10); y -= 13; }
    y -= 8;
  }
  y -= 4;

  // ——— Linjene ———
  tabellhode();
  b.linjer.forEach((l, nr) => {
    const vare = bryt(l.vare, 9.5, varebredde, fet);
    const var_ = l.varLinje ? bryt(`Vår linje: ${l.varLinje}`, 8, varebredde) : [];
    const hoyde = vare.length * 12 + var_.length * 10 + 6;
    if (y - hoyde < MARG + 30) nySide(true);
    tekst(String(nr + 1), kol.nr, 9.5, font, graa);
    hoyre(String(l.antall), kol.antall, 9.5);
    hoyre(belop(l.liste), kol.liste, 9.5);
    if (l.rabatt) hoyre(`-${l.rabatt}`, kol.rabatt, 9.5);
    hoyre(belop(l.sum), kol.sum, 9.5, fet);
    for (const del of vare) { tekst(del, kol.vare, 9.5, fet); y -= 12; }
    for (const del of var_) { tekst(del, kol.vare, 8, font, graa); y -= 10; }
    y += 8; strek(); y -= 14;
  });

  // ——— Sum ———
  if (y < MARG + 90) nySide(true);
  y -= 2;
  if (b.frakt) {
    tekst('Sum varer', kol.vare, 10); hoyre(belop(b.sum), kol.sum, 10); y -= 15;
    tekst('Frakt og faste kostnader', kol.vare, 10); hoyre(belop(b.frakt), kol.sum, 10); y -= 9;
    strek(); y -= 16;
  }
  tekst('Totalt', kol.vare, 12, fet); hoyre(belop(b.total), kol.sum, 13, fet); y -= 8;
  strek(1.25, svart); y -= 18;
  tekst('Priser og rabatter er som oppgitt i tilbudet.', MARG, 9, font, graa);

  doc.setTitle(`Bestilling – ${leverandor.navn || 'leverandør'}`);
  const blob = new Blob([await doc.save()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bestilling ${(leverandor.navn || 'leverandor').replace(/[\\/:*?"<>|]/g, '-')} ${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
