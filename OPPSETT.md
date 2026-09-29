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
