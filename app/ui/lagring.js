// «Lagret»-statusen i toppmenyen. Alle skrivinger går gjennom `lagre()`,
// som viser «Lagrer …», så «Lagret» i to sekunder, og ved feil en rød
// melding med «Prøv igjen» som kjører den samme skrivingen på nytt.
import { escapeHtml } from './format.js';

let pagaende = 0;
let sistLagret = null;
let visLagretTil = 0;
let feil = null; // { melding, igjen }
let melding = null; // { tekst } — valideringsfeil uten «Prøv igjen»
let kvittering = null; // { tekst, til } — f.eks. «Kopiert», vises to sekunder
let tidtaker;
const ventende = new Set();

function el() {
  return document.getElementById('lagrestatus');
}

function klokke(d) {
  return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

const HAK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function tegn() {
  const rot = el();
  if (!rot) return;
  if (feil) {
    rot.innerHTML = `<span class="lagrestatus-feil" role="alert">${escapeHtml(feil.melding)}<button type="button" data-lagring="igjen">Prøv igjen</button></span>`;
  } else if (melding) {
    rot.innerHTML = `<span class="lagrestatus-feil" role="alert">${escapeHtml(melding.tekst)}<button type="button" data-lagring="lukk">OK</button></span>`;
  } else if (kvittering && Date.now() < kvittering.til) {
    rot.innerHTML = `<span class="lagrestatus-lagret">${HAK}${escapeHtml(kvittering.tekst)}</span>`;
  } else if (pagaende > 0) {
    rot.innerHTML = '<span class="lagrestatus-rolig">Lagrer …</span>';
  } else if (Date.now() < visLagretTil) {
    rot.innerHTML = `<span class="lagrestatus-lagret">${HAK}Lagret</span>`;
  } else {
    rot.innerHTML = `<span class="lagrestatus-rolig">${sistLagret ? `Alle endringer lagret kl. ${klokke(sistLagret)}` : 'Alle endringer lagres automatisk'}</span>`;
  }
}

export function kobleLagringsstatus() {
  el()?.addEventListener('click', e => {
    const knapp = e.target.closest('[data-lagring]');
    if (!knapp) return;
    if (knapp.dataset.lagring === 'igjen' && feil) {
      const igjen = feil.igjen;
      feil = null;
      lagre(igjen);
    } else if (knapp.dataset.lagring === 'lukk') {
      melding = null;
      tegn();
    }
  });
  tegn();
}

// Kjører en skriving og viser status. Returnerer resultatet, eller
// undefined hvis den feilet (feilen vises da i toppmenyen).
export function lagre(skriving) {
  const lofte = utfor(skriving);
  ventende.add(lofte);
  lofte.finally(() => ventende.delete(lofte));
  return lofte;
}

// Venter til alle skrivinger som er i gang er ferdige (f.eks. feltet som
// nettopp ble forlatt). Gir false hvis en lagring har feilet.
export async function ferdigLagret() {
  while (ventende.size) await Promise.all([...ventende]);
  return !feil;
}

async function utfor(skriving) {
  pagaende++;
  melding = null;
  tegn();
  try {
    const svar = await skriving();
    pagaende--;
    sistLagret = new Date();
    visLagretTil = Date.now() + 2000;
    clearTimeout(tidtaker);
    tidtaker = setTimeout(tegn, 2050);
    tegn();
    return svar;
  } catch (err) {
    pagaende--;
    console.error('Lagring feilet:', err);
    feil = { melding: forklar(err), igjen: skriving };
    tegn();
    return undefined;
  }
}

// Valideringsfeil (f.eks. ugyldig dato) — vises på samme sted, men uten
// «Prøv igjen», siden det er verdien som må rettes.
export function visMelding(tekst) {
  melding = { tekst };
  tegn();
}

// En kort bekreftelse på noe som ikke er en lagring (f.eks. «Kopiert»).
export function visKvittering(tekst) {
  kvittering = { tekst, til: Date.now() + 2000 };
  clearTimeout(tidtaker);
  tidtaker = setTimeout(tegn, 2050);
  tegn();
}

function forklar(err) {
  const kode = err?.code || '';
  if (kode.includes('permission-denied')) return 'Kunne ikke lagre: mangler tilgang';
  if (/^(Giveren|Behovet|Leverandøren|Brukeren) /.test(err?.message || '')) return err.message;
  return 'Kunne ikke lagre siste endring';
}
