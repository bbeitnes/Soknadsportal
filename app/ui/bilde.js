import { hentPdfLib } from './rapport.js';
import { lesOrd } from './tekstgjenkjenning.js';

// Bilder fra mobilkamera er store (og på iPhone ofte HEIC, som PDF-
// rapporten ikke kan ta med). Vi tegner bildet på et lerret og lagrer det
// som JPEG, maks 2000 px på lengste side. PDF og små JPEG/PNG går urørt.
// `rett: true` tegner også små JPEG på nytt, så retningen fra kameraet
// (EXIF) blir en del av bildet – pdf-lib leser ikke EXIF.

export async function klargjorBilde(fil, { rett = false } = {}) {
  if (fil.type === 'application/pdf') return fil;
  const erJpegPng = fil.type === 'image/jpeg' || fil.type === 'image/png';
  if (erJpegPng && fil.size < 1.5 * 1024 * 1024 && !(rett && fil.type === 'image/jpeg')) return fil;
  let bilde;
  try {
    bilde = await createImageBitmap(fil);
  } catch {
    // Nettleseren kan ikke dekode formatet (f.eks. HEIC utenfor Safari).
    if (erJpegPng) return fil;
    throw new Error('Bildeformatet støttes ikke. Bruk JPEG eller PNG, eller slå på «Mest kompatibelt» i kamerainnstillingene.');
  }
  const maks = 2000;
  const skala = Math.min(1, maks / Math.max(bilde.width, bilde.height));
  const lerret = document.createElement('canvas');
  lerret.width = Math.round(bilde.width * skala);
  lerret.height = Math.round(bilde.height * skala);
  lerret.getContext('2d').drawImage(bilde, 0, 0, lerret.width, lerret.height);
  bilde.close?.();
  const blob = await new Promise(r => lerret.toBlob(r, 'image/jpeg', 0.85));
  const navn = fil.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], navn, { type: 'image/jpeg' });
}

// Kvitteringer fra mobil lagres som PDF: bildet legges på en A4-side med
// samme plassering som revisjonsrapporten bruker for bilder, så løpenummeret
// i hjørnet ikke dekker kvitteringen. Teksten i bildet legges usynlig oppå,
// ord for ord, så PDF-en kan søkes i. Går det ikke (PDF-biblioteket lar seg
// ikke laste), beholdes bildet – rapporten tar med begge deler.
const A4 = [595.28, 841.89];

export async function bildeTilPdf(fil) {
  if (fil.type !== 'image/jpeg' && fil.type !== 'image/png') return fil;
  try {
    const [{ PDFDocument, StandardFonts, TextRenderingMode, setTextRenderingMode }, ord] = await Promise.all([hentPdfLib(), lesOrd(fil)]);
    const doc = await PDFDocument.create();
    const bytes = await fil.arrayBuffer();
    const bilde = fil.type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const maksB = A4[0] - 2 * 36, maksH = A4[1] - 36 - 90;
    const skala = Math.min(maksB / bilde.width, maksH / bilde.height, 1);
    const b = bilde.width * skala, h = bilde.height * skala;
    const x = (A4[0] - b) / 2, topp = A4[1] - 90;
    const side = doc.addPage(A4);
    side.drawImage(bilde, { x, y: topp - h, width: b, height: h });
    if (ord.length) {
      const font = await doc.embedFont(StandardFonts.Helvetica);
      side.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
      for (const o of ord) {
        // Standardfonten dekker bare WinAnsi. Skriftstørrelsen velges så
        // ordet blir like bredt som i bildet.
        const tekst = o.tekst.replace(/[^\x20-\x7e\u00a1-\u00ff]/g, '');
        if (!tekst) continue;
        const storrelse = Math.min(100, Math.max(1, (o.x1 - o.x0) * skala / font.widthOfTextAtSize(tekst, 1)));
        side.drawText(tekst + ' ', { x: x + o.x0 * skala, y: topp - o.y * skala, size: storrelse, font });
      }
      side.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));
    }
    const navn = fil.name.replace(/\.[^.]+$/, '') + '.pdf';
    return new File([await doc.save()], navn, { type: 'application/pdf' });
  } catch (err) {
    console.error('Kunne ikke gjøre om bildet til PDF', err);
    return fil;
  }
}
