// Firestore-verdier ↔ ren JSON. Typer JSON ikke har (tidsstempel, bytes,
// referanse, geopunkt, NaN) pakkes som { __sk: type, … } så de kommer
// tilbake som samme type ved gjenoppretting.
const M = '__sk';

export function kod(v) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : { [M]: 'tall', v: String(v) };
  if (Array.isArray(v)) return v.map(kod);
  if (v instanceof Date) return { [M]: 'tid', s: Math.floor(v.getTime() / 1000), n: (v.getTime() % 1000) * 1e6 };
  if (v instanceof Uint8Array) return { [M]: 'bytes', v: Buffer.from(v).toString('base64') };
  if (typeof v.toMillis === 'function') return { [M]: 'tid', s: v.seconds, n: v.nanoseconds };
  if (typeof v.isEqual === 'function' && 'latitude' in v) return { [M]: 'geo', lat: v.latitude, lng: v.longitude };
  if (v.firestore && typeof v.path === 'string') return { [M]: 'ref', v: v.path };
  if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) {
    throw new Error(`Ukjent Firestore-type: ${v.constructor?.name}`);
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, kod(x)]));
}

// typer = { tid(s, n), geo(lat, lng), ref(sti) } lager de ekte Firestore-verdiene.
export function dekod(v, typer) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(x => dekod(x, typer));
  switch (v[M]) {
    case 'tall': return Number(v.v);
    case 'tid': return typer.tid(v.s, v.n);
    case 'bytes': return Buffer.from(v.v, 'base64');
    case 'geo': return typer.geo(v.lat, v.lng);
    case 'ref': return typer.ref(v.v);
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dekod(x, typer)]));
}

// Samme tekst for samme innhold uansett rekkefølgen på feltene – brukes til å sammenligne dokumenter.
export function kanonisk(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(kanonisk).join(',')}]`;
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${kanonisk(v[k])}`).join(',')}}`;
}

// Dokumentene lagrer filstier med miljøprefiks («soknadsportal/prod/fakturaer/…»).
// Legges kopien et annet sted enn den ble tatt, må stiene peke dit.
export function byttPrefiks(v, fra, til) {
  if (fra === til) return v;
  if (typeof v === 'string') return v.startsWith(fra + '/') ? til + v.slice(fra.length) : v;
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(x => byttPrefiks(x, fra, til));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, byttPrefiks(x, fra, til)]));
}

export const samlingAv = sti => sti.slice(0, sti.lastIndexOf('/'));
