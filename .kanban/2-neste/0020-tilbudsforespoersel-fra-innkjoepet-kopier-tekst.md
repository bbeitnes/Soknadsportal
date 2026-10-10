---
id: 0020
tittel: Tilbudsforespørsel fra innkjøpet (kopier tekst)
status: neste
opprettet: 2026-10-10
---

# 0020 · Tilbudsforespørsel fra innkjøpet (kopier tekst)

## Brukerhistorie

Som **bruker** ønsker jeg å kopiere en ferdig tilbudsforespørsel fra et
innkjøp – med linjene, spesifikasjonene og antallene vi har lagt inn – og lime
den rett inn i e-posten til leverandørene, slik at alle får den samme listen
uten at jeg skriver den på nytt. Leverandørene får da pris per linje, som
matrisen trenger.

## Kontekst

Innkjøpet samler linjer (fra søknadens behov eller frie) og leverandører i én
matrise, og har status «Innhenter tilbud → valgt → fakturert». Selve
innhentingen skjer i dag helt utenfor portalen: brukeren skriver listen selv i
en e-post til hver leverandør, og tilbudene kommer tilbake som PDF/e-post som
leses inn med «Les priser fra tilbudet». Det første leddet i kjeden – å be om
tilbud – har ingen støtte, og listen i e-posten stemmer ikke alltid med
linjene i innkjøpet (glemte linjer, feil antall, uklart om vi vil ha pris per
linje eller en pakkepris).

Spec.md nevner ingen forespørsel; hjelpeteksten «Be leverandøren om pris per
linje» (B-12) forutsetter at det skjer utenfor portalen. Forespørselen er lik
for alle leverandørene i innkjøpet og har derfor ingen mottaker; den hører til
innkjøpet, ikke til leverandørpanelet. Portalen sender ingenting (B-19):
brukeren limer teksten inn i sin egen e-post og skriver hilsen og svarfrist
selv.

Utgangen er ren tekst på utklippstavlen, samme mønster som «Kopier underlag» i
Tekst-fanen (kort 0018, `sider/tekst.js`): `navigator.clipboard.writeText()`,
«Kopiert» i toppmenyen (`visKvittering()`), og et sidepanel med teksten
merket hvis nettleseren ikke slipper oss til. Innholdet lages av én ren
funksjon i `beregning.js` (`tilbudsforesporsel()`), som `skrivunderlag()`.

Innholdet finnes allerede: linjene med tittel og antall
(`innkjop.<id>.linjer`, tittel fra søknadslinjen/behovet for koblede linjer,
`linjetittel()`), behovets `beskrivelse` (spesifikasjonen, slik matrisen viser
den under varenavnet), typen (`innkjopslinjetype()`) og kontaktinfoen vår fra
`innstillinger/<orgId>` (orgNavn, orgNr, kontaktperson, telefon, epost,
adresse, leveringsadresse). Ingenting nytt lagres (B-15).

**Teksten** (fast i koden), i denne rekkefølgen:

1. «Tilbudsforespørsel» og «Gjelder: ‹innkjøpets navn›».
2. Hvem vi er: organisasjonens navn, org.nr, kontaktperson, telefon, e-post
   og postadresse. «Leveres til»: `leveringsadresse`, ellers postadressen.
3. Linjene gruppert på type i samme rekkefølge som matrisen, med løpenummer,
   tittel, beskrivelse etter bindestrek og antall («3. Bb-klarinett – Buffet
   E13, med etui · 4 stk»). Delte linjer (samme `soknadLinjeId`) står én gang
   med summen av antallene. «Uten tittel» og «0 stk» tas med som de står.
4. Fast avslutning: vi ber om pris per stykk for hver linje, oppgitt enten
   som listepris minus rabatt eller som nettopris; vi ønsker ikke pakkepris
   eller totalrabatt. Oppgi frakt og leveringstid. Har dere ikke varen eller
   anbefaler et annet produkt, oppgi det tydelig på den linjen, med pris per
   stykk på samme måte.

## Akseptansekriterier

- [ ] Gitt et innkjøp med minst én linje, når jeg ser på matrisen, så står
      knappen «Kopier tilbudsforespørsel» i verktøylinjen over matrisen,
      sammen med «+ Fri linje», «+ Leverandør» og «Billigst per linje».
- [ ] Gitt at jeg trykker på knappen, så ligger forespørselen på
      utklippstavlen som ren tekst, og toppmenyen viser «Kopiert». Slipper
      nettleseren oss ikke til, vises teksten merket i et sidepanel der jeg kan
      kopiere den selv (som «Kopier underlag»).
- [ ] Gitt at teksten limes inn i Gmail eller Outlook, så kommer linjeskift,
      æøå og gruppeoverskriftene riktig, og teksten følger rekkefølgen i
      Kontekst: overskrift og «Gjelder», hvem vi er og leveringsadresse,
      linjene, fast avslutning.
- [ ] Gitt at innkjøpet har linjer av flere typer, så er linjene gruppert på
      type i samme rekkefølge som matrisen, nummerert fortløpende, med tittel,
      behovets beskrivelse etter bindestrek (utelatt når den er tom) og antall
      – uten priser, rabatt, frakt eller sum.
- [ ] Gitt at en linje er delt (to innkjøpslinjer med samme `soknadLinjeId`),
      så står varen én gang med summen av antallene.
- [ ] Gitt at Innstillinger har `leveringsadresse`, så står den under «Leveres
      til»; ellers står postadressen der.
- [ ] Gitt at den faste avslutningen vises, så ber den om pris per stykk per
      linje som listepris minus rabatt eller nettopris, sier at vi ikke ønsker
      pakkepris, ber om frakt og leveringstid, og ber om at alternativ vare
      oppgis tydelig per linje med pris per stykk (B-12).
- [ ] Gitt at forespørselen kopieres, så lagres ingenting på innkjøpet,
      leverandørene eller i Storage, og «Sist endret» på innkjøpet endres ikke.
- [ ] Gitt at jeg er leser, så kan jeg kopiere forespørselen (handlingen er i
      `LESEHANDLINGER`); gitt at jeg er revisor, så finnes ikke knappen.
- [ ] Gitt at innkjøpet ikke har noen linjer, så er knappen slått av med
      forklaringen «Innkjøpet har ingen linjer».
- [ ] Gitt `tilbudsforesporsel()` i `beregning.js`, så har den en node-test
      som dekker gruppering og rekkefølge, sammenslåing av delte linjer,
      beskrivelse etter bindestrek, leveringsadresse foran postadresse og at
      den faste avslutningen er med.

## Avgrensning

- Portalen sender ikke e-post (B-19). Teksten limes inn av brukeren.
- Ingen PDF. Kommer det en leverandør som vil ha et dokument, er det et eget
  kort; da bør samme funksjon gi innholdet til PDF-en.
- Ingen mottaker i teksten: samme forespørsel går til alle leverandørene.
  Leverandørens navn, hilsen og svarfrist skriver brukeren i e-posten.
- Den faste teksten er lik for alle organisasjoner og kan ikke redigeres.
  Trengs egen ordlyd per korps, er det et lite tilleggskort (felt på
  `innstillinger`).
- Ingen fritekst per linje ut over behovets beskrivelse; mangler
  spesifikasjonen, rettes den på behovet.
- Forespørselen lagres ikke og låser ingenting (ulikt bestillingen, B-32);
  ingen liste over sendte forespørsler.
- Ingen forespørsel fra søknaden direkte; linjene må ligge i et innkjøp først.
- Ikke i Revisjon, rapporten eller avtrykket. Mobil har ikke Innkjøp.

## Grilling

Grillet 2026-10-10 med `/grill-me`, ett spørsmål om gangen. Ni spørsmål, alle besvart av brukeren.

**1. Kollisjon med beslutningsloggen.** Ingen brudd. B-12 (stykkpris, ingen totalrabatt) er selve grunnen til kortet: den faste teksten ber om pris per stykk per linje og sier nei til pakkepris. B-19 (portalen sender ingenting) følges: teksten limes inn av brukeren. B-15 (det som kan utledes, lagres ikke): ingenting lagres. B-02 (forenkle): PDF-en ble tatt ut, bare tekst. B-30: leser får handlingen i `LESEHANDLINGER`. B-32 (bestillinger) berøres ikke – forespørselen låser ingenting. Ingen ny beslutning trengs.

**2. Datamodell.** Ingen nye felt. Alt finnes: linjer, tittel, behovets `beskrivelse`, type, kontaktinfo og leveringsadresse på `innstillinger`. Valgt bort: fritekst per linje i forespørselen (c i Q1), redigerbar fast tekst på `innstillinger` (b i Q2), svarfrist på innkjøpet (b i Q3). Alle kan komme som egne kort uten å rive noe.

**3. Migrering og data i drift.** Ingenting. Kortet leser bare. Eldre innstillingsdokumenter uten `leveringsadresse` får postadressen.

**4. Låser vi oss?** Nei. Teksten lages av én ren funksjon; en PDF senere bruker samme funksjon. Fast tekst i koden kan flyttes til et felt på `innstillinger` med teksten som standard uten at noe annet endres.

**5. Er det nødvendig?** Uten kortet skriver brukeren listen for hånd per e-post, med risiko for glemte linjer og feil antall, og leverandørene svarer med pakkepriser matrisen ikke tar imot. PDF-utgaven ble vurdert som de siste 20 % og tatt ut (Q5: b). Svarfrist, hilsen og mottaker hører til e-posten, ikke dokumentet (Q3, Q7).

**6. Hvordan verifiseres det?** `tilbudsforesporsel()` i `beregning.js` testes med node (gruppering/rekkefølge, delte linjer slått sammen, beskrivelse etter bindestrek, leveringsadresse foran postadresse, fast avslutning). Knapp, «Kopiert», reservepanel og leser/revisor sjekkes på `?demo` på dev. Innliming i Gmail/Outlook gjør brukeren selv (akseptansekriterium).

**7. Sikkerhetskopien (B-24, B-25).** Ingen nye data, ingen nye Storage-stier, ingen automatisk skriving. Ikke relevant.

**Avgjørelser underveis:** linjen tar med behovets beskrivelse (Q1 b); fast tekst i koden (Q2 a); ingen svarfrist, men leveringsadresse (Q3 a); ber om alternativ vare per linje (Q4 a); bare «Kopier tekst», ingen PDF (Q5 b); knappen i verktøylinjen over matrisen (Q6 a); referanselinje «Gjelder: ‹innkjøpets navn›», ikke søknad/giver (Q7 a); linjer uten tittel eller med 0 stk tas med som de står (Q8 a); node-test + manuell sjekk (Q9 a).

**Konklusjon:** neste.

## Notater

- Kom opp 2026-10-10 som spørsmål i chatten: «har vi noe for å sende ut
  tilbudsforespørsel?» Svaret var nei; «print som PDF er godt nok».
- Presisert samme dag: leverandøren kan oppgi listepris minus rabatt eller
  nettopris; teksten skal kunne kopieres rett inn i en e-post; ingen
  «TIL»-blokk – samme dokument til alle.
- Grillingen 2026-10-10 tok PDF-en ut (tekst holder), la beskrivelsen og
  leveringsadressen inn, flyttet knappen til verktøylinjen og la til
  referanselinjen «Gjelder».
- Mønster å følge: `skrivunderlag()` i `beregning.js` og «Kopier underlag» i
  `sider/tekst.js` (`kopier()`, `visKvittering('Kopiert')`, reservepanel).
