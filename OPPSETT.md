# Oppsett (gjøres én gang, manuelt)

Firebase-prosjekt: `skiensskolemusikk-b5cbc` (samme som KorpsApp og Bestillingsportal).

## 1. Firestore-databaser
Firebase Console → Firestore Database → «Create database» to ganger:
- Database ID `soknadsportal-test`
- Database ID `soknadsportal`

Velg samme lokasjon som de andre (europe-west). Produksjonsmodus.

## 2. Regler
- **Firestore:** lim inn HELE `firebase/firestore.rules` i Rules-fanen for
  hver av de to databasene (velg databasen øverst først).
- **Storage:** lim inn HELE `firebase/storage.rules.samlet` under Storage → Rules.
  Filen inneholder også Bestillingsportal sine regler — de må være med.
- **Revisorer:** reglene som skjermer revisorer må være limt inn i en database
  FØR første revisor inviteres der. Med eldre regler er enhver rad i `brukere`
  et fullt medlem. Prøv reglene som beskrevet under.

### Prøve reglene som revisor
Gjøres i testdatabasen hver gang `firebase/firestore.rules` er endret.

1. Lim inn reglene (begge databasene).
2. Som administrator: inviter en ekstra e-postadresse du selv har, med rollen
   Revisor. Kryss den av som revisor på ÉN søknad (Søknad-fanen). Noter ID-en
   til den søknaden og til en annen søknad (ID-en står i adressen:
   `#/soknad/<ID>`).
3. Logg inn som revisoren (eget nettleservindu). Du skal bare se «Revisjon» i
   menyen og bare den ene søknaden. Godkjenn-knappen virker bare når søknaden
   er Avsluttet.
4. Åpne konsollen (F12) som revisoren, sett inn de to ID-ene og lim inn:

   ```js
   const TILDELT = '<ID til søknaden revisoren er tildelt>';
   const ANNEN = '<ID til en annen søknad>';
   const { lager } = await import('./data/lager.js');
   const les = (samling, filter) => new Promise((ok, feil) => { const stopp = lager.lytt(samling, l => { setTimeout(stopp); ok(l); }, feil, filter); });
   const prov = async (hva, f) => { try { await f(); console.error('FEIL – ble tillatt:', hva); } catch { console.log('OK – avvist:', hva); } };
   await prov('lese alle søknader', () => les('soknader'));
   await prov('lese alle innkjøp', () => les('innkjop'));
   await prov('lese alle fakturaer', () => les('fakturaer'));
   await prov('lese brukerlisten', () => les('brukere'));
   await prov('lese en søknad revisoren ikke er tildelt', () => lager.hent('soknader', ANNEN));
   await prov('lese fakturaene til en annen søknad', () => les('fakturaer', ['soknadId', '==', ANNEN]));
   await prov('lese innkjøpene til en annen søknad', () => les('innkjop', ['soknadId', '==', ANNEN]));
   await prov('endre tittel på tildelt søknad', () => lager.oppdater('soknader', TILDELT, { tittel: 'endret av revisor' }));
   await prov('endre tilgangslisten', () => lager.oppdater('soknader', TILDELT, { tilgang: [] }));
   await prov('skrive en annen revisors oppføring', () => lager.oppdater('soknader', TILDELT, { 'revisorer.en_annen.merknad': 'x' }));
   await prov('opprette faktura', () => lager.opprett('fakturaer', { soknadId: TILDELT, belop: 1 }));
   await prov('opprette behov', () => lager.opprett('behov', { tittel: 'fra revisor' }));
   await prov('endre innstillinger', () => lager.flett('innstillinger', 'skiens-skolemusikk', { orgNavn: 'x' }));
   console.log('Skal gå bra – tildelt søknad:', (await les('soknader', ['tilgang', 'array-contains', (await import('./data/index.js')).tilstand.meg.epost])).length, 'stk, fakturaer:', (await les('fakturaer', ['soknadId', '==', TILDELT])).length);
   ```

   Alle linjene skal si «OK – avvist», og den siste skal skrive ut antall uten
   feil. Står det «FEIL – ble tillatt», stemmer ikke reglene: fjern revisoren
   og si fra. (Ble noe opprettet ved en feil, slett det i Firebase Console.)
5. Sett søknaden til en annen status enn Avsluttet (som vanlig bruker), og
   prøv som revisor i konsollen – skal avvises:

   ```js
   await prov('godkjenne når søknaden ikke er Avsluttet', async () => { const m = await import('./data/index.js'); return m.godkjennRevisjon(m.tilstand.soknader.find(s => s.id === TILDELT)); });
   ```
6. Logg inn som vanlig bruker og se at alt virker som før: åpne en søknad,
   endre et felt, legg inn og slett en faktura.

## 3. Innlogging
Authentication → Sign-in method:
- Google er allerede på (brukes av Bestillingsportal).
- Slå på **Email/Password** og kryss av **Email link (passwordless sign-in)**.

Authentication → Settings → Authorized domains: sjekk at `beitnes.net` og
`localhost` står der.

### E-post fra eget domene (anbefalt)
Innloggingslenken sendes som standard fra `noreply@skiensskolemusikk-b5cbc.firebaseapp.com`
og havner lett i søppelpost (bekreftet 2026-09-30). Send heller gjennom en
e-postkonto på eget domene:

1. Opprett en e-postkonto hos ProISP, f.eks. `portal@beitnes.net`. SMTP-server,
   port og sikkerhet står under kontoens oppsett for e-postklient i kontrollpanelet.
2. Firebase Console → Authentication → Templates → **SMTP settings** → slå på, og
   fyll inn avsenderadresse, SMTP-server, port, brukernavn, passord og sikkerhet.
3. Samme sted: sett malspråket til norsk, og gi «Email link sign-in»-malen et
   gjenkjennelig avsendernavn (f.eks. «Søknadsportal»).
4. Test fra innloggingssiden på test-siden med en adresse du kan lese.

Innstillingen gjelder hele Firebase-prosjektet (også KorpsApp og Bestillingsportal).

## 4. Første administrator
Firestore → velg databasen → «Start collection» `brukere`:
- Document ID: din e-post med små bokstaver, f.eks. `bbeitnes@gmail.com`
- Felter:
  - `organisasjonId` (string) = `skiens-skolemusikk`
  - `epost` (string) = samme e-post
  - `navn` (string) = ditt navn
  - `rolle` (string) = `administrator`
  - `status` (string) = `aktiv`

Gjør det i begge databasene. Flere brukere inviteres fra portalen (trinn e).
Rollene er `bruker`, `administrator` og `revisor`.

## 5. Hosting
- Opprett mappene `Soknadsportal` og `Soknadsportal-test` på ProISP (SFTP),
  ved siden av `Bestillingsportal`.
- Nytt GitHub-repo med secrets `SFTP_USERNAME`, `SFTP_HOST`, `SFTP_PASSWORD`
  (samme verdier som Bestillingsportal).
- Push til `test` deployer til `…/Soknadsportal-test/`, push til `main` til
  `…/Soknadsportal/`. Bare `app/` publiseres.

## 6. CORS på Storage-bøtta (gjort 2026-09-30)
Revisjonsrapporten henter vedleggene fra Storage i nettleseren. Da må
bøtta tillate lesing fra portalens adresser, ellers stopper nettleseren
det («blocked by CORS policy»). Settes én gang for bøtta (felles for test
og prod) fra Cloud Shell på console.cloud.google.com:

```bash
printf '[{"origin":["https://beitnes.net","http://beitnes.net","http://localhost:8430"],"method":["GET"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]' > cors.json && gcloud storage buckets update gs://skiensskolemusikk-b5cbc.firebasestorage.app --cors-file=cors.json
```

Får portalen ny adresse, må den legges til i `origin`-listen.

## 7. Lokal dev-server (Docker)
Forhåndsvisning på egen maskin før noe pushes til `test`. Krever Docker Desktop.

```bash
docker compose up -d
```

Gjøres én gang fra prosjektmappa; containeren `soknadsportal-dev` starter
deretter sammen med Docker. `app/` er montert rett inn, så endringer vises ved
omlasting.
- `http://localhost:8430/?demo` – oppdiktede data i minnet, ingen innlogging.
- `http://localhost:8430/` – lokal kode mot testdatabasen (krever innlogging).

Porten må være 8430: den står i CORS-listen (§6).

## 8. API-nøkkelen (Firebase / Google Cloud)
Nøkkelen ligger ikke i repoet (det er offentlig). `app/config/firebase-config.js` henter den
fra `app/config/api-nokkel.js`, som står i `.gitignore`:
- **Lokalt:** kopier `api-nokkel.eksempel.js` til `api-nokkel.js` og lim inn nøkkelen.
- **Deploy:** GitHub → Settings → Secrets and variables → Actions → secret `FIREBASE_API_KEY`.
  Deploy-jobbene skriver filen før opplasting, og stopper hvis secreten mangler.

Nettleseren må ha nøkkelen for å snakke med Firebase, så den som åpner portalen kan alltid
lese den (i filen på serveren og i nettverkskallene). Det som beskytter er derfor
begrensningene på nøkkelen og `firestore.rules` – ikke at den er skjult.

### Begrensninger på nøkkelen
Google Cloud Console → APIs & Services → Credentials → nøkkelen:
- **Application restrictions → Websites:** `https://beitnes.net/*`, `http://beitnes.net/*`,
  `https://skiensskolemusikk-b5cbc.firebaseapp.com/*` (innloggingsvinduet til Google) og
  `http://localhost:8430/*` (dev).
- **API restrictions → Restrict key:** samme liste som Firebase la på den opprinnelige
  nøkkelen (ca. 25 API-er). Den kopieres ved bytte (under) – ikke plukk dem for hånd.

### Bytte nøkkel
Prosjektet deles med KorpsApp og Bestillingsportal. Bruker de samme nøkkel, må de ha den
nye før den gamle slettes.
1. Credentials → åpne den gamle nøkkelen → **«Rotate key»**. Det lager en ny nøkkel med de
   samme begrensningene, og den gamle virker til den slettes. (Heter knappen «Regenerate
   key», ikke bruk den – kopier heller med kommandoen under.) Legg til nettstedene over
   under «Application restrictions» hvis de mangler.

   Alternativt fra Cloud Shell (kopierer API-listen fra den gamle nøkkelen og setter
   nettstedene i samme slengen; `GAMMEL` er UID fra første kommando):
   ```bash
   gcloud services api-keys list --format="table(displayName,uid)"
   GAMMEL=<uid>
   gcloud services api-keys create --display-name="Nettleser $(date +%F)" \
     --allowed-referrers="https://beitnes.net/*,http://beitnes.net/*,https://skiensskolemusikk-b5cbc.firebaseapp.com/*,http://localhost:8430/*" \
     $(gcloud services api-keys describe "$GAMMEL" --format=json | jq -r '.restrictions.apiTargets[].service | "--api-target=service=" + .')
   ```
   Nøkkelen står som `keyString` i svaret.
2. Legg den nye nøkkelen i `api-nokkel.js` lokalt og i secreten `FIREBASE_API_KEY`. Kjør
   deploy til test (Actions → «Run workflow») og logg inn. Deretter prod.
3. Bytt nøkkel i KorpsApp og Bestillingsportal og deploy dem.
4. Når alle tre er sjekket: slett den gamle nøkkelen. Først da er den ubrukelig.
