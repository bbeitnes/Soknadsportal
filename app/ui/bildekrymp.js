// Krymper bilder i revisjonsrapporten. Fotograferte bilag er store (flere MB
// per bilde), og rapporten trenger bare nok til at bilaget kan leses.
// Originalen i lagringen røres ikke.
//   - krympBilde(): et løst bilde (JPEG/PNG) → mindre JPEG.
//   - krympBilderIPdf(): bilder inne i et PDF-bilag byttes mot mindre
//     JPEG-utgaver – både JPEG-bilder og bilder som ligger tapsfritt lagret
//     (FlateDecode; typisk «skriv ut til PDF» av et foto, flere MB per side).
//     Tekst og vektorgrafikk (ekte PDF-fakturaer) og den usynlige teksten i
//     mobilkvitteringene røres ikke.
// Et bilde byttes bare når den nye utgaven er klart mindre; ellers (og når
// noe går galt) blir originalen stående.

const MAKS = 1600;          // punkter på lengste side …
const MINST_KORT = 1000;    // … men lange, smale kvitteringer beholder dette på korteste side
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

// Reverserer prediktoren i et tapsfritt lagret bilde (DecodeParms /Predictor):
// 2 = TIFF (forskjell mot punktet til venstre), 10–15 = PNG (én filterbyte
// foran hver rad). Gir de rå punktene, `kanaler` byte per punkt.
export function utenPrediktor(data, prediktor, kolonner, kanaler) {
  const rad = kolonner * kanaler;
  if (prediktor >= 10) {
    const rader = Math.floor(data.length / (rad + 1));
    const ut = new Uint8Array(rader * rad);
    for (let r = 0; r < rader; r++) {
      const filter = data[r * (rad + 1)], inn = r * (rad + 1) + 1, o = r * rad;
      for (let i = 0; i < rad; i++) {
        const a = i >= kanaler ? ut[o + i - kanaler] : 0;          // venstre
        const b = r ? ut[o - rad + i] : 0;                         // over
        const c = r && i >= kanaler ? ut[o - rad + i - kanaler] : 0; // over til venstre
        let v = data[inn + i];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += (a + b) >> 1;
        else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        ut[o + i] = v;
      }
    }
    return ut;
  }
  if (prediktor === 2) {
    const ut = Uint8Array.from(data);
    for (let o = 0; o + rad <= ut.length; o += rad) for (let i = kanaler; i < rad; i++) ut[o + i] += ut[o + i - kanaler];
    return ut;
  }
  return data;
}

// Tegner kilden (bilde eller lerret) forminsket og gir den som JPEG.
async function tilJpeg(kilde) {
  const skala = Math.min(1, Math.max(MAKS / Math.max(kilde.width, kilde.height), MINST_KORT / Math.min(kilde.width, kilde.height)));
  const lerret = document.createElement('canvas');
  lerret.width = Math.max(1, Math.round(kilde.width * skala));
  lerret.height = Math.max(1, Math.round(kilde.height * skala));
  const ctx = lerret.getContext('2d');
  // JPEG har ikke gjennomsiktighet: gjennomsiktig PNG får hvit bunn.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lerret.width, lerret.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(kilde, 0, 0, lerret.width, lerret.height);
  const blob = await new Promise(r => lerret.toBlob(r, 'image/jpeg', KVALITET));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), bredde: lerret.width, hoyde: lerret.height };
}

async function filTilJpeg(bytes, type) {
  const bilde = await createImageBitmap(new Blob([bytes], { type }));
  try {
    return { ...await tilJpeg(bilde), kildeBredde: bilde.width, kildeHoyde: bilde.height };
  } finally {
    bilde.close?.();
  }
}

// Pakker ut zlib-data (FlateDecode). Søppel etter dataene tåles så lenge vi
// har fått det vi venter.
async function pakkUt(bytes, forventet) {
  const leser = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const deler = [];
  let lengde = 0;
  try {
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      deler.push(value);
      lengde += value.length;
    }
  } catch (err) {
    if (lengde < forventet) throw err;
  }
  const ut = new Uint8Array(lengde);
  let p = 0;
  for (const d of deler) { ut.set(d, p); p += d.length; }
  return ut;
}

// Rå punkter (1 eller 3 byte per punkt) → lerret.
function punkterTilLerret(data, bredde, hoyde, kanaler) {
  const px = new Uint8ClampedArray(bredde * hoyde * 4);
  for (let i = 0, j = 0; j < px.length; i += kanaler, j += 4) {
    px[j] = data[i];
    px[j + 1] = kanaler === 3 ? data[i + 1] : data[i];
    px[j + 2] = kanaler === 3 ? data[i + 2] : data[i];
    px[j + 3] = 255;
  }
  const lerret = document.createElement('canvas');
  lerret.width = bredde;
  lerret.height = hoyde;
  lerret.getContext('2d').putImageData(new ImageData(px, bredde, hoyde), 0, 0);
  return lerret;
}

// Gir bildet som mindre JPEG, eller null når det ikke lønner seg (eller
// nettleseren ikke kan lese bildet).
export async function krympBilde(bytes, type) {
  if (bytes.byteLength < MINST) return null;
  try {
    const ny = await filTilJpeg(bytes, type);
    return ny.bytes.length < bytes.byteLength * GEVINST ? ny.bytes : null;
  } catch {
    return null;
  }
}

// Bare vanlige bilder i gråtoner eller RGB med 8 bit per kanal: JPEG
// (DCTDecode) eller tapsfritt lagret (FlateDecode). CMYK, fargemasker og
// andre spesialtilfeller lar vi være – de tåler ikke å bli tegnet på nytt.
// Gir { slag: 'jpeg' | 'punkter', kanaler, prediktor } eller null.
function bildeinfo(d, { PDFName, PDFArray, PDFDict, PDFNumber }) {
  const n = navn => PDFName.of(navn);
  const tall = (dict, navn, standard) => { const v = dict.lookup(n(navn)); return v instanceof PDFNumber ? v.asNumber() : standard; };
  if (d.lookup(n('Subtype')) !== n('Image')) return null;
  if (d.has(n('Decode')) || d.has(n('Mask')) || d.has(n('ImageMask'))) return null;
  // En gjennomsiktighetsmaske kan bli stående (den trenger ikke samme mål
  // som bildet), unntatt når bildet er forhåndsblandet mot en bakgrunn.
  const maske = d.lookup(n('SMask'));
  if (maske && (!maske.dict || maske.dict.has(n('Matte')))) return null;
  if (tall(d, 'BitsPerComponent', 0) !== 8) return null;

  const farger = d.lookup(n('ColorSpace'));
  let kanaler = 0;
  if (farger === n('DeviceRGB')) kanaler = 3;
  else if (farger === n('DeviceGray')) kanaler = 1;
  else if (farger instanceof PDFArray && farger.size()) {
    const slag = farger.lookup(0);
    if (slag === n('CalRGB')) kanaler = 3;
    else if (slag === n('CalGray')) kanaler = 1;
    else if (slag === n('ICCBased')) kanaler = tall(farger.lookup(1)?.dict ?? d, 'N', 0);
  }
  if (kanaler !== 1 && kanaler !== 3) return null;

  let filter = d.lookup(n('Filter'));
  if (filter instanceof PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : null;
  if (filter === n('DCTDecode')) return { slag: 'jpeg', kanaler };
  if (filter !== n('FlateDecode')) return null;
  let parametre = d.lookup(n('DecodeParms'));
  if (parametre instanceof PDFArray) parametre = parametre.size() === 1 ? parametre.lookup(0) : null;
  if (!(parametre instanceof PDFDict)) return d.has(n('DecodeParms')) ? null : { slag: 'punkter', kanaler, prediktor: 1 };
  const prediktor = tall(parametre, 'Predictor', 1);
  if (prediktor > 1 && (tall(parametre, 'Colors', 1) !== kanaler || tall(parametre, 'BitsPerComponent', 8) !== 8 || tall(parametre, 'Columns', 1) !== tall(d, 'Width', 0))) return null;
  return { slag: 'punkter', kanaler, prediktor };
}

// Bytter store bilder i PDF-en (et PDFDocument fra pdf-lib) mot mindre
// JPEG-utgaver. `PDFLib` er biblioteket fra hentPdfLib(). Gjøres før sidene
// kopieres inn i rapporten.
export async function krympBilderIPdf(pdf, PDFLib) {
  const { PDFName, PDFNumber, PDFRawStream } = PDFLib;
  const n = navn => PDFName.of(navn);
  for (const [ref, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || obj.contents.length < MINST) continue;
    try {
      const d = obj.dict;
      const info = bildeinfo(d, PDFLib);
      if (!info) continue;
      const bredde = d.lookup(n('Width'))?.asNumber?.(), hoyde = d.lookup(n('Height'))?.asNumber?.();
      let ny;
      if (info.slag === 'jpeg') {
        ny = await filTilJpeg(utenExif(obj.contents), 'image/jpeg');
        // Stemmer ikke målene, har nettleseren lest bildet annerledes enn PDF-en.
        if (ny.kildeBredde !== bredde || ny.kildeHoyde !== hoyde) continue;
      } else {
        const lengde = bredde * hoyde * info.kanaler;
        const pakket = await pakkUt(obj.contents, info.prediktor >= 10 ? lengde + hoyde : lengde);
        const punkter = utenPrediktor(pakket, info.prediktor, bredde, info.kanaler);
        if (!(lengde > 0) || punkter.length < lengde) continue;
        ny = await tilJpeg(punkterTilLerret(punkter, bredde, hoyde, info.kanaler));
      }
      if (ny.bytes.length >= obj.contents.length * GEVINST) continue;
      d.set(n('Width'), PDFNumber.of(ny.bredde));
      d.set(n('Height'), PDFNumber.of(ny.hoyde));
      // Tapsfrie RGB-bilder beholder fargerommet sitt (punktene er de samme).
      // Ellers er den nye JPEG-en vanlig RGB.
      if (info.slag === 'jpeg' || info.kanaler !== 3) d.set(n('ColorSpace'), n('DeviceRGB'));
      d.set(n('BitsPerComponent'), PDFNumber.of(8));
      d.set(n('Filter'), n('DCTDecode'));
      d.delete(n('DecodeParms'));
      pdf.context.assign(ref, PDFRawStream.of(d, ny.bytes));
    } catch (err) {
      console.warn('Kunne ikke krympe et bilde i bilaget', err);
    }
  }
}
