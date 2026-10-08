// Tekst-fanen i en søknad (kort 0018, B-34): ett tekstområde per felt i
// giverens skjema, med teller under og statuslinje øverst, og «Kopier
// underlag» som samler alt portalen vet til et oppdrag som limes inn i en
// språkmodell. Teksten lagres per felt ved blur; den er det vi sendte og
// låses sammen med resten når søknaden ikke lenger er et utkast (B-16).
// Kalles fra soknad.js.
import { tilstand, organisasjon } from '../data/index.js';
import { tekstfelt, tekststatus, tellTekst, tellerTekst, skrivunderlag, erLast } from '../data/beregning.js';
import { escapeHtml } from '../ui/format.js';
import { tekstomrade } from '../ui/felt.js';
import { visKvittering } from '../ui/lagring.js';
import { tegn, IKON, sidepanel, lukkeknapp } from '../ui/visning.js';

const LAST_TITTEL = 'Låst: søknaden er sendt. Sett status tilbake til Utkast for å endre.';
// `underlag` er teksten som vises i panelet når utklippstavlen ikke kan brukes.
const ui = { kopiert: false, underlag: null, nyttPanel: false };

function lagUnderlag(s) {
  return skrivunderlag({ organisasjon: organisasjon(), giver: giver(s) || {}, soknad: s, behov: tilstand.behov, soknader: tilstand.soknader });
}

async function kopier(tekst) {
  try { await navigator.clipboard.writeText(tekst); return true; } catch { return false; }
}

const giver = s => tilstand.givere.find(g => g.id === s.giverId);

function tekstrad(s, f, last) {
  const nokkel = `soknader/${s.id}/tekster.${f.id}`;
  return `
    <div class="tekstfelt">
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px">
        <span class="etikett">${escapeHtml(f.navn || (f.fjernet ? 'Fjernet felt' : 'Uten navn'))}</span>
        <span class="undertekst ${f.over ? 'over' : ''}" id="teller-${f.id}" title="${f.maks ? `Giveren tillater maks ${f.maks} ${f.enhet}` : 'Ingen grense'}">${tellerTekst(f.antall, f.maks, f.enhet)}</span>
      </div>
      ${f.hjelp ? `<span class="undertekst" style="white-space:pre-line">${escapeHtml(f.hjelp)}</span>` : ''}
      ${tekstomrade(nokkel, f.tekst, `class="inndata" rows="6" data-teller="${f.id}" data-maks="${f.maks || ''}" data-enhet="${f.enhet}"${f.fjernet ? ' data-fjernet' : ''}${last ? ` readonly title="${LAST_TITTEL}"` : ''}`)}
    </div>`;
}

export const tekstFane = {
  tegn(s) {
    const g = giver(s);
    const felt = tekstfelt(s, g);
    const egne = felt.filter(f => !f.fjernet), fjernede = felt.filter(f => f.fjernet);
    const status = tekststatus(felt);
    const last = erLast(s);
    const harSkjema = !!egne.length && egne[0].id !== 'fri';
    return `
      <div class="verktoyrad">
        <div class="etikett">Søknadstekst</div>
        <div class="hint" id="tekststatus" style="flex:1 1 auto">${status.tekst}${last ? ` · <span style="display:inline-flex; align-items:center; gap:6px; vertical-align:middle">${IKON.las}<b>Låst</b> – søknaden er sendt.</span>` : ''}</div>
        <div class="grupper" style="align-items:center">
          ${ui.kopiert ? '<span class="undertekst">Kopiert – lim inn i Claude eller ChatGPT</span>' : ''}
          <button type="button" class="knapp knapp-ramme knapp-liten" data-handling="kopier-underlag" title="Kopierer et oppdrag med alt portalen vet om korpset, giveren og søknaden. Lim det inn i Claude eller ChatGPT og få utkast til hvert felt.">Kopier underlag</button>
        </div>
      </div>
      <div class="hint">${harSkjema
        ? `Feltene er giverens skjema (${escapeHtml(g?.navn || '')}). Skriv teksten her og kopier den inn i giverens skjema når søknaden sendes. Giverens skjema endres under <a href="#/givere">Innstillinger → Givere</a>.`
        : `Giveren har ikke noe skjema. Legg inn feltene giveren ber om under <a href="#/givere">Innstillinger → Givere</a>, så får søknaden ett tekstområde per felt med ordgrense.`}</div>
      <div style="flex:1 1 auto; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:18px; padding-right:12px" data-rull="tekst">
        ${egne.map(f => tekstrad(s, f, last)).join('')}
        ${fjernede.length ? `
          <div class="etikett" style="margin-top:8px">Felt som ikke lenger er i skjemaet</div>
          <div class="hint">Giverens skjema er endret etter at dette ble skrevet. Teksten blir stående her og tas ikke med i underlaget.</div>
          ${fjernede.map(f => tekstrad(s, f, last)).join('')}` : ''}
      </div>`;
  },

  // Panelet med underlaget: vises når nettleseren ikke lar oss skrive til
  // utklippstavlen, så teksten kan merkes og kopieres for hånd.
  panel() {
    if (ui.underlag == null) return '';
    return sidepanel(`
      <div class="panelhode">
        <div><h2>Underlag</h2><div class="ingress" style="margin-top:4px">Nettleseren slapp oss ikke til på utklippstavlen. Merk teksten (⌘/Ctrl+A i feltet) og kopier den selv, så lim den inn i Claude eller ChatGPT.</div></div>
        ${lukkeknapp('lukk-underlag')}
      </div>
      <textarea class="inndata" id="underlagtekst" readonly style="flex:1 1 auto; min-height:300px; font-size:13px; font-family:ui-monospace, Menlo, monospace">${escapeHtml(ui.underlag)}</textarea>
      <div class="panelbunn"><span></span><button type="button" class="knapp knapp-ramme" data-handling="kopier-underlag">Prøv å kopiere igjen</button></div>`, { nytt: ui.nyttPanel });
  },

  forlat() { ui.underlag = null; },
  escape() { if (ui.underlag == null) return false; ui.underlag = null; return true; },

  async klikk(handling, el, e, s) {
    if (handling === 'lukk-underlag') { ui.underlag = null; tegn(); return true; }
    if (handling !== 'kopier-underlag') return false;
    const tekst = lagUnderlag(s);
    if (await kopier(tekst)) {
      ui.underlag = null;
      visKvittering('Kopiert');
      ui.kopiert = true; tegn();
      setTimeout(() => { ui.kopiert = false; tegn(); }, 4000);
    } else {
      ui.underlag = tekst; ui.nyttPanel = true; tegn(); ui.nyttPanel = false;
      document.getElementById('underlagtekst')?.select();
    }
    return true;
  },
};

// Telleren under feltet og statuslinjen følger med mens man skriver – uten
// å tegne siden på nytt (det ville revet bort fokus).
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.matches?.('textarea[data-teller]')) return;
  const maks = Number(el.dataset.maks) || null, enhet = el.dataset.enhet || 'ord';
  const antall = tellTekst(el.value, enhet);
  const teller = document.getElementById(`teller-${el.dataset.teller}`);
  if (teller) { teller.textContent = tellerTekst(antall, maks, enhet); teller.classList.toggle('over', !!maks && antall > maks); }
  const status = document.getElementById('tekststatus');
  if (!status) return;
  // Samme regning som tekststatus(): fjernede felt teller bare i «over grensen».
  const alle = [...document.querySelectorAll('textarea[data-teller]')].map(t => {
    const m = Number(t.dataset.maks) || null, n = tellTekst(t.value, t.dataset.enhet || 'ord');
    return { utfylt: t.value.trim() !== '', over: !!m && n > m, fjernet: t.hasAttribute('data-fjernet') };
  });
  const egne = alle.filter(x => !x.fjernet);
  const utfylt = egne.filter(x => x.utfylt).length, over = alle.filter(x => x.over).length;
  status.firstChild.textContent = `${utfylt} av ${egne.length} felt utfylt${over ? ` · ${over} over grensen` : ''}`;
});
