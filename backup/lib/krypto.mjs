// Kryptering av kopiene: AES-256-GCM med nøkkel avledet av passordet (scrypt).
// Filformat: «SPK1» + salt (16) + iv (12) + kryptert innhold + merke (16).
// En fil som er endret eller åpnes med feil passord, gir feil – aldri søppel.
import { scryptSync, randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const MERKE = Buffer.from('SPK1');
// Så mye større er en kryptert fil enn originalen.
export const TILLEGG = MERKE.length + 16 + 12 + 16;

// scrypt er treg med vilje, så nøkkelen regnes ut én gang per salt.
const nokler = new Map();
function nokkel(passord, salt) {
  const id = salt.toString('hex') + passord;
  if (!nokler.has(id)) nokler.set(id, scryptSync(passord, salt, 32));
  return nokler.get(id);
}
const salter = new Map();

export function krypter(innhold, passord) {
  if (!passord) throw new Error('Mangler krypteringspassord (KOPI_PASSORD).');
  if (!salter.has(passord)) salter.set(passord, randomBytes(16));
  const salt = salter.get(passord);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', nokkel(passord, salt), iv);
  return Buffer.concat([MERKE, salt, iv, c.update(innhold), c.final(), c.getAuthTag()]);
}

export function dekrypter(fil, passord) {
  if (!passord) throw new Error('Mangler krypteringspassord (KOPI_PASSORD).');
  if (fil.length < TILLEGG || !fil.subarray(0, 4).equals(MERKE)) throw new Error('Ikke en kryptert kopi (feil filformat).');
  const salt = fil.subarray(4, 20), iv = fil.subarray(20, 32);
  const d = createDecipheriv('aes-256-gcm', nokkel(passord, salt), iv);
  d.setAuthTag(fil.subarray(fil.length - 16));
  try {
    return Buffer.concat([d.update(fil.subarray(32, fil.length - 16)), d.final()]);
  } catch {
    throw new Error('Kunne ikke dekryptere: feil passord, eller filen er skadet.');
  }
}

export const md5 = innhold => createHash('md5').update(innhold).digest('hex');
