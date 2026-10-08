---
id: 0018
tittel: Skrivestøtte for søknadstekster
status: neste
opprettet: 2026-10-08
---

# 0018 · Skrivestøtte for søknadstekster

## Brukerhistorie

Som **bruker** som skal skrive en søknad til en stiftelse, ønsker jeg at portalen
gir meg et utkast til søknadsteksten – bygget på det portalen allerede vet om
korpset, behovene og giverens krav (felter, maks antall ord, hva de legger vekt
på) – slik at jeg bruker tiden på å rette og spisse teksten, ikke på å samle fakta
og begynne på blankt ark hver gang.

## Kontekst

Søknadsteksten skrives i dag utenfor portalen og lastes opp som dokument (B-21).
Portalen vet likevel mesteparten av det som skal inn i en søknad: hvilke behov vi
søker om, antall og estimat, søkt beløp, egenandel, giver og frist – og hva som
ble søkt om og innvilget tidligere.

Det som gjør søknadsskriving tungt er tre ting som hver for seg er løsbare:

1. **Standardinfo om korpset** (hvem vi er, medlemmer, aktiviteter, formål,
   økonomi) finnes bare i hodet på den som skrev forrige søknad, eller i gamle
   dokumenter.
2. **Hver giver har sitt skjema**: egne felter, egne spørsmål, maks antall ord
   eller tegn per felt, og egne ting de legger vekt på. Vi må lese kravene på nytt
   hver gang, og teksten må tilpasses.
3. **Selve skrivingen**: å få fakta og tall til å bli en god, konkret tekst
   innenfor ordgrensen. Her er en språkmodell god – men bare når den får riktig
   underlag.

Dette kortet er et forsøk som kan mislykkes. Det bygges på branchen
`skrivestotte` så alt kan forkastes. Gjennomgangen av løsningsalternativene står
under Notater.

## Akseptansekriterier

Trinn 1 – underlaget (ingen språkmodell i portalen):

- [ ] Gitt Innstillinger → Organisasjon, når jeg åpner siden, så finnes avsnittet
      «Om korpset» med de faste feltene Kort om korpset · Medlemmer og alder ·
      Aktiviteter i året · Formål og hvorfor det er viktig · Økonomi, som lagres
      ved blur som de andre feltene der (`lager.flett()`).
- [ ] Gitt giverpanelet, når jeg åpner en giver, så kan jeg legge inn giverens
      søknadsskjema: tekstfelt i giverens rekkefølge, hvert med navn, hjelpetekst
      (giverens spørsmål eller hva de legger vekt på) og valgfri grense som ett
      tall pluss valget ord/tegn (standard ord), og fjerne felt igjen. Alle
      brukere kan endre skjemaet.
- [ ] Gitt en søknad til en giver med skjema, når jeg åpner fanen «Tekst»
      (nummer to: Søknad · Tekst · Innkjøp · Utgifter · Revisjon), så vises ett
      tekstområde per felt med feltets navn og hjelpetekst, og under hvert felt
      «N av maks M ord» / «… tegn» (uten maks: bare «N ord») som oppdateres
      mens jeg skriver. Teksten lagres per felt ved blur
      (`soknader.<id>.tekster.<fid>`).
- [ ] Gitt Tekst-fanen, så står det øverst «N av M felt utfylt · K over
      grensen» (siste del bare når K > 0).
- [ ] Gitt at giveren ikke har skjema, når jeg åpner Tekst-fanen, så vises ett
      fritt tekstområde «Søknadstekst» med teller uten maks, og en lenke til
      giveren for å legge inn skjema.
- [ ] Gitt at et felt er fjernet fra giverens skjema etter at søknaden fikk
      tekst i det, når jeg åpner Tekst-fanen, så vises teksten under
      overskriften «Felt som ikke lenger er i skjemaet». Den slettes ikke.
- [ ] Gitt Tekst-fanen, når jeg trykker «Kopier underlag», så legges en tekst på
      utklippstavlen som inneholder: Om korpset, giverens navn og skjema med
      grenser, behovene vi søker om gruppert per type med antall og estimat,
      søkt beløp, egenandel, det som allerede står i feltene, og historikken mot
      samme giver (tittel, år, søkt, innvilget, status) – formulert som et
      oppdrag til en språkmodell om å skrive utkast per felt innenfor grensene,
      klart til å limes inn i Claude eller ChatGPT. Toppmenyen viser «Kopiert».
- [ ] Gitt at søknaden er låst (status ≠ utkast), når jeg åpner Tekst-fanen, så
      er feltene skrivebeskyttet som resten av det vi søkte om (B-16), og
      «Kopier underlag» virker.
- [ ] Gitt leser-rollen, når jeg åpner Tekst-fanen, så er feltene skrivebeskyttet
      og «Kopier underlag» virker. Gitt revisor, så finnes ikke fanen.
- [ ] Gitt `?demo`, når jeg åpner en søknad, så har minst én giver et skjema og
      én søknad tekst i feltene.
- [ ] Gitt `node --test test/`, så testes ordtelling (ord og tegn), statuslinjen,
      fjernede felt og underlagsteksten i `beregning.js`.

Trinn 2 – språkmodell i portalen: eget kort etter at trinn 1 er brukt på
NMR-søknaden (se Notater).

## Avgrensning

- Portalen sender ikke søknaden (B-19). Teksten kopieres inn i giverens skjema
  av brukeren.
- Ingen formatering i tekstfeltene (ren tekst). Ingen vedleggsgenerering, ingen
  PDF av søknadsteksten i dette kortet.
- Trinn 1 kaller ingen språkmodell. Brukeren limer underlaget inn i et verktøy
  hen allerede har. Trinn 2 (API) vurderes etterpå.
- Bare tekstområder i giverskjemaet – ingen felttyper (ja/nei, tall, vedlegg).
- Ett skjema per giver. Flere ordninger hos samme giver er ikke støttet.
- Tidligere søknader (opplastede dokumenter) tas ikke med i underlaget.
- Teksten inngår ikke i revisjonsavtrykket, rapporten eller potten.
  Søknadslisten viser ingenting om teksten.
- Ingen maler på tvers av organisasjoner, ingen deling av giverskjema.

## Grilling

Grillet 2026-10-08, ett spørsmål om gangen.

**1. Kollisjon med beslutningsloggen.** Snur B-21 (teksten bare som opplastet dokument) – ført inn som B-34, og åpent spørsmål 1 er lukket. B-19 og B-20 står: ingen språkmodell i portalen i trinn 1, brukeren limer underlaget inn i Claude.ai/ChatGPT selv. Trinn 2 (API) får eget kort som må ta B-19/B-20 opp på nytt. B-16: teksten er det vi sendte og låses med resten når status ≠ utkast (ikke åpen, som kortet først sa). B-29: giverskjemaet og «Om korpset» kan alle brukere endre; reglene gir allerede skriverett til `givere` og `innstillinger`, så ingen regelendring. B-02: uttalt behov (NMR-søknaden står for tur).

**2. Datamodell.** Tre nye steder, alle som felt/kart (B-03/B-11): `innstillinger/<orgId>` får faste felt «Om korpset» (skrives med `flett()`); `givere.<id>.skjema.<fid>` = `{ navn, hjelp, maks, enhet: 'ord'|'tegn', rekkefolge }` – bare tekstområder, ingen felttyper; `soknader.<id>.tekster.<fid>` = ren tekst (`fri` uten skjema). Ingenting utledbart lagres: ordtelling, «over grensen», statuslinjen og underlaget regnes i `beregning.js`. Skjemaet ligger bare på giveren (ikke kopi på søknaden); tekst for felt som er fjernet vises under egen overskrift og slettes aldri. Historikken mot giveren i underlaget er tall som alt finnes på søknadene.

**3. Migrering og data i drift.** Bare nye, frivillige felt. Eldre givere, søknader og innstillinger leses som tomme. Kan kjøres mange ganger uten virkning. Ingen regelendring.

**4. Låser vi oss?** Lite. Flere skjemaer per giver (én per ordning) og felttyper kan legges til senere uten å flytte data. Trinn 2 trenger nøyaktig samme underlag som «Kopier underlag» lager, så ingenting i trinn 1 kastes om API kommer. Branchen `skrivestotte` kan forkastes i sin helhet.

**5. Er det nødvendig?** Alternativet er å fortsette med blankt ark og gamle dokumenter. Det enklere 80 %-alternativet ER trinn 1: struktur + kopier underlag, uten modell, nøkkel eller server. Prisen er at «Om korpset» og giverskjemaene må holdes ved like av frivillige.

**6. Hvordan verifiseres det?** `node --test` for ordtelling, statuslinje, fjernede felt og underlagsteksten. Skjermen på dev med demodata (minst én giver med skjema, én søknad med tekst). Ferdig etter B-33. Om søknadene blir bedre avgjøres etter NMR-søknaden og skrives som notat på kortet; det avgjør trinn 2 eller forkasting.

**7. Sikkerhetskopien.** Ingen ny samling, ikke noe nytt Storage-prefiks; feltene følger dokumentene. Ingen automatikk mot prod.

**Avklart underveis:** grense = ett tall + ord/tegn (standard ord); Tekst-fanen som nummer to med statuslinje «N av M felt utfylt · K over grensen» og teller under hvert felt; ingenting i søknadslisten; leser ser fanen skrivebeskyttet og kan kopiere underlag, revisor ser den ikke; underlaget tar med Om korpset, skjema med grenser, behov per type med antall/estimat, søkt beløp, egenandel, det som står i feltene, og historikk mot samme giver som tall (tittel, år, søkt, innvilget, status). Tidligere søknadstekster holdes utenfor.

**Konklusjon:** neste.

## Notater

### Gjennomgang: hvordan kan skrivestøtte løses? (2026-10-08)

**Hva problemet egentlig består av.** En god søknad er (a) riktige fakta, (b)
tilpasset giverens skjema og kriterier, (c) godt skrevet innenfor rammen.
Portalen har allerede (a) i tall; (b) må legges inn én gang per giver; (c) er det
en språkmodell kan hjelpe med – men en modell uten (a) og (b) skriver generelt og
feil. Verdien ligger derfor først og fremst i å *strukturere underlaget*, og det
kan portalen gjøre uten noen modell. Det er også det eneste som er unikt for oss:
skrivingen kan Claude/ChatGPT gjøre like godt med et godt underlag limt inn.

**Data som trengs (alt kan lagres felt for felt, B-03/B-11):**

| Hva | Hvor | Form |
|---|---|---|
| Om korpset (standardinfo) | `innstillinger/<orgId>` | Flate tekstfelt, skrives med `flett()` |
| Giverens skjema | `givere.<id>.skjema.<fid>` | `{ navn, maksOrd, hjelp, rekkefolge }` |
| Søknadsteksten | `soknader.<id>.tekster.<fid>` | Ren tekst per felt; `fid` fra giverens skjema, eller `fri` uten skjema |
| Tidligere søknader | Finnes: `soknader.<id>.dokumenter` i Storage | Tekst kan leses med pdf.js (`ui/pdftekst.js`) – senere trinn |

Ordtelling, underlag og «hva mangler» (tomme felt, felt over grensen) er rene
funksjoner i `beregning.js` med tester (B-06).

**Fire måter å få en språkmodell inn på – og hva de koster oss:**

1. **Kopier underlag → lim inn i Claude.ai/ChatGPT (trinn 1).** Ingen nøkkel,
   ingen server, ingen kostnad, ingen brudd på B-19/B-20. Brukeren får utkastet
   i sitt eget verktøy, kan be om endringer der, og limer teksten tilbake i
   feltene. Ulempe: to vinduer. Fordel: hvis dette ikke gir gode søknader, vil
   heller ikke en innebygd modell gjøre det – underlaget er det samme.
2. **Nøkkel i nettleseren (bring your own key).** Anthropic-API-et kan kalles
   rett fra nettleseren (eget tillatelsesfelt i forespørselen); nøkkelen limes
   inn av brukeren og ligger bare i nettleserens localStorage, aldri i Firestore
   eller git (B-08). Enkelt å bygge, men hver bruker trenger egen nøkkel, og en
   nøkkel på en delt PC er en risiko. Egner seg som eksperiment, ikke som drift.
3. **Liten mellomtjener på ProISP (PHP).** Nøkkelen ligger i en fil utenfor
   webrota, skrevet av deploy-jobben fra en GitHub-secret som i dag
   (`FIREBASE_API_KEY`). Skriptet sjekker brukerens Firebase-innlogging
   (ID-token) og videresender til Anthropic. Robust og felles for alle brukere,
   men det er den første serverkoden i prosjektet (bryter B-20) og den første
   eksterne tjenesten (bryter B-19). Begge brudd må føres som ny beslutning.
4. **Firebase AI Logic (Gemini fra klienten, sperret med App Check).** Ingen egen
   server og ingen nøkkel å passe på, alt i Firebase-prosjektet vi har. Men det
   er Googles modell, ikke Claude, og det binder oss til Firebase enda tettere.

Kostnad for 2–4 er liten uansett: et søknadsutkast er grovt 5 000 tegn inn og
2 000 ut, altså godt under én krone per utkast med dagens priser. Pris er ikke
argumentet; nøkkelhåndtering og serverdel er.

**Hva modellen skal gjøre (når den kommer inn, trinn 2):** ikke bare «skriv»,
men tre oppdrag: *utkast* per felt innenfor ordgrensen, *vurdering* av det som
står (mangler, for langt, svarer ikke på giverens spørsmål), og *forkorting* til
grensen. Vurderingen er ofte mer verdt enn utkastet. Alle tre trenger det samme
underlaget som trinn 1 lager.

**Anbefaling.** Bygg trinn 1 nå og bruk det på en ekte søknad. Det gir hele
datamodellen, Tekst-fanen og underlaget – som trinn 2 trenger uansett – og
svarer på det viktigste spørsmålet (blir søknadene bedre?) uten nøkkel, server
eller nye beslutninger. Faller det godt ut, lages et eget kort for trinn 2 der
valget står mellom 3 (PHP på ProISP) og 4 (Firebase AI Logic); 2 kan brukes som
rask prøve underveis uten å committes.

**Beslutninger som berøres:** B-21 (søknadsteksten bare som opplastet
dokument) og åpent spørsmål 1 snus av trinn 1 – teksten skrives i portalen.
B-19 og B-20 berøres først av trinn 2. B-02: kortet peker på et uttalt behov,
men «Om korpset»-feltene og giverskjemaet er nye data som må holdes i orden av
frivillige – det er prisen.
