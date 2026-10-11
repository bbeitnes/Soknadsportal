// Tilbudsforespørselen som HTML (kort 0020): samme tabell i forhåndsvisningen
// i sidepanelet og på utklippstavlen. Kolonnene Pris, Rabatt og Nettopris står
// tomme og fylles ut av leverandøren (pris per stykk, B-12). Limes HTML-en inn i Gmail, Outlook eller
// Apple Mail, blir den en ekte tabell i e-posten; i Excel blir den celler.
// Stilene står inline fordi e-postklienter stryker alt annet.
import { escapeHtml } from './format.js';
import { tilbudsforesporselTekst } from '../data/beregning.js';

const CELLE = 'padding:4px 10px; border:1px solid #c8c6c4; vertical-align:top; font-family:Helvetica, Arial, sans-serif; font-size:13px';
const TALL = `${CELLE}; text-align:right; white-space:nowrap`;
const TOM = `${CELLE}; min-width:70px`;

export function foresporselHtml(f) {
  const rader = [];
  for (const g of f.grupper) {
    if (g.type) rader.push(`<tr><td colspan="7" style="${CELLE}; background:#f1efed; font-weight:bold">${escapeHtml(g.type)}</td></tr>`);
    // De tre siste kolonnene står tomme: dem fyller leverandøren ut.
    for (const r of g.rader) rader.push(`<tr><td style="${TALL}">${r.nr}</td><td style="${TALL}">${r.antall} stk</td><td style="${CELLE}">${escapeHtml(r.tittel)}</td><td style="${CELLE}">${escapeHtml(r.spesifikasjon)}</td><td style="${TOM}"></td><td style="${TOM}"></td><td style="${TOM}"></td></tr>`);
  }
  if (!f.antallLinjer) rader.push(`<tr><td colspan="7" style="${CELLE}; color:#666">Innkjøpet har ingen linjer.</td></tr>`);
  const avsnitt = 'font-family:Helvetica, Arial, sans-serif; font-size:14px; margin:0 0 12px';
  return `<div style="${avsnitt}">
<p style="${avsnitt}">${escapeHtml(f.intro)}${f.ref ? ` &nbsp; <span style="color:#666">Ref.: ${escapeHtml(f.ref)}</span>` : ''}</p>
<table cellspacing="0" cellpadding="0" style="border-collapse:collapse; margin:0 0 14px">
<thead><tr><th style="${TALL}; background:#e6e3e0">Nr</th><th style="${TALL}; background:#e6e3e0">Antall</th><th style="${CELLE}; background:#e6e3e0; text-align:left">Vare</th><th style="${CELLE}; background:#e6e3e0; text-align:left">Spesifikasjon</th><th style="${TALL}; background:#e6e3e0">Pris</th><th style="${TALL}; background:#e6e3e0">Rabatt</th><th style="${TALL}; background:#e6e3e0">Nettopris</th></tr></thead>
<tbody>${rader.join('')}</tbody>
</table>
<p style="${avsnitt}; margin-bottom:4px"><b>Slik ønsker vi tilbudet:</b></p>
<ul style="${avsnitt}; padding-left:20px">${f.krav.map(k => `<li>${escapeHtml(k)}</li>`).join('')}</ul>
${f.levering ? `<p style="${avsnitt}; margin-bottom:4px">Leveres til: ${escapeHtml(f.levering)}</p>` : ''}
${f.signatur ? `<p style="${avsnitt}; color:#444">${escapeHtml(f.signatur)}</p>` : ''}
</div>`;
}

// Legger forespørselen på utklippstavlen som HTML og ren tekst. Gir true når
// det gikk; false når nettleseren ikke slipper oss til (da merker siden
// forhåndsvisningen, så brukeren kan kopiere selv).
export async function kopierForesporsel(f) {
  const html = foresporselHtml(f), tekst = tilbudsforesporselTekst(f);
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([tekst], { type: 'text/plain' }),
      })]);
      return true;
    }
  } catch { /* prøver ren tekst under */ }
  try { await navigator.clipboard.writeText(tekst); return true; } catch { return false; }
}
