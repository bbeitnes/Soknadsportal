// Hvilke øyeblikksbilder som tas vare på: alle fra de siste 30 dagene, og den
// første kopien i hver måned i 12 måneder. Den nyeste beholdes alltid.
const DOGN = 24 * 3600 * 1000;
export const DAGLIGE_DAGER = 30;
export const MANEDLIGE_DAGER = 366;

// «2026-10-04T021700Z.json.gz.spk» → tidspunkt
export function tidFraNavn(navn) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(navn);
  return m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`) : NaN;
}

export function stempel(tid) {
  return new Date(tid).toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '');
}

export function beholdes(navn, na) {
  const kjente = navn.filter(n => !Number.isNaN(tidFraNavn(n))).sort();
  const behold = new Set();
  const forstIManeden = new Map();
  for (const n of kjente) if (!forstIManeden.has(n.slice(0, 7))) forstIManeden.set(n.slice(0, 7), n);
  for (const n of kjente) {
    const alder = na - tidFraNavn(n);
    if (alder <= DAGLIGE_DAGER * DOGN) behold.add(n);
    else if (alder <= MANEDLIGE_DAGER * DOGN && forstIManeden.get(n.slice(0, 7)) === n) behold.add(n);
  }
  if (kjente.length) behold.add(kjente.at(-1));
  return behold;
}
