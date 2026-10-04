// Database og filer i minnet – til testene (test/sikkerhetskopi.test.js).
import { md5 } from './krypto.mjs';

export class MinneMal {
  constructor(database, prefiks) {
    this.database = database; this.prefiks = prefiks;
    this.dok = new Map(); this.filer = new Map();
  }
  async lesDokumenter() { return [...this.dok].map(([sti, data]) => ({ sti, data: structuredClone(data) })).sort((a, b) => a.sti.localeCompare(b.sti)); }
  async skrivDokumenter(dokumenter) { for (const d of dokumenter) this.dok.set(d.sti, structuredClone(d.data)); }
  async slettDokumenter(stier) { for (const s of stier) this.dok.delete(s); }
  async listeFiler() { return [...this.filer].map(([sti, f]) => ({ sti, md5: md5(f.innhold), storrelse: f.innhold.length, type: f.type })); }
  async lesFil(sti) { return this.filer.get(sti).innhold; }
  async skrivFil(sti, innhold, type) { this.filer.set(sti, { innhold: Buffer.from(innhold), type }); }
  async slettFil(sti) { this.filer.delete(sti); }
}
