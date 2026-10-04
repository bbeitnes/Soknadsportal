---
id: 0004
tittel: Sikkerhetskopi og gjenoppretting av dataene i portalen
status: ferdig
opprettet: 2026-10-03
---

# 0004 · Sikkerhetskopi og gjenoppretting av dataene i portalen

## Brukerhistorie

Som **administrator** ønsker jeg at dataene i portalen sikkerhetskopieres jevnlig, og at en kopi
kan legges tilbake, slik at vi ikke mister søknader, innkjøp, fakturaer og bilag hvis noe slettes,
ødelegges eller Firebase-prosjektet går tapt.

## Kontekst

Vi har ikke råd til å miste dataene. Koden ligger i GitHub, men dataene finnes i dag bare ett sted:

- Firestore-databasen `soknadsportal` (prod): `brukere`, `givere`, `behov`, `soknader`, `innkjop`,
  `fakturaer`, `leverandorer`, `innstillinger`.
- Storage-bøtta under `soknadsportal/prod/`: fakturaer, kvitteringer, tilbud og andre dokumenter.
  Firestore-dokumentene peker på filene, så en kopi uten filene er ikke en hel kopi.

Det finnes ingen sikkerhetskopi i dag. Det som kan gå galt: en bruker sletter eller overskriver
noe (felt lagres ved blur, siste lagring vinner – B-03), en feil i koden skriver feil i mange
dokumenter, reglene limes inn feil, eller vi mister tilgangen til Firebase-prosjektet/Google-kontoen.

En kopi vi aldri har prøvd å legge tilbake, vet vi ikke om virker. Derfor må gjenoppretting kunne
øves uten at prod (eller det noen holder på med i test) kan bli berørt.

Løsningen (avklart i grillingen, se nederst):

- **Feil inne i portalen:** Googles egne ordninger – gjenoppretting til et tidspunkt (7 dager),
  planlagt daglig Firestore-backup og versjonering på Storage-bøtta.
- **Tap av Google-prosjektet:** daglig kryptert kopi i åpent format til webhotellet hos ProISP,
  kjørt av GitHub Actions med en nøkkel som bare kan lese. Kan hentes til Mac på kommando.
- **Restore-test:** legger nyeste kopi i databasen `soknadsportal-restore` og prefikset
  `soknadsportal/restore/` med en tjenestekonto som ikke kan skrive andre steder.
- Skriptene ligger i `backup/` (utenfor `app/`), oppskriftene i OPPSETT.md.

## Akseptansekriterier

Daglig kopi
- [ ] Gitt at den planlagte jobben har kjørt, når jeg ser i kopimappa på ProISP, så ligger det
      et kryptert øyeblikksbilde med dagens dato som inneholder alle dokumentene i alle
      samlingene i `soknadsportal` (`brukere`, `givere`, `behov`, `soknader`, `innkjop`,
      `fakturaer`, `leverandorer`, `innstillinger`), og alle filene under `soknadsportal/prod/`
      finnes i det krypterte filspeilet.
- [ ] Gitt at jeg trykker «Run workflow» på kopijobben i GitHub, når den er ferdig, så finnes en
      fersk kopi på ProISP uten at jeg har ventet til natten.
- [ ] Gitt at kopijobben feiler (for eksempel feil SFTP-passord), når den avsluttes, så står
      jobben som rød i GitHub Actions og GitHub sender e-post.
- [ ] Gitt 31 daglige øyeblikksbilder, når jobben kjører, så er det eldste daglige ryddet bort,
      mens den første kopien i hver måned beholdes i 12 måneder. Det finnes alltid minst én kopi.
- [ ] Gitt en fil som er slettet i portalen, når det har gått under 12 måneder, så ligger den
      fortsatt i filspeilet og følger med når et øyeblikksbilde fra før slettingen gjenopprettes.
- [ ] Gitt tjenestenøkkelen kopijobben bruker, når den forsøker å skrive et dokument i
      `soknadsportal`, så avvises det (bare leserett).

Lagring og hemmeligheter
- [ ] Gitt adressen til kopimappa, når den åpnes i en nettleser, så svarer serveren 403 eller 404
      (eller mappa ligger utenfor webroten og har ingen adresse).
- [ ] Gitt en fil lastet ned fra kopimappa, når den åpnes uten krypteringspassordet, så er
      innholdet uleselig.
- [ ] Gitt repoet på GitHub, når jeg søker i det, så finnes verken tjenestenøkler, passord eller
      sikkerhetskopier der, og `backup/` har `.gitignore` for nøkler og nedlastede kopier.

Til Mac på kommando
- [ ] Gitt en kopi på ProISP, når jeg kjører hent-kommandoen på Mac-en (nyeste eller en valgt
      dato), så ligger øyeblikksbildet og filene i en lokal mappe, og kommandoen skriver antall
      dokumenter per samling og antall filer, eller feiler hvis arkivet ikke er helt.

Restore-test
- [ ] Gitt en kopi på ProISP, når jeg starter «Restore-test» i GitHub Actions eller kjører samme
      skript på Mac-en, så tømmes `soknadsportal-restore` og `soknadsportal/restore/`, kopien
      legges inn, og resultatet viser antall dokumenter per samling og antall filer i kopien mot
      det som ble lagt tilbake. Avvik gir rød jobb.
- [ ] Gitt at restore-testen har kjørt, når jeg sammenligner prod og test før og etter, så har
      ingen dokumenter eller filer der endret seg.
- [ ] Gitt tjenestekontoen restore-testen bruker, når den forsøker å skrive til `soknadsportal`
      eller `soknadsportal-test`, eller til `soknadsportal/prod/` i bøtta, så avvises det.
- [ ] Gitt at restore-testen er kjørt, når jeg åpner `http://localhost:8430/?restore` og logger
      inn, så viser portalen «Søknadsportal (RESTORE)», en søknad kan åpnes, og
      revisjonsrapporten for den lages med bilagene i.
- [ ] Gitt portalen på beitnes.net, når adressen åpnes med `?restore`, så har det ingen virkning.
- [ ] Gitt at det har gått en måned, når jeg ser i GitHub Actions, så har restore-testen kjørt av
      seg selv, og en feil har gitt e-post.

Gjenoppretting til prod
- [ ] Gitt gjenopprettingsskriptet, når det kjøres uten uttrykkelig mål, så skriver det bare til
      `soknadsportal-restore`.
- [ ] Gitt at målet er `soknadsportal`, når skriptet kjøres, så tar det først en fersk kopi av
      prod, viser antall nye, endrede og slettede dokumenter per samling, og gjør ingenting før
      jeg har skrevet databasenavnet. Skrives noe annet, avbrytes det uten endringer.
- [ ] Gitt at gjenopprettingen er fullført, når jeg sammenligner, så er prod nøyaktig lik kopien:
      dokumenter som ikke fantes i kopien er borte (også i `brukere`), og filene er på plass.

Googles egne ordninger og oppskrift
- [ ] Gitt Firebase/Google Cloud Console, når jeg ser på databasen `soknadsportal` og bøtta, så
      er gjenoppretting til et tidspunkt på, en daglig backup-plan finnes, og bøtta har
      versjonering der gamle versjoner slettes etter 90 dager.
- [ ] Gitt OPPSETT.md, når en annen teknisk person leser den, så finner hen: oppsettet av
      nøkler, secrets og restore-databasen (med liming av reglene), hvordan en kopi hentes,
      hvordan restore-testen kjøres (ved oppsett, hvert halvår og ved ny samling), gjenoppretting
      med Googles ordninger, gjenoppretting fra arkivet, gjenoppbygging i et nytt
      Firebase-prosjekt, hvor krypteringspassordet oppbevares, og at GitHub slår av planlagte
      jobber etter 60 dager uten commits.

## Avgrensning

- Koden sikkerhetskopieres ikke her – den ligger i GitHub.
- Test-databasen og Bestillingsportals data sikkerhetskopieres ikke (B-01). Versjoneringen på
  bøtta gjelder likevel hele bøtta.
- Ikke noe verktøy for å gjenopprette én enkelt søknad; det gjøres for hånd via restore-målet.
- Ingen angreknapp eller versjonshistorikk for enkeltfelt i portalen.
- Ingen skjerm eller statuslinje i portalen; jobben skriver ingenting til prod (B-25).
- Gjenoppbygging i et helt nytt Firebase-prosjekt beskrives, men øves ikke.
- Ingen kopi med låsing mot sletting (egen lagringstjeneste ble valgt bort til fordel for ProISP).

## Grilling

Grillet 2026-10-03/04 med brukeren (24 spørsmål, tre runder).

**1. Kollisjon med beslutningsloggen.**
- B-01: Versjonering slås på for hele Storage-bøtta, som er felles med Bestillingsportal. Koden og dataene der røres ikke; bare en innstilling på bøtta endres. Bestillingsportals data tas ikke med i kopien.
- B-05: Skriptene bruker npm, men ligger i `backup/` utenfor `app/`. Ingenting av det publiseres.
- B-07: Ny database `soknadsportal-restore` – hele `firebase/firestore.rules` må limes inn der også. Storage-reglene dekker allerede `soknadsportal/{miljo}/`.
- B-08: Tjenestenøkler, SFTP-passord og krypteringspassord ligger som GitHub-secrets / i passordbehandler, aldri i repoet. Kopiene ligger aldri i repoet.
- B-19/B-20: Jobbene kjører i GitHub Actions, utenfor portalen. Portalen får ingen serverdel og sender ingenting. Varsel om feil er GitHubs egen e-post.
- B-06: `?restore` er et nytt miljøvalg i `app/config/`, bare på localhost.
- Nye beslutninger: B-24 og B-25.

**2. Datamodell.** Ingen nye felt eller samlinger i portalen. «Siste sikkerhetskopi» lagres ikke i Firestore (ville krevd skriverett til prod for jobben – B-25). Dokumentene lagrer filstier uten miljøprefiks, så en kopi kan legges under et annet prefiks uten omskriving.

**3. Migrering og data i drift.** Ingenting i prod endres av kopieringen. Gjenoppretting til prod gjør prod nøyaktig lik kopien (også `brukere`; dokumenter som ikke er i kopien slettes), etter at skriptet har tatt en fersk kopi av prod, vist antall nye/endrede/slettede per samling og fått databasenavnet skrevet inn. Restore-testen tømmer målet først og tåler derfor å kjøres mange ganger.

**4. Låser vi oss?** Åpent format (JSON per dokument + filene som de er) gjør at kopien kan leses uten Google. ProISP ble valgt framfor egen lagringstjeneste (brukerens valg): ingen ny leverandør, men ingen låsing mot sletting – SFTP-passordet som deployer siden kan også slette kopiene. Dempes av kryptering, Googles egne backuper og kommandoen som henter kopien til Mac. Bytte av lagringssted senere er bare et nytt opplastingsmål.

**5. Er det nødvendig?** Ja – dataene finnes i dag bare ett sted. To farer dekkes: (A) feil inne i portalen: Firestore gjenoppretting til et tidspunkt (7 dager), planlagt daglig Firestore-backup og versjonering på bøtta (gamle versjoner slettes etter 90 dager); (B) tap av Google-prosjektet/kontoen: daglig kryptert kopi til ProISP. Utelatt som unødvendig nå: verktøy for å gjenopprette én enkelt søknad (gjøres for hånd via restore-målet), skjerm i portalen, kopi av test-databasen og av Bestillingsportal.

**6. Hvordan verifiseres det?** Restore-testen er verifikasjonen: knapp i GitHub Actions, samme skript som kommando på Mac, og automatisk én gang i måneden. Den bruker en egen tjenestekonto som bare kan skrive til `soknadsportal-restore` og `soknadsportal/restore/`, henter nyeste kopi fra ProISP, dekrypterer, legger tilbake og sammenligner antall dokumenter per samling og antall filer. Brukeren åpner deretter `localhost:8430/?restore` og lager en revisjonsrapport. Googles egen gjenoppretting prøves én gang ved oppsett. Gjenoppbygging av et helt nytt Firebase-prosjekt beskrives i OPPSETT.md, men øves ikke.

**Valg ellers.**
- Tåler å miste ett døgn. Oppbevaring: 30 daglige + 12 månedlige øyeblikksbilder av databasen. Filene ligger som ett kryptert speil (hver fil lastes opp én gang; slettede filer ryddes etter 12 måneder), og hvert øyeblikksbilde har liste over filene som hørte til.
- Plassering på ProISP: utenfor webroten hvis SFTP-brukeren får skrive der (prøves først i byggingen); ellers en `.htaccess`-stengt mappe med navn som ikke kan gjettes.
- Daglig jobb i GitHub Actions med tjenestenøkkel som bare kan lese, og med startknapp for fersk kopi på kommando. GitHub slår av planlagte jobber etter 60 dager uten commits: godtas, varselet kommer på e-post, står i OPPSETT.md.
- «Til min Mac»: kommando som henter nyeste eller valgt dato fra ProISP og kontrollerer arkivet. Trenger bare SFTP- og krypteringspassord.
- Krypteringspassordet ligger i brukerens passordbehandler og hos én person til. Minst én person til skal ha eierrolle i Google-prosjektet.
- Forutsetter Blaze-abonnement (bøttenavnet `…firebasestorage.app` tyder på det; bekreftes i Console ved oppsett). Uten Blaze faller Googles egne ordninger bort, og kopien til ProISP står alene.

**Konklusjon:** neste

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-04: Rettelse til grillingen (punkt 2): dokumentene lagrer filstier MED miljøprefiks
  (`lager.lastOpp()` returnerer `soknadsportal/prod/…`). Gjenopprettingen skriver derfor om
  stiene til målets prefiks (`byttPrefiks()` i `backup/lib/koding.mjs`), og kontrollen
  sammenligner etter omskrivingen. B-24 er rettet tilsvarende.
- 2026-10-04: Bygget: `backup/` (kopier, hent, gjenopprett, sjekk-tilgang), to GitHub-jobber,
  `?restore` i `app/config/app-config.js`, OPPSETT.md §9, tester i `test/sikkerhetskopi.test.js`.
  Ikke kjørt mot Google eller ProISP ennå – venter på oppsettet i OPPSETT.md §9.1–9.3.
  Jobbene kjører først når de ligger på `main`.
- 2026-10-04: Oppsettet gjort sammen med brukeren. Googles ordninger er på (PITR, daglig backup
  28 dager, versjonering + 90 dager). «Uniform bucket-level access» ble slått på for den delte
  bøtta (brukerens valg; Bestillingsportal og Korpsapp åpner filer som før). `sjekk-tilgang`
  bestått for begge nøklene. Første kopi tatt fra Mac (122 dokumenter, 24 filer) til
  hjemmemappa på ProISP utenfor webroten, og restore-testen bestått med 0 avvik.
  Gjenstår: secret `KOPI_SFTP_MAPPE`, se på `?restore`, og jobbene til `main`.
- 2026-10-04: På `main` (fc1952e). Kopijobben og restore-testen kjørt i GitHub Actions med 0 avvik;
  brukeren har sett gjennom `?restore`. Godkjent av brukeren samme dag. Bevisst ikke prøvd mot
  ekte data: `hent.mjs`, gjenoppretting til prod (`--mal soknadsportal`, krever gcloud på Mac) og
  Googles egen gjenoppretting (§9.1). Gjenstår utenfor kortet: gi krypteringspassordet og eierrolle
  i Google-prosjektet til én person til.
- 2026-10-04: `hent.mjs` kjørt mot ekte data: nyeste kopi hentet fra ProISP til `backup/kopier/`
  (122 dokumenter, 24 filer, 51 MB), alle filer dekryptert og kontrollert.
