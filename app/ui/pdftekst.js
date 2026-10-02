// Leser teksten ut av en PDF i nettleseren med pdf.js (fra cdnjs), linje for
// linje. Brukes til å lese priser fra tilbud. Ingenting sendes noe sted.
// Virker bare på PDF-er med ekte tekst – et skannet bilde gir ingen linjer.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let lasting = null;

function hentPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  lasting ||= new Promise((ok, feil) => {
    const s = document.createElement('script');
    s.src = PDFJS + 'pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
      ok(window.pdfjsLib);
    };
    s.onerror = () => { lasting = null; feil(new Error('Kunne ikke laste PDF-leseren')); };
    document.head.appendChild(s);
  });
  return lasting;
}

// Gir [{ side, y, tekst }], ovenfra og ned. Tekstbiter på samme høyde blir én
// linje, og store mellomrom (kolonneskiller i en tabell) blir tabulator, så
// tolkTilbudslinjer() vet hvor cellene går. Tekst som ligger oppå en annen
// (usynlige felt i leverandørens mal) blir en egen celle, ikke limt til naboen.
export async function lesPdfLinjer(bytes) {
  const pdfjs = await hentPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const ut = [];
  for (let nr = 1; nr <= doc.numPages; nr++) {
    const side = await doc.getPage(nr);
    const innhold = await side.getTextContent();
    const biter = innhold.items
      .filter(i => i.str.trim() !== '')
      .map(i => ({ tekst: i.str.trim(), x: i.transform[4], y: i.transform[5], bredde: i.width, hoyde: i.height || Math.abs(i.transform[3]) || 10 }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const linjer = [];
    for (const bit of biter) {
      const l = linjer.at(-1);
      if (l && Math.abs(l.y - bit.y) <= 2) l.biter.push(bit);
      else linjer.push({ y: bit.y, biter: [bit] });
    }
    for (const l of linjer) {
      l.biter.sort((a, b) => a.x - b.x);
      let tekst = '', slutt = 0, oppa = false;
      l.biter.forEach((bit, i) => {
        if (i) {
          const gap = bit.x - slutt, over = gap < -bit.hoyde * 0.6;
          tekst += over || oppa || gap > bit.hoyde * 0.6 ? '\t' : gap > 0.5 ? ' ' : '';
          oppa = over;
        }
        tekst += bit.tekst;
        slutt = Math.max(slutt, bit.x + bit.bredde);
      });
      ut.push({ side: nr, y: l.y, hoyde: l.biter[0].hoyde, tekst });
    }
  }
  return ut;
}
