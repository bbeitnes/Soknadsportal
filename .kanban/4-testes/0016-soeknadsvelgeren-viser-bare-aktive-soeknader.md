---
id: 0016
tittel: Søknadsvelgeren viser bare aktive søknader
status: testes
opprettet: 2026-10-07
---

# 0016 · Søknadsvelgeren viser bare aktive søknader

## Brukerhistorie

Som **bruker** ønsker jeg at nedtrekkslisten ved tittelen på en søknad (pilen
til høyre for tittelen) bare viser de aktive søknadene, slik at jeg raskt
finner den jeg skal bytte til uten å bla forbi avsluttede og avslåtte
søknader fra tidligere år. Vil jeg til en avsluttet eller avslått søknad, går
jeg via menyen «Søknader».

## Kontekst

Velgeren (`velger()` i `sider/soknad.js`) lister i dag **alle** søknader i
organisasjonen, sortert på frist (nyeste først), med tittel, giver og status
på hver rad, og lenken «Alle søknader →» nederst. Etter hvert som årene går,
fylles listen av søknader som er avsluttet eller avslått, og de aktive
drukner.

Søknadslisten (`sider/soknader.js`) har allerede filteret «Aktive» =
status utkast, sendt eller innvilget (`SOKNADSFILTRE.aktive` i
`beregning.js`), og det er samme avgrensning velgeren skal bruke. Listen
er stedet for å finne alt annet; velgeren er en snarvei mellom det som
pågår.

Står brukeren i en avsluttet eller avslått søknad og åpner velgeren, er den
søknaden ikke «aktiv». Den vises likevel, markert som i dag, så listen aldri
mangler den valgte raden. Avgjort i grillingen 2026-10-07.

Velgeren sorterer også annerledes enn søknadslisten. Velgeren sorterer på
søknadsfrist, nyeste først, og tar ikke hensyn til «Neste frist» (kort 0010).
Søknadslisten bruker `sorterSoknader()`: det som haster øverst (søknader med
en gjeldende neste frist, sortert på dato), deretter resten etter
søknadsfrist, nyeste først. Velgeren skal bruke samme rekkefølge som listen,
så brukeren møter én sortering begge steder. Avgjort 2026-10-07.

## Akseptansekriterier

- [ ] Gitt en organisasjon med søknader i alle fem statuser, når jeg åpner
      velgeren fra en aktiv søknad, så vises bare søknadene med status Utkast,
      Sendt eller Innvilget (samme utvalg som «Aktive» i søknadslisten), og
      ingen med status Avsluttet eller Avslått.
- [ ] Gitt at jeg står i en søknad som er avsluttet eller avslått, når jeg
      åpner velgeren, så vises den søknaden jeg står i (markert som valgt)
      sammen med de aktive, og ingen andre lukkede.
- [ ] Gitt at velgeren er åpen, når jeg ser på rekkefølgen, så er den den
      samme som i søknadslisten med filteret «Aktive» (`sorterSoknader()`):
      søknader med en gjeldende neste frist øverst, sortert på dato, deretter
      resten etter søknadsfrist, nyeste først.
- [ ] Gitt at velgeren er åpen, når jeg ser nederst i listen, så står lenken
      «Alle søknader →» der med samme tekst som i dag og fører til `#/soknader`.
- [ ] Gitt at ingen søknader er aktive og jeg står i en lukket søknad, når jeg
      åpner velgeren, så vises bare den søknaden og lenken, uten egen melding.
- [ ] Gitt at velgeren er åpen, når jeg ser på en rad, så viser den tittel,
      giver og statusmerke som i dag.
- [ ] Gitt at velgeren er åpen, når jeg velger en søknad i listen, så byttes
      det til den som i dag (ingen endring i oppførsel ut over utvalget).
- [ ] Gitt testene i `test/beregning.test.js`, når `node --test test/`
      kjøres, så finnes det en test som bekrefter hvilke søknader velgeren
      lister (utvalgsfunksjonen ligger i `beregning.js`).

## Avgrensning

- Søknadslisten (`#/soknader`) og filtrene der endres ikke.
- Ingen søk, ingen gruppering og ingen nytt filter i velgeren – lenken til
  listen er veien til resten. Lenketeksten endres ikke.
- Ingen egen melding når det ikke finnes aktive søknader.
- Ingen ny sorteringslogikk: velgeren gjenbruker `sorterSoknader()`.
- Revisorlisten (`#/revisor`) og mobilskjermen er ikke berørt; revisor har
  ingen velger.
- Ingenting lagres: utvalget regnes ut fra status hver gang.

## Grilling

Grillet 2026-10-07 med `/grill-me`.

1. **Kollisjon med beslutningsloggen.** Ingen. B-02: brukeren har bedt om det
   uttrykkelig. B-06 og B-15: utvalget er en ren funksjon i `beregning.js`
   som ikke lagrer noe. B-05: ingen nye avhengigheter.
2. **Datamodell.** Ingen nye data. Utvalg og rekkefølge regnes ut av status,
   frist og «Neste frist» hver gang velgeren tegnes.
3. **Migrering og data i drift.** Ingen samling, felt eller fil endres.
   Ingenting å migrere; endringen er bare skjerm.
4. **Låser vi oss?** Nei. Søk eller filter i velgeren kan senere bygges oppå
   samme utvalgsfunksjon. Lenken til søknadslisten står uendret.
5. **Er det nødvendig?** Uten endringen vokser velgeren med ett sett lukkede
   søknader per år, og de aktive drukner. Dette er allerede minste variant;
   det finnes ikke et enklere alternativ.
6. **Hvordan verifiseres det?** Brukeren på dev med `?demo`, som har søknader
   i alle fem statuser (`demodata.js`). Node-test på utvalgsfunksjonen i
   `test/beregning.test.js`. Ingen ny testinfrastruktur.
7. **Sikkerhetskopien (B-24, B-25).** Ikke relevant: ingen nye data, ingen
   skriving til prod.

Avgjort i intervjuet:
- Søknaden brukeren står i vises alltid, også når den er avsluttet eller
  avslått, markert som valgt. En liste uten markert rad ser ut som en feil.
- Lenken nederst beholder teksten «Alle søknader →».
- Finnes det ingen aktive søknader, vises bare raden man står i og lenken.
  Ingen egen melding.
- Radene viser tittel, giver og statusmerke som i dag.

**Konklusjon:** neste.

## Notater

- Lagt inn 2026-10-07 fra chatten: «Når vi står i en søknad og velger pilen
  til høyre for tittel for å velge en annen søknad, ønsker jeg at kun aktive
  søknader skal vises der. Hvis jeg skal se andre søknader (f.eks. avsluttet),
  må jeg gå via menyen "Søknader".»
- Berørte steder: `velger()` i `app/sider/soknad.js:47`,
  `SOKNADSFILTRE.aktive` i `app/data/beregning.js:393` og `sorterSoknader()`
  i `app/data/beregning.js:421`.
- 2026-10-07: sorteringen tatt inn i kortet. Alternativene alfabetisk,
  gruppert på status og giver først ble vurdert og lagt bort; samme
  rekkefølge som søknadslisten valgt.
