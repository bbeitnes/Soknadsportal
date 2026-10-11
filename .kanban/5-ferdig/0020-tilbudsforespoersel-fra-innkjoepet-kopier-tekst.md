---
id: 0020
tittel: Tilbudsforespørsel fra innkjøpet (kopier tekst)
status: ferdig
opprettet: 2026-10-10
---

# 0020 · Tilbudsforespørsel fra innkjøpet (kopier tekst)

## Brukerhistorie

Som **bruker** ønsker jeg å kopiere en ferdig tilbudsforespørsel fra et
innkjøp – en tabell med nummer, antall, vare og spesifikasjon – og lime den
rett inn i e-posten til leverandørene, slik at alle får den samme listen og
kan taste den inn i sitt eget ERP-system uten å tolke prosa. Leverandørene får
da pris per linje, som matrisen trenger.

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
brukeren limer tabellen inn i sin egen e-post og skriver hilsen, svarfrist og
mottaker selv.

**Første utgave (ren tekst) ble forkastet** 2026-10-10: elleve linjer «Fra:»
før varelisten, antallet sist på linjen etter en beskrivelse av varierende
lengde, og ren tekst kan ikke lage kolonner i Gmail/Outlook. Leverandørene
lager tilbudet i sitt eget ERP-system og trenger antall og vare som kolonner.

**Løsningen er en tabell på utklippstavlen.** Utklippstavlen tar HTML sammen
med ren tekst (`navigator.clipboard.write()` med `ClipboardItem`): limt inn i
Gmail, Outlook eller Apple Mail blir det en ekte tabell, limt inn i Excel blir
det celler. Knappen «Tilbudsforespørsel» i verktøylinjen over matrisen åpner
alltid et sidepanel med forhåndsvisning av tabellen slik den blir i e-posten,
og «Kopier» i panelet. Slipper nettleseren oss ikke til, merkes tabellen i
panelet, og ⌘/Ctrl+C kopierer den som rik tekst (merket HTML kopieres som
tabell i alle nettlesere). Ren tekst-utgaven har tabulator mellom kolonnene.

**Nytt felt `spesifikasjon` på behovet** (`behov.<id>.spesifikasjon`, fritekst):
det leverandøren trenger – merke, modell, størrelse. Behovets `beskrivelse` er
vår begrunnelse («Erstatter to instrumenter med sprukne ventiler») og går aldri
til leverandøren. Spesifikasjonen settes i behovpanelet, vises i behovslisten
og søknadens behovstabell (sammen med beskrivelsen), og i Innkjøp under
varenavnet (med beskrivelsen som reserve for eldre behov uten spesifikasjon –
der går den også inn i bestillings-PDF-ens varetekst og i «Les priser»).
Importen kjenner overskriften «Spesifikasjon»/«Modell» som eget felt (før gikk
den til beskrivelsen); uten overskrift er kolonnene som før. Panelet varsler
hvor mange linjer som mangler spesifikasjon.

**Innholdet** (`tilbudsforesporsel()` i `beregning.js` gir data,
`ui/foresporsel.js` HTML, `tilbudsforesporselTekst()` ren tekst):

1. «‹Organisasjon› ber om tilbud på varene under.» og «Ref.: ‹innkjøpets navn›».
2. Tabell Nr · Antall · Vare · Spesifikasjon · Pris · Rabatt · Nettopris, typene
   som mellomtitler i matrisens rekkefølge. De tre priskolonnene står tomme og
   fylles ut av leverandøren. Delte linjer (samme `soknadLinjeId`) står én gang med
   summen av antallene. «Uten tittel» og «0 stk» tas med som de står.
3. «Slik ønsker vi tilbudet» (fast i koden, `FORESPORSELKRAV`): pris per
   stykk per linje som listepris minus rabatt eller nettopris; ingen pakkepris
   eller totalrabatt; frakt og leveringstid; alternativ vare oppgis på linjen
   med pris per stykk.
4. «Leveres til: ‹leveringsadresse, ellers postadresse›» på én linje, og en
   signaturlinje: navn · org.nr · kontaktperson · telefon · e-post.

## Akseptansekriterier

- [ ] Gitt et innkjøp med minst én linje, når jeg ser på matrisen, så står
      knappen «Tilbudsforespørsel» i verktøylinjen over matrisen, mellom
      «+ Leverandør» og «Billigst per linje».
- [ ] Gitt at jeg trykker på knappen, så åpnes et sidepanel med tabellen slik
      den blir i e-posten (Nr · Antall · Vare · Spesifikasjon · Pris · Rabatt ·
      Nettopris, de tre siste tomme, typer som mellomtitler), kravteksten, «Leveres til» og signaturlinjen, og knappen
      «Kopier» nederst.
- [ ] Gitt at jeg trykker «Kopier», så ligger tabellen på utklippstavlen som
      HTML og ren tekst, panelet sier «Kopiert – lim inn i e-posten» og
      toppmenyen viser «Kopiert». Slipper nettleseren oss ikke til, sier
      panelet fra og tabellen er merket, så ⌘/Ctrl+C kopierer den.
- [ ] Gitt at tabellen limes inn i Gmail eller Outlook, så kommer den som en
      tabell med sju kolonner og typene som egne rader; limt inn i Excel blir
      den celler.
- [ ] Gitt at innkjøpet har linjer av flere typer, så er linjene gruppert på
      type i samme rekkefølge som matrisen og nummerert fortløpende, med
      antall, varenavn og behovets spesifikasjon – aldri beskrivelsen, og uten
      priser, rabatt, frakt eller sum.
- [ ] Gitt at en linje er delt (to innkjøpslinjer med samme `soknadLinjeId`),
      så står varen én gang med summen av antallene.
- [ ] Gitt at linjer mangler spesifikasjon, så sier panelet hvor mange og
      hvor den settes.
- [ ] Gitt behovpanelet, så har det feltet «Spesifikasjon» over «Beskrivelse»,
      med forklaring på hva som går til leverandøren og hva som er internt;
      behovslisten, søknadens behovstabell og matrisen viser spesifikasjonen.
- [ ] Gitt et regneark med kolonnen «Spesifikasjon» eller «Modell», så
      importeres den til feltet `spesifikasjon`; «Beskrivelse» går fortsatt til
      beskrivelsen.
- [ ] Gitt at Innstillinger har `leveringsadresse`, så står den i «Leveres
      til»; ellers står postadressen der.
- [ ] Gitt at forespørselen kopieres, så lagres ingenting på innkjøpet,
      leverandørene eller i Storage, og «Sist endret» på innkjøpet endres ikke.
- [ ] Gitt at jeg er leser, så kan jeg åpne panelet og kopiere (handlingene er
      i `LESEHANDLINGER`); gitt at jeg er revisor, så finnes ikke knappen.
- [ ] Gitt at innkjøpet ikke har noen linjer, så er knappen slått av med
      forklaringen «Innkjøpet har ingen linjer».
- [ ] Gitt `tilbudsforesporsel()` og `tilbudsforesporselTekst()` i
      `beregning.js`, så har de node-tester som dekker gruppering og
      rekkefølge, sammenslåing av delte linjer, spesifikasjon men aldri
      beskrivelse, leveringsadresse foran postadresse, signatur og kravene.

## Avgrensning

- Portalen sender ikke e-post (B-19). Tabellen limes inn av brukeren.
- Ingen PDF i dette kortet. **Neste steg** (eget kort): PDF med samme tabell
  fra samme `tilbudsforesporsel()`-data, for leverandører som vil ha et
  dokument.
- Ingen mottaker i teksten: samme forespørsel går til alle leverandørene.
  Leverandørens navn, hilsen og svarfrist skriver brukeren i e-posten.
- Kravteksten er lik for alle organisasjoner og kan ikke redigeres. Trengs
  egen ordlyd per korps, er det et lite tilleggskort (felt på `innstillinger`).
- Spesifikasjonen ligger på behovet, ikke på søknadslinjen eller
  innkjøpslinjen. Frie linjer i innkjøpet har bare tittelen.
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
- Bygget 2026-10-10: `tilbudsforesporsel()` i `beregning.js` (+ test), knappen,
  reservepanelet og handlingen i `sider/innkjop.js`, `kopier-foresporsel` i
  `LESEHANDLINGER`, demo-innstillingene fikk org.nr, kontakt og adresser.
  Sjekket på dev i `?demo` (tekst, reservepanel, «Kopiert», tomt innkjøp slått
  av) og `?demo=leser` (knappen virker). Gjenstår for brukeren: lime inn i
  Gmail/Outlook.
- 2026-10-10: Satt på vent av brukeren etter første visning på dev – «det ble ikke
  helt slik jeg hadde sett det for meg». Ligger committet på `test` lokalt
  (e8c84ed), ikke pushet. Hva som skal endres er ikke sagt enda.
- 2026-10-11: Bygget om etter tilbakemeldingen. Brukeren valgte nytt felt
  «Spesifikasjon» på behovet (alternativ 3) og tabell-kopiering med
  forhåndsvisning; PDF venter som neste steg. Nytt: `ui/foresporsel.js`
  (HTML + utklippstavle), `tilbudsforesporsel()` gir data og
  `tilbudsforesporselTekst()` ren tekst, `FORESPORSELKRAV`, feltet i
  behovpanelet, listene og importen (`IMPORTKOLONNER.spesifikasjon`). Sjekket på
  dev i `?demo` (panel, HTML + tekst på utklippstavlen, merking når den er
  sperret, varsel om manglende spesifikasjon) og `?demo=leser`.
- 2026-10-11: Tomme kolonner Pris, Rabatt og Nettopris lagt til etter ønske fra
  brukeren – leverandøren fyller dem ut per linje.
- 2026-10-11, etter ferdig: brukeren tok ut setningen «Ingen pakkepris eller
  totalrabatt …» og linjen «Leveres til» fra forespørselen. Kravene er nå tre:
  pris per stykk per linje, frakt og leveringstid, alternativ vare på linjen.
  Signaturlinjen står som før.
