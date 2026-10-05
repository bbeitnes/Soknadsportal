---
id: 0006
tittel: Planlagte utgifter: søknadslinjer kan plukkes inn i Utgifter
status: testes
opprettet: 2026-10-05
---

# 0006 · Planlagte utgifter: søknadslinjer kan plukkes inn i Utgifter

## Brukerhistorie

Som **bruker som fører en søknad** ønsker jeg å plukke en linje vi har søkt om
inn i Utgifter og koble den faktiske fakturaen til den, slik at søknader som
bare gjelder utgifter (ikke innkjøp med tilbud) kan føres og revideres uten at
jeg må lage et innkjøp eller skrive utgiften inn én gang til.

## Kontekst

Noen søknader har ingen innkjøp. Vi har søkt om dekning for utgifter
(dirigenthonorar, leie av lokale, reise …), og de står i Søknad-fanen som frie
linjer – skrevet rett inn, ikke hentet fra Behov.

I dag er de to tingene ikke koblet:

- En søknadslinje kan bare følges opp gjennom Innkjøp (linje → tilbud → valgt
  pris → faktura). For en ren utgift er tilbudsrunde og leverandørmatrise
  meningsløst.
- Utgifter-fanen har «løse utgifter» (`soknader.<id>.utgifter`), som kan kobles
  til faktura i Revisjon. Men de må skrives inn på nytt og har ingen kobling
  til linjen vi søkte om, så det går ikke fram hva som var planlagt og hva som
  dukket opp underveis.

Utgifter blir dermed to ting: **planlagte** (står i søknaden) og **uplanlagte**
(kommer opp underveis, som i dag).

Løsningen (landet i grillingen 2026-10-05, se under):

- En utgift kan peke på en søknadslinje: `utgifter.<uid>.soknadLinjeId`. Da er
  den planlagt (utledes, B-15), og beskrivelse og type hentes fra linjen.
- Bare frie linjer (uten `behovId`, ikke `etterSoknad`) som ikke ligger i et
  innkjøp kan plukkes, og en linje har høyst én utgift. Flere fakturaer kobles
  til samme utgift i Revisjon, som i dag.
- Beløpet på utgiften er det faktiske, forhåndsutfylt med estimatet. Estimatet
  står urørt på søknadslinjen (B-16).
- En linje følges opp enten i Innkjøp eller som utgift (B-27).

## Akseptansekriterier

- [ ] Gitt en søknad med frie linjer som ikke ligger i noe innkjøp og ikke har
      en utgift, når jeg ser Utgifter-fanen, så står knappen «+ Fra søknaden (n)»
      i verktøyraden med antallet slike linjer, og fanens overskrift er
      «Utgifter».
- [ ] Gitt at jeg trykker «+ Fra søknaden», når sidepanelet åpnes, så viser det
      disse linjene med tittel, type og estimert sum, og jeg kan legge til én
      om gangen («Legg til») eller alle («Legg til alle n»), som i de andre
      panelene. Linjer hentet fra Behov, linjer lagt til etter søknaden,
      linjer i et innkjøp og linjer som alt har en utgift er ikke med.
- [ ] Gitt at jeg har lagt til linjer, når jeg ser Utgifter-fanen, så står hver linje som
      en rad i gruppen «Fra søknaden» med linjens tittel og type
      (skrivebeskyttet; har linjen ingen type, kan typen settes på utgiften), estimatet i kolonnen «Søkt» og samme sum forhåndsutfylt
      som beløp, i samme rekkefølge som linjene har i søknaden.
- [ ] Gitt en søknad med både planlagte og andre utgifter, når jeg ser
      Utgifter-fanen, så er det én tabell med gruppene «Fra søknaden» og «Andre
      utgifter», delsum per gruppe og totalsum nederst; den tomme raden for ny
      utgift står under «Andre utgifter».
- [ ] Gitt en planlagt utgift, når jeg endrer beløp eller dato, så lagres det
      ved blur, og estimatet på søknadslinjen og «Søkt beløp» er uendret.
- [ ] Gitt at jeg retter tittelen eller typen på søknadslinjen (utkast), når
      Utgifter, Revisjon og rapporten tegnes, så viser de den nye teksten.
- [ ] Gitt en planlagt utgift, når jeg kobler én eller flere fakturaer til den
      i Revisjon, så oppfører den seg som en løs utgift gjør i dag (tilbudt =
      utgiftens beløp, fakturert, avvik, «mangler faktura», pott, egne midler,
      egeninnsats), har underteksten «Utgift fra søknaden», og regnes inn i
      linjens type i sluttoppgjøret og rapporten.
- [ ] Gitt utgifter uten type, når Revisjon og PDF-rapporten grupperer
      postene, så heter samlegruppen «Andre utgifter» (ikke «Løse utgifter»),
      og rapporten skiller ellers ikke planlagt fra uplanlagt.
- [ ] Gitt en linje som er plukket inn i Utgifter, når jeg åpner «Ikke fordelt»
      i Innkjøp, så er den ikke der, og «Legg alle» / «Legg hele typen» tar den
      ikke med.
- [ ] Gitt en søknadslinje som har en utgift, når jeg ser Søknad-fanen, så har
      linjen merkelappen «Utgift»; prøver jeg å fjerne linjen (utkast), så
      fjernes den ikke, og jeg får beskjed om å slette utgiften først.
- [ ] Gitt en planlagt utgift, når jeg sletter den i Utgifter-fanen, så står
      søknadslinjen igjen, kan plukkes på nytt og dukker opp igjen i «Ikke
      fordelt».
- [ ] Gitt en eksisterende løs utgift, når jeg
      velger «Koble til linje» på raden og velger en linje som kan
      plukkes, så flytter raden til «Fra søknaden», viser linjens tittel og
      type, og beholder beløp, dato, egne midler og fakturakoblinger.
- [ ] Gitt en låst søknad (status ≠ utkast), når jeg plukker linjer inn i
      Utgifter eller kobler en løs utgift til en linje, så går det.
- [ ] Gitt en revisor som har godkjent en søknad, når en løs utgift kobles til
      en søknadslinje uten at beløpet endres, så står godkjenningen fortsatt
      som «godkjent».
- [ ] Gitt en revisor på en tildelt søknad, når hen åpner Revisjon, så vises
      planlagte utgifter på linje med andre poster, skrivebeskyttet.
- [ ] `node --test test/` er grønn, med nye tester for hvilke linjer som kan
      plukkes, at posten får tittel og kategori fra linjen, at «ikke fordelt»
      utelukker plukkede linjer, og at `sumEstimert()` og
      `revisjonsavtrykk()` ikke endres av koblingen.

## Avgrensning

- Ingen endring i Innkjøp: linjer som skal ha tilbud, går dit som før.
- Ingen ny samling og ingen regelendring – utgiftene ligger fortsatt som kart
  på søknaden (B-11).
- Uplanlagte (løse) utgifter, egeninnsats og kvitteringer fra mobil virker som
  i dag.
- Én linje fordeles ikke på flere utgiftsrader – flere fakturaer kobles til
  samme utgift.
- Behovslinjer kan ikke føres som utgift (ville krevd at utgifter gir
  «Finansiert»/«Anskaffet»).
- Ingen funksjon for å løsne en kobling: slett utgiften og skriv den inn på
  nytt.
- PDF-rapporten skiller ikke planlagt fra uplanlagt.

## Grilling

Grillet 2026-10-05 med brukeren (8 spørsmål, ett om gangen).

**1. Kollisjon med beslutningsloggen.**
- B-02: holdes. Ingen delvis plukking, ingen funksjon for å løsne en kobling, ingen engangsrydding med skript – brukeren ba om plukking og faktura, og kobling av eksisterende utgifter ble uttrykkelig valgt (Q8).
- B-03/B-04: holdes. Plukking skjer i sidepanel; dato og beløp lagres ved blur. Én tabell med to grupper, ikke to tabeller.
- B-11: holdes. Utgiftene ligger fortsatt som kart på søknaden.
- B-13: berøres ikke. Én linje blir én utgift (Q1); flere fakturaer kobles til samme utgift, som Revisjon allerede støtter.
- B-15: holdes. «Planlagt» er utledet av `soknadLinjeId`. Beskrivelse og type lagres ikke på en planlagt utgift, men hentes fra søknadslinjen (Q4).
- B-16: holdes. Det søkte endres ikke av plukking eller av at utgiftens beløp rettes, så det er lov i en låst søknad.
- B-17: holdes. Egne midler og egeninnsats virker likt på planlagte utgifter.
- B-23: holdes. Revisor ser planlagte utgifter i Revisjon som andre poster, skrivebeskyttet. Ingen regelendring.
- Ny beslutning: B-27 (en søknadslinje følges opp enten i Innkjøp eller som utgift).

**2. Datamodell.** Ett nytt felt: `soknader.<id>.utgifter.<uid>.soknadLinjeId`. Beløpet på utgiften er det faktiske og er et eget tall (forhåndsutfylt med estimatet, Q3); estimatet står på linjen. Ingen ny samling. Hvilke linjer som kan plukkes utledes: fri linje (ingen `behovId`), ikke `etterSoknad`, ikke i noe innkjøp, ikke allerede koblet til en utgift.

**3. Migrering og data i drift.** Ingen migrering. Utgifter i prod har ikke `soknadLinjeId` og blir stående under «Andre utgifter». Utgifter som allerede er ført for hånd kan kobles til linjen sin fra raden (Q8) og beholder beløp, dato og fakturaer. `revisjonsavtrykk()` endres ikke (beløp, egeninnsats og egne midler er uberørt av koblingen), så avgitte godkjenninger står og versjonen forblir «v1». Samlegruppen «Løse utgifter» heter «Andre utgifter» i rapporter som lages på nytt – ingen tall endres.

**4. Låser vi oss?** Én til én (Q1) gjør at en linje ikke kan fordeles på flere utgiftsrader; trengs det senere, kan `soknadLinjeId` på flere utgifter tillates uten å endre lagringen. Behovslinjer kan ikke føres som utgift (Q2) – å åpne for det krever at utgifter kan gi «Finansiert»/«Anskaffet», og tas da som eget kort. B-27 hindrer dobbel belastning av potten.

**5. Er det nødvendig?** Uten kortet må en ren utgiftssøknad enten føres gjennom et innkjøp med tilbudsmatrise som ikke gir mening, eller skrives inn på nytt som løs utgift uten spor til det vi søkte om. Det enklere alternativet (bare en merkelapp på løse utgifter) gir ikke huskelisten over hva som gjenstår.

**6. Hvordan verifiseres det?** `node --test test/` for hvilke linjer som kan plukkes, at `sumEstimert()` og avtrykket er uendret, og at postene får tittel og kategori fra linjen. Demodataene får en søknad med bare utgifter. Brukeren prøver på dev (`?demo`), så på test. Ingen ny testinfrastruktur.

**7. Sikkerhetskopien (B-24, B-25).** Ingen ny samling, ikke noe nytt Storage-prefiks, ingen automatikk som skriver. Kopiskriptet og restore-testen røres ikke.

**Valg.**
- Q1: Én søknadslinje → én utgift. Flere fakturaer på samme utgift.
- Q2: Bare frie linjer som ikke ligger i et innkjøp. Ikke behovslinjer, ikke linjer lagt til etter søknaden.
- Q3: Eget beløp på utgiften, forhåndsutfylt med estimatet. Avvik i Revisjon måles mot utgiftens beløp; det søkte vises i Utgifter-fanen.
- Q4: Beskrivelse og type følger søknadslinjen og er skrivebeskyttet på utgiften. En linje med utgift kan ikke slettes før utgiften er slettet; linjen får merkelappen «Utgift» i Søknad-fanen.
- Q5: Én tabell, gruppene «Fra søknaden» og «Andre utgifter» med delsum, kolonnen «Søkt», knappen «+ Fra søknaden (n)». Fanens overskrift blir «Utgifter». Planlagte står i søknadens linjerekkefølge. Ny-rad står under «Andre utgifter».
- Q6: Merkes bare på skjerm («Utgift fra søknaden» i Revisjon). Rapporten skiller ikke. Samlegruppen heter «Andre utgifter».
- Q7: Enten innkjøp eller utgift (B-27). Plukkede linjer forsvinner fra «Ikke fordelt» i Innkjøp. «Legg alle»/«Legg hele typen» tar fortsatt med frie linjer som ikke er plukket.
- Q8: En eksisterende løs utgift kan kobles til en søknadslinje. Ingen funksjon for å løsne.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-05: Bygget. Avvik fra grillingen, alle små: (1) panelet «Fra søknaden» har «Legg til» per
  linje og «Legg til alle», som de andre panelene, i stedet for avkrysning + bekreft. (2) Har linjen
  ingen type, gjelder utgiftens egen type og kan settes på utgiften – ellers mistet en løs utgift
  typen sin når den ble koblet til en linje uten type i en låst søknad. (3) Kvitteringer fra mobil
  er fakturaer, ikke utgifter, så «koble til linje» gjelder bare løse utgifter. Gruppene og kolonnen
  «Søkt» vises bare når søknaden har minst én planlagt utgift.
