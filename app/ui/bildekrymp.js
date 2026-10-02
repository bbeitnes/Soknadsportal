// Krymper bilder i revisjonsrapporten. Fotograferte bilag er store (flere MB
// per bilde), og rapporten trenger bare nok til at bilaget kan leses.
// Originalen i lagringen røres ikke.
//   - krympBilde(): et løst bilde (JPEG/PNG) → mindre JPEG.
//   - krympBilderIPdf(): JPEG-bilder inne i et PDF-bilag byttes mot mindre
//     utgaver. Tekst og vektorgrafikk (ekte PDF-fakturaer) og den usynlige
//     teksten i mobilkvitteringene røres ikke.
// Et bilde byttes bare når den nye utgaven er klart mindre; ellers (og når
// noe går galt) blir originalen stående.

const MAKS = 1600;          // punkter på lengste side
const KVALITET = 0.6;       // JPEG-kvalitet
const MINST = 150 * 1024;   // mindre bilder enn dette lar vi være
const GEVINST = 0.8;        // den nye må være minst 20 % mindre

// Fjerner EXIF fra en JPEG. Et bilde inne i en PDF vises uten hensyn til
// EXIF-retningen, mens nettleseren roterer etter den når bildet dekodes.
export function utenExif(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] !== 0xff || b[1] !== 0xd8) return b;
  const deler = [b.subarray(0, 2)];
  let i = 2, fjernet = false;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const merke = b[i + 1];
    if (merke === 0xda || merke === 0xd9) break; // herfra er det bildedata
    const lengde = (b[i + 2] << 8) | b[i + 3];
    if (lengde < 2) break;
    const exif = merke === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66; // «Exif»
    if (exif) fjernet = true; else deler.push(b.subarray(i, i + 2 + lengde));
    i += 2 + lengde;
  }
  if (!fjernet) return b;
  deler.push(b.subarray(i));
  const ut = new Uint8Array(deler.reduce((sum, d) => sum + d.length, 0));
  let p = 0;
  for (const d of deler) { ut.set(d, p); p += d.length; }
  return ut;
}

async function tilJpeg(bytes, type) {
  const bilde = await createImageBitmap(new Blob([bytes], { type }));
  try {
    const skala = Math.min(1, MAKS / Math.max(bilde.width, bilde.height));
    const lerret = document.createElement('canvas');
    lerret.width = Math.max(1, Math.round(bilde.width * skala));
    lerret.height = Math.max(1, Math.round(bilde.height * skala));
    const ctx = lerret.getContext('2d');
    // JPEG har ikke gjennomsiktighet: gjennomsiktig PNG får hvit bunn.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lerret.width, lerret.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bilde, 0, 0, lerret.width, lerret.height);
    const blob = await new Promise(r => lerret.toBlob(r, 'image/jpeg', KVALITET));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), bredde: lerret.width, hoyde: lerret.height, kildeBredde: bilde.width, kildeHoyde: bilde.height };
  } finally {
    bilde.close?.();
  }
}

// Gir bildet som mindre JPEG, eller null når det ikke lønner seg (eller
// nettleseren ikke kan lese bildet).
export async function krympBilde(bytes, type) {
  if (bytes.byteLength < MINST) return null;
  try {
    const ny = await tilJpeg(bytes, type);
    return ny.bytes.length < bytes.byteLength * GEVINST ? ny.bytes : null;
  } catch {
    return null;
  }
}

// Bare vanlige JPEG-bilder i gråtoner eller RGB. CMYK, masker og andre
// spesialtilfeller lar vi være – de tåler ikke å bli tegnet på nytt.
function kanKrympes(d, { PDFName, PDFArray, PDFNumber }) {
  const n = navn => PDFName.of(navn);
  if (d.lookup(n('Subtype')) !== n('Image')) return false;
  let filter = d.lookup(n('Filter'));
  if (filter instanceof PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : null;
  if (filter !== n('DCTDecode')) return false;
  if (d.has(n('Decode')) || d.has(n('Mask')) || d.has(n('SMask')) || d.has(n('ImageMask'))) return false;
  const farger = d.lookup(n('ColorSpace'));
  if (farger === n('DeviceRGB') || farger === n('DeviceGray')) return true;
  if (!(farger instanceof PDFArray) || !farger.size()) return false;
  const slag = farger.lookup(0);
  if (slag === n('CalRGB') || slag === n('CalGray')) return true;
  if (slag !== n('ICCBased')) return false;
  const kanaler = farger.lookup(1)?.dict?.lookup(n('N'));
  return kanaler instanceof PDFNumber && (kanaler.asNumber() === 1 || kanaler.asNumber() === 3);
}

// Bytter store JPEG-bilder i PDF-en (et PDFDocument fra pdf-lib) mot mindre
// utgaver. `PDFLib` er biblioteket fra hentPdfLib(). Gjøres før sidene
// kopieres inn i rapporten.
export async function krympBilderIPdf(pdf, PDFLib) {
  const { PDFName, PDFNumber, PDFRawStream } = PDFLib;
  const n = navn => PDFName.of(navn);
  for (const [ref, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || obj.contents.length < MINST) continue;
    try {
      const d = obj.dict;
      if (!kanKrympes(d, PDFLib)) continue;
      const ny = await tilJpeg(utenExif(obj.contents), 'image/jpeg');
      // Stemmer ikke målene, har nettleseren lest bildet annerledes enn PDF-en.
      if (ny.kildeBredde !== d.lookup(n('Width'))?.asNumber?.() || ny.kildeHoyde !== d.lookup(n('Height'))?.asNumber?.()) continue;
      if (ny.bytes.length >= obj.contents.length * GEVINST) continue;
      d.set(n('Width'), PDFNumber.of(ny.bredde));
      d.set(n('Height'), PDFNumber.of(ny.hoyde));
      d.set(n('ColorSpace'), n('DeviceRGB'));
      d.set(n('BitsPerComponent'), PDFNumber.of(8));
      d.set(n('Filter'), n('DCTDecode'));
      d.delete(n('DecodeParms'));
      pdf.context.assign(ref, PDFRawStream.of(d, ny.bytes));
    } catch (err) {
      console.warn('Kunne ikke krympe et bilde i bilaget', err);
    }
  }
}
