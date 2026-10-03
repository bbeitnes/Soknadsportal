---
id: 0001
tittel: Revisjonsrapport: det fakturaen gjelder listes linje for linje under posten
status: testes
opprettet: 2026-10-03
---

# 0001 · Revisjonsrapport: det fakturaen gjelder listes linje for linje under posten

## Brukerhistorie

Som **den som leser revisjonsrapporten (giver, revisor eller kasserer)** ønsker jeg
at det en faktura gjelder står linje for linje under fakturaen, slik at jeg kan
finne og telle det vi har kjøpt uten å lete i et avsnitt med løpende tekst.

## Kontekst

Brukeren ba om dette 2026-10-03, med et skjermbilde av «Oversikt over fakturaer»
i PDF-rapporten. Rapporten oppleves som oversiktlig og fin fram til denne
tabellen.

I dag er «Gjelder» den siste, smale kolonnen (135 pt). Alle postene fakturaen
dekker slås sammen til én kommaseparert tekst (`app/ui/rapport.js`, rundt linje
154: `fakturaDekker(f) … .map(posttittel).join(', ')`) og brytes i den kolonnen.
En faktura fra Egge Musikk med 37 varer blir et avsnitt på over 30 linjer der
antall og varenavn brytes midt i («4` / `× Kornett»), mens resten av raden står
tom. Merknaden står under samme tekst.

Forslaget fra brukeren: la det fakturaen gjelder stå «på en linje under resten,
innenfor hver post» – altså under fakturaraden i stedet for i en kolonne ved
siden av.

## Akseptansekriterier

Gjelder «Oversikt over fakturaer» i PDF-rapporten.

**Oppsett**
- [ ] Gitt en faktura som dekker flere poster, når rapporten lages, så står
      fakturaraden (nr, fakturanr, dato, leverandør, beløp) på én linje uten
      «Gjelder»-kolonne, og postene står under den i én kolonne, én
      innkjøpslinje per linje, før skillelinjen til neste faktura.
- [ ] Gitt en post fra et innkjøp, når rapporten lages, så viser linjen antall
      og varenavn («3 × Bøylefett»), netto stykkpris og tilbudt totalpris,
      begge høyrestilt med to desimaler under overskriftene «Stykkpris» og
      «Tilbudt».
- [ ] Gitt en post som er en løs utgift, når rapporten lages, så viser linjen
      beskrivelsen og bare totalen (ingen stykkpris).
- [ ] Gitt en post med alternativ («4 × Kornett (alternativ: Yamaha
      YCR-2330SIII Bb-kornett)»), når rapporten lages, så står antall og
      varenavn på samme linje, og teksten brytes bare hvis den er bredere enn
      plassen fram til priskolonnene.
- [ ] Gitt to innkjøpslinjer med samme varenavn («1 × Horn» to ganger), når
      rapporten lages, så står de som to linjer.
- [ ] Gitt en faktura der postene ikke summerer til fakturabeløpet, når
      rapporten lages, så vises ingen sumlinje og ikke noe avvik under postene.
- [ ] Gitt en faktura som ikke er koblet til noe, når rapporten lages, så står
      det «Ikke koblet» der postene ellers står.
- [ ] Gitt en faktura med merknad, når rapporten lages, så står merknaden i
      grått under postene, i samme blokk.
- [ ] Gitt en faktura med flere poster enn det er plass til på siden, når
      rapporten lages, så fortsetter postene på neste side under gjentatte
      kolonneoverskrifter, og ingen tekst går utenfor margen eller oppå annen
      tekst.

**Rekkefølge**
- [ ] Gitt en faktura med poster av mer enn én type, når rapporten lages, så
      står postene gruppert per type med typenavnet som mellomtittel, i samme
      typerekkefølge som tabellen per kategori på forsiden (søknadens
      `typeRekkefolge`), med «Uten type» og «Løse utgifter» nederst.
- [ ] Gitt en faktura der alle postene har samme type, når rapporten lages, så
      står postene rett under fakturaraden uten mellomtittel.
- [ ] Gitt poster av typen «Instrument» eller «Instrumenter», når rapporten
      lages, så står de i denne rekkefølgen: piccolo/fløyte, obo, fagott,
      klarinett, saksofon (også skrevet «sax»), kornett/trompet/flygelhorn,
      horn, trombone, baryton/eufonium, tuba, slagverk (skarptromme,
      stortromme, pauker, cymbaler, klokkespill, xylofon, marimba).
- [ ] Gitt en instrumentpost med flere instrumenter i navnet
      («Altsax/Kornett/Horn»), når rapporten lages, så plasseres den etter det
      første instrumentet i navnet (her saksofon).
- [ ] Gitt en instrumentpost der varenavnet ikke gjenkjennes («Flexatone»), når
      rapporten lages, så står den nederst i instrumentgruppen.
- [ ] Gitt flere poster med samme instrument, eller poster av en annen type enn
      instrument, når rapporten lages, så står de alfabetisk etter varenavn.

**Uendret**
- [ ] Gitt samme søknad før og etter endringen, når rapporten lages, så er
      fakturabeløpene, «Sum fakturert», rekkefølgen på fakturaene, forsiden og
      bilagssidene uendret.
- [ ] Gitt testene, når `node --test test/` kjøres, så går de gjennom, med nye
      tester for sortering og gruppering av postene.

## Avgrensning

- Bare «Oversikt over fakturaer» i PDF-rapporten. Forsiden, bilagssidene,
  listen «Egeninnsats uten faktura», Revisjon-fanen og matrisen endres ikke.
- Ingen nye lagrede data: stykkpris og antall utledes fra innkjøpet.
- Ingen sumlinje eller avvik per faktura, ingen listepris/rabatt, ingen
  sammenslåing av like linjer, ikke to kolonner.
- Instrumentlisten ligger fast i koden og kan ikke redigeres i Innstillinger.
  Den utvides ikke med småslagverk; det som ikke gjenkjennes, står nederst.
- Partiturrekkefølgen brukes bare i rapporten.

## Grilling

Grillet med brukeren 2026-10-03 (ni spørsmål, ett om gangen).

**1. Kollisjon med beslutningsloggen.** Ingen brudd.
- B-02: omfanget er holdt nede – ingen sumlinje, ingen avviksutregning, ingen sammenslåing av like linjer, ingen redigerbar instrumentliste.
- B-06: sortering og gruppering legges som rene funksjoner i `beregning.js` med test; `rapport.js` tegner bare.
- B-14: stykkpris og tilbudt vises med `kr()`, to desimaler.
- B-15: ingenting nytt lagres (se punkt 2).
- B-20: rapporten beholder de tre delene sine og lages fortsatt i nettleseren; bare oppsettet av oversiktstabellen endres.
- B-16: tillegg etter søknaden merkes fortsatt ikke i PDF-en.

**2. Datamodell.** Ingen nye felt. Postene får antall og netto stykkpris utledet fra innkjøpet (i dag har de bare tittelen «3 × Bøylefett» og `tilbudt`). Typen finnes som `kategori` på posten. Partiturrekkefølgen er en fast liste i koden, ikke data.

**3. Migrering og data i drift.** Ingen. Rapporten lages på nytt hver gang av det som ligger der; ingen regler endres, så ingenting skal limes inn i Console.

**4. Låser vi oss?** Lite. Instrumentlisten ligger i koden og kjenner instrumentgruppen på typenavnet «Instrument»/«Instrumenter»; får et annet korps (annen organisasjon) andre typenavn eller en annen besetning, må listen flyttes til Innstillinger. Det er bevisst utsatt. Rekkefølgen brukes bare i rapporten, så skjermbildene er ikke bundet av den.

**5. Er det nødvendig?** Ja. En faktura med 37 varer blir i dag et avsnitt på over 30 linjer i en 135 pt bred kolonne, og det er den ene delen av rapporten som ikke er lesbar. Det enkleste alternativet – bare linjeskift i stedet for komma i samme kolonne – ble vurdert som for smalt: lange varenavn ville fortsatt brytes, og det er ikke plass til priser.

**6. Hvordan verifiseres det?** Sortering (partiturrekkefølge, første instrument i sammensatt navn, ukjente nederst, alfabetisk ellers) og gruppering testes med `node --test` på oppdiktede data. Oppsettet bekrefter brukeren på dev ved å lage rapporten for søknaden med Egge Musikk-fakturaen (testdatabasen) og sammenligne med skjermbildet fra 2026-10-03. Ingen ny testinfrastruktur.

**Det grillingen avklarte**
- Postene summerer ikke nødvendigvis til fakturabeløpet (frakt er ikke en post; prisendring, delfaktura, kreditnota). Valgt: ingen sumlinje og ingen avvik i oversikten. Kolonnene heter «Stykkpris» og «Tilbudt», og avvik forklares med merknaden. Begrunnelse: en post som er delt på flere fakturaer står under hver av dem med full tilbudt pris, så en sum ville vært misvisende.
- Stykkpris er netto etter rabatt; listepris og rabatt vises ikke.
- Typerekkefølgen ble endret fra «instrumenter øverst, resten alfabetisk» til søknadens manuelle `typeRekkefolge`, som forsiden bruker – én regel i hele rapporten.
- Poster uten type: «Uten type» og «Løse utgifter» som egne grupper nederst, som på forsiden.
- Mellomtittel bare når fakturaen har poster av mer enn én type.
- Partiturrekkefølgen: piccolo/fløyte, obo, fagott, klarinett, saksofon (også «sax»), kornett/trompet/flygelhorn, horn, trombone, baryton/eufonium, tuba, slagverk, ikke gjenkjent. Kornett/trompet før horn (kortet sa først omvendt). Første instrument i varenavnet avgjør; like instrumenter alfabetisk; listen utvides ikke med småslagverk.
- Like varenavn slås ikke sammen: én linje per innkjøpslinje.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-03: Bygget. `partiturplass()`, `kategorigrupper()` og `grupperFakturaposter()` i
  `app/data/beregning.js` (postene har fått `navn`, `antall`, `stykkpris`), `fakturaposterFor()` i
  `app/sider/revisjon.js`, nytt tabelloppsett i `app/ui/rapport.js`. Tre nye tester; `node --test test/`
  gir 44 av 44.
- Sett på dev i `?demo` med en oppdiktet faktura på 55 poster (instrumenter, utstyr, uten type, løse
  utgifter, alternativ, langt varenavn, merknad): gruppering, partiturrekkefølge, sideskift med
  «forts.» og «Ikke koblet» tegnes riktig.
- Gjenstår: brukeren bekrefter på dev med Egge Musikk-fakturaen fra testdatabasen. Ikke committet.
- Ved sideskift midt i en faktura gjentas løpenummeret med «forts.» under kolonneoverskriftene.
