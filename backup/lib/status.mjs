// Statusfilen portalen viser lampen sin fra (B-26). Den ligger åpent på
// webhotellet ved siden av portalen, så den inneholder ALDRI data fra
// portalen – bare tidspunkt, antall og bestått/ikke bestått. Kopijobben og
// restore-testen oppdaterer hver sin del og lar den andres stå.
export const STATUSFIL = 'sikkerhetskopi-status.json';

export function flettStatus(gammel, del) {
  const k = del.kopi ?? gammel?.kopi, r = del.restoreTest ?? gammel?.restoreTest;
  return {
    ...(k ? { kopi: { tatt: String(k.tatt), dokumenter: Number(k.dokumenter), filer: Number(k.filer) } } : {}),
    ...(r ? { restoreTest: { kjort: String(r.kjort), bestatt: r.bestatt === true } } : {}),
  };
}

// Skriver til alle mappene i KOPI_STATUS_MAPPER (kommaskilt: portalens mapper
// for prod og test). Feiler skrivingen, feiler kommandoen – en lampe som
// viser feil status er verre enn ingen lampe.
export async function meldStatus(del) {
  const mapper = (process.env.KOPI_STATUS_MAPPER || '').split(',').map(m => m.trim().replace(/\/+$/, '')).filter(Boolean);
  if (!mapper.length) { console.log('\nStatusfil: KOPI_STATUS_MAPPER er ikke satt, så lampen i portalen oppdateres ikke.'); return; }
  const { default: Klient } = await import('ssh2-sftp-client');
  const sftp = new Klient();
  try {
    await sftp.connect({ host: process.env.SFTP_HOST, username: process.env.SFTP_USERNAME, password: process.env.SFTP_PASSWORD, port: 22, readyTimeout: 30000 });
    for (const mappe of mapper) {
      const sti = `${mappe}/${STATUSFIL}`;
      let gammel = null;
      if (await sftp.exists(sti)) { try { gammel = JSON.parse(await sftp.get(sti)); } catch { /* uleselig fil erstattes */ } }
      await sftp.put(Buffer.from(JSON.stringify(flettStatus(gammel, del), null, 2) + '\n'), sti);
    }
    console.log(`\nStatusfilen er oppdatert i ${mapper.length} mappe(r).`);
  } catch (feil) {
    throw new Error(`Kunne ikke skrive statusfilen til portalen: ${feil.message}`);
  } finally {
    await sftp.end().catch(() => {});
  }
}
