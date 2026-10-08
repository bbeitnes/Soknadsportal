// Givere og brukere. Alle brukere kan opprette og endre givere; bare
// administrator sletter dem og ser brukerlisten (B-29).
import { tilstand, erAdmin, opprettGiver, oppdaterGiver, slettGiver, leggTilFrist, fjernFrist, leggTilSkjemafelt, fjernSkjemafelt, flyttSkjemafelt, opprettSoknad, inviterBruker, oppdaterBruker, fjernBruker, invitasjonstekst, sendInnloggingslenkeTil } from '../data/index.js';
import { statusNavn, erTomPost, fristliste, nesteForekomst, skjemafelt, TEKSTENHETER } from '../data/beregning.js';
import { escapeHtml, kr, datoFelt, iDag } from '../ui/format.js';
import { feltAttr, tekstomrade } from '../ui/felt.js';
import { lagre, ferdigLagret, visMelding } from '../ui/lagring.js';
import { tegn, fokuser, gaaTil, avkryss, sidepanel, lukkeknapp, nesteknapp, kontaktfelt, kontaktcelle, IKON } from '../ui/visning.js';
import { innstillingsmeny } from './innstillinger.js';

const ui = { seksjon: 'givere', panel: null, nyttPanel: false, invitasjon: { epost: '', rolle: 'bruker' }, kopiert: null, sender: null, sendt: null };

function momsTekst(g) {
  return g.momsTrekk ? `Trekkes ut, ${g.momsProsent ?? 0} %` : 'Nei';
}

function sortert() {
  return [...tilstand.givere].sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'));
}

// Fristene til årshjulet (kort 0009). Hver frist er en egen post; en årlig
// frist gjentas på samme dag hvert år.
function fristrad(g, f) {
  const nokkel = felt => `givere/${g.id}/frister.${f.id}.${felt}`;
  const neste = nesteForekomst(f, iDag());
  const passert = !!f.dato && !neste;
  const naar = !f.dato ? '' : f.arlig ? `${datoFelt(f.dato).slice(0, 5)} · hvert år` : passert ? 'Passert' : 'Engang';
  return `
    <div class="fristrad ${passert ? 'passert' : ''}">
      <div class="fristfelt">
        <input class="inndata" placeholder="dd.mm.åååå" title="Dato" ${feltAttr(nokkel('dato'), f.dato, 'dato')}>
        <input class="inndata" placeholder="Hva, f.eks. ordinær tildeling" title="Hva fristen gjelder" ${feltAttr(nokkel('tekst'), f.tekst)}>
        <button type="button" class="ikonknapp" data-handling="frist-slett" data-id="${f.id}" title="Slett fristen">${IKON.lukk}</button>
      </div>
      <div class="fristvalg">
        ${avkryss(!!f.arlig, 'Årlig', 'frist-arlig', `data-id="${f.id}"`)}
        <span class="undertekst fyll">${naar}</span>
        ${neste ? `<button type="button" class="knapp knapp-ramme knapp-liten" style="height:26px; font-size:12px" data-handling="frist-soknad" data-id="${f.id}" title="Oppretter et utkast med giveren og frist ${datoFelt(neste)}">+ Søknad til denne fristen</button>` : ''}
      </div>
    </div>`;
}

// Giverens søknadsskjema (kort 0018): feltene søknadsteksten skrives i, i
// giverens rekkefølge, hvert med navn, hjelpetekst og valgfri grense.
function skjemarad(g, f, i, antall) {
  const nokkel = felt => `givere/${g.id}/skjema.${f.id}.${felt}`;
  const pil = (retning, ikon, tittel) => `<button type="button" class="ikonknapp" data-handling="skjema-${retning}" data-id="${f.id}" title="${tittel}" ${(retning === 'opp' ? i === 0 : i === antall - 1) ? 'disabled' : ''}>${ikon}</button>`;
  return `
    <div class="skjemafelt">
      <input class="inndata" placeholder="Feltets navn, f.eks. Beskrivelse av tiltaket" title="Navn på feltet i giverens skjema" ${feltAttr(nokkel('navn'), f.navn)}>
      <div class="skjemahode">
        <span class="undertekst">Maks</span>
        <input class="inndata tall" style="text-align:left; padding:0 6px" inputmode="numeric" placeholder="–" title="Maks antall ord eller tegn. Tomt = ingen grense." ${feltAttr(nokkel('maks'), f.maks, 'tall')}>
        <div class="segment">${TEKSTENHETER.map(([id, navn]) => `<button type="button" data-handling="skjema-enhet" data-id="${f.id}" data-enhet="${id}" aria-pressed="${(f.enhet || 'ord') === id}" title="Grensen telles i ${navn}">${navn}</button>`).join('')}</div>
        <span class="fyll"></span>
        ${pil('opp', IKON.opp, 'Flytt opp')}
        ${pil('ned', IKON.ned, 'Flytt ned')}
        <button type="button" class="ikonknapp" data-handling="skjema-slett" data-id="${f.id}" title="Fjern feltet. Tekst som er skrevet i det på søknader blir stående.">${IKON.lukk}</button>
      </div>
      ${tekstomrade(nokkel('hjelp'), f.hjelp, 'class="inndata" rows="2" placeholder="Giverens spørsmål, eller hva de legger vekt på" title="Vises under feltet i søknaden og tas med i underlaget"')}
    </div>`;
}

// Giverpanelet. Brukes i registeret (Innstillinger → Givere, med «+ Ny giver»
// nederst) og i Årshjul. Alle brukere kan endre; bare administrator sletter (B-29).
export function giverpanel(g, { nytt = false, neste = false } = {}) {
  const soknader = tilstand.soknader.filter(s => s.giverId === g.id);
  const eksempel = kr(1000 * (100 - (g.momsProsent ?? 0)) / 100);
  const nokkel = f => `givere/${g.id}/${f}`;
  const frister = fristliste(g);
  const skjema = skjemafelt(g);
  return sidepanel(`
    <div class="panelhode">
      <div>
        <div class="etikett">Giver</div>
        <input class="tittelfelt" ${feltAttr(nokkel('navn'), g.navn)} placeholder="Navn">
      </div>
      ${lukkeknapp()}
    </div>
    ${kontaktfelt(nokkel, g, { nettEtikett: 'Søknadsportal (nettadresse)' })}
    <label class="felt"><span class="etikett">Notat</span>
      ${tekstomrade(nokkel('kontakt'), g.kontakt, 'class="inndata" rows="4" placeholder="Krav til søknaden, andre kontakter …"')}
    </label>
    <div class="felt"><span class="etikett">Søknadsfrister</span>
      ${frister.map(f => fristrad(g, f)).join('') || '<div class="undertekst">Ingen frister enda. De vises i Årshjul.</div>'}
      <button type="button" class="knapp knapp-ramme knapp-liten" style="align-self:flex-start" data-handling="frist-ny">+ Frist</button>
    </div>
    <div class="felt"><span class="etikett">Søknadsskjema</span>
      <span class="undertekst">Feltene giveren ber om i søknaden, i deres rekkefølge, med maks ord eller tegn. Teksten skrives i søknadens Tekst-fane.</span>
      ${skjema.map((f, i) => skjemarad(g, f, i, skjema.length)).join('') || '<div class="undertekst">Ingen felt enda. Uten skjema får søknaden ett fritt tekstfelt.</div>'}
      <button type="button" class="knapp knapp-ramme knapp-liten" style="align-self:flex-start" data-handling="skjema-ny">+ Felt</button>
    </div>
    <div class="boksrute">
      ${avkryss(!!g.momsTrekk, 'Trekk ut momskompensasjon', 'moms', '', 'fet')}
      ${g.momsTrekk ? `
        <div class="innrykk" style="display:flex; align-items:center; gap:10px"><span class="dempet">Standardprosent</span><input class="inndata prosent" inputmode="numeric" ${feltAttr(nokkel('momsProsent'), g.momsProsent, 'prosent')}><span>%</span></div>
        <div class="innrykk undertekst">Eksempel: en vare til 1 000 kr dekkes med ${eksempel} kr fra giveren; resten dekkes av momskompensasjonen året etter. Kan justeres per søknad.</div>`
      : '<div class="innrykk undertekst">Søknader til denne giveren viser ingen ekstra kolonner.</div>'}
    </div>
    <div class="felt"><span class="etikett">Søknader</span>
      <div class="valgliste">
        ${soknader.map(s => `<a href="#/soknad/${s.id}"><span class="fyll" style="font-weight:600">${escapeHtml(s.tittel)}</span><span class="undertekst">${statusNavn(s.status)}</span></a>`).join('')
          || '<div class="tomt">Ingen søknader enda.</div>'}
      </div>
    </div>
    ${neste ? nesteknapp('+ Ny giver') : ''}
    <div class="panelbunn"><span></span>
      ${erAdmin() && !soknader.length ? '<button type="button" class="knapp knapp-fare" data-handling="slett">Slett giver</button>' : ''}
    </div>`, { nytt });
}

// Knappene i giverpanelet. Gir true når handlingen hørte til panelet.
// `lukk` kalles når giveren slettes.
export async function giverklikk(handling, el, g, lukk) {
  if (!g) return false;
  if (handling === 'moms') lagre(() => oppdaterGiver(g.id, { momsTrekk: !g.momsTrekk }));
  else if (handling === 'frist-ny') {
    if (!(await ferdigLagret())) return true;
    const id = await lagre(() => leggTilFrist(g.id));
    if (id) { fokuser(`givere/${g.id}/frister.${id}.dato`); tegn(); }
  }
  else if (handling === 'frist-arlig') {
    const f = g.frister?.[el.dataset.id];
    if (f) lagre(() => oppdaterGiver(g.id, { [`frister.${el.dataset.id}.arlig`]: !f.arlig }));
  }
  else if (handling === 'frist-slett') lagre(() => fjernFrist(g.id, el.dataset.id));
  else if (handling === 'skjema-ny') {
    if (!(await ferdigLagret())) return true;
    const id = await lagre(() => leggTilSkjemafelt(g));
    if (id) { fokuser(`givere/${g.id}/skjema.${id}.navn`); tegn(); }
  }
  else if (handling === 'skjema-enhet') lagre(() => oppdaterGiver(g.id, { [`skjema.${el.dataset.id}.enhet`]: el.dataset.enhet }));
  else if (handling === 'skjema-opp' || handling === 'skjema-ned') {
    if (!(await ferdigLagret())) return true;
    lagre(() => flyttSkjemafelt(tilstand.givere.find(x => x.id === g.id) || g, el.dataset.id, handling === 'skjema-opp' ? 'opp' : 'ned'));
  }
  else if (handling === 'skjema-slett') {
    const f = g.skjema?.[el.dataset.id];
    if (f && confirm(`Fjerne feltet «${f.navn || 'Uten navn'}» fra skjemaet?\n\nTekst som er skrevet i feltet på søknader blir stående under «Felt som ikke lenger er i skjemaet».`)) lagre(() => fjernSkjemafelt(g.id, el.dataset.id));
  }
  else if (handling === 'frist-soknad') {
    if (!(await ferdigLagret())) return true;
    const f = tilstand.givere.find(x => x.id === g.id)?.frister?.[el.dataset.id];
    const frist = nesteForekomst(f, iDag());
    if (!frist) return true;
    const tittel = `${(f.tekst || g.navn || 'Søknad').trim()} ${frist.slice(0, 4)}`;
    const id = await lagre(() => opprettSoknad({ giverId: g.id, tittel, frist }));
    if (id) gaaTil(`#/soknad/${id}`);
  }
  else if (handling === 'slett') {
    if (!erAdmin() || !confirm(`Slette giveren «${g.navn || 'Uten navn'}»?`)) return true;
    lukk?.();
    lagre(() => slettGiver(g.id));
  }
  else return false;
  return true;
}

// ——— Brukere (bare administrator) ———

const ROLLER = [['bruker', 'Bruker'], ['administrator', 'Administrator'], ['leser', 'Leser'], ['revisor', 'Revisor']];

function brukerRad(b) {
  const meg = b.id === tilstand.meg.epost;
  const invitert = b.status !== 'aktiv';
  const rolleknapp = ([id, navn]) => `<button type="button" data-handling="rolle" data-id="${b.id}" data-rolle="${id}" aria-pressed="${(b.rolle || 'bruker') === id}" style="height:26px; font-size:12px; padding:0 10px" ${meg && id !== 'administrator' ? 'disabled title="Du kan ikke fjerne din egen administratorrolle"' : ''}>${navn}</button>`;
  return `
    <tr>
      <td class="fet">${escapeHtml(b.navn || '–')}</td>
      <td class="dempet" style="font-size:14px">${escapeHtml(b.epost)}</td>
      <td style="padding-top:8px; padding-bottom:8px"><div class="segment" style="display:inline-flex">${ROLLER.map(rolleknapp).join('')}</div></td>
      <td class="smal" style="font-size:13px; ${invitert ? 'color:var(--color-accent-700)' : 'color:var(--color-neutral-700)'}">${invitert ? `Invitert${b.invitertTid ? ' ' + datoFelt(new Date(b.invitertTid).toISOString().slice(0, 10)) : ''}` : 'Aktiv'}</td>
      <td class="tall smal" style="padding-top:8px; padding-bottom:8px">
        ${ui.kopiert === b.id ? '<span class="undertekst">Invitasjon kopiert</span>' : invitert ? `<button type="button" class="knapp knapp-liten" style="height:28px; font-size:12px" data-handling="kopier" data-id="${b.id}" title="Kopierer invitasjonsteksten, så du kan sende den selv">Kopier invitasjon</button>` : ''}
        ${meg ? '' : ui.sendt === b.id ? '<span class="undertekst">Lenke sendt</span>' : `<button type="button" class="knapp knapp-liten" style="height:28px; font-size:12px" data-handling="send-lenke" data-id="${b.id}" title="Sender en innloggingslenke på e-post – for brukere uten Google-konto" ${ui.sender === b.id ? 'disabled' : ''}>${ui.sender === b.id ? 'Sender …' : 'Send innloggingslenke'}</button>`}
        ${meg ? '<span class="undertekst">deg</span>' : `<button type="button" class="knapp knapp-fare" data-handling="fjern" data-id="${b.id}">Fjern</button>`}
      </td>
    </tr>`;
}

function brukere() {
  const liste = [...tilstand.brukere].sort((a, b) => (a.navn || a.epost).localeCompare(b.navn || b.epost, 'nb'));
  return `
    <div class="verktoyrad">
      <div class="hint">Alle brukere kan gjøre alt i søknadene. Administratorer kan i tillegg invitere og fjerne brukere og slette givere. Lesere ser alt, men kan ikke endre noe. Revisorer ser bare søknadene de er satt som revisor for (velges på søknaden), og kan ikke endre noe.</div>
      <button type="button" class="knapp knapp-primar" data-handling="inviter">+ Inviter bruker</button>
    </div>
    <div class="tabellramme" data-rull="brukere">
      <table class="liste">
        <thead><tr><th>Navn</th><th>E-post</th><th>Rolle</th><th>Status</th><th style="width:360px"></th></tr></thead>
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
        ${ROLLER.map(([id, navn]) => `<button type="button" data-handling="inv-rolle" data-rolle="${id}" aria-pressed="${i.rolle === id}">${navn}</button>`).join('')}
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:12px">
      <button type="button" class="knapp knapp-primar" data-handling="inv-send" ${gyldig ? '' : 'disabled'}>Inviter og kopier tekst</button>
      <span class="undertekst" id="inv-hint">${gyldig ? `Inviteres som ${i.rolle}.` : 'Skriv inn en gyldig e-postadresse.'}</span>
    </div>
    ${i.rolle === 'revisor' ? '<div class="undertekst">En revisor ser ingenting før hen er krysset av som revisor på en søknad (Søknad-fanen, under «Revisjon på denne søknaden»).</div>' : ''}
    <div class="undertekst">Personen logger inn med Google eller innloggingslenke på e-post, med den adressen du inviterer. Status blir «Aktiv» ved første innlogging. Har personen ikke Google-konto, kan du sende en innloggingslenke fra brukerlisten etterpå.</div>`, { nytt: ui.nyttPanel });
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
  meny: 'innstillinger',

  // #/givere viser giverne, #/givere/brukere viser brukerne (bare administrator).
  tegn([seksjon] = []) {
    const onsket = seksjon === 'brukere' && erAdmin() ? 'brukere' : 'givere';
    if (onsket !== ui.seksjon) { ui.seksjon = onsket; ui.panel = null; }
    const givere = sortert();
    const valgt = givere.find(g => g.id === ui.panel);
    if (ui.panel && !valgt && ui.panel !== 'inviter') ui.panel = null;
    const visBrukere = ui.seksjon === 'brukere';
    const html = `
      <header class="sidehode">
        <div>
          <h1>${visBrukere ? 'Brukere' : 'Givere'}</h1>
          <div class="ingress">${visBrukere ? 'Hvem som har tilgang til portalen.' : 'Kontaktinfo, søknadsfrister og momsinnstilling. Fristene vises i Årshjul, og momsinnstillingen arves av nye søknader til giveren.'}</div>
        </div>
      </header>
      ${innstillingsmeny(visBrukere ? 'givere/brukere' : 'givere')}
      <main class="innhold">
        ${visBrukere ? brukere() : `
        <div class="verktoyrad">
          <div class="hint bare-skriv">Klikk en giver for å endre kontaktinfo, frister og momsinnstilling.</div>
          <button type="button" class="knapp knapp-primar" data-handling="ny">+ Ny giver</button>
        </div>
        <div class="tabellramme" data-rull="givere">
          <table class="liste">
            <thead><tr><th>Giver</th><th>Kontakt</th><th>Frister</th><th>Momskompensasjon</th><th class="tall">Søknader</th></tr></thead>
            <tbody>
              ${givere.map(g => `
                <tr class="klikkbar ${g.id === ui.panel ? 'valgt' : ''}" data-handling="apne" data-id="${g.id}">
                  <td class="fet">${escapeHtml(g.navn || 'Uten navn')}</td>
                  <td class="dempet" style="max-width:320px; overflow:hidden">${kontaktcelle(g)}</td>
                  <td class="smal dempet">${escapeHtml(fristliste(g).filter(f => f.dato).map(f => f.arlig ? datoFelt(f.dato).slice(0, 5) : datoFelt(f.dato)).join(', ') || '–')}</td>
                  <td class="smal"><span class="merkelapp ${g.momsTrekk ? 'm-pa' : 'm-av'}">${escapeHtml(momsTekst(g))}</span></td>
                  <td class="tall">${tilstand.soknader.filter(s => s.giverId === g.id).length}</td>
                </tr>`).join('') || '<tr class="tom-rad"><td colspan="5">Ingen givere enda.</td></tr>'}
            </tbody>
          </table>
        </div>`}
      </main>
      ${valgt ? giverpanel(valgt, { nytt: ui.nyttPanel, neste: true }) : ui.panel === 'inviter' ? inviterPanel() : ''}`;
    ui.nyttPanel = false;
    return html;
  },

  async klikk(handling, el) {
    const g = tilstand.givere.find(x => x.id === ui.panel);
    if (handling === 'inviter') { ui.panel = 'inviter'; ui.nyttPanel = true; ui.invitasjon = { epost: '', rolle: 'bruker' }; tegn(); }
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
    else if (handling === 'send-lenke') {
      const b = tilstand.brukere.find(x => x.id === el.dataset.id);
      if (!b || ui.sender) return;
      if (!confirm(`Sende innloggingslenke på e-post til ${b.epost}?\n\nLenken virker én gang. Mottakeren skriver inn e-postadressen sin når den åpnes. Be mottakeren se i søppelpost hvis den ikke dukker opp.`)) return;
      ui.sender = b.id; tegn();
      try {
        if (await sendInnloggingslenkeTil(b) === 'demo') visMelding('Demo: ingen e-post sendes. Åpne portalen uten ?demo for å sende på ordentlig.');
        else { ui.sendt = b.id; setTimeout(() => { ui.sendt = null; tegn(); }, 4000); }
      } catch (err) {
        console.error(err);
        visMelding('Kunne ikke sende lenken: ' + (err.code || err.message || err));
      }
      ui.sender = null; tegn();
    }
    else if (handling === 'rolle') lagre(() => oppdaterBruker(el.dataset.id, { rolle: el.dataset.rolle }));
    else if (handling === 'fjern') {
      const b = tilstand.brukere.find(x => x.id === el.dataset.id);
      if (b && confirm(`Fjerne ${b.navn || b.epost} fra portalen?`)) lagre(() => fjernBruker(b.id));
    }
    else if (handling === 'apne') { ui.panel = el.dataset.id; ui.nyttPanel = true; tegn(); }
    else if (handling === 'lukk-panel') { ui.panel = null; tegn(); }
    else if (handling === 'ny' || handling === 'neste') {
      if (handling === 'neste') {
        if (!(await ferdigLagret())) return;
        const apen = tilstand.givere.find(x => x.id === ui.panel);
        if (apen && erTomPost('givere', apen)) { fokuser(`givere/${apen.id}/navn`); tegn(); return; }
      }
      const id = await lagre(() => opprettGiver());
      if (id) { ui.panel = id; fokuser(`givere/${id}/navn`); tegn(); }
    } else await giverklikk(handling, el, g, () => { ui.panel = null; });
  },

  escape() {
    if (!ui.panel) return false;
    ui.panel = null;
    return true;
  },
};
