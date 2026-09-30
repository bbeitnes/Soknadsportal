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
