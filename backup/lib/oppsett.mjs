// Felles for kommandoene: leser backup/.env, argumenter og lager fra miljøet.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LokalLager, SftpLager } from './lager.mjs';

const envfil = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envfil)) {
  for (const linje of readFileSync(envfil, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(linje);
    if (m && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

export function krev(navn) {
  if (!process.env[navn]) throw new Error(`Mangler ${navn} (GitHub-secret, eller backup/.env på Mac – se OPPSETT.md §9).`);
  return process.env[navn];
}

// «--dato 2026-10-01 --lesbar» → { dato: '2026-10-01', lesbar: true }
export function argumenter(tillatt) {
  const ut = {};
  const arg = process.argv.slice(2);
  for (let i = 0; i < arg.length; i++) {
    const navn = arg[i].replace(/^--/, '');
    if (!arg[i].startsWith('--') || !(navn in tillatt)) throw new Error(`Ukjent argument: ${arg[i]}. Gyldige: ${Object.keys(tillatt).map(n => '--' + n).join(' ')}`);
    ut[navn] = tillatt[navn] === 'ja' ? true : arg[++i];
    if (ut[navn] === undefined) throw new Error(`--${navn} mangler verdi.`);
  }
  return ut;
}

// Arkivet på ProISP, eller en lokal mappe med en nedhentet kopi (--fra).
export function arkiv(mappe) {
  if (mappe) return new LokalLager(path.resolve(mappe));
  return new SftpLager({ host: krev('SFTP_HOST'), username: krev('SFTP_USERNAME'), password: krev('SFTP_PASSWORD'), mappe: krev('KOPI_SFTP_MAPPE') });
}

export function skrivTabell(rader) {
  const bredde = rader[0].map((_, i) => Math.max(...rader.map(r => String(r[i]).length)));
  for (const r of rader) console.log('  ' + r.map((c, i) => i ? String(c).padStart(bredde[i]) : String(c).padEnd(bredde[i])).join('  '));
}

// Kjører kommandoen og avslutter med kode 1 og en lesbar feil hvis noe går galt.
export async function kjor(hoved) {
  try { await hoved(); } catch (feil) { console.error(`\nFEIL: ${feil.message}`); process.exitCode = 1; }
}
