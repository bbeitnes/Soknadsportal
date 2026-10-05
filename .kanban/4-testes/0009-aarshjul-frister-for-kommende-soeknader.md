---
id: 0009
tittel: Årshjul: frister for kommende søknader
status: testes
opprettet: 2026-10-05
---

# 0009 · Årshjul: frister for kommende søknader

## Brukerhistorie

Som **bruker** ønsker jeg et årshjul i portalen der vi legger inn frister for kommende søknader, slik at vi ser hva som kommer gjennom året og ikke går glipp av en søknadsfrist.

## Kontekst

I dag finnes fristen bare som ett datofelt på en søknad som allerede er opprettet (`soknader.<id>.frist`).
Frister hos givere vi ennå ikke har laget søknad til, står som fritekst i giverens kontaktfelt
(«Frister 15. mars og 15. september») og vises ingen steder samlet.

Ønsket (2026-10-05): noen frister er engangs, andre er årlige, og noen givere har flere frister
gjennom året – også ekstra utlysninger som kommer én gang.

Løsningen etter grillingen:

- Fristene ligger på giveren: `givere.<id>.frister.<fid>` = `{ dato, tekst, arlig }` (kart, B-11).
- Årshjul er eget punkt i toppmenyen (`#/aarshjul`): tolv månedsruter (4 × 3), fra forrige måned.
- Søknadenes neste frist (kort 0010, bygges først) vises som egne linjer; frist og søknad kobles ikke.
- Alle brukere kan opprette og endre givere; bare administrator sletter (B-29, endrer B-09).
  `firebase/firestore.rules` endres og må limes inn i prod, test og `soknadsportal-restore`.

## Akseptansekriterier

Skrives som Gitt/Når/Så, og skal kunne verifiseres av noen andre enn den som
skrev dem. Unngå «fungerer bra» — si hva som skal stå på skjermen.

**Frister på giveren**

- [ ] Gitt at jeg har åpnet en giver i giverpanelet, når jeg trykker «+ Frist» og fyller inn dato (dd.mm.åååå), tekst (f.eks. «Ordinær tildeling») og krysser av «Årlig», så lagres hvert felt ved blur, og fristen står i giverens fristliste som «15.03 · hvert år · Ordinær tildeling».
- [ ] Gitt en giver med fristene 15.03 (årlig), 15.09 (årlig) og 01.12.2026 (engang), så står alle tre i fristlisten, og engangsfristen vises med full dato.
- [ ] Gitt en engangsfrist som er passert, så står den grået ut i giverens fristliste til jeg sletter den med × på raden.
- [ ] Gitt at jeg åpner giveren fra Innstillinger → Givere, så ser jeg den samme fristlisten som når jeg åpner giveren fra Årshjul.

**Årshjulet**

- [ ] Gitt at jeg er bruker eller administrator, så står toppmenyen som Behov · Søknader · Årshjul · Innstillinger. Gitt at jeg er revisor eller på mobilskjermen, så finnes ikke Årshjul.
- [ ] Gitt at dagens dato er 05.10.2026, når jeg åpner Årshjul, så ser jeg tolv månedsruter i et rutenett (4 × 3) fra september 2026 til august 2027 uten at siden scroller, med årstall i månedstittelen, og september-ruten er grået ut.
- [ ] Gitt en årlig frist 15.03 og at dagens dato er 05.10.2026, så står den under mars 2027 som «15. · ‹givernavn› · ‹tekst›».
- [ ] Gitt en giver med to årlige frister (15.03 og 15.09) og dagens dato 05.10.2026, så står giveren under mars 2027 og (grået ut) under september 2026.
- [ ] Gitt en frist tidligere i inneværende måned (f.eks. 01.10 når dagens dato er 05.10), så står den grået ut i inneværende måneds rute.
- [ ] Gitt en engangsfrist 01.12.2026, så står den under desember 2026 til og med januar 2027, og er borte fra Årshjul fra februar 2027.
- [ ] Gitt en giverfrist som er 30 dager eller mindre fram i tid, så står den med aksentfarge; frister lenger fram står uten markering.
- [ ] Gitt en årlig frist 29.02, så står den på 28. februar i år uten skuddår.
- [ ] Gitt et utkast med søknadsfrist 01.06.2027 og ingen egen «Neste frist», så står det under juni 2027 som egen linje «1. · ‹tittel› · Send søknaden», med annet utseende enn giverfristene, og klikk åpner søknaden.
- [ ] Gitt en innvilget søknad med neste frist 01.03.2027 og «Sluttrapport til giver» (kort 0010), så står den under mars 2027 med den teksten. Gitt en sendt eller innvilget søknad uten neste frist, eller en avsluttet eller avslått søknad, så står den ikke i Årshjul.
- [ ] Gitt en søknadslinje i Årshjul, så markeres den som i søknadslisten (aksentfarge fra 30 dager før, «Forfalt» når datoen er passert); forfalte vises bare så lenge de ligger i forrige eller inneværende måned.

**Fra frist til søknad**

- [ ] Gitt en giverfrist i Årshjul, når jeg klikker på den, så åpnes giverpanelet som sidepanel i Årshjul (Escape lukker, B-28).
- [ ] Gitt fristen «15.03 · hvert år · Ordinær tildeling» og dagens dato 05.10.2026, når jeg trykker «+ Søknad til denne fristen» på fristraden, så opprettes et utkast med giveren, frist 15.03.2027 og tittelen «Ordinær tildeling 2027», og søknaden åpnes.

**Hvem kan endre givere (B-29)**

- [ ] Gitt at jeg er vanlig bruker, så kan jeg opprette en giver («+ Ny giver») og endre alle feltene på en giver – navn, kontaktinfo, momsinnstilling og frister – og endringene lagres uten feil mot testdatabasen.
- [ ] Gitt at jeg er vanlig bruker, så finnes ikke «Slett» på giveren; gitt at jeg er administrator, så finnes den som før.
- [ ] Gitt at regelfilen er endret, så er hele `firebase/firestore.rules` limt inn i prod, test og `soknadsportal-restore`.

**Demo og tester**

- [ ] Gitt `localhost:8430/?demo`, så har minst to givere frister (årlige og en engangs), slik at Årshjul viser både markerte, vanlige og grå frister.
- [ ] Gitt `node --test test/`, så er neste forekomst, periode, markering og skuddår dekket av tester i beregningslaget.

## Avgrensning

- Ingen varsling på e-post eller kalendereksport – portalen sender ingenting selv (B-19).
- Ingen automatisk tolking av fristene som står som fritekst i giverens kontaktfelt; de legges inn for hånd, og kontaktfeltet røres ikke.
- Ingen kobling mellom frist og søknad: årshjulet viser ikke om en giverfrist «er tatt hånd om».
- Ikke tall i toppmenyen for frister som nærmer seg – kanskje senere (krever koblingen over for å treffe).
- Ikke et tegnet, rundt hjul – kan vurderes senere.
- Ingen frister uten giver.
- Feltene og utregningen av søknadens «Neste frist» er kort 0010; årshjulet bare viser den.

## Grilling

Grillet 2026-10-05 med `/grill-me` (ett spørsmål om gangen).

**Valgene**

- **Q1 Hva henger en frist på?** Giveren. En giver kan ha både faste, årlige frister og ekstra engangsutlysninger; hver frist har sin egen tekst. Ingen frister uten giver.
- **Q2 Post eller ordning?** Hver dato er sin egen post (dato, tekst, årlig). Ingen «ordning» med flere datoer.
- **Q3 Visning:** tolv månedsruter i et rutenett (4 × 3). Et tegnet, rundt hjul hadde vært «gøyest», men er lagt til Avgrensning (kan vurderes senere).
- **Q4 Periode:** rullerende. Forrige måned (grået ut) + inneværende + ti måneder fram. Passerte frister i inneværende måned gråes ut.
- **Q5 Søknader i årshjulet:** ja, som egne linjer under måneden for søknadsfristen (ikke avsluttet/avslått). Frist og søknad kobles ikke.
- **Q6 Klikk på giverfrist:** åpner giverpanelet i årshjulet, og hver fristrad har «+ Søknad til denne fristen» (uttrykkelig bedt om, så B-02 holder).
- **Q7 Hvem kan endre:** alle brukere kan opprette og endre hele giveren (også kontaktinfo og momsinnstilling); bare administrator sletter. Ført som B-29.
- **Q8 Plassering:** eget punkt i toppmenyen (`#/aarshjul`). Revisor og mobil får det ikke.
- **Q9 Markering:** aksentfarge i årshjulet fra 30 dager før. Tall i toppmenyen: kanskje senere (Avgrensning).
- **Q10 Detaljer:** full dato + kryss «Årlig» (29.02 → 28.02 uten skuddår); passert engangsfrist står grået i giverens liste til den slettes; tittelforslag «‹tekst› ‹år›»; samme giverpanel under Innstillinger; kontaktfeltet røres ikke.

**Punktene**

1. **Kollisjon med beslutningsloggen.** Bryter bevisst med B-09 (bare administrator vedlikeholder givere) – begrunnet i B-29: den som oppdager en ny ordning eller flyttet frist skal kunne legge den inn selv. Rutenettet er en avveining mot B-04 («ingen kortvisninger i stedet for tabell»): månedsoversikten er selve formålet, og siden scroller ikke. B-03 (felt lagres ved blur), B-11 (kart), B-15, B-19, B-22, B-23 og B-28 følges.
2. **Datamodell.** Nytt kart `givere.<id>.frister.<fid>` = `{ dato, tekst, arlig }`. Neste forekomst av en årlig frist, måneden den havner i og markeringen utledes i `beregning.js` og lagres ikke (B-15). Søknadslinjene i årshjulet kommer fra `soknader.<id>.frist`, som finnes.
3. **Migrering og data i drift.** Ingen. Feltet er valgfritt; givere uten `frister` virker som før. Fritekstfristene i kontaktfeltet flyttes for hånd. `firebase/firestore.rules` endres (givere: create/update for bruker, delete for administrator) og må limes inn i prod, test og `soknadsportal-restore`.
4. **Låser vi oss?** Lite. Uten kobling mellom frist og søknad kan et tall i toppmenyen («frister uten søknad») ikke bli treffsikkert uten at koblingen innføres da. Kartet kan få flere felt senere.
5. **Er det nødvendig?** Alternativet er fritekst i kontaktfeltet, som ikke vises samlet noe sted. En ren liste hadde løst mye, men ikke «året på ett blikk».
6. **Hvordan verifiseres det?** Tester i `test/` for utregningen (neste forekomst, periode, markering, skuddår). Demodata får frister på et par givere; brukeren ser årshjulet på `localhost:8430/?demo` før push til test (B-10). Regelendringen prøves på test med en vanlig bruker.
7. **Sikkerhetskopien (B-24, B-25).** Ingen ny samling og ikke noe nytt lagringssted – kopiskript og restore-test er uendret. Ingenting automatisk skriver til prod.

**Konklusjon:** `neste`.

## Notater

- 2026-10-05: Bygget på dev. Sett i `?demo` (som administrator): rutenettet, grå forrige måned, markering, søknadslinjer, giverpanelet fra en frist, «+ Frist», årlig 29.02 → 28. februar 2027, engang utenfor vinduet, «+ Søknad til denne fristen» (ga «Ordinær tildeling 2027» med frist 15.03.2027), fristkolonne i giverlisten. `node --test test/`: 74 av 74. Ikke sett: vanlig bruker mot testdatabasen (krever at reglene limes inn), revisor og mobil. Reglene er IKKE limt inn i Console ennå.
- 2026-10-05: Grillingen av kort 0010 (Q7) endret søknadslinjene her: årshjulet viser søknadens neste frist i stedet for søknadsfristen. Q5 i grillingen over er dermed justert. 0010 bygges først.
Løpende. Lenke til commits, skjermbilder, avklaringer.
