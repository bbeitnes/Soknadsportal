---
id: 0018
tittel: Skrivestøtte for søknadstekster
status: idé
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

- [ ] Gitt Innstillinger → Organisasjon, når jeg åpner siden, så finnes et avsnitt
      «Om korpset» med tekstfelt (f.eks. kort om korpset, medlemmer og
      aldersgrupper, aktiviteter, formål/hvorfor det er viktig) som lagres ved
      blur som andre felt i Innstillinger (`lager.flett()`).
- [ ] Gitt giverpanelet, når jeg åpner en giver, så kan jeg legge inn giverens
      søknadsskjema: feltene i den rekkefølgen giveren spør, hvert med navn,
      maks antall ord (valgfritt) og hjelpetekst (giverens eget spørsmål eller hva
      de legger vekt på), og slette felt igjen.
- [ ] Gitt en søknad til en giver med skjema, når jeg åpner en ny fane «Tekst» i
      søknaden, så vises ett tekstområde per felt i giverens skjema, med feltets
      navn, hjelpetekst og «N av maks M ord» som oppdateres mens jeg skriver, og
      teksten lagres per felt ved blur.
- [ ] Gitt at giveren ikke har skjema, når jeg åpner Tekst-fanen, så vises ett
      fritt tekstområde «Søknadstekst» med ordteller uten maks, og en lenke til
      giveren for å legge inn skjema.
- [ ] Gitt Tekst-fanen, når jeg trykker «Kopier underlag», så legges det en
      tekst på utklippstavlen som inneholder: Om korpset, giverens navn og
      skjema med ordgrenser, behovene vi søker om (gruppert per type, med antall
      og estimat), søkt beløp, egenandel og eventuelt det som allerede står i
      feltene – formulert som et oppdrag til en språkmodell om å skrive utkast
      per felt innenfor ordgrensene. Teksten kan limes rett inn i Claude eller
      ChatGPT.
- [ ] Gitt at søknaden er låst (status ≠ utkast), når jeg åpner Tekst-fanen, så
      er feltene fortsatt redigerbare (teksten er ikke en del av det vi søkte om
      i tall-forstand; se Avgrensning).
- [ ] Gitt leser-rollen, når jeg åpner Tekst-fanen, så er feltene skrivebeskyttet
      og «Kopier underlag» virker. Gitt revisor, så finnes ikke fanen.
- [ ] Gitt `?demo`, når jeg åpner en søknad, så har minst én giver et skjema og
      én søknad tekst i feltene.

Trinn 2 – språkmodell i portalen (eget kort når trinn 1 er prøvd, se Notater):

- [ ] _Avgjøres etter at trinn 1 er brukt på en ekte søknad._

## Avgrensning

- Portalen sender ikke søknaden (B-19). Teksten kopieres inn i giverens skjema
  av brukeren.
- Ingen formatering i tekstfeltene (ren tekst). Ingen vedleggsgenerering, ingen
  PDF av søknadsteksten i dette kortet.
- Trinn 1 kaller ingen språkmodell. Brukeren limer underlaget inn i et verktøy
  hen allerede har. Trinn 2 (API) vurderes etterpå.
- Tidligere søknader (opplastede dokumenter) tas ikke med i underlaget i trinn 1.
- Teksten inngår ikke i revisjonsavtrykket, rapporten eller hengelåsen.
- Ingen maler på tvers av organisasjoner, ingen deling av giverskjema mellom korps.

## Grilling

_Fylles av `planlegging.mjs svar 0018` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

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
