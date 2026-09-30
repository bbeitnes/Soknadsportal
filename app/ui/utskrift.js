import { escapeHtml } from './format.js';

// Åpner et utskriftsvindu med enkel, lys typografi.
export function utskrift(tittel, innhold, retning = 'portrait') {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${escapeHtml(tittel)}</title><style>body{font-family:Archivo,system-ui,sans-serif;color:#201e1d;margin:40px;font-size:12px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 20px;color:#605d5d}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th{text-align:left;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#605d5d;padding:7px 8px;border-bottom:2px solid #201e1d}td{padding:7px 8px;border-bottom:1px solid #d7d3d3;vertical-align:top}.n,th.n{text-align:right;white-space:nowrap}.d{color:#605d5d;font-size:11px}tfoot td{border-top:2px solid #201e1d;border-bottom:0;font-weight:700}tr.g td{font-weight:700;font-size:10px;letter-spacing:.08em;text-transform:uppercase;background:#eae9e9;padding-top:9px}@page{margin:16mm;size:${retning}}</style></head><body><h1>${escapeHtml(tittel)}</h1>${innhold}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
