// Innlogging: Google eller innloggingslenke på e-post. Tilgang krever at
// e-posten er invitert (ligger i brukere-samlingen) — det sjekkes i app.js.
import { innlogging } from '../data/index.js';
import { escapeHtml } from '../ui/format.js';

const GOOGLE = '<svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.96H.96A8.996 8.996 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.34z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/></svg>';

const gyldigEpost = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const innloggingsside = {
  venterPaaEpost: false,

  vis(rot, { feil = '', beskjed = '', loggUt = false } = {}) {
    this.venterPaaEpost = false;
    rot.innerHTML = `
      <div class="innlogging"><form class="kort" id="innlogging" novalidate>
        <h1>Søknadsportal</h1>
        ${feil ? `<div class="beskjed feil" role="alert">${escapeHtml(feil)}</div>` : ''}
        ${loggUt ? '<button type="button" class="knapp knapp-ramme" data-inn="ut">Logg inn med en annen konto</button>' : `
        <button type="button" class="knapp knapp-ramme" data-inn="google">${GOOGLE}Logg inn med Google</button>
        <div class="skille">eller</div>
        <label class="felt"><span class="etikett">E-post</span><input class="inndata" name="epost" type="email" autocomplete="email" placeholder="navn@korpset.no"></label>
        <button type="submit" class="knapp knapp-primar">Send meg en innloggingslenke</button>
        <div class="beskjed" id="beskjed">${escapeHtml(beskjed)}</div>`}
      </form></div>`;
    const skjema = rot.querySelector('#innlogging');
    const skriv = (tekst, erFeil) => {
      const el = rot.querySelector('#beskjed');
      el.textContent = tekst;
      el.classList.toggle('feil', !!erFeil);
    };
    skjema.addEventListener('click', async e => {
      const knapp = e.target.closest('[data-inn]');
      if (!knapp) return;
      if (knapp.dataset.inn === 'ut') { await innlogging.loggUt(); this.vis(rot); return; }
      try { await innlogging.loggInnMedGoogle(); }
      catch (err) { if (err.code !== 'auth/popup-closed-by-user') skriv('Innlogging feilet: ' + (err.message || err.code), true); }
    });
    skjema.addEventListener('submit', async e => {
      e.preventDefault();
      const epost = skjema.epost.value.trim().toLowerCase();
      if (!gyldigEpost(epost)) { skriv('Skriv inn en gyldig e-postadresse.', true); return; }
      try {
        await innlogging.sendInnloggingslenke(epost);
        skriv(`Sjekk e-posten din. Vi har sendt en innloggingslenke til ${epost}.`);
      } catch (err) {
        skriv('Kunne ikke sende lenken: ' + (err.message || err.code), true);
      }
    });
  },

  // Lenken ble åpnet i en annen nettleser enn den ble bestilt fra.
  visTrengerEpost(rot) {
    this.venterPaaEpost = true;
    rot.innerHTML = `
      <div class="innlogging"><form class="kort" id="bekreft" novalidate>
        <h1>Bekreft e-post</h1>
        <div class="beskjed">Skriv inn e-postadressen du ba om innloggingslenken til.</div>
        <label class="felt"><span class="etikett">E-post</span><input class="inndata" name="epost" type="email" autocomplete="email"></label>
        <button type="submit" class="knapp knapp-primar">Logg inn</button>
        <div class="beskjed feil" id="beskjed"></div>
      </form></div>`;
    const skjema = rot.querySelector('#bekreft');
    skjema.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await innlogging.fullforLenke(skjema.epost.value.trim().toLowerCase());
        this.venterPaaEpost = false;
      } catch (err) {
        rot.querySelector('#beskjed').textContent = 'Kunne ikke logge inn: ' + (err.message || err.code);
      }
    });
  },
};
