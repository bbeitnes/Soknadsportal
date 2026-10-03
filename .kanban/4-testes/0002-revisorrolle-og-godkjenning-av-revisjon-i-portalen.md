---
id: 0002
tittel: Revisorrolle og godkjenning av revisjon i portalen
status: testes
opprettet: 2026-10-03
---

# 0002 · Revisorrolle og godkjenning av revisjon i portalen

## Brukerhistorie

Som **revisor for korpset** ønsker jeg å logge inn i portalen, se regnskapet og
bilagene for de søknadene jeg er satt til å revidere, og godkjenne revisjonen
der, slik at revisjonen kan gjøres på nett uten at jeg får tilgang til – eller
kan endre – noe annet.

Som **den som fører søknaden** ønsker jeg at godkjenningen står på søknaden og i
rapporten med navn og tidspunkt, og at den faller bort hvis tallene endres
etterpå, slik at giveren kan stole på at det som er godkjent er det som står der.

## Kontekst

Brukeren spurte 2026-10-03 om det kan lages en rolle som bare har tilgang til
revisjon, helst slik at revisjonen gjøres på nett, og om det da må signeres
digitalt med Vipps e.l. Tre nivåer ble skissert (godkjenning i portalen /
signert PDF utenfor portalen / BankID innebygd). Brukeren valgte: **nivå 1
først**, og **revisor skal bare se tildelte søknader**. Korpset har flere
revisorer som hver skal stå bak godkjenningen.

I dag:
- To roller, Bruker og Administrator (`brukere.<epost>.rolle`). Alle medlemmer
  kan lese og skrive alle søknader, innkjøp og fakturaer
  (`firebase/firestore.rules`: `erMedlem()`). B-09 sier uttrykkelig «ingen
  rettigheter per søknad».
- Revisjon er en fane på søknaden (`app/sider/revisjon.js`), og rapporten lages
  som PDF i nettleseren (`app/ui/rapport.js`). Revisor får i dag PDF-en tilsendt
  utenfor portalen, og det finnes ikke noe spor av at revisjonen er godkjent.
- `lytt()` henter hele samlinger filtrert på `organisasjonId`. Firestore-regler
  er ikke filtre: en revisor som bare får lese tildelte søknader, må spørre med
  en spørring som reglene kan godkjenne (f.eks. `where('revisor', '==', epost)`),
  ellers avvises hele lyttingen.
- Innkjøp og fakturaer er egne samlinger med `soknadId`. Skal revisor bare lese
  dem som hører til tildelte søknader, må reglene slå opp søknaden
  (`get(soknader/<soknadId>)`), og klienten lytte per tildelt søknad.
- Revisjonsvisningen trenger også behov (varenavn), leverandører (navn), givere
  og innstillinger (typerekkefølge). Disse er registre for hele organisasjonen.
- Storage-reglene krever bare innlogging; filstiene finnes bare i dokumenter
  som Firestore beskytter.

Løsningen (etter grillingen 2026-10-03, se B-23):
- Ny rolle `revisor` i `brukere`. Inviteres av administrator og logger inn som
  andre.
- Tilgang: `soknader.<id>.tilgang` er en liste med e-postadresser. Reglene og
  revisorens spørring (`array-contains`) bruker den. Navnet er bevisst
  generelt, så samme liste kan skjerme søknader for vanlige brukere senere.
- Revisjon: `soknader.<id>.revisorer.<nøkkel>` = `{ epost, navn, godkjent:
  { tid, avtrykk } | null, merknad }` – én oppføring per tildelt revisor.
  Oppføringen opprettes av brukeren som tildeler; revisoren kan bare skrive
  `godkjent` og `merknad` (og senere `kommentarer`, kort 0003) i sin egen.
- `avtrykk` er et fingeravtrykk av tallgrunnlaget, regnet ut av en ren
  funksjon i `beregning.js`. Om en godkjenning gjelder, utledes ved å
  sammenligne med avtrykket slik dataene er nå – det lagres ikke (B-15).
- Reglene: revisor leser søknader der e-posten står i `tilgang`, innkjøp og
  fakturaer som hører til dem (oppslag på søknaden), registrene (behov,
  leverandører, givere, innstillinger) og sin egen brukerrad. Hen skriver bare
  sin egen oppføring i `revisorer`, og `godkjent` bare når status er Avsluttet.

## Akseptansekriterier

**Rolle og tildeling**
- [ ] Gitt en administrator i Innstillinger → Brukere, når en bruker inviteres
      eller rollen byttes, så kan «Revisor» velges i tillegg til «Bruker» og
      «Administrator».
- [ ] Gitt en søknad med revisjon slått på, når en bruker eller administrator
      åpner Søknad-fanen, så kan de krysse av én eller flere revisorer for
      søknaden blant brukerne med rollen Revisor, og valget lagres uten
      lagreknapp. Brukere med rollen Bruker eller Administrator står ikke i
      listen.
- [ ] Gitt at ingen har rollen Revisor, når Søknad-fanen åpnes, så står det at
      en administrator inviterer revisorer under Innstillinger → Brukere, i
      stedet for en tom liste.
- [ ] Gitt en bruker som får rollen endret fra Revisor til noe annet, eller
      fjernes, når Revisjon-fanen tegnes, så regnes hen ikke lenger som
      tildelt revisor.

**Det revisor ser**
- [ ] Gitt en innlogget revisor, når portalen åpnes (PC eller mobil), så viser
      toppmenyen bare «Revisjon», og siden lister bare søknadene revisoren er
      tildelt, med tittel, giver, status, innvilget, fakturert og revisorens
      egen godkjenning.
- [ ] Gitt en revisor uten tildelte søknader, når portalen åpnes, så står det
      «Du er ikke satt som revisor for noen søknader ennå.»
- [ ] Gitt en revisor som åpner en tildelt søknad, når siden tegnes, så vises
      pottlinjen, Revisjon-visningen (fakturaer, hva potten er brukt på) og
      dokumentene på søknaden – uten fanene Søknad, Innkjøp og Utgifter og
      uten søknadsvelgeren.
- [ ] Gitt en revisor, når hen klikker et dokument på søknaden eller vedlegget
      på en faktura, så åpnes det i ny fane. Det finnes ingen opplasting,
      bytting eller sletting.
- [ ] Gitt en revisor i Revisjon-visningen, når siden tegnes, så finnes ikke
      «+ Ny faktura», «Slett faktura» eller avkrysning av hva fakturaen
      gjelder, og ingen felt kan redigeres (leverandør, fakturanr, dato,
      beløp, merknad, egne midler).
- [ ] Gitt en revisor, når hen trykker «Revisjonsrapport (PDF)», så lastes
      rapporten ned som for andre brukere.
- [ ] Gitt en revisor som skriver inn en rute hen ikke har tilgang til
      (`#/behov`, `#/soknader`, `#/givere`, `#/kvittering`,
      `#/soknad/<ikke tildelt>`), når siden tegnes, så havner hen på listen
      over tildelte søknader.

**Håndhevet i reglene (ikke bare skjult)**
- [ ] Gitt en revisor, når klienten (eller konsollen) prøver å lese en søknad,
      et innkjøp eller en faktura som hører til en søknad hen ikke er tildelt,
      så avviser Firestore lesingen.
- [ ] Gitt en revisor, når klienten prøver å opprette, endre eller slette noe
      annet enn sin egen oppføring i `revisorer` på en tildelt søknad (og
      navn/status på sin egen brukerrad ved første innlogging), så avviser
      Firestore skrivingen. Det gjelder også `tilgang`, andre revisorers
      oppføringer, fakturaer, innkjøp og registrene.
- [ ] Gitt en revisor og en tildelt søknad som ikke har status Avsluttet, når
      klienten prøver å skrive `godkjent`, så avviser Firestore skrivingen.
- [ ] Gitt en revisor, når klienten prøver å lese brukerlisten, så får hen bare
      lese sin egen rad.
- [ ] Gitt de nye reglene og den gamle koden (før ny kode er lagt ut), når en
      bruker eller administrator bruker portalen, så virker alt som før.
- [ ] Gitt en bruker eller administrator og ny kode, når de bruker portalen, så
      virker alt som før.

**Godkjenning**
- [ ] Gitt en tildelt søknad som ikke har status Avsluttet, når revisoren åpner
      den, så står «Kan godkjennes når søknaden er satt til Avsluttet» der
      knappen ellers er.
- [ ] Gitt en tildelt søknad med status Avsluttet, når revisoren trykker
      «Godkjenn revisjon» og bekrefter, så lagres tidspunkt og avtrykk i
      revisorens oppføring, og Revisjon-fanen viser «<navn>: godkjent <dato og
      klokkeslett>» for både revisorer og brukere.
- [ ] Gitt en revisor, når hen skriver i feltet «Revisors merknad», så lagres
      det ved blur og vises for brukerne i Revisjon-fanen sammen med navnet.
- [ ] Gitt en bruker eller administrator, når de åpner Revisjon-fanen, så ser
      de en linje med status per tildelt revisor («godkjent <dato>», «ikke
      godkjent» eller «endret etter godkjenningen <dato>») og merknadene, men
      ingen «Godkjenn»-knapp og ikke noe redigerbart merknadsfelt.
- [ ] Gitt to tildelte revisorer der bare én har godkjent, når Revisjon-fanen
      tegnes, så står den ene som godkjent og den andre som «ikke godkjent».
- [ ] Gitt en godkjenning, når en faktura legges til, slettes eller får endret
      løpenummer, leverandør, fakturanummer, dato, beløp, vedlegg eller
      kobling, eller når valgt leverandør/pris, antall, frakt, egne midler,
      løse utgifter (beløp, egeninnsats), søkt, innvilget, egenandel,
      egenandelsvalg eller momsprosent endres, så viser Revisjon-fanen «endret
      etter godkjenningen <dato>» (aksentfarge) for den revisoren, og hen kan
      godkjenne på nytt.
- [ ] Gitt en godkjenning, når noe annet endres (fakturamerknad, titler og
      beskrivelser, typer, rekkefølge, dokumenter, status, frist, sendt,
      priser som ikke er valgt, revisorens merknad), så gjelder godkjenningen
      fortsatt.
- [ ] Gitt en godkjenning, når statusen flyttes tilbake fra Avsluttet og
      tallene er uendret, så står godkjenningen. Ny godkjenning krever
      Avsluttet.
- [ ] Gitt en godkjenning, når revisoren trykker «Trekk godkjenningen» og
      bekrefter, så fjernes den.
- [ ] Gitt en revisor som har godkjent, når hen fjernes fra søknaden, så vises
      og teller ikke godkjenningen lenger.

**Rapporten**
- [ ] Gitt en søknad med tildelte revisorer, når rapporten lages, så har
      forsiden en blokk «Revisjon» med én linje per tildelt revisor:
      «Godkjent i Søknadsportal av <navn> (<e-post>), <dato kl.>» med
      revisorens merknad under, eller «Ikke godkjent: <navn>». En godkjenning
      som er endret etter at den ble gitt, står som «Ikke godkjent».
- [ ] Gitt en søknad uten tildelte revisorer, når rapporten lages, så er den
      som i dag, uten blokken.

**Demo, test og dokumentasjon**
- [ ] Gitt `http://localhost:8430/?demo=revisor`, når siden åpnes, så er man
      revisor i demodataene med minst én tildelt og én ikke tildelt søknad.
      `?demo` er som før.
- [ ] Gitt testene, når `node --test test/` kjøres, så går de gjennom, med nye
      tester for avtrykket (endres av det som inngår, ikke av det som ikke
      inngår) og for status per revisor.
- [ ] Gitt at kortet er bygget, når svaret gis, så sier det fra at HELE
      `firebase/firestore.rules` må limes inn i begge databasene FØR første
      revisor inviteres, og spec.md («Brukere og roller»), CLAUDE.md og
      OPPSETT.md (med sjekkliste for å prøve reglene som revisor) er
      oppdatert.

## Avgrensning

- Ingen BankID-/Vipps-signering og ingen signeringstjeneste (nivå 2 og 3).
  Godkjenningen er en innlogget brukers handling, ikke en kvalifisert
  signatur, og rapporten sier «godkjent», ikke «signert».
- Kommentarer per faktura er kort 0003. Reglene i dette kortet lar allerede
  revisoren skrive i sin egen oppføring, så de limes inn bare én gang.
- Ingen låsing av søknaden når revisjonen er godkjent.
- Ingen historikk over tidligere godkjenninger; bare den siste per revisor.
- Portalen varsler ingen (B-19), og søknadslisten får ingen merkelapp for
  revisjon nå. Mulig senere.
- Revisor ser ikke Søknad-, Innkjøp- og Utgifter-fanene, og dermed ikke
  tilbudsdokumentene. Eget kort hvis revisorene ber om det.
- Bruker og Administrator ser fortsatt alle søknader. Skjerming av søknader
  for vanlige brukere er ikke med, men `tilgang`-listen er laget for det.
- Revisorvisningen tilpasses ikke smal skjerm (B-22).
- Ingen emulator eller automatiske regeltester; reglene prøves for hånd i
  testdatabasen.
- Storage-reglene endres ikke.

## Grilling

Grillet med brukeren 2026-10-03 (fjorten spørsmål, ett om gangen).

**1. Kollisjon med beslutningsloggen.**
- B-09 brytes bevisst: tredje rolle og tilgang per søknad. Ført som B-23. B-09 sa selv at den snur «når organisasjonen får behov for å skjerme enkelte søknader».
- B-02: omfanget er uttrykkelig bedt om av brukeren, punkt for punkt. Det som ikke ble valgt (låsing, tråder, merkelapp i søknadslisten, innsyn i tilbudene, emulator) står i Avgrensning.
- B-03: revisorens merknad lagres ved blur. «Godkjenn» og «Trekk godkjenningen» er handlinger med bekreftelse, ikke lagreknapper.
- B-06: avtrykket og status per revisor er rene funksjoner i `beregning.js` med test; alt må virke i `?demo`.
- B-07: `firebase/firestore.rules` endres – hele filen limes inn i begge databasene.
- B-11: `revisorer` er et kart med én oppføring per revisor. `tilgang` er en liste fordi reglene og spørringen (`array-contains`) krever det; den skrives i ett stykke, men bare ved tildeling.
- B-15: at en godkjenning gjelder, utledes av avtrykket. Selve godkjenningen (hvem, når, avtrykk) er en hendelse og må lagres.
- B-19: portalen varsler ingen; revisor og brukere sier fra til hverandre utenfor portalen.
- B-20: rapporten lages fortsatt i nettleseren og beholder de tre delene; forsiden får en blokk til.
- B-22: revisor på mobil får listen sin, men visningen tilpasses ikke smal skjerm.

**2. Datamodell.** Nytt: rolleverdien `revisor`, `soknader.<id>.tilgang` (liste med e-post) og `soknader.<id>.revisorer.<nøkkel>` (`epost`, `navn`, `godkjent {tid, avtrykk}`, `merknad`). Navnet kopieres inn i oppføringen fordi revisorer ikke får lese brukerlisten, og fordi godkjenningen skal vise navnet slik det var. Om godkjenningen gjelder, og om revisjonen er ferdig (alle tildelte har gyldig godkjenning), utledes.

**3. Migrering og data i drift.** Ingen migrering. Søknader uten `tilgang`/`revisorer` har ingen revisorer og oppfører seg som i dag. Rekkefølgen er viktig: med dagens regler er enhver rad i `brukere` fullt medlem, så de nye reglene må limes inn i en database før første revisor inviteres der, og de nye reglene må virke med den gamle koden i mellomtiden.

**4. Låser vi oss?** Brukeren valgte at tilgang per søknad skal kunne utvides til vanlige brukere, så listen heter `tilgang` og ikke `revisorer`. Avtrykket er en avtale: endres det som inngår i en senere versjon, blir gamle godkjenninger ugyldige – avtrykket får derfor et versjonsprefiks. Innkjøp og fakturaer skjermes ved oppslag på søknaden; det koster en lesing per regelsjekk og binder revisorens lytting til én spørring per tildelt søknad.

**5. Er det nødvendig?** Alternativet er dagens praksis: PDF-en sendes til revisor, og godkjenningen kommer på e-post uten spor i portalen eller rapporten. Brukeren vil ha revisjonen på nett. BankID/Vipps-signering (nivå 2 og 3) er valgt bort inntil en giver krever det.

**6. Hvordan verifiseres det?** `node --test` for avtrykket og status per revisor. `?demo=revisor` på dev for skjermbildene. Reglene limes inn i testdatabasen; brukeren inviterer en ekstra e-postadresse som revisor og går gjennom en sjekkliste i OPPSETT.md (med kall til konsollen som skal avvises), og logger så inn som vanlig bruker og ser at alt er som før. Ingen emulator.

**Det grillingen avklarte**
- Tilgang per søknad skal kunne gjelde vanlige brukere senere (ikke bygget nå).
- Flere revisorer per søknad; hver godkjenner for seg, og revisjonen er godkjent når alle tildelte har gyldig godkjenning. (Kortet sa først én revisor.)
- Bare brukere med rollen Revisor kan tildeles, så den som fører regnskapet ikke kan godkjenne det. Alle brukere kan tildele; bare administrator inviterer.
- Revisor ser pottlinjen, Revisjon og dokumentene på søknaden (tilsagnsbrevet). Ikke Søknad-, Innkjøp- og Utgifter-fanene. (Kortet sa først bare Revisjon.)
- Registrene (behov, leverandører, givere, innstillinger) er lesbare for revisor; å kopiere navn inn i søknaden ville brutt B-15.
- Revisor får én merknad til godkjenningen (i rapporten) og kommentarer per faktura (bare på skjerm, ingen svar, hindrer ikke godkjenning). Svar i tråd kan komme senere. Kommentarene er skilt ut som kort 0003.
- «Godkjenn» virker bare når status er Avsluttet, også i reglene. Revisor kan se fra tildelingen.
- Ingen låsing. Godkjenningen står om statusen flyttes tilbake og tallene er uendret. En fjernet revisors godkjenning faller bort.
- Avtrykket: fakturaer (løpenummer, leverandør, fakturanr, dato, beløp, vedlegg, kobling), poster (valgt pris, antall, frakt, egne midler, utgifter, egeninnsats) og rammen (søkt, innvilget, egenandel, egenandelsvalg, momsprosent). Typer inngår ikke – giverne bevilger ikke per kategori.
- Rapporten viser status per tildelt revisor, også «Ikke godkjent», og sier «Godkjent i Søknadsportal».
- Ingen merkelapp i søknadslisten nå; varsling skjer utenfor portalen.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-03: Bygget. Avvik fra kortet: oppføringen heter `soknader.<id>.revisorer.<nøkkel>` (ikke
  `revisjon`, som er det gamle av/på-krysset), og den skrives BARE av revisoren selv – brukeren som
  tildeler skriver bare `tilgang`. Brukere og administratorer kan ikke røre `revisorer` (reglene), så
  en godkjenning ikke kan forfalskes. Følge: en revisor som ikke har skrevet noe ennå, står med
  e-postadressen i stedet for navnet når en ANNEN revisor ser søknaden (revisorer kan ikke lese
  brukerlisten). Brukere og administratorer ser alltid navnet.
- En revisor som fjernes fra søknaden beholder oppføringen sin i dataene, men den vises og teller
  ikke. Krysses hen av igjen, er godkjenningen tilbake (hvis tallene er uendret).
- Nytt: `revisornokkel()`, `revisjonsavtrykk()`, `revisorstatus()`, `revisjonGodkjent()` i
  `beregning.js`; `erRevisor()`, `startRevisorlytting()`, `settRevisor()`, `godkjennRevisjon()`,
  `trekkGodkjenning()` i `data/index.js`; `lager.lytt(…, filter)`; `sider/revisor.js`; revisorvisning i
  `soknad.js`/`revisjon.js`; blokken «Revisjon» i `rapport.js`; rollen i `givere.js`;
  `firebase/firestore.rules`. Fire nye tester, `node --test test/` gir 48 av 48.
- Sett på dev i `?demo=revisor` og `?demo`: liste, sperrede ruter, skrivebeskyttet panel, godkjenn/
  trekk, merknad, «endret etter godkjenningen» når et fakturabeløp endres, tildeling, rapporten.
- IKKE prøvd: reglene. De kan bare prøves mot Firebase (OPPSETT.md §2 «Prøve reglene som revisor»).
  Usikkert punkt: at reglene godtar revisorens spørringer på innkjøp/fakturaer
  (`where soknadId ==` + oppslag på søknaden i reglene). Feiler det, står revisoren med «Kunne ikke
  hente data», og reglene/spørringen må legges om (f.eks. `tilgang` kopiert til innkjøp og fakturaer).
- Gjenstår: brukeren limer reglene inn i testdatabasen og går gjennom sjekklisten. Ikke committet.
