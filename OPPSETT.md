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
