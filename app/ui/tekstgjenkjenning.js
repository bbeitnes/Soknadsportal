// Tekstgjenkjenning (OCR) i nettleseren med Tesseract.js, så kvitterings-
// PDF-ene blir søkbare. Ingenting sendes noe sted. Biblioteket kommer fra
// cdnjs; motoren og den norske språkpakken (ca. 4 MB til sammen) hentes fra
// jsdelivr første gang og ligger siden i nettleserens mellomlager.
const TESSERACT = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/7.0.0/';
const MAKS_VENTETID = 30000;
let lasting = null, arbeider = null;

function hentTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  lasting ||= new Promise((ok, feil) => {
    const s = document.createElement('script');
    s.src = TESSERACT + 'tesseract.min.js';
    s.onload = () => ok(window.Tesseract);
    s.onerror = () => { lasting = null; feil(new Error('Kunne ikke laste tekstgjenkjenningen')); };
    document.head.appendChild(s);
  });
  return lasting;
}

async function gjenkjenn(fil) {
  const tesseract = await hentTesseract();
  // Én arbeider gjenbrukes for alle kvitteringene i økten.
  arbeider ||= tesseract.createWorker('nor', 1, { workerPath: TESSERACT + 'worker.min.js' });
  arbeider.catch(() => { arbeider = null; });
  const { data } = await (await arbeider).recognize(fil, {}, { blocks: true });
  const ord = [];
  for (const blokk of data.blocks || []) for (const avsnitt of blokk.paragraphs || []) for (const linje of avsnitt.lines || []) for (const o of linje.words || []) {
    if (o.confidence < 20 || !o.text?.trim()) continue;
    // Ordene settes på linjens grunnlinje (ruten går lavere for ord med
    // g, j, p …), som kan skrå når bildet er tatt litt på skjeve.
    const g = linje.baseline, x = (o.bbox.x0 + o.bbox.x1) / 2;
    const y = g && g.x1 > g.x0 ? g.y0 + (g.y1 - g.y0) * (x - g.x0) / (g.x1 - g.x0) : o.bbox.y1;
    ord.push({ tekst: o.text.trim(), x0: o.bbox.x0, x1: o.bbox.x1, y });
  }
  return ord;
}

// Gir ordene i bildet: [{ tekst, x0, x1, y }] i bildets piksler (y er
// grunnlinjen, målt fra toppen). Tom liste hvis det ikke går eller tar for
// lang tid – da lagres kvitteringen uten søkbar tekst.
export async function lesOrd(fil) {
  let tidtaker;
  try {
    return await Promise.race([
      gjenkjenn(fil),
      new Promise((_, feil) => { tidtaker = setTimeout(() => feil(new Error('Tekstgjenkjenningen tok for lang tid')), MAKS_VENTETID); }),
    ]);
  } catch (err) {
    console.error('Kunne ikke lese teksten i bildet', err);
    return [];
  } finally {
    clearTimeout(tidtaker);
  }
}
