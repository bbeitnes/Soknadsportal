// Firestore-databasen og Storage-prefikset som ett «mål». ENESTE fil i backup/
// som snakker med Google. Innlogging: tjenestenøkkel i GOOGLE_NOKKEL_JSON
// (GitHub), ellers GOOGLE_APPLICATION_CREDENTIALS / `gcloud auth
// application-default login` (Mac).
import { Firestore, Timestamp, GeoPoint } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { kod, dekod } from './koding.mjs';
import { md5 } from './krypto.mjs';

export const PROSJEKT = 'skiensskolemusikk-b5cbc';
export const BOTTE = 'skiensskolemusikk-b5cbc.firebasestorage.app';
export const PROD = 'soknadsportal';
export const RESTORE = 'soknadsportal-restore';
// Databasene skriptene kjenner, og hvor filene deres ligger i bøtta.
export const PREFIKS = {
  [PROD]: 'soknadsportal/prod',
  'soknadsportal-test': 'soknadsportal/test',
  [RESTORE]: 'soknadsportal/restore',
};

export class FirebaseMal {
  constructor(database) {
    if (!PREFIKS[database]) throw new Error(`Ukjent database: ${database}`);
    const nokkel = process.env.GOOGLE_NOKKEL_JSON;
    const innlogging = nokkel ? { credentials: JSON.parse(nokkel) } : {};
    this.database = database;
    this.prefiks = PREFIKS[database];
    this.db = new Firestore({ projectId: PROSJEKT, databaseId: database, ...innlogging });
    this.botte = new Storage({ projectId: PROSJEKT, ...innlogging }).bucket(BOTTE);
    this.typer = {
      tid: (s, n) => new Timestamp(s, n),
      geo: (lat, lng) => new GeoPoint(lat, lng),
      ref: sti => this.db.doc(sti),
    };
  }

  // Alle samlinger, også undersamlinger og samlinger som kommer til senere (B-24).
  async lesDokumenter() {
    const ut = [];
    const lesSamling = async samling => {
      const svar = await samling.get();
      await Promise.all(svar.docs.map(async d => {
        ut.push({ sti: d.ref.path, data: kod(d.data()) });
        for (const under of await d.ref.listCollections()) await lesSamling(under);
      }));
    };
    for (const samling of await this.db.listCollections()) await lesSamling(samling);
    return ut.sort((a, b) => a.sti.localeCompare(b.sti));
  }

  async massevis(dokumenter, handling) {
    const skriver = this.db.bulkWriter();
    const feil = [];
    for (const d of dokumenter) handling(skriver, d).catch(f => feil.push(f));
    await skriver.close();
    if (feil.length) throw new Error(`${feil.length} dokumenter feilet i ${this.database}: ${feil[0].message}`);
  }
  skrivDokumenter(dokumenter) {
    return this.massevis(dokumenter, (s, d) => s.set(this.db.doc(d.sti), dekod(d.data, this.typer)));
  }
  slettDokumenter(stier) {
    return this.massevis(stier, (s, sti) => s.delete(this.db.doc(sti)));
  }

  // Filstier er relative til prefikset («fakturaer/abc/123-faktura.pdf»).
  async listeFiler() {
    const [filer] = await this.botte.getFiles({ prefix: this.prefiks + '/' });
    const ut = [];
    for (const f of filer) {
      if (f.name.endsWith('/')) continue;
      const m = f.metadata;
      ut.push({
        sti: f.name.slice(this.prefiks.length + 1),
        md5: m.md5Hash ? Buffer.from(m.md5Hash, 'base64').toString('hex') : md5((await f.download())[0]),
        storrelse: Number(m.size),
        type: m.contentType || 'application/octet-stream',
      });
    }
    return ut.sort((a, b) => a.sti.localeCompare(b.sti));
  }
  async lesFil(sti) { return (await this.botte.file(`${this.prefiks}/${sti}`).download())[0]; }
  skrivFil(sti, innhold, type) {
    return this.botte.file(`${this.prefiks}/${sti}`).save(innhold, { resumable: false, contentType: type });
  }
  slettFil(sti) { return this.botte.file(`${this.prefiks}/${sti}`).delete({ ignoreNotFound: true }); }
}
