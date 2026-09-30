// Givere. Vedlikeholdes av administrator; andre brukere ser dem lesbart.
// (Brukerlisten og invitasjoner kommer i trinn e.)
import { tilstand, erAdmin, opprettGiver, oppdaterGiver, slettGiver, inviterBruker, oppdaterBruker, fjernBruker, invitasjonstekst } from '../data/index.js';
import { statusNavn } from '../data/beregning.js';
import { escapeHtml, kr, datoFelt } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre, visMelding } from '../ui/lagring.js';
import { tegn, fokuser, avkryss, sidepanel, lukkeknapp } from '../ui/visning.js';

const ui = { seksjon: 'givere', panel: null, nyttPanel: false, invitasjon: { epost: '', rolle: 'bruker' }, kopiert: null };

function momsTekst(g) {
  return g.momsTrekk ? `Trekkes ut, ${g.momsProsent ?? 0} %` : 'Nei';
}

function sortert() {
  return [...tilstand.givere].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
}

function panel(g) {
  const admin = erAdmin();
  const soknader = tilstand.soknader.filter(s => s.giverId === g.id);
  const eksempel = kr(1000 * (100 - (g.momsProsent ?? 0)) / 100);
  const nokkel = f => `givere/${g.id}/${f}`;
  return sidepanel(`
    <div class="panelhode">
      <div>
        <div class="etikett">Giver</div>
        ${admin
          ? `<input class="tittelfelt" ${feltAttr(nokkel('navn'), g.navn)} placeholder="Navn">`
          : `<h2>${escapeHtml(g.navn || 'Uten navn')}</h2>`}
      </div>
      ${lukkeknapp()}
    </div>
    <label class="felt"><span class="etikett">Kontaktinfo og notat</span>
      ${admin
        ? tekstomrade(nokkel('kontakt'), g.kontakt, 'class="inndata" rows="4" placeholder="Kontaktperson, e-post, telefon, søknadsfrister …"')
        : `<div style="white-space:pre-line; font-size:14px">${escapeHtml(g.kontakt || '–')}</div>`}
    </label>
    <div class="boksrute">
      ${admin
        ? avkryss(!!g.momsTrekk, 'Trekk ut momskompensasjon', 'moms', '', 'fet')
        : `<div style="font-weight:600">Momskompensasjon: ${escapeHtml(momsTekst(g))}</div>`}
      ${g.momsTrekk ? `
        ${admin ? `<div class="innrykk" style="display:flex; align-items:center; gap:10px"><span class="dempet">Standardprosent</span><input class="inndata prosent" inputmode="numeric" ${feltAttr(nokkel('momsProsent'), g.momsProsent, 'prosent')}><span>%</span></div>` : ''}
        <div class="innrykk undertekst">Eksempel: en vare til 1 000 kr dekkes med ${eksempel} kr fra giveren; resten dekkes av momskompensasjonen året etter. Kan justeres per søknad.</div>`
      : '<div class="innrykk undertekst">Søknader til denne giveren viser ingen ekstra kolonner.</div>'}
    </div>
    <div class="felt"><span class="etikett">Søknader</span>
      <div class="valgliste">
        ${soknader.map(s => `<a href="#/soknad/${s.id}"><span class="fyll" style="font-weight:600">${escapeHtml(s.tittel)}</span><span class="undertekst">${statusNavn(s.status)}</span></a>`).join('')
          || '<div class="tomt">Ingen søknader enda.</div>'}
      </div>
    </div>
    <div class="panelbunn"><span></span>
      ${admin && !soknader.length ? '<button type="button" class="knapp knapp-fare" data-handling="slett">Slett giver</button>' : ''}
    </div>`, { nytt: ui.nyttPanel });
}

// ——— Brukere (bare administrator) ———

function brukerRad(b) {
  const meg = b.id === tilstand.meg.epost;
  const invitert = b.status !== 'aktiv';
  const admin = b.rolle === 'administrator';
  return `
    <tr>
      <td class="fet">${escapeHtml(b.navn || '–')}</td>
      <td class="dempet" style="font-size:14px">${escapeHtml(b.epost)}</td>
      <td style="padding-top:8px; padding-bottom:8px"><div class="segment" style="display:inline-flex">
        <button type="button" data-handling="rolle" data-id="${b.id}" data-rolle="bruker" aria-pressed="${!admin}" style="height:26px; font-size:12px; padding:0 10px" ${meg ? 'disabled title="Du kan ikke fjerne din egen administratorrolle"' : ''}>Bruker</button>
        <button type="button" data-handling="rolle" data-id="${b.id}" data-rolle="administrator" aria-pressed="${admin}" style="height:26px; font-size:12px; padding:0 10px">Administrator</button>
      </div></td>
      <td class="smal" style="font-size:13px; ${invitert ? 'color:var(--color-accent-700)' : 'color:var(--color-neutral-700)'}">${invitert ? `Invitert${b.invitertTid ? ' ' + datoFelt(new Date(b.invitertTid).toISOString().slice(0, 10)) : ''}` : 'Aktiv'}</td>
      <td class="tall smal" style="padding-top:8px; padding-bottom:8px">
        ${ui.kopiert === b.id ? '<span class="undertekst">Lenke kopiert</span>' : invitert ? `<button type="button" class="knapp knapp-liten" style="height:28px; font-size:12px" data-handling="kopier" data-id="${b.id}">Send igjen</button>` : ''}
        ${meg ? '<span class="undertekst">deg</span>' : `<button type="button" class="knapp knapp-fare" data-handling="fjern" data-id="${b.id}">Fjern</button>`}
      </td>
    </tr>`;
}

function brukere() {
  const liste = [...tilstand.brukere].sort((a, b) => (a.navn || a.epost).localeCompare(b.navn || b.epost, 'nb'));
  return `
    <div class="verktoyrad">
      <div class="hint">Alle brukere kan gjøre alt i søknadene. Administratorer kan i tillegg invitere og fjerne brukere og vedlikeholde givere.</div>
      <button type="button" class="knapp knapp-primar" data-handling="inviter">+ Inviter bruker</button>
    </div>
    <div class="tabellramme" data-rull="brukere">
      <table class="liste">
        <thead><tr><th>Navn</th><th>E-post</th><th>Rolle</th><th>Status</th><th style="width:170px"></th></tr></thead>
        <tbody>${liste.map(brukerRad).join('')}</tbody>
      </table>
    </div>`;
}

function inviterPanel() {
  const i = ui.invitasjon;
  const gyldig = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.epost.trim());
  return sidepanel(`
    <div class="panelhode">
      <div><h2>Inviter bruker</h2><div class="ingress" style="margin-top:4px">Portalen sender ikke e-post. Du får en tekst å kopiere og sende selv.</div></div>
      ${lukkeknapp()}
    </div>
    <label class="felt"><span class="etikett">E-post</span><input class="inndata" id="inv-epost" type="email" inputmode="email" autocomplete="off" value="${escapeHtml(i.epost)}" placeholder="navn@korpset.no"></label>
    <div class="felt"><span class="etikett">Rolle</span>
      <div class="segment fyll">
        <button type="button" data-handling="inv-rolle" data-rolle="bruker" aria-pressed="${i.rolle === 'bruker'}">Bruker</button>
        <button type="button" data-handling="inv-rolle" data-rolle="administrator" aria-pressed="${i.rolle === 'administrator'}">Administrator</button>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:12px">
      <button type="button" class="knapp knapp-primar" data-handling="inv-send" ${gyldig ? '' : 'disabled'}>Inviter og kopier tekst</button>
      <span class="undertekst" id="inv-hint">${gyldig ? `Inviteres som ${i.rolle}.` : 'Skriv inn en gyldig e-postadresse.'}</span>
    </div>
    <div class="undertekst">Personen logger inn med Google eller innloggingslenke på e-post, med den adressen du inviterer. Status blir «Aktiv» ved første innlogging.</div>`, { nytt: ui.nyttPanel });
}

document.addEventListener('input', e => {
  if (e.target.id !== 'inv-epost') return;
  ui.invitasjon.epost = e.target.value;
  const gyldig = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ui.invitasjon.epost.trim());
  const knapp = document.querySelector('[data-handling="inv-send"]');
  if (knapp) knapp.disabled = !gyldig;
  const hint = document.getElementById('inv-hint');
  if (hint) hint.textContent = gyldig ? `Inviteres som ${ui.invitasjon.rolle}.` : 'Skriv inn en gyldig e-postadresse.';
});

async function kopier(tekst) {
  try { await navigator.clipboard.writeText(tekst); return true; }
  catch { prompt('Kopier denne teksten og send den til brukeren:', tekst); return true; }
}

export const givereSide = {
  tegn() {
    const givere = sortert();
    const valgt = givere.find(g => g.id === ui.panel);
    if (ui.panel && !valgt && ui.panel !== 'inviter') ui.panel = null;
    if (!erAdmin()) ui.seksjon = 'givere';
    const visBrukere = ui.seksjon === 'brukere';
    const html = `
      <header class="sidehode">
        <div>
          <h1>${visBrukere ? 'Brukere' : 'Givere'}</h1>
          <div class="ingress">${visBrukere ? 'Hvem som har tilgang til portalen.' : 'Vedlikeholdes av administrator. Momsinnstillingen arves av nye søknader til giveren.'}</div>
        </div>
        ${erAdmin() ? `<div class="segment"><button type="button" data-handling="seksjon" data-id="givere" aria-pressed="${!visBrukere}" style="height:34px; padding:0 18px; font-size:14px">Givere (${givere.length})</button><button type="button" data-handling="seksjon" data-id="brukere" aria-pressed="${visBrukere}" style="height:34px; padding:0 18px; font-size:14px">Brukere (${tilstand.brukere.length})</button></div>` : ''}
      </header>
      <main class="innhold">
        ${visBrukere ? brukere() : `
        <div class="verktoyrad">
          <div class="hint">Klikk en giver for å ${erAdmin() ? 'endre kontaktinfo og momsinnstilling' : 'se detaljer'}.</div>
          ${erAdmin() ? '<button type="button" class="knapp knapp-primar" data-handling="ny">+ Ny giver</button>' : ''}
        </div>
        <div class="tabellramme" data-rull="givere">
          <table class="liste">
            <thead><tr><th>Giver</th><th>Kontakt</th><th>Momskompensasjon</th><th class="tall">Søknader</th></tr></thead>
            <tbody>
              ${givere.map(g => `
                <tr class="klikkbar ${g.id === ui.panel ? 'valgt' : ''}" data-handling="apne" data-id="${g.id}">
                  <td class="fet">${escapeHtml(g.navn || 'Uten navn')}</td>
                  <td class="dempet" style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml((g.kontakt || '–').split('\n')[0])}</td>
                  <td class="smal"><span class="merkelapp ${g.momsTrekk ? 'm-pa' : 'm-av'}">${escapeHtml(momsTekst(g))}</span></td>
                  <td class="tall">${tilstand.soknader.filter(s => s.giverId === g.id).length}</td>
                </tr>`).join('') || '<tr class="tom-rad"><td colspan="4">Ingen givere enda.</td></tr>'}
            </tbody>
          </table>
        </div>`}
      </main>
      ${valgt ? panel(valgt) : ui.panel === 'inviter' ? inviterPanel() : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    const g = tilstand.givere.find(x => x.id === ui.panel);
    if (handling === 'seksjon') { ui.seksjon = el.dataset.id; ui.panel = null; tegn(); }
    else if (handling === 'inviter') { ui.panel = 'inviter'; ui.nyttPanel = true; ui.invitasjon = { epost: '', rolle: 'bruker' }; tegn(); }
    else if (handling === 'inv-rolle') { ui.invitasjon.epost = document.getElementById('inv-epost')?.value ?? ui.invitasjon.epost; ui.invitasjon.rolle = el.dataset.rolle; tegn(); }
    else if (handling === 'inv-send') {
      const epost = (document.getElementById('inv-epost')?.value || '').trim().toLowerCase();
      const rolle = ui.invitasjon.rolle;
      el.disabled = true;
      const id = await lagre(() => inviterBruker(epost, rolle));
      if (!id) { el.disabled = false; return; }
      ui.panel = null;
      await kopier(invitasjonstekst({ epost: id }));
      ui.kopiert = id; tegn();
      setTimeout(() => { ui.kopiert = null; tegn(); }, 4000);
    }
    else if (handling === 'kopier') {
      const b = tilstand.brukere.find(x => x.id === el.dataset.id);
      if (b) { await kopier(invitasjonstekst(b)); ui.kopiert = b.id; tegn(); setTimeout(() => { ui.kopiert = null; tegn(); }, 4000); }
    }
    else if (handling === 'rolle') lagre(() => oppdaterBruker(el.dataset.id, { rolle: el.dataset.rolle }));
    else if (handling === 'fjern') {
      const b = tilstand.brukere.find(x => x.id === el.dataset.id);
      if (b && confirm(`Fjerne ${b.navn || b.epost} fra portalen?`)) lagre(() => fjernBruker(b.id));
    }
    else if (handling === 'apne') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else if (handling === 'ny') {
      const id = await lagre(() => opprettGiver());
      if (id) { ui.panel = id; fokuser(`givere/${id}/navn`); tegn(); }
    } else if (handling === 'moms' && g) {
      lagre(() => oppdaterGiver(g.id, { momsTrekk: !g.momsTrekk }));
    } else if (handling === 'slett' && g) {
      if (!confirm(`Slette giveren «${g.navn || 'Uten navn'}»?`)) return;
      ui.panel = null;
      lagre(() => slettGiver(g.id));
    }
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
