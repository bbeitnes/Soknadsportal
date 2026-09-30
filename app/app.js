// Appskallet: innlogging, ruting, tegning og felles hendelser.
//
// Tegning: hver side har `tegn(parametre)` som gir HTML ut fra `tilstand`,
// og `klikk(handling, el, e)` for knapper merket data-handling="…". Når data
// endres (egen lagring eller andres), tegnes siden på nytt — men ALDRI mens
// markøren står i et felt eller museknappen er nede. Da venter vi til feltet
// er forlatt / klikket er ferdig, så fokus og klikk aldri rives bort.
// Unntak: står markøren i et lagringsfelt (data-felt), tegnes siden likevel,
// og markøren, utvalget og det som er skrevet flyttes over til det nye feltet.
// Da oppdateres f.eks. kostnaden med én gang man tabber fra antall til pris.
import { APPNAVN, MILJO } from './config/app-config.js';
import { tilstand, innlogging, hentTilgang, startLytting, alleLastet, oppdaterGiver, oppdaterBehov, oppdaterSoknad, oppdaterInnkjop, oppdaterLeverandor, oppdaterFaktura } from './data/index.js';
import { escapeHtml } from './ui/format.js';
import { kobleLagringsstatus, lagre, visMelding } from './ui/lagring.js';
import { tolkFelt, tolkNokkel } from './ui/felt.js';
import { registrerSkall } from './ui/visning.js';
import { innloggingsside } from './sider/innlogging.js';
import { soknaderSide } from './sider/soknader.js';
import { soknadSide } from './sider/soknad.js';
import { behovSide } from './sider/behov.js';
import { givereSide } from './sider/givere.js';
import { leverandorerSide } from './sider/leverandorer.js';
import { kvitteringSide } from './sider/kvittering.js';

const rot = document.getElementById('side');
const SIDER = { soknader: soknaderSide, soknad: soknadSide, behov: behovSide, givere: givereSide, leverandorer: leverandorerSide, kvittering: kvitteringSide };

document.title = APPNAVN;
document.getElementById('merke').innerHTML = MILJO === 'prod' ? 'Søknadsportal' : `Søknadsportal<small>${MILJO.toUpperCase()}</small>`;

let gjeldende = null; // { side, parametre }
let ventendeTegning = false;
let pekerNede = false;
let fokusEtterTegning = null;

// ——— Ruting ———

// Uten rute på en smal skjerm (telefon) går vi rett til kvitteringen —
// det er det portalen brukes til fra mobil.
function lesRute() {
  const [navn, ...parametre] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (!navn && window.matchMedia('(max-width: 700px)').matches) return { navn: 'kvittering', parametre: [] };
  return { navn: SIDER[navn] ? navn : 'soknader', parametre };
}

window.addEventListener('hashchange', () => {
  if (!tilstand.meg) return;
  byttSide();
});

function byttSide() {
  const { navn, parametre } = lesRute();
  const side = SIDER[navn];
  if (gjeldende?.side !== side) gjeldende?.side.forlat?.();
  gjeldende = { side, parametre };
  document.body.classList.toggle('mobilside', !!side.mobil);
  document.querySelectorAll('[data-meny]').forEach(a => {
    const aktiv = a.dataset.meny === (side.meny || navn);
    if (aktiv) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  tegnNaa();
}

// ——— Tegning ———

// Felt uten data-felt (f.eks. «Ny søknad»-skjemaet) har ingen lagret verdi
// å gjenopprette, så der venter vi med å tegne til feltet er forlatt.
function redigerer() {
  const a = document.activeElement;
  return a && rot.contains(a) && a.matches('input:not([type=file]):not([data-felt]), textarea:not([data-felt])');
}

let tegner = false;

// Tegningen legges i en egen oppgave (setTimeout 0). Firestore kan melde
// en endring midt i en Tab-overgang — før markøren har landet i neste felt —
// og da ville vi ikke visst hvilket felt som skulle få fokus tilbake.
let planlagt = false;
function tegn() {
  if (planlagt) return;
  planlagt = true;
  setTimeout(() => {
    planlagt = false;
    if (redigerer() || pekerNede) { ventendeTegning = true; return; }
    tegnNaa();
  }, 0);
}

function tegnNaa() {
  ventendeTegning = false;
  if (!gjeldende) return;
  if (!alleLastet()) { rot.innerHTML = '<div class="laster">Laster …</div>'; return; }

  // Ta vare på scrollposisjoner (tabeller, panel) på tvers av tegningen.
  const rull = {};
  rot.querySelectorAll('[data-rull]').forEach(el => { rull[el.dataset.rull] = [el.scrollTop, el.scrollLeft]; });
  const aktiv = document.activeElement;
  const panelHaddeFokus = aktiv?.closest?.('.sidepanel');
  const felt = aktiv?.matches?.('[data-felt]') && rot.contains(aktiv) ? {
    nokkel: aktiv.dataset.felt,
    verdi: aktiv.value,
    endret: aktiv.value !== aktiv.dataset.verdi,
    utvalg: [aktiv.selectionStart, aktiv.selectionEnd],
  } : null;
  // Knapper (f.eks. «Finansieres» etter Tab fra prisfeltet) finnes igjen på
  // handling + id-attributtene sine.
  const knapp = !felt && aktiv?.matches?.('[data-handling]') && rot.contains(aktiv)
    ? '[data-handling="' + CSS.escape(aktiv.dataset.handling) + '"]'
      + ['id', 'linje', 'verdi'].filter(k => aktiv.dataset[k] != null).map(k => `[data-${k}="${CSS.escape(aktiv.dataset[k])}"]`).join('')
    : null;

  tegner = true; // focusout fra feltet som fjernes skal ikke lagre
  rot.innerHTML = gjeldende.side.tegn(gjeldende.parametre);
  tegner = false;

  rot.querySelectorAll('[data-rull]').forEach(el => {
    const r = rull[el.dataset.rull];
    if (r) [el.scrollTop, el.scrollLeft] = r;
  });

  if (felt && !fokusEtterTegning) {
    const el = rot.querySelector(`[data-felt="${CSS.escape(felt.nokkel)}"]`);
    if (el) {
      if (felt.endret) el.value = felt.verdi; // ulagret tekst beholdes
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(...felt.utvalg); } catch { /* select/tall */ }
      return;
    }
  }
  // Et element merket data-autofokus (f.eks. prisfeltet i en celle som
  // redigeres) får fokus når det dukker opp.
  const auto = rot.querySelector('[data-autofokus]');
  if (auto) { auto.focus({ preventScroll: true }); auto.select?.(); return; }
  if (knapp && !fokusEtterTegning) {
    const el = rot.querySelector(knapp);
    if (el) { el.focus({ preventScroll: true }); return; }
  }
  if (fokusEtterTegning) {
    const el = rot.querySelector(`[data-felt="${CSS.escape(fokusEtterTegning)}"]`);
    fokusEtterTegning = null;
    if (el) { el.focus(); el.select?.(); return; }
  }
  // Et nytt/åpent sidepanel får fokus, så Escape virker med én gang.
  const panel = rot.querySelector('.sidepanel');
  if (panel && (panel.dataset.nytt === 'ja' || panelHaddeFokus)) panel.focus({ preventScroll: true });
}

// Ber om at et felt får fokus etter neste tegning (f.eks. tittelen på et
// nytt behov).
function fokuser(nokkel) {
  fokusEtterTegning = nokkel;
}

registrerSkall({ tegn, fokuser });

function tegnHvisVentende() {
  if (ventendeTegning && !redigerer() && !pekerNede) tegnNaa();
}

document.addEventListener('pointerdown', () => { pekerNede = true; }, true);
document.addEventListener('pointerup', () => { pekerNede = false; setTimeout(tegnHvisVentende, 0); }, true);
document.addEventListener('pointercancel', () => { pekerNede = false; setTimeout(tegnHvisVentende, 0); }, true);

// ——— Felles hendelser ———

rot.addEventListener('click', e => {
  gjeldende?.side.klikkOveralt?.(e);
  const el = e.target.closest('[data-handling]');
  if (!el || !rot.contains(el) || el.disabled) return;
  gjeldende?.side.klikk?.(el.dataset.handling, el, e);
});

rot.addEventListener('dblclick', e => {
  const el = e.target.closest('[data-dobbelt]');
  if (el && rot.contains(el)) gjeldende?.side.dobbeltklikk?.(el, e);
});

rot.addEventListener('paste', e => {
  gjeldende?.side.limInn?.(e.target, e.clipboardData?.getData('text') ?? '', e);
});

rot.addEventListener('change', e => {
  if (e.target.matches('input[type=file]')) gjeldende?.side.filer?.(e.target, [...e.target.files]);
  // Nedtrekkslister lagres med én gang man velger, ikke først ved blur.
  if (e.target.matches('select[data-felt]')) lagreFelt(e.target);
});

rot.addEventListener('dragover', e => {
  if (e.target.closest('[data-slipp]')) { e.preventDefault(); e.target.closest('[data-slipp]').classList.add('over'); }
});
rot.addEventListener('dragleave', e => e.target.closest('[data-slipp]')?.classList.remove('over'));
rot.addEventListener('drop', e => {
  const sone = e.target.closest('[data-slipp]');
  if (!sone) return;
  e.preventDefault();
  sone.classList.remove('over');
  gjeldende?.side.filer?.(sone, [...e.dataTransfer.files]);
});

// Lagring ved blur: bare hvis verdien er endret siden den ble tegnet.
rot.addEventListener('focusout', e => {
  if (tegner) return;
  const el = e.target;
  if (el.matches?.('[data-felt]')) lagreFelt(el);
  else gjeldende?.side.fokusUt?.(el, e);
  setTimeout(tegnHvisVentende, 0);
});

const OPPDATER = { givere: oppdaterGiver, behov: oppdaterBehov, soknader: oppdaterSoknad, innkjop: oppdaterInnkjop, leverandorer: oppdaterLeverandor, fakturaer: oppdaterFaktura };

function lagreFelt(el) {
  if (el.value === el.dataset.verdi) return;
  const svar = tolkFelt(el);
  if (!svar.ok) {
    visMelding(svar.melding);
    el.value = el.dataset.verdi;
    return;
  }
  el.dataset.verdi = el.value; // unngå dobbel lagring hvis focusout kommer to ganger
  const { samling, id, sti } = tolkNokkel(el.dataset.felt);
  const felt = gjeldende?.side.forLagring?.(samling, id, sti, svar.verdi) || { [sti]: svar.verdi };
  lagre(() => OPPDATER[samling](id, felt));
  ventendeTegning = true; // tall/summer oppdateres når feltet er forlatt
}

document.addEventListener('keydown', e => {
  const el = e.target;
  if (el.matches?.('[data-felt]')) {
    if (e.key === 'Enter' && el.tagName === 'INPUT') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { el.value = el.dataset.verdi; el.blur(); e.preventDefault(); }
    return;
  }
  if (e.key === 'Enter' && el.matches?.('input[data-blur-ved-enter]')) { e.preventDefault(); el.blur(); return; }
  if (e.key === 'Escape' && gjeldende?.side.escape?.()) { e.preventDefault(); tegn(); }
});

// ——— Innlogging og oppstart ———

let stoppLytting = null;

function visMeg() {
  const m = tilstand.meg;
  const el = document.getElementById('meg');
  el.hidden = false;
  el.innerHTML = `<span>${escapeHtml(m.navn || m.epost)}</span><button type="button" id="logg-ut">Logg ut</button>`;
  el.querySelector('#logg-ut').addEventListener('click', () => innlogging.loggUt());
}

function visInnlogging(beskjed) {
  stoppLytting?.();
  stoppLytting = null;
  tilstand.meg = null;
  gjeldende = null;
  document.getElementById('meny').hidden = true;
  document.getElementById('lagrestatus').hidden = true;
  document.getElementById('meg').hidden = true;
  innloggingsside.vis(rot, beskjed);
}

async function start() {
  kobleLagringsstatus();
  try {
    const lenke = await innlogging.fullforLenke();
    if (lenke === 'trenger-epost') { innloggingsside.visTrengerEpost(rot); }
  } catch (err) {
    console.error(err);
    innloggingsside.vis(rot, { feil: 'Innloggingslenken er ugyldig eller utløpt. Be om en ny.' });
  }

  innlogging.vedEndring(async bruker => {
    if (!bruker) { if (!innloggingsside.venterPaaEpost) visInnlogging(); return; }
    if (!bruker.bekreftet) { visInnlogging({ feil: 'E-postadressen er ikke bekreftet.' }); return; }
    try {
      const meg = await hentTilgang(bruker);
      if (!meg) {
        visInnlogging({ feil: `${bruker.epost} har ikke tilgang. Be en administrator om en invitasjon.`, loggUt: true });
        return;
      }
    } catch (err) {
      console.error(err);
      visInnlogging({ feil: 'Kunne ikke sjekke tilgang. Prøv igjen senere.', loggUt: true });
      return;
    }
    document.getElementById('meny').hidden = false;
    document.getElementById('lagrestatus').hidden = false;
    visMeg();
    stoppLytting = startLytting(() => tegn(), err => {
      console.error(err);
      rot.innerHTML = '<div class="laster">Kunne ikke hente data. Last siden på nytt.</div>';
    });
    byttSide();
  });
}

start();
