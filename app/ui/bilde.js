// Bilder fra mobilkamera er store (og på iPhone ofte HEIC, som PDF-
// rapporten ikke kan ta med). Vi tegner bildet på et lerret og lagrer det
// som JPEG, maks 2000 px på lengste side. PDF og små JPEG/PNG går urørt.
export async function klargjorBilde(fil) {
  if (fil.type === 'application/pdf') return fil;
  const erJpegPng = fil.type === 'image/jpeg' || fil.type === 'image/png';
  if (erJpegPng && fil.size < 1.5 * 1024 * 1024) return fil;
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
