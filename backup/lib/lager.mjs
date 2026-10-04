// Der kopiene ligger: en mappe på ProISP (SFTP) eller en lokal mappe.
// Samme fire operasjoner begge steder, så kopiering, henting og gjenoppretting
// er lik uansett hvor arkivet er.
import { mkdir, readdir, stat, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

export class LokalLager {
  constructor(rot) { this.rot = rot; this.navn = rot; }
  async liste(mappe) {
    const m = path.join(this.rot, mappe);
    const navn = await readdir(m).catch(feil => { if (feil.code === 'ENOENT') return []; throw feil; });
    const ut = [];
    for (const n of navn) {
      const s = await stat(path.join(m, n));
      if (s.isFile()) ut.push({ navn: n, storrelse: s.size });
    }
    return ut;
  }
  les(sti) { return readFile(path.join(this.rot, sti)); }
  // Skrives til midlertidig navn først, så en avbrutt skriving aldri ser ut som en ferdig fil.
  async skriv(sti, innhold) {
    const full = path.join(this.rot, sti);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full + '.tmp', innhold);
    await rename(full + '.tmp', full);
  }
  slett(sti) { return rm(path.join(this.rot, sti), { force: true }); }
  async lukk() {}
}

export class SftpLager {
  constructor({ host, username, password, mappe }) {
    this.tilkobling = { host, username, password, port: 22, readyTimeout: 30000 };
    this.rot = mappe.replace(/\/+$/, '');
    this.navn = `sftp://${host}${this.rot}`;
    this.mapper = new Set();
  }
  async klient() {
    if (!this.sftp) {
      const { default: Klient } = await import('ssh2-sftp-client');
      this.sftp = new Klient();
      await this.sftp.connect(this.tilkobling);
      await this.sikreMappe('');
      // Ligger mappa i webroten, skal ingenting der kunne hentes over nettet.
      if (!await this.sftp.exists(`${this.rot}/.htaccess`)) {
        await this.sftp.put(Buffer.from('Require all denied\nOptions -Indexes\n'), `${this.rot}/.htaccess`);
      }
    }
    return this.sftp;
  }
  async sikreMappe(mappe) {
    if (this.mapper.has(mappe)) return;
    const full = mappe ? `${this.rot}/${mappe}` : this.rot;
    if (!await this.sftp.exists(full)) await this.sftp.mkdir(full, true);
    this.mapper.add(mappe);
  }
  async liste(mappe) {
    const s = await this.klient();
    if (!await s.exists(`${this.rot}/${mappe}`)) return [];
    return (await s.list(`${this.rot}/${mappe}`)).filter(f => f.type === '-').map(f => ({ navn: f.name, storrelse: f.size }));
  }
  async les(sti) { return (await this.klient()).get(`${this.rot}/${sti}`); }
  async skriv(sti, innhold) {
    const s = await this.klient();
    await this.sikreMappe(path.posix.dirname(sti));
    const full = `${this.rot}/${sti}`;
    await s.put(innhold, full + '.tmp');
    if (await s.exists(full)) await s.delete(full);
    await s.rename(full + '.tmp', full);
  }
  async slett(sti) { await (await this.klient()).delete(`${this.rot}/${sti}`, true); }
  async lukk() { if (this.sftp) await this.sftp.end(); this.sftp = null; }
}
