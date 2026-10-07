---
id: 0017
tittel: Låse et innkjøp mot utilsiktede endringer
status: testes
opprettet: 2026-10-07
---

# 0017 · Låse et innkjøp mot utilsiktede endringer

## Brukerhistorie

Som **bruker** ønsker jeg at bestillingene jeg lager lagres i portalen og låser
varelinjene de inneholder, slik at ingen ved et uhell endrer antall, pris eller
valgt leverandør på en bestilt vare – samtidig som jeg fortsatt kan legge inn
nye linjer, hente priser og sende nye bestillinger til samme leverandør i
samme innkjøp, og finne igjen det som faktisk ble sendt.

## Kontekst

I dag er alt i et innkjøp redigerbart hele tiden: antall i matrisen, priser
(dobbeltklikk, innliming, «Les priser fra tilbudet»), valgt leverandør (klikk
på en celle, «Velg alt fra …», «Billigst per linje»), deling og fjerning av
linjer, og fjerning av leverandører. Innkjøpets status (Innhenter tilbud →
Valgt → Fakturert) er bare en merkelapp og låser ingenting. Bestillings-PDF-en
lastes ned og sendes av brukeren (B-19), og portalen husker ikke at den ble
laget. Det som ble bestilt finnes bare i avsenderens e-post.

Måten vi jobber på gjør at **innkjøpet som helhet ikke kan låses**: vi sender
ofte bestillinger før hele listen er ferdig, og kan sende to bestillinger til
samme leverandør på ulike tidspunkt. Men når en varelinje først er bestilt,
bestilles den (nesten) aldri igjen – trengs det flere, legges det inn som et
nytt behov. **Enheten som skal låses er derfor varelinjen, ikke innkjøpet og
ikke leverandøren.**

**Modellen (B-32):** «Last ned bestilling (PDF)» lager PDF-en av de valgte,
ubestilte linjene hos leverandøren, lagrer den som en bestilling på innkjøpet
og laster den ned:

    innkjop.<id>.bestillinger.<bid> = { sid, tid, av: { epost, navn }, navn, sti, linjer: { lid: true } }

Filen ligger i `innkjop/<id>/bestillinger/…` i Storage, i samme mappe som
tilbudsvedleggene. **En linje er bestilt når den står i en lagret
bestilling** (`bestilteLinjer(innkjop)` i `beregning.js`) – ingenting lagres
på linjen (B-15). Leverandøren er `valgt[lid]`, som låses sammen med linjen.
Feiler lagringen, blir ingenting bestilt og PDF-en lastes ikke ned.

En bestilt linje er låst for det som sto i bestillingen: antall, valgt
leverandør, prisen hos den valgte leverandøren (råtekst og alternativt
produkt), tittel på en fri linje, deling og fjerning. Alt som skriver priser
eller valg i flere celler samtidig («Les priser», innliming, «Velg alt fra»,
«Billigst per linje») hopper over bestilte linjer. Egne midler, type, vedlegg
og priser hos *andre* leverandører er ikke en del av bestillingen og forblir
åpne. Søknadslinjen bak en bestilt innkjøpslinje kan ikke fjernes fra søknaden
(som linjer med utgift i dag). «Fjern fra innkjøpet», «Slett innkjøp» og
«Slett søknad» er borte så lenge det finnes bestillinger.

`bestilling()` (det som havner i PDF-en) tar bare med linjer som er valgt hos
leverandøren og ikke er bestilt, så bestilling nummer to til samme leverandør
inneholder bare de nye linjene. **Frakt står bare på den første bestillingen**
til leverandøren (B-12: ett beløp, regnet én gang). En eventuell ny frakt på
senere bestillinger er ikke budsjettert og blir synlig som avvik når fakturaen
kommer.

Bestillingene listes i leverandørpanelet («Bestilling dd.mm.åååå · N linjer ·
av Kari») med «Åpne» (den lagrede PDF-en, nøyaktig som sendt) og «Slett».
**Opplåsing** skjer på to måter, begge for alle brukere og med `confirm()`:
slett bestillingen (alle linjene åpnes, filen slettes) eller åpne én linje fra
`•••`-panelet på den valgte prisen (linjen tas ut av bestillingens linjeliste,
PDF-en består som dokumentasjon). Ingen historikk over opplåsinger.

Låsen er en skjermsperre som hengelåsen på søknaden (B-16); reglene i
Firestore endres ikke. Leser kan åpne lagrede bestillinger men ikke lage nye
(B-30). Revisor ser ikke Innkjøp og heller ikke bestillingene (B-23).

Alternativer lagt bort: låse hele innkjøpet via status (må låses opp for hver
ny linje), låse per leverandør (kolliderer med to bestillinger til samme
leverandør), egen «Merk som bestilt»-knapp etter nedlastingen (glemmes den,
låses ingenting), flagg `bestilt` på linjen (overflødig når bestillingen
lagres), «Last ned igjen» som lager en ny PDF med dagens dato (den lagrede
filen er den ekte kopien).

## Akseptansekriterier

- [ ] Gitt et innkjøp der tre linjer er valgt hos leverandør A og ingen er
      bestilt, når jeg trykker «Last ned bestilling (PDF)», så lastes PDF-en
      ned med de tre linjene og frakten, og det ligger en bestilling på
      innkjøpet med leverandør, tidspunkt, hvem, fil og de tre linje-ID-ene.
      Leverandørpanelet viser den under «Bestillinger» med «Åpne» og «Slett»,
      og «Åpne» viser den lagrede filen.
- [ ] Gitt at lagringen av filen feiler (`demoFeil = true`), når jeg trykker
      «Last ned bestilling (PDF)», så vises feilen i toppmenyen, ingen
      bestilling opprettes og ingen linje låses.
- [ ] Gitt en bestilt linje, når jeg ser den i matrisen, så har den en
      hengelås og «bestilt dd.mm.åååå» under varenavnet, antallsfeltet er
      skrivebeskyttet, dobbeltklikk på prisen hos den valgte leverandøren
      åpner ikke redigering, klikk på en annen leverandørs celle endrer ikke
      valget, og del-/fjern-knappene på linjen er borte. Forklaringen
      «Bestilt – åpne linjen fra ••• for å endre» vises som tittel.
- [ ] Gitt et innkjøp med bestilte og ubestilte linjer, når jeg bruker «Velg
      alt fra …», «Billigst per linje», limer inn priser eller «Les priser fra
      tilbudet» (også rader koblet til bestilte linjer), så endres bare de
      ubestilte linjene; de bestilte står urørt i `priser` og `valgt`.
- [ ] Gitt en bestilt linje, når jeg åpner `•••` på den valgte prisen, så er
      prisfeltene og «Alternativt produkt» skrivebeskyttet, mens «Egne midler»
      kan endres.
- [ ] Gitt at to linjer er bestilt hos A og én ny linje senere velges hos A,
      når jeg laster ned bestillingen til A igjen, så inneholder PDF-en bare den
      nye linjen og ingen fraktlinje, det blir to bestillinger på innkjøpet, og
      leverandørpanelet viser «2 bestilt · 1 ikke bestilt» før nedlastingen og
      «3 bestilt» etter.
- [ ] Gitt at alle valgte linjer hos A er bestilt, når jeg ser leverandørpanelet,
      så er knappen «Last ned bestilling (PDF)» erstattet av teksten «Alle N
      linjer hos A er bestilt».
- [ ] Gitt en søknadslinje hvis innkjøpslinje er bestilt, når jeg ser den i
      Søknad-fanen, så er fjern-knappen borte med forklaring, slik som for
      linjer med utgift.
- [ ] Gitt et innkjøp med minst én bestilling, når jeg åpner leverandørpanelet
      for leverandøren, innkjøpspanelet og søknadspanelet, så er «Fjern fra
      innkjøpet», «Slett innkjøp» og «Slett søknad» erstattet av teksten «Har
      bestillinger – slett dem først». Innkjøp uten bestillinger kan slettes
      som før.
- [ ] Gitt en bestilling med tre linjer, når jeg trykker «Slett» på den og
      bekrefter («Slette bestillingen til A fra dd.mm? Linjene blir åpne for
      endring igjen.»), så fjernes bestillingen og filen, og de tre linjene er
      åpne.
- [ ] Gitt en bestilt linje, når jeg trykker «Åpne linjen for endring» i
      `•••`-panelet og bekrefter («Linjen står i bestillingen til A fra dd.mm.
      Åpne den for endring?»), så tas linjen ut av bestillingens linjeliste,
      bestillingen og PDF-en består, og linjen kan endres. Lastes bestillingen
      ned på nytt, er linjen med i den nye.
- [ ] Gitt `?demo`, når jeg åpner demoinnkjøpet, så finnes én lagret bestilling
      med to bestilte linjer og én ubestilt linje hos samme leverandør, så
      kriteriene over kan ses uten innlogging.
- [ ] Gitt `?demo=leser`, når jeg åpner leverandørpanelet, så kan jeg åpne den
      lagrede bestillingen, men «Last ned bestilling (PDF)», «Slett» og «Åpne
      linjen for endring» finnes ikke.
- [ ] Gitt `?demo=revisor`, når jeg ser søknaden, så vises ingen bestillinger
      noe sted.
- [ ] Gitt testene i `test/beregning.test.js`, når `node --test test/` kjøres,
      så finnes tester for `bestilteLinjer()`, for at `bestilling()` utelater
      bestilte linjer, for at frakt bare tas med når leverandøren ikke har en
      bestilling fra før, og for hvilke felt som er låst på en bestilt linje.
- [ ] Gitt endringen, når CLAUDE.md leses, så står B-32-modellen der
      (bestillinger, låsen, opplåsing, roller) i konvensjonslisten.

## Avgrensning

- Innkjøpet som helhet og leverandøren låses ikke – bare linjer, utledet av
  bestillingene.
- Ingen egen frakt per bestilling (B-12); ingen bestillingsnummer eller
  «Bestilling 2 av …» i PDF-en.
- Ingen historikk over opplåsinger og ingen egen administratorrett.
- Ingen ny behovsstatus («Bestilt») i behovslisten og ingen endring i
  `pott()`, Revisjon, rapporten eller revisjonsavtrykket.
- Innkjøpets status (Innhenter tilbud / Valgt / Fakturert) settes ikke
  automatisk av en bestilling.
- Bestillingene vises ikke for revisor og ikke blant søknadens dokumenter.
- Reglene i `firebase/firestore.rules` endres ikke; låsen er en skjermsperre.
- Mobilskjermen er ikke berørt.

## Grilling

Grillet 2026-10-07 med `/grill-me`, ett spørsmål om gangen. Underveis endret kortet seg
fra et lagret flagg per linje til lagrede bestillinger som låsen utledes av.

**1. Kollisjon med beslutningsloggen.** Berører B-02 (uttalt behov: brukeren ba om låsen),
B-11 (bestillingene ligger som kart på innkjøpsdokumentet), B-12 (frakt er fortsatt ett
beløp per leverandør, regnet én gang – derfor står den bare på den første bestillingen),
B-15 (låsen utledes av bestillingene, ingenting lagres på linjen), B-16 (samme mønster som
hengelåsen på søknaden: skjermsperre, ingen regelendring), B-19 (portalen sender fortsatt
ikke; nedlastingen er handlingen), B-20 (PDF-en lages i nettleseren; at den lagres er ikke
en endring av en original), B-23 (revisor ser ikke bestillingene), B-24 (filene ligger i
innkjøpets mappe i Storage, innenfor det kopien alt tar), B-30 (leser kan åpne lagrede
bestillinger, ikke lage nye). Ingen brudd. Ny beslutning: B-32.

**2. Datamodell.** Første utkast hadde `linjer.<lid>.bestilt = { tid, av }`. Grillingen
(Q6) viste at brukeren vil ha bestillingene lagret i portalen, og da kan låsen utledes:
`innkjop.<id>.bestillinger.<bid> = { sid, tid, av, navn, sti, linjer: { lid: true } }`, og
en linje er bestilt når den står i en bestilling (`bestilteLinjer(innkjop)`). Antall og
pris lagres ikke i bestillingen – linjen er låst, så verdiene står på linjen, og PDF-en
er dokumentasjonen på det som ble sendt. Leverandøren er `valgt[lid]`, låst sammen med
linjen. Åpnes én linje, tas `lid` ut av bestillingens `linjer`; PDF-en består.

**3. Migrering og data i drift.** Ingen eksisterende innkjøp har `bestillinger`, og
manglende kart = ingen bestilte linjer. Ingen migrering, og endringen tåler å kjøres flere
ganger. Firestore-reglene endres ikke (låsen er en skjermsperre som på søknaden; reglene
gir alt brukere skriverett til innkjøp). Sletting av en bestilling sletter filen, som for
vedlegg.

**4. Låser vi oss?** Bestillingen som egen post kan senere bære mer (mottatt, levert) uten
ny modell. Låsen er utledet, så den kan endres i én funksjon. Det vi velger bort nå:
egen frakt per bestilling (B-12), historikk over opplåsinger og revisorinnsyn – alle kan
legges til senere uten å endre det som lagres.

**5. Er det nødvendig?** Brukeren ber om det: endringer etter bestilling har skjedd ved
uhell. Enklere varianter ble vurdert og lagt bort: låse hele innkjøpet via status (må
låses opp for hver ny linje, så låsen står åpen når den trengs) og låse per leverandør
(kolliderer med to bestillinger til samme leverandør). Egen «Merk som bestilt»-knapp
(alternativ B) ble lagt bort fordi en glemt knapp gir ingen lås.

**6. Hvordan verifiseres det?** Demodataene får én lagret bestilling (to bestilte linjer,
én ubestilt) så alt kan ses på dev med `?demo`, `?demo=leser` og `?demo=revisor`. Tester
i `test/beregning.test.js`: `bestilteLinjer()`, `bestilling()` utelater bestilte linjer,
frakt bare uten tidligere bestilling hos leverandøren, og hvilke felt som er låst.
Brukeren bekrefter kriteriene på dev (B-10). Ingen ny testinfrastruktur.

**7. Sikkerhetskopien.** PDF-ene lagres under `innkjop/<id>/bestillinger/…`, samme prefiks
som vedleggene, så kopiskriptet og restore-testen tar dem med uten endring. Ingen ny
samling, ingen automatikk som skriver til prod. Dokumenter lagrer `sti` slik
`lager.lastOpp()` gir den (med miljøprefiks), som B-24 krever.

**Avgjørelser i grillingen:** Q1 frakt bare på første bestilling til leverandøren · Q2
søknadslinjen kan ikke fjernes når innkjøpslinjen er bestilt · Q3 «Fjern fra innkjøpet» og
«Slett innkjøp» sperret med bestillinger · Q4/Q8 leser kan åpne lagrede bestillinger, ikke
lage nye · Q5 alle brukere kan åpne, ingen historikk · Q6 bestillingen lagres i portalen og
kan åpnes igjen · Q7 opplåsing både ved å slette bestillingen og per linje fra `•••` · Q9
revisor ser ikke bestillingene · Q10 demodata + tester · Q11 «Slett søknad» sperret med
bestillinger.

**Konklusjon:** neste.

## Notater

- Lagt inn 2026-10-07 fra chatten: «Jeg ønsker en mulighet til å kunne låse et
  innkjøp, slik at man ikke utilsiktet gjør en endring. […] vi ofte lager
  bestillinger før hele listen er utfylt. Det betyr at vi kan sende to
  bestillinger til samme leverandør, men på ulikt tidspunkt. Men når en
  varelinje er bestilt, blir det (nesten) aldri flere bestillinger av det. Da
  må det i så fall legges inn som et nytt behov.»
- Berørte steder: `bestilling()` og `INNKJOPSSTATUSER` i `app/data/beregning.js`,
  `settValgt()` / `settPriser()` / `settTilbudspriser()` / `fjernLeverandor()` i
  `app/data/index.js`, matrisen, `leverandorPanel()`, `bestillingsfelt()` og
  `tilbudPanel()` i `app/sider/innkjop.js`. Hengelåsmønsteret fra
  `sider/soknad.js` (`skrivevern(last)`) kan gjenbrukes per linje.
- Alternativer vurdert og lagt bort i utkastet: låse hele innkjøpet via status
  (må låses opp for hver ny linje, så låsen blir stående åpen), og låse per
  leverandør (kolliderer med to bestillinger til samme leverandør).
- 2026-10-07: brukeren valgte at nedlastingen merker linjene (alternativ A).
- 2026-10-07: grillet (11 spørsmål). Modellen endret fra flagg på linjen til
  lagrede bestillinger (B-32); se Grilling for avgjørelsene.
