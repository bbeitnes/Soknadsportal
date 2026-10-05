---
id: 0005
tittel: Statuslampe for sikkerhetskopien i portalen
status: ferdig
opprettet: 2026-10-04
---

# 0005 · Statuslampe for sikkerhetskopien i portalen

## Brukerhistorie

Som **administrator** ønsker jeg å se inne i portalen når siste sikkerhetskopi ble tatt, med en
lampe som viser om den er fersk, slik at jeg oppdager at kopieringen har stoppet uten å måtte
inn i GitHub.

## Kontekst

Kort 0004 ga nattlig kopi til ProISP og månedlig restore-test. I dag vises status bare i GitHub
Actions, og feil varsles på e-post derfra. I grillingen av 0004 valgte vi bort en statuslinje i
portalen fordi jobben da måtte få skrive i prod-databasen (B-25). Brukeren ber nå uttrykkelig om
lampen (B-02).

Forslag som ikke bryter B-25: kopijobben har allerede SFTP-tilgang til webhotellet. Etter en
vellykket kopi legger den en liten fil, `sikkerhetskopi-status.json`, i portalens mappe på ProISP
(tidspunkt og antall dokumenter/filer – ingen data). Portalen henter filen fra sin egen adresse.
Ingenting skrives til Firestore. Deploy-jobben sletter ikke filer den ikke selv laster opp.

Lampen blir da en «dødmannsknapp»: den trenger ikke at jobben melder fra om feil – den blir rød
fordi tidspunktet slutter å fornye seg.

Alternativ: portalen spør GitHubs åpne API om siste kjøring av jobben. Ingen fil, men portalen
blir avhengig av et eksternt system (B-19) og av at repoet er offentlig.

Valgene er tatt i grillingen (se nederst).

## Akseptansekriterier

Statusfilen
- [ ] Gitt at kopijobben har tatt en vellykket kopi, når den er ferdig, så ligger
      `sikkerhetskopi-status.json` i både `Soknadsportal/` og `Soknadsportal-test/` på ProISP med
      tidspunktet for kopien og antall dokumenter og filer.
- [ ] Gitt at kopijobben feiler før kopien er lagret, når den avsluttes, så er statusfilen uendret.
- [ ] Gitt at kopien er tatt, men statusfilen ikke lar seg skrive, når jobben avsluttes, så er
      jobben rød i GitHub Actions (e-post), og kopien ligger likevel i arkivet.
- [ ] Gitt at restore-testen er bestått, når jobben er ferdig, så har statusfilen tidspunktet for
      testen og «bestått», og opplysningene om siste kopi står uendret.
- [ ] Gitt statusfilen, når den åpnes direkte i nettleseren, så inneholder den bare tidspunkt,
      antall og bestått/ikke bestått (B-26).
- [ ] Gitt nøkkelen til kopijobben, når `sjekk-tilgang --rolle kopi` kjøres etter endringen, så er
      alle skrivinger til Firestore og Storage fortsatt avvist (B-25).

Toppmenyen
- [ ] Gitt en kopi som er under 26 timer gammel, når en administrator eller bruker åpner portalen,
      så vises en grønn prikk i toppmenyen uten tekst. Holdes musepekeren over, står det
      «Siste sikkerhetskopi av prod: 05.10.2026 kl. 04.17» (nettleserens tid, samme format som ellers i portalen).
- [ ] Gitt at siste kopi er 26–50 timer gammel, så er prikken gul; over 50 timer, så er den rød.
      I begge tilfeller står teksten «Ingen kopi siden 03.10.2026 kl. 04.17» ved siden av prikken.
- [ ] Gitt at statusfilen mangler eller ikke kan leses, så er prikken grå med «Ukjent» når
      musepekeren holdes over, og portalen virker ellers som før uten feilmelding.
- [ ] Gitt en fane som står åpen, når siste kopi passerer 26 timer, så blir prikken gul innen en
      halvtime uten at siden lastes på nytt – og uten at et felt med fokus mister fokus.
- [ ] Gitt prikken, når jeg klikker på den, så åpnes Innstillinger → Organisasjon.
- [ ] Gitt en revisor, når hen er logget inn, så vises ingen prikk.
- [ ] Gitt mobilskjermen `#/kvittering`, så vises ingen prikk.

Innstillinger → Organisasjon
- [ ] Gitt en fersk kopi, når siden åpnes, så står det «● Siste sikkerhetskopi av prod:
      05.10.2026 kl. 04.17 – 122 dokumenter, 24 filer» med samme farge som prikken i toppmenyen.
- [ ] Gitt en bestått restore-test, så står det «Siste restore-test: 01.10.2026 kl. 05.43 – bestått».
      Er testen over 35 dager gammel eller ikke bestått, er linjen gul. Prikken i toppmenyen
      påvirkes ikke.
- [ ] Gitt at siden åpnes, så hentes status på nytt.

Miljøer
- [ ] Gitt test-siden, når kopijobben har kjørt, så vises samme prod-status som i prod.
- [ ] Gitt `?demo`, når portalen åpnes, så vises lampen med oppdiktet status, og
      `demoKopiAlder = 30` (timer) i konsollen gjør den gul, `60` rød og `null` grå.

## Avgrensning

- Ingen knapp i portalen for å starte kopi eller gjenoppretting.
- Ingen varsling fra portalen (e-post kommer fortsatt fra GitHub, B-19).
- Ingen historikk over kopier – bare den siste.
- Ingenting lagres i Firestore, og reglene endres ikke.
- Dev (localhost uten `?demo`) viser «Ukjent»; det finnes ingen statusfil der.

## Grilling

Grillet 2026-10-04 med brukeren (11 spørsmål, ett om gangen).

**1. Kollisjon med beslutningsloggen.**
- B-25: holdes. Jobben skriver en fil på webhotellet med SFTP-tilgangen den allerede har, ikke til Firestore eller Storage. `sjekk-tilgang` skal fortsatt vise at kopi-nøkkelen ikke kan skrive.
- B-19: holdes. Portalen henter filen fra sin egen adresse; GitHubs API ble valgt bort nettopp for å unngå en ekstern avhengighet.
- B-02: lampen ble valgt bort i grillingen av 0004, men er nå uttrykkelig bedt om.
- B-03/B-04: status hentes i bakgrunnen og tegner ikke siden på nytt mens et felt har fokus. Toppmenyen får bare en prikk når alt er i orden; detaljene ligger under Innstillinger → Organisasjon.
- B-06: henting av statusfilen legges i `app/data/`, fargeregelen som ren funksjon i `beregning.js` med test, og `?demo` får oppdiktet status.
- B-09/B-23: Administrator og Bruker ser lampen. Revisor ser den ikke.
- Ny beslutning: B-26.

**2. Datamodell.** Ingenting nytt i Firestore. Statusfilen `sikkerhetskopi-status.json` har `kopi { tatt, dokumenter, filer }` og `restoreTest { kjort, bestatt }`. Fargen lagres ikke – den regnes ut av tidspunktet hver gang (B-15).

**3. Migrering og data i drift.** Ingen. Før første kopi etter endringen finnes ikke filen, og lampen er grå «Ukjent». Deploy-jobben sletter ikke filer den ikke selv laster opp, så filen overlever deploy. Kopi-jobben og restore-jobben oppdaterer hver sin del av filen uten å fjerne den andres.

**4. Låser vi oss?** Nei. Filen kan senere erstattes av en annen kilde uten at skjermen endres. Filen er åpen på nettet; B-26 setter grensen for hva den får inneholde.

**5. Er det nødvendig?** E-posten fra GitHub varsler allerede om feil, men ikke hvis GitHub slår av jobben etter 60 dager uten commits eller e-posten overses. Lampen blir rød fordi tidspunktet slutter å fornye seg, uansett årsak. Valgt bort: statusfelt i databasen (B-25), GitHubs API (B-19), knapper for å starte kopi, historikk.

**6. Hvordan verifiseres det?** Fargegrensene testes med `node --test`. Brukeren ser lampen på dev i `?demo` (alle fargene), deretter på test-siden med ekte prod-status etter en kjøring av kopijobben. Ingen ny testinfrastruktur.

**Valg.**
- Statusfil på ProISP, lagt i både `Soknadsportal/` og `Soknadsportal-test/`. Teksten sier «av prod». Dev viser «Ukjent».
- Prikk i toppmenyen + detaljer under Innstillinger → Organisasjon. Klikk på prikken går dit.
- Grønn under 26 timer, gul 26–50, rød over 50, grå hvis filen ikke kan leses.
- Toppmenyen: bare prikken når grønn; gul/rød får tekst («Ingen kopi siden 03.10.2026 kl. 04.17»).
- Detaljer: tidspunkt + antall dokumenter og filer; restore-testen på egen linje med tidspunkt og bestått, gul over 35 dager. Restore-testen påvirker ikke prikken.
- Lar ikke statusfilen seg skrive, blir jobben rød (e-post), selv om kopien er tatt.
- Portalen henter status ved oppstart, hver halvtime og når Innstillinger åpnes.
- Kopier tatt fra Mac-en oppdaterer også statusfilen. Ingen endring i Firestore-reglene.

**Konklusjon:** neste

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-04: Bygget. Tidspunktene vises med portalens eksisterende `datoKl()` («05.10.2026 kl.
  04.17») i stedet for formatet i grillingen; kriteriene er rettet. Designsystemet har ingen
  grønn/gul, så lampefargene er egne i `app.css`. Vist på dev i `?demo` med alle fire farger.
  Statusfilen er ikke skrevet til ProISP ennå – det skjer første gang kopijobben kjører fra `main`.
- 2026-10-05: På `main` (dee072e). Kopijobben og restore-testen skrev statusfilen til begge
  mappene; filen lest fra nettet og inneholder bare tidspunkt, antall og bestått. Brukeren har
  sett lampen på test-siden og godkjent. Lagt til underveis: `?demo&kopialder=30` i adressen, og
  klikk på lampen henter alltid status på nytt. Ikke prøvd: halvtimesoppdateringen i en åpen fane.
