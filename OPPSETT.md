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

## 9. Sikkerhetskopi og gjenoppretting
Dataene (Firestore-databasen `soknadsportal` og filene under `soknadsportal/prod/` i bøtta) vernes
på to måter. Skriptene ligger i `backup/` og publiseres ikke.

| Fare | Vern |
|---|---|
| Noe slettes/ødelegges i portalen | Googles egne ordninger (§9.1) |
| Google-prosjektet eller kontoen går tapt | Daglig kryptert kopi til ProISP (§9.2–9.4) |

Automatiske jobber har aldri skriverett til prod (B-25): kopijobben kan bare lese, restore-testen
kan bare skrive til `soknadsportal-restore`.

Minst én person til bør ha eierrolle i Google-prosjektet og kjenne krypteringspassordet (§9.3).

### 9.1 Googles egne ordninger (settes én gang, krever Blaze-abonnement)
Sjekk først at prosjektet står på Blaze: Firebase Console → nederst i venstremenyen.
Fra Cloud Shell på console.cloud.google.com:

```bash
P=skiensskolemusikk-b5cbc; B=skiensskolemusikk-b5cbc.firebasestorage.app
# Gjenoppretting til et tidspunkt: 7 dager tilbake, minutt for minutt
gcloud firestore databases update --database=soknadsportal --enable-pitr --project=$P
# Daglig backup hos Google, beholdes i 4 uker
gcloud firestore backups schedules create --database=soknadsportal --recurrence=daily --retention=4w --project=$P
# Versjonering på bøtta (gjelder også Bestillingsportals filer); gamle versjoner slettes etter 90 dager
gcloud storage buckets update gs://$B --versioning
printf '{"rule":[{"action":{"type":"Delete"},"condition":{"daysSinceNoncurrentTime":90}}]}' > livssyklus.json && gcloud storage buckets update gs://$B --lifecycle-file=livssyklus.json
```

Kontroll: `gcloud firestore databases describe --database=soknadsportal --project=$P` viser
`pointInTimeRecoveryEnablement: POINT_IN_TIME_RECOVERY_ENABLED`, og
`gcloud firestore backups schedules list --database=soknadsportal --project=$P` viser planen.

**Hente tilbake med Googles ordninger** (raskest når feilen er fersk og prosjektet er intakt).
Google legger alltid tilbake i en *ny* database – den eksisterende røres ikke:

```bash
# Fra et tidspunkt de siste 7 dagene (hele minutter, UTC)
gcloud firestore databases clone --source-database=projects/$P/databases/soknadsportal \
  --snapshot-time=2026-10-04T10:00:00Z --destination-database=soknadsportal-sjekk --project=$P
# Eller fra en daglig backup
gcloud firestore backups list --project=$P
gcloud firestore databases restore --source-backup=<navn fra listen> --destination-database=soknadsportal-sjekk --project=$P
```

Åpne `soknadsportal-sjekk` i Firebase Console og kopier tilbake det som mangler for hånd. Slett
databasen etterpå (`gcloud firestore databases delete --database=soknadsportal-sjekk`).
Prøv dette én gang ved oppsett. Skal *hele* prod tilbake, er §9.5 den øvde veien.

En slettet eller overskrevet fil: `gcloud storage ls -a gs://$B/soknadsportal/prod/<sti>` viser
versjonene, og `gcloud storage cp "gs://$B/<sti>#<generasjon>" gs://$B/<sti>` henter én tilbake.

### 9.2 Tjenestekontoer (Cloud Shell)
```bash
P=skiensskolemusikk-b5cbc; B=skiensskolemusikk-b5cbc.firebasestorage.app

# Kopijobben: bare lese
gcloud iam service-accounts create soknadsportal-kopi --display-name="Søknadsportal sikkerhetskopi (leser)" --project=$P
KOPI=serviceAccount:soknadsportal-kopi@$P.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $P --member=$KOPI --role=roles/datastore.viewer --condition=None
gcloud storage buckets add-iam-policy-binding gs://$B --member=$KOPI --role=roles/storage.objectViewer
gcloud iam service-accounts keys create kopi-nokkel.json --iam-account=soknadsportal-kopi@$P.iam.gserviceaccount.com

# Restore-testen: bare skrive til databasen soknadsportal-restore og soknadsportal/restore/ i bøtta
gcloud iam service-accounts create soknadsportal-restore --display-name="Søknadsportal restore-test" --project=$P
RESTORE=serviceAccount:soknadsportal-restore@$P.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $P --member=$RESTORE --role=roles/datastore.user \
  --condition="title=bare-restore-databasen,expression=resource.name==\"projects/$P/databases/soknadsportal-restore\""
gcloud storage buckets add-iam-policy-binding gs://$B --member=$RESTORE --role=roles/storage.objectAdmin \
  --condition="title=bare-restore-prefikset,expression=resource.name==\"projects/_/buckets/$B\" || resource.name.startsWith(\"projects/_/buckets/$B/objects/soknadsportal/restore/\")"
gcloud iam service-accounts keys create restore-nokkel.json --iam-account=soknadsportal-restore@$P.iam.gserviceaccount.com
```

Betingelsen på bøtta krever «uniform bucket-level access» – slått på 2026-10-04
(`gcloud storage buckets update gs://$B --uniform-bucket-level-access`; gjelder hele den delte bøtta).
Last ned de to nøkkelfilene (Cloud Shell → ⋮ → Download), legg innholdet i GitHub-secrets (under)
og slett filene fra Cloud Shell. De skal aldri i repoet.

**Restore-databasen:** Firebase Console → Firestore → Add database → Database ID
`soknadsportal-restore`, samme region som de andre. Lim så inn HELE `firebase/firestore.rules`
i den (som i §2). Storage-reglene dekker allerede `soknadsportal/restore/`.

### 9.3 GitHub-secrets og passord
Repo → Settings → Secrets and variables → Actions:

| Secret | Innhold |
|---|---|
| `KOPI_GOOGLE_NOKKEL` | Hele innholdet i `kopi-nokkel.json` |
| `RESTORE_GOOGLE_NOKKEL` | Hele innholdet i `restore-nokkel.json` |
| `KOPI_PASSORD` | Krypteringspassordet (langt, tilfeldig) |
| `KOPI_SFTP_MAPPE` | Mappa på ProISP der kopiene ligger |

`SFTP_HOST`, `SFTP_USERNAME` og `SFTP_PASSWORD` finnes fra før (§5).

**Krypteringspassordet** kan ikke leses ut av GitHub igjen. Lagre det i passordbehandleren *før*
det legges inn som secret, og gi det til én person til. Uten passordet er kopiene verdiløse.

**Mappa på ProISP:** `/customers/7/7/8/chd71y6vo/users/chd71y6vo_bbeitnes/sikkerhetskopi-soknadsportal`
– SFTP-brukerens hjemmemappe, utenfor webroten (rett under `/customers/…/chd71y6vo/` får brukeren
ikke opprette mapper; prøvd 2026-10-04). Skriptet legger likevel en `.htaccess` som stenger mappa,
og innholdet er kryptert.

På Mac-en (for `hent`, restore-test og tilgangssjekk): `cd backup && npm install`, kopier
`.env.eksempel` til `.env` og fyll inn. `.env` og nøkkelfiler ligger i `.gitignore`.

Kontroller at nøklene ikke kan mer enn de skal (med den aktuelle nøkkelen i
`GOOGLE_APPLICATION_CREDENTIALS`):

```bash
node backup/sjekk-tilgang.mjs --rolle kopi
```

```bash
node backup/sjekk-tilgang.mjs --rolle restore
```

### 9.4 Daglig drift
- **Kopien** tas hver natt (02:17 UTC) av Actions-jobben «Sikkerhetskopi av prod». Fersk kopi på
  kommando: Actions → «Sikkerhetskopi av prod» → Run workflow. Feiler den, sender GitHub e-post.
- **Lampen i portalen:** etter en vellykket kopi legger jobben `sikkerhetskopi-status.json` i
  portalens mapper (`KOPI_STATUS_MAPPER` i jobbene: `Soknadsportal` og `Soknadsportal-test`), og
  restore-testen fører inn sitt tidspunkt samme sted. Filen er åpen på nettet og har bare
  tidspunkt, antall og bestått (B-26). Prikken i toppmenyen er grønn under 26 timer, gul til 50,
  så rød. Lar ikke filen seg skrive, blir jobben rød selv om kopien er tatt. Skal kopier tatt fra
  Mac-en også oppdatere lampen, settes `KOPI_STATUS_MAPPER` i `backup/.env`.
- **Oppbevaring:** alle kopier fra de siste 30 dagene, og den første i hver måned i 12 måneder.
  Filer lastes opp én gang; en fil som slettes i portalen ligger i arkivet så lenge en kopi viser til den.
- **GitHub slår av planlagte jobber** etter 60 dager uten commits i repoet, og varsler på e-post
  en uke før. Slå jobbene på igjen under Actions.
- Jobbene kjører bare fra `main`. Endringer i `backup/` virker først når de er merget dit.
- **Til Mac-en:**
  ```bash
  node backup/hent.mjs
  ```
  henter nyeste kopi til `backup/kopier/` og kontrollerer hver fil. `--dato 2026-10-01` velger
  en dag, `--til <mappe>` et annet sted, `--lesbar` legger også en dekryptert utgave ved siden av.
- **Restore-test:** Actions → «Restore-test» → Run workflow (kjører også av seg selv den 1. hver
  måned), eller på Mac-en med restore-nøkkelen:
  ```bash
  node backup/gjenopprett.mjs
  ```
  Den tømmer `soknadsportal-restore`, legger nyeste kopi inn og sammenligner antall dokumenter per
  samling og filer med kopien. Åpne så `http://localhost:8430/?restore`, logg inn, åpne en søknad
  og lag revisjonsrapporten. Gjør dette ved oppsett, hvert halvår, og når portalen får en ny
  samling eller et nytt sted å lagre filer (B-24).
- Arkivet er `db/<tidspunkt>.json.gz.spk` (alle dokumentene som JSON + fillisten) og
  `filer/<md5>-<størrelse>.spk`. Kryptering: AES-256-GCM, nøkkel fra passordet med scrypt
  (`backup/lib/krypto.mjs`).

### 9.5 Gjenopprette prod fra arkivet
Gjør prod *nøyaktig* som kopien: dokumenter og filer som ikke finnes i kopien slettes, også i
`brukere`. Krever din egen Google-innlogging med skriverett (installer gcloud, så
`gcloud auth application-default login`) – ikke en av tjenestenøklene.

```bash
node backup/gjenopprett.mjs --mal soknadsportal --dato 2026-10-01
```

Skriptet tar først en fersk kopi av prod slik den er, viser hvor mange dokumenter og filer som
blir nye, endret og slettet, og gjør ingenting før du har skrevet `soknadsportal`. Uten `--dato`
brukes nyeste kopi. Med `--fra backup/kopier` brukes en kopi som er hentet til Mac-en.
Kjør gjerne restore-testen med samme dato først og se på dataene i `?restore`.

### 9.6 Hvis hele Google-prosjektet er borte (ikke øvd)
1. Nytt Firebase-prosjekt: §1–4, §6 og §8 i denne filen (databaser, regler, innlogging, CORS, API-nøkkel).
2. Sett det nye prosjektnavnet og bøttenavnet i `app/config/firebase-config.js` og `backup/lib/firebase.mjs`.
3. `node backup/gjenopprett.mjs --mal soknadsportal` (§9.5). Kopiene på ProISP er uavhengige av Google.
4. Brukerne logger inn som før – tilgangen ligger i `brukere`, som følger med kopien.
5. Sett opp §9.1–9.3 på nytt.
