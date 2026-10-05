// Revisjonsrapporten: én samlet PDF laget i nettleseren med pdf-lib.
//   1. Forside: søknad, giver, søkt, innvilget, brukt, gjenstående
//      (+ fordeling egne midler / giver / momskompensasjon når det gjelder,
//      og samme fordeling per kategori når søknaden har egenandel).
//      Har søknaden revisorer, står status per revisor nederst: godkjent
//      (med tidspunkt og merknad) eller ikke godkjent.
//   2. Oversiktstabell over fakturaene. Summen stemmer med forsiden.
//      Egeninnsats uten faktura (dugnad) listes for seg under tabellen.
//   3. Alle fakturaene i rekkefølge, med løpenummer stamplet i hjørnet.
//      Bilder blir egne sider; PDF-er kopieres inn side for side. Store
//      bilder (også inne i PDF-bilag) krympes først, se bildekrymp.js.
import { tilstand, innkjopFor, fakturaerFor, filBytes, revisorerFor } from '../data/index.js';
import { pott, fakturaDekker, giverandelOre, posttittel, revisjonsoppsummering, sumEgneMidler, momsPerAr } from '../data/beregning.js';
import { posterFor, fordelingFor, fakturaposterFor } from '../sider/revisjon.js';
import { belop, datoFelt, datoKl } from './format.js';
import { krympBilde, krympBilderIPdf } from './bildekrymp.js';

const PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
let lasting = null;

export function hentPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  lasting ||= new Promise((ok, feil) => {
    const s = document.createElement('script');
    s.src = PDF_LIB;
    s.onload = () => ok(window.PDFLib);
    s.onerror = () => { lasting = null; feil(new Error('Kunne ikke laste PDF-biblioteket')); };
    document.head.appendChild(s);
  });
  return lasting;
}

// Standardfontene i PDF dekker WinAnsi (æøå er med), men ikke f.eks. «−»
// og «→». Vi bytter til tegn som finnes.
export const trygg = t => String(t ?? '').replace(/[−–—]/g, '-').replace(/→/g, '->').replace(/ /g, ' ').replace(/[^\x20-\x7e -ÿ]/g, '?');

const A4 = [595.28, 841.89];
const MARG = 56;

export async function lagRevisjonsrapport(s) {
  const PDFLib = await hentPdfLib();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fet = await doc.embedFont(StandardFonts.HelveticaBold);
  const svart = rgb(0.125, 0.118, 0.114), graa = rgb(0.38, 0.36, 0.36), lys = rgb(0.84, 0.83, 0.83);

  const giver = tilstand.givere.find(g => g.id === s.giverId);
  const fakturaer = fakturaerFor(s.id);
  const poster = posterFor(s);
  const p = pott(s, innkjopFor(s.id));
  const fakturert = fakturaer.reduce((sum, f) => sum + (Number(f.belop) || 0), 0);
  // Egne midler etter samme regel som potten: egenandelen på søknaden hvis den
  // er satt, ellers det som er lagt på postene. De brukes først og holdes
  // utenfor fordelingen mellom giver og momskompensasjon.
  const fordelt = sumEgneMidler(poster);
  const harEgne = p.egne > 0;
  // Egeninnsats (dugnad) har ingen faktura, men er brukt: estimert verdi,
  // dekket av egne midler.
  const egeninnsats = poster.filter(x => x.egeninnsats);
  const sumEgeninnsats = egeninnsats.reduce((sum, x) => sum + x.tilbudt, 0);
  const brukt = fakturert + sumEgeninnsats;
  const egne = Math.min(p.egne, Math.max(0, brukt));
  const fraGiver = giverandelOre(brukt - egne, p.prosent);
  const dato = new Date().toLocaleDateString('nb-NO');

  // ——— Tegnehjelpere ———
  const bredde = (t, st, f = font) => f.widthOfTextAtSize(trygg(t), st);
  function brytTekst(t, st, maks, f = font) {
    const ord = trygg(t).split(/\s+/), linjer = []; let linje = '';
    for (const o of ord) {
      const prov = linje ? `${linje} ${o}` : o;
      if (bredde(prov, st, f) <= maks || !linje) linje = prov; else { linjer.push(linje); linje = o; }
    }
    if (linje) linjer.push(linje);
    return linjer;
  }
  let side, y;
  function nySide() {
    side = doc.addPage(A4);
    y = A4[1] - MARG;
    return side;
  }
  function tekst(t, x, st = 11, f = font, farge = svart) { side.drawText(trygg(t), { x, y, size: st, font: f, color: farge }); }
  function hoyre(t, xSlutt, st = 11, f = font, farge = svart) { side.drawText(trygg(t), { x: xSlutt - bredde(t, st, f), y, size: st, font: f, color: farge }); }
  function strek(tykkelse = 0.75, farge = lys) { side.drawLine({ start: { x: MARG, y: y - 4 }, end: { x: A4[0] - MARG, y: y - 4 }, thickness: tykkelse, color: farge }); }
  function stempel(nr, sidenr) {
    const t = String(nr), st = 20, b = bredde(t, st, fet) + 24, h = 34;
    const x = A4[0] - 40 - b, yy = A4[1] - 40 - h;
    side.drawRectangle({ x, y: yy, width: b, height: h, borderColor: svart, borderWidth: 2, color: rgb(1, 1, 1) });
    side.drawText(t, { x: x + 12, y: yy + 9, size: st, font: fet, color: svart });
    side.drawText(trygg(`Faktura ${nr}${sidenr ? ` · side ${sidenr}` : ''}`), { x: MARG, y: A4[1] - 30, size: 8, font, color: graa });
  }

  // ——— 1. Forside ———
  nySide();
  tekst(s.tittel || 'Søknad', MARG, 24, fet); y -= 20;
  tekst(`${giver?.navn || 'Ukjent giver'} · Revisjonsrapport · ${dato}`, MARG, 11, font, graa); y -= 36;
  const linje = (etikett, verdi, f = font) => { tekst(etikett, MARG, 12, f); hoyre(verdi, A4[0] - MARG, 12, f); y -= 8; strek(); y -= 18; };
  linje('Søkt', belop(p.sokt));
  linje('Innvilget', p.innvilget == null ? '–' : belop(p.innvilget));
  if (harEgne) {
    linje(p.egenandel > 0 ? (p.egenandel === p.egenandelPlanlagt ? 'Egenandel' : `Egenandel (i søknaden ${belop(p.egenandelPlanlagt)})`) : 'Egne midler', belop(p.egne));
    linje('Ramme (innvilget + egne midler)', p.ramme == null ? '–' : belop(p.ramme));
  }
  linje('Disponert (tilbud og utgifter)', belop(p.disponertFull));
  linje('Brukt (fakturert)', belop(fakturert), sumEgeninnsats ? font : fet);
  if (sumEgeninnsats) {
    linje('Egeninnsats uten faktura (estimert)', belop(sumEgeninnsats));
    linje('Brukt i alt', belop(brukt), fet);
  }
  linje('Gjenstående av innvilget', p.innvilget == null ? '–' : belop(p.innvilget - fraGiver));
  if (p.harMoms || harEgne) {
    y -= 10;
    tekst(sumEgeninnsats ? 'Fordeling av det som er brukt' : 'Fordeling av det fakturerte', MARG, 10, fet, graa); y -= 20;
    if (harEgne) linje('Egne midler', belop(egne));
    linje(p.harMoms ? `Fra giver (${p.giverProsent} %${harEgne ? ' etter egne midler' : ''})` : 'Fra giver', belop(fraGiver));
    if (p.harMoms) {
      // Kompensasjonen kommer året etter kjøpet. Ett kjøpsår står i selve
      // linjen; flere år (eller fakturaer uten dato) får hver sin underlinje.
      const moms = brukt - egne - fraGiver, perAr = momsPerAr(fakturaer, moms);
      const ettAr = perAr.length === 1 && perAr[0].ar != null;
      linje(`Fra momskompensasjon (${p.prosent} %)${ettAr ? ` – ventes mottatt ${perAr[0].mottas}` : ''}`, belop(moms));
      if (perAr.length && !ettAr) {
        y += 4;
        for (const r of perAr) {
          tekst(r.ar == null ? 'Uten dato' : `Kjøp i ${r.ar} – ventes mottatt ${r.mottas}`, MARG + 14, 10, font, graa);
          hoyre(belop(r.moms), A4[0] - MARG, 10, font, graa); y -= 15;
        }
        y -= 7;
      }
    }
  }
  // Samme fordeling per kategori, slik giveren kan se at egenandelen er innfridd.
  if (harEgne) {
    const f = fordelingFor(s, poster, revisjonsoppsummering(fakturaer, poster).perPost, p.prosent);
    const kol = [A4[0] - MARG - (p.harMoms ? 270 : 180), A4[0] - MARG - (p.harMoms ? 180 : 90), A4[0] - MARG - (p.harMoms ? 90 : 0), A4[0] - MARG];
    const rad = (navn, g, f1 = font, st = 10) => {
      tekst(brytTekst(navn, st, kol[0] - 80 - MARG, f1)[0] || '', MARG, st, f1);
      hoyre(belop(g.kostnad), kol[0], st, f1); hoyre(belop(g.egne), kol[1], st, f1); hoyre(belop(g.giver), kol[2], st, f1);
      if (p.harMoms) hoyre(belop(g.moms), kol[3], st, f1);
    };
    if (y - (f.grupper.length + 3) * 18 - 60 < MARG) nySide(); else y -= 10;
    tekst('Fordeling per kategori', MARG, 10, fet, graa); y -= 20;
    tekst('KATEGORI', MARG, 8, fet, graa); hoyre('KOSTNAD', kol[0], 8, fet, graa); hoyre('EGNE MIDLER', kol[1], 8, fet, graa); hoyre('FRA GIVER', kol[2], 8, fet, graa);
    if (p.harMoms) hoyre('MOMSKOMP.', kol[3], 8, fet, graa);
    y -= 6; strek(1.5, svart); y -= 16;
    for (const g of f.grupper) { rad(g.navn, g); y -= 6; strek(); y -= 14; }
    y += 2; strek(1.5, svart); y -= 16;
    rad('Sum', f.sum, fet, 11); y -= 18;
    const merknad = 'Kostnad er fakturert beløp. Poster uten faktura står med tilbudt pris (egeninnsats med estimert verdi), og fakturaer som ikke er koblet til en post er ikke med.'
      + (p.egenandel > fordelt ? ` Av egenandelen er ${belop(p.egenandel - fordelt)} ikke fordelt på poster.` : '')
      + (p.egenandel > 0 && fordelt > p.egenandel ? ` Det er lagt ${belop(fordelt - p.egenandel)} mer på poster enn egenandelen.` : '');
    for (const l of brytTekst(merknad, 9, A4[0] - 2 * MARG)) { tekst(l, MARG, 9, font, graa); y -= 12; }
  }
  y -= 20;
  for (const l of brytTekst(`Rapporten inneholder ${fakturaer.length} ${fakturaer.length === 1 ? 'faktura' : 'fakturaer'} med løpenummer 1–${fakturaer.length}. Løpenummeret er stamplet øverst til høyre på hvert bilag.`, 10, A4[0] - 2 * MARG)) { tekst(l, MARG, 10, font, graa); y -= 14; }

  // Revisjon: én linje per tildelt revisor. En godkjenning gjelder bare når
  // tallene er de samme som da den ble gitt – ellers står revisoren som
  // «ikke godkjent». Uten tildelte revisorer er forsiden som før.
  const revisorer = revisorerFor(s);
  if (revisorer.length) {
    const hvem = r => r.navn === r.epost ? r.epost : `${r.navn} (${r.epost})`;
    const blokker = revisorer.map(r => ({
      linjer: brytTekst(r.status === 'godkjent' ? `Godkjent i Søknadsportal av ${hvem(r)}, ${datoKl(r.tid)}` : `Ikke godkjent: ${hvem(r)}`, 11, A4[0] - 2 * MARG, r.status === 'godkjent' ? fet : font),
      merknad: r.status === 'godkjent' && r.merknad ? brytTekst(`Revisors merknad: ${r.merknad}`, 9, A4[0] - 2 * MARG) : [],
      godkjent: r.status === 'godkjent',
    }));
    const hoyde = 40 + blokker.reduce((sum, b) => sum + b.linjer.length * 14 + b.merknad.length * 12 + 8, 0);
    if (y - hoyde < MARG) nySide(); else y -= 16;
    tekst('Revisjon', MARG, 10, fet, graa); y -= 6; strek(1.5, svart); y -= 18;
    for (const b of blokker) {
      for (const l of b.linjer) { tekst(l, MARG, 11, b.godkjent ? fet : font, b.godkjent ? svart : graa); y -= 14; }
      for (const l of b.merknad) { tekst(l, MARG, 9, font, graa); y -= 12; }
      y -= 8;
    }
  }

  // ——— 2. Oversiktstabell ———
  nySide();
  tekst('Oversikt over fakturaer', MARG, 18, fet); y -= 30;
  const hoyrekant = A4[0] - MARG;
  const kol = { nr: MARG, fnr: MARG + 30, dato: MARG + 110, lev: MARG + 175, stykk: hoyrekant - 75, belop: hoyrekant };
  const postBredde = kol.stykk - 60 - kol.fnr;
  const tabellhode = () => {
    tekst('NR', kol.nr, 8, fet, graa); tekst('FAKTURANR', kol.fnr, 8, fet, graa); tekst('DATO', kol.dato, 8, fet, graa); tekst('LEVERANDØR', kol.lev, 8, fet, graa); hoyre('BELØP', kol.belop, 8, fet, graa);
    y -= 11;
    tekst('Gjelder', kol.fnr, 8, font, graa); hoyre('Stykkpris', kol.stykk, 8, font, graa); hoyre('Tilbudt', kol.belop, 8, font, graa);
    y -= 6; strek(1.5, svart); y -= 16;
  };
  tabellhode();
  for (const f of fakturaer) {
    // Det fakturaen gjelder står linje for linje under fakturaraden: gruppert
    // per type, med tilbudt stykkpris og sum. Postene summerer ikke
    // nødvendigvis til fakturabeløpet (frakt, delfaktura, kreditnota).
    const dekket = fakturaDekker(f).map(id => poster.find(x => x.id === id)).filter(Boolean);
    const grupper = fakturaposterFor(s, dekket);
    const merknad = (f.merknad || '').trim() ? brytTekst(`Merknad: ${f.merknad.trim()}`, 8.5, kol.belop - kol.fnr) : [];
    const levLinjer = brytTekst(f.leverandor || '–', 9, kol.belop - 70 - kol.lev);
    // Lange lister fortsetter på neste side, under de samme overskriftene.
    const plass = hoyde => {
      if (y - hoyde >= MARG + 30) return;
      nySide(); tabellhode();
      tekst(String(f.lopenummer), kol.nr, 10, fet); tekst('forts.', kol.fnr, 9, font, graa); y -= 14;
    };
    if (y - levLinjer.length * 12 - 14 < MARG + 30) { nySide(); tabellhode(); }
    tekst(String(f.lopenummer), kol.nr, 10, fet);
    tekst(f.fakturanr || '–', kol.fnr, 9);
    tekst(f.dato ? datoFelt(f.dato) : '–', kol.dato, 9);
    hoyre(f.belop == null ? '–' : belop(f.belop), kol.belop, 10, fet);
    for (const l of levLinjer) { tekst(l, kol.lev, 9); y -= 12; }
    y -= 2;
    if (!dekket.length) { plass(12); tekst('Ikke koblet', kol.fnr, 9, font, graa); y -= 12; }
    for (const g of grupper) {
      // Mellomtittel bare når det er flere typer å skille fra hverandre.
      if (grupper.length > 1) { plass(28); y -= 4; tekst(g.navn, kol.fnr, 8, fet, graa); y -= 12; }
      for (const post of g.poster) {
        const linjer = brytTekst(posttittel(post), 9, postBredde);
        plass(linjer.length * 12);
        if (post.stykkpris != null) hoyre(belop(post.stykkpris), kol.stykk, 9);
        hoyre(belop(post.tilbudt), kol.belop, 9);
        for (const l of linjer) { tekst(l, kol.fnr, 9); y -= 12; }
      }
    }
    if (merknad.length) { plass(merknad.length * 11 + 2); y -= 2; }
    for (const l of merknad) { tekst(l, kol.fnr, 8.5, font, graa); y -= 11; }
    strek(); y -= 16;
  }
  if (y < MARG + 60) nySide();
  y -= 4; strek(1.5, svart); y -= 16;
  tekst('Sum fakturert', kol.nr, 11, fet); hoyre(belop(fakturert), kol.belop, 12, fet);
  y -= 24;
  tekst('Summen stemmer med «Brukt (fakturert)» på forsiden.', MARG, 9, font, graa);

  // Egeninnsats har ingen bilag, og listes derfor for seg.
  if (egeninnsats.length) {
    if (y - (egeninnsats.length + 4) * 20 < MARG + 40) nySide(); else y -= 40;
    tekst('Egeninnsats uten faktura', MARG, 14, fet); y -= 16;
    tekst('Estimert verdi av dugnad og annen egeninnsats. Dekkes av egne midler og har ikke bilag.', MARG, 9, font, graa); y -= 22;
    tekst('BESKRIVELSE', MARG, 8, fet, graa); hoyre('BELØP', A4[0] - MARG, 8, fet, graa);
    y -= 6; strek(1.5, svart); y -= 16;
    for (const x of egeninnsats) {
      if (y < MARG + 40) nySide();
      tekst(brytTekst(`${x.tittel}${x.under.includes('·') ? ` (${x.under.split('· ')[1]})` : ''}`, 10, A4[0] - 2 * MARG - 110)[0] || '', MARG, 10);
      hoyre(belop(x.tilbudt), A4[0] - MARG, 10, fet);
      y -= 6; strek(); y -= 16;
    }
    y += 2; strek(1.5, svart); y -= 16;
    tekst('Sum egeninnsats', MARG, 11, fet); hoyre(belop(sumEgeninnsats), A4[0] - MARG, 12, fet);
  }

  // ——— 3. Bilagene ———
  // Samme dokument på flere oppføringer (faktura + kreditnota) tas med én gang.
  const sett = new Map();
  for (const f of fakturaer) {
    const nr = f.lopenummer;
    let lagt = false;
    if (f.fil?.sti && sett.has(f.fil.sti)) {
      nySide();
      stempel(nr, 0);
      y = A4[1] / 2 + 20;
      tekst(`Bilag: samme dokument som faktura ${sett.get(f.fil.sti)}.`, MARG, 12, fet, graa); y -= 24;
      tekst(`${f.leverandor || 'Ukjent leverandør'} · ${f.fakturanr || 'uten nummer'} · ${f.dato ? datoFelt(f.dato) : 'uten dato'} · ${f.belop == null ? '–' : belop(f.belop) + ' kr'}`, MARG, 10, font, graa);
      continue;
    }
    if (f.fil?.sti) {
      sett.set(f.fil.sti, nr);
      try {
        const bytes = await filBytes(f.fil.sti);
        const type = (f.fil.type || '').toLowerCase();
        if (type === 'application/pdf' || f.fil.navn?.toLowerCase().endsWith('.pdf')) {
          const kilde = await PDFDocument.load(bytes, { ignoreEncryption: true });
          await krympBilderIPdf(kilde, PDFLib);
          const sider = await doc.copyPages(kilde, kilde.getPageIndices());
          sider.forEach((pg, idx) => { doc.addPage(pg); side = pg; stempel(nr, sider.length > 1 ? idx + 1 : 0); });
          lagt = true;
        } else if (type === 'image/jpeg' || type === 'image/png' || /\.(jpe?g|png)$/i.test(f.fil.navn || '')) {
          const erPng = type === 'image/png' || /\.png$/i.test(f.fil.navn || '');
          const krympet = await krympBilde(bytes, erPng ? 'image/png' : 'image/jpeg');
          const bilde = krympet ? await doc.embedJpg(krympet) : erPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
          nySide();
          const maksB = A4[0] - 2 * 36, maksH = A4[1] - 36 - 90;
          const skala = Math.min(maksB / bilde.width, maksH / bilde.height, 1);
          const b = bilde.width * skala, h = bilde.height * skala;
          side.drawImage(bilde, { x: (A4[0] - b) / 2, y: 36, width: b, height: h });
          stempel(nr, 0);
          lagt = true;
        }
      } catch (err) {
        console.error('Kunne ikke ta med bilag', f.fil, err);
      }
    }
    if (!lagt) {
      nySide();
      stempel(nr, 0);
      y = A4[1] / 2 + 20;
      const melding = f.fil ? `Vedlegget «${f.fil.navn}» kunne ikke tas med (ukjent format).` : 'Vedlegg mangler.';
      for (const l of brytTekst(melding, 12, A4[0] - 2 * MARG)) { tekst(l, MARG, 12, fet, graa); y -= 16; }
      y -= 8;
      tekst(`${f.leverandor || 'Ukjent leverandør'} · ${f.fakturanr || 'uten nummer'} · ${f.dato ? datoFelt(f.dato) : 'uten dato'} · ${f.belop == null ? '–' : belop(f.belop) + ' kr'}`, MARG, 10, font, graa);
    }
  }

  doc.setTitle(`Revisjonsrapport – ${s.tittel || 'Søknad'}`);
  const ut = await doc.save();
  const blob = new Blob([ut], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Revisjonsrapport ${(s.tittel || 'soknad').replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
