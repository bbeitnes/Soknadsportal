---
id: 0007
tittel: Ny leverandør rett fra Innkjøp og Revisjon
status: testes
opprettet: 2026-10-05
---

# 0007 · Ny leverandør rett fra Innkjøp og Revisjon

## Brukerhistorie

Som **den som fører en søknad** ønsker jeg å kunne legge til en ny leverandør i registeret uten å forlate Innkjøp eller Revisjon, slik at jeg slipper å gå til Innstillinger → Leverandører og finne tilbake til der jeg var.

## Kontekst

Leverandørregisteret vedlikeholdes i dag bare under Innstillinger → Leverandører («+ Ny leverandør» åpner sidepanelet med navn og kontaktinfo). Fra søknaden er situasjonen:

- **Innkjøp:** «Legg til leverandør»-panelet har «+ Opprett «navn» og legg til». Den oppretter leverandøren med bare navnet og lukker panelet – kontaktinfo må fylles ut i Innstillinger etterpå.
- **Revisjon:** Leverandør på fakturaen er fritekst (`fakturaer.<id>.leverandor`) med forslag fra registeret. Et nytt navn havner ikke i registeret.
- **Utgifter:** Løse utgifter har ikke noe leverandørfelt i dag.

Brukeren vil ha samme sidepanel som «Ny leverandør» i Innstillinger, åpnet der hen står. Panelet ligger i `sider/leverandorer.js` og må kunne brukes fra søknadssiden.

## Akseptansekriterier

**Innkjøp**

- [ ] Gitt at jeg har åpnet «Legg til leverandør» i et innkjøp og skrevet et navn som ikke finnes i registeret, når jeg trykker «+ Opprett «navn» og legg til», så er leverandøren lagt til i innkjøpet, og sidepanelet viser leverandørpanelet fra Innstillinger → Leverandører med navnet utfylt og markøren i «Kontaktinfo og notat».
- [ ] Gitt at leverandørpanelet er åpnet slik, når jeg trykker Escape eller ✕, så lukkes panelet og jeg står i matrisen i samme innkjøp, med den nye leverandøren som kolonne.
- [ ] Gitt at søkefeltet er tomt eller navnet finnes i registeret, så vises ikke «+ Opprett …» (som i dag).

**Revisjon**

- [ ] Gitt at jeg har et fakturapanel åpent og leverandørfeltet inneholder et navn som ikke finnes i registeret (uten hensyn til store/små bokstaver og mellomrom i endene), så vises «+ Legg «navn» i leverandørregisteret» under feltet. Er feltet tomt eller navnet kjent, vises den ikke.
- [ ] Gitt at knappen vises, når jeg trykker den, så opprettes leverandøren med det navnet, og leverandørpanelet vises der fakturapanelet sto, med markøren i «Kontaktinfo og notat».
- [ ] Gitt at leverandørpanelet er åpnet fra en faktura, når jeg trykker Escape eller ✕, så vises fakturapanelet for samme faktura igjen med markøren i «Fakturanr». Escape en gang til lukker fakturaen.
- [ ] Gitt at jeg har rettet navnet i leverandørpanelet, når jeg går tilbake til fakturaen, så står det rettede navnet i fakturaens leverandørfelt og i fakturalisten.
- [ ] Gitt at jeg er revisor, så vises ikke knappen.

**Felles**

- [ ] Gitt at jeg har opprettet en leverandør fra Innkjøp eller Revisjon, når jeg går til Innstillinger → Leverandører, så står den der med navnet og kontaktinfoen jeg skrev.
- [ ] Gitt at leverandørpanelet er åpnet fra søknaden, så har det de samme delene som i Innstillinger: navn, kontaktinfo, «Brukt i innkjøp» og – for administrator når leverandøren ikke er brukt i noe innkjøp – «Slett leverandør».
- [ ] Gitt at jeg sletter leverandøren fra panelet åpnet fra en faktura, så vises fakturapanelet igjen, og navnet står fortsatt som tekst på fakturaen.

## Avgrensning

- Utgifter-fanen får ingen knapp og løse utgifter ikke noe leverandørfelt (avklart i grillingen).
- Fakturaens leverandør er fortsatt fritekst – ingen kobling til registeret. Endres navnet i registeret senere, følger ikke gamle fakturaer med.
- Åpne eller redigere en leverandør som allerede finnes i registeret, fra søknaden.
- Ingen endring i leverandørregisteret selv (felter, sletting, hvem som kan endre).
- Ukjente navn legges aldri i registeret automatisk.

## Grilling

Grillet 2026-10-05 med `/grill-me`. Omfanget ble snevret inn: Utgifter falt ut, og «samme panel» ble presisert.

**Avklart i intervjuet**

- Leverandøren skal settes inn der brukeren står, ikke bare i registeret.
- Utgifter får ingen knapp: en løs utgift har ikke leverandør, så knappen ville ikke hatt synlig virkning der, og et nytt leverandørfelt ville duplisert fakturaens (B-02, B-15).
- Innkjøp: dagens «+ Opprett «navn» og legg til» beholdes som eneste vei inn. Etter oppretting bytter sidepanelet til leverandørpanelet med markøren i kontaktinfo. Ingen egen knapp uten søketekst – den ville gitt navnløse leverandører og duplikater.
- Revisjon: når navnet i fakturaens leverandørfelt ikke finnes i registeret, vises «+ Legg «navn» i leverandørregisteret» under feltet. Ukjente navn legges ikke i registeret automatisk (en skrivefeil skal ikke bli en oppføring).
- Lukkes leverandørpanelet i Revisjon, vises fakturapanelet igjen med markøren i fakturanr. I Innkjøp lukkes det til matrisen.
- Rettes navnet i leverandørpanelet, settes fakturaens leverandør til registernavnet når brukeren går tilbake. Én skriving, ingen varig kobling.
- Panelet er helt likt det i Innstillinger og tegnes av samme funksjon, med «Brukt i innkjøp» og «Slett leverandør» (administrator, ubrukt leverandør).

**1. Kollisjon med beslutningsloggen.** Ingen brudd. B-02: bare det som er bedt om, og Utgifter ble tatt ut. B-03: ingen lagreknapp, feltene i panelet lagres ved blur som før. B-04: detaljer i sidepanel. B-23: revisor ser ikke knappen (fakturapanelet deres er skrivebeskyttet) og kan ikke skrive til `leverandorer`.

**2. Datamodell.** Ingen nye felt eller samlinger. Fakturaens leverandør er fortsatt fritekst (`fakturaer.<id>.leverandor`), ikke en kobling til registeret. Om navnet «finnes» utledes ved sammenligning (uten hensyn til store/små bokstaver og mellomrom i endene), som i Innkjøp i dag.

**3. Migrering og data i drift.** Ingenting å migrere. Eksisterende fakturaer med navn som ikke står i registeret får tilbudet om å legge det inn når de åpnes – det er ønsket.

**4. Låser vi oss?** Nei. Skulle fakturaen senere kobles til registeret med id, står fritekstfeltet uendret, og tilbudet under feltet er et naturlig sted å bygge videre.

**5. Er det nødvendig?** Uten kortet må brukeren til Innstillinger → Leverandører og finne tilbake. Det enklere alternativet (bare registeret, velg selv etterpå) ble vurdert og forkastet: en mangler leverandøren fordi den skal brukes der.

**6. Hvordan verifiseres det?** Brukeren prøver begge veiene på dev (`?demo`) og ser at leverandøren står i Innstillinger → Leverandører. Ingen ny testinfrastruktur; logikken er skjermflyt, ikke beregning.

**Sikkerhetskopien (B-24, B-25).** Ingen nye data eller lagringssteder, ingen automatikk som skriver.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-05: Bygget og prøvd på dev (`?demo`), begge veier. Rettet samtidig at «+ Opprett …» i Innkjøp ble tilbudt for en leverandør som finnes i
  registeret, men alt er med i innkjøpet.
- 2026-10-05: Etter første prøving: knappen i Revisjon er med i Tab-rekkefølgen, og Escape i et felt som
  ikke er endret lukker panelet direkte (gjelder alle sider, se B-28). Før måtte en trykke to ganger.
