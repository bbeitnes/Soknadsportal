---
id: 0014
tittel: Kontaktperson og nettadresse på givere og leverandører
status: ferdig
opprettet: 2026-10-06
---

# 0014 · Kontaktperson og nettadresse på givere og leverandører

## Brukerhistorie

Som **bruker** ønsker jeg å kunne legge inn en nettadresse og en kontaktperson
(navn, e-post, telefon) på hver giver og hver leverandør, slik at jeg finner
rett side og rett person uten å lete i et fritekstfelt. Alle feltene er
frivillige.

- **Giver:** URL til giverens søknadsportal, kontaktperson (navn, e-post, telefon).
- **Leverandør:** URL til nettsiden, kontaktperson (navn, e-post, telefon).

## Kontekst

I dag har både giveren og leverandøren ett fritekstfelt, `kontakt`, med
etiketten «Kontaktinfo og notat» og plassholder «Kontaktperson, e-post,
telefon …». Alt havner i samme boks: adressen til søknadsportalen, navnet på
saksbehandleren, kundenummeret og løse notater. Lenker er ikke klikkbare, og
e-postadresser kan ikke kopieres uten å markere riktig del av teksten.

Fritekstfeltet brukes også andre steder:
- `leverandorKontakt()` henter det til leverandørpanelet i Innkjøp (lesevisning
  med lenke til registeret) og til «TIL»-blokken i bestillings-PDF-en
  (`ui/bestilling.js`).
- Leverandørvelgeren i Innkjøp viser første linje av `kontakt` som undertekst.
- `erTomPost()` (`URORT` i `beregning.js`) avgjør om en nyopprettet giver eller
  leverandør er urørt ut fra `navn` og `kontakt`.

Spec.md § Giver sier bare «Navn, kontaktinfo/notat og innstillingen Trekk ut
momskompensasjon». Kortet utvider det med strukturerte felt.

## Akseptansekriterier

- [ ] Gitt giverpanelet (Innstillinger → Givere og Årshjul) når jeg åpner en
      giver så står det fire nye, frivillige felt under navnet: «Søknadsportal
      (nettadresse)», «Kontaktperson», «E-post» og «Telefon». Feltet
      «Kontaktinfo og notat» står fortsatt, med etiketten «Notat».
- [ ] Gitt leverandørpanelet i registeret (Innstillinger → Leverandører, og det
      samme panelet åpnet fra Innkjøp/Revisjon) når jeg åpner en leverandør så
      står det fire nye, frivillige felt: «Nettside», «Kontaktperson», «E-post»
      og «Telefon». «Kontaktinfo og notat» står fortsatt, med etiketten «Notat».
- [ ] Gitt at jeg skriver i et av feltene og går ut av det (blur) så lagres
      verdien uten lagreknapp, «Lagret» vises i toppmenyen, og verdien står der
      etter at siden er lastet på nytt (B-03).
- [ ] Gitt en lagret nettadresse så vises den som en klikkbar lenke ved siden av
      feltet som åpner adressen i ny fane. Skrives adressen uten `https://`,
      legges det på i lenken (ikke i det lagrede feltet).
- [ ] Gitt en lagret e-post så er den en `mailto:`-lenke ved siden av feltet.
- [ ] Gitt en giver eller leverandør som ble opprettet før endringen (feltene
      mangler i dokumentet) så vises panelet med tomme felt, og det gamle
      innholdet i «Notat» står urørt. Ingen migrering.
- [ ] Gitt «+ Ny leverandør»/«+ Ny giver» (⌘/Ctrl+Enter, B-28) når jeg bare har
      fylt ut kontaktperson eller nettadresse så regnes posten som rørt
      (`erTomPost()` er false), og en ny post opprettes.
- [ ] Gitt leverandørpanelet i Innkjøp for en registerleverandør så viser
      lesevisningen «Kontakt» kontaktperson, e-post, telefon og nettside når de
      er satt, over notatet.
- [ ] Gitt bestillings-PDF-en så inneholder «TIL»-blokken kontaktperson, e-post
      og telefon når de er satt, før notatet som i dag.
- [ ] Gitt leverandørvelgeren i Innkjøp («+ Leverandør») så står kontaktpersonen
      som undertekst når den er satt, ellers første linje av notatet som i dag.
- [ ] Gitt `?demo` så har én giver og én leverandør utfylt nettadresse,
      kontaktperson, e-post og telefon fra start.
- [ ] Gitt en leser (B-30) så vises feltene skrivebeskyttet, og lenkene virker.
- [ ] Gitt `node --test test/` så er `erTomPost()` dekket for de nye feltene, og
      alle tester går.

## Avgrensning

- Ingen validering av e-post, telefon eller URL ut over at lenkene lages.
- Ikke flere enn én kontaktperson per giver/leverandør.
- Portalen sender ingen e-post og åpner ingen integrasjon (B-19). `mailto:`
  åpner brukerens eget e-postprogram.
- Kontaktinfoen på giveren vises ikke i søknaden eller i revisjonsrapporten.
- Feltene inngår ikke i `revisjonsavtrykk()`.
- Det eksisterende `kontakt`-feltet beholdes som notat. Ingen automatisk
  flytting av tekst fra notatet til de nye feltene.
- Frie leverandører i et innkjøp (uten `leverandorId`) beholder fritekstfeltet
  «Kontakt» og får ikke de nye feltene.

## Grilling

Grillet 2026-10-06, ett spørsmål om gangen.

**1. Kollisjon med beslutningsloggen.** Berører B-03 (lagring ved blur, hvert felt for seg), B-19 (`mailto:` åpner brukerens eget e-postprogram, portalen sender ingenting), B-28 (⌘/Ctrl+Enter og `erTomPost()`), B-29 (alle brukere skriver giverfeltene) og B-30 (leser ser feltene skrivebeskyttet, lenkene virker). Ingen brudd. Reglene for `givere` og `leverandorer` begrenser ikke feltnavn og endres ikke.

**2. Datamodell.** Flate felt på dokumentet: `nettadresse`, `kontaktperson`, `epost`, `telefon` – samme navn som organisasjonen bruker i `innstillinger/<orgId>`. Ikke nestet kart. Det gamle `kontakt`-feltet består med etiketten «Notat». Ingenting kan utledes; det er nye opplysninger. Én kontaktperson per post, flere havner i notatet. Frie leverandører i et innkjøp (uten `leverandorId`) beholder fritekstfeltet «Kontakt».

**3. Migrering og data i drift.** Ingen migrering. Gamle dokumenter mangler feltene og leses som tomme. Ingen flytting av tekst fra notatet. Tåler å kjøres flere ganger fordi ingenting kjøres.

**4. Låser vi oss?** Flate felt gir plass til én kontaktperson. Trengs flere senere, kan feltene leses inn som første oppføring i et kart uten tap. Vurdert og godtatt.

**5. Er det nødvendig?** Alternativet var å beholde fritekst og autolenke adresser i teksten. Valgt bort: kontaktpersonen skal kunne vises på faste plasser (bestillings-PDF, leverandørvelger), og det skal ikke være vilkårlig hva som står hvor.

**6. Hvordan verifiseres det?** Brukeren tester på dev med `?demo` og `?demo=leser`. Demodataene får utfylt kontaktinfo på én giver og én leverandør, så PDF og velger viser noe fra start. Nodetest for `erTomPost()` med de nye feltene. Ingen ny testinfrastruktur.

**7. Sikkerhetskopien (B-24, B-25).** Ingen nye samlinger eller Storage-stier; kopiskriptet tar alle felt i eksisterende samlinger. Ingenting skriver til prod automatisk.

**Visning utenfor panelene.** Leverandør: lesevisningen i Innkjøp-panelet, «TIL»-blokken i bestillings-PDF-en, og kontaktpersonen som undertekst i leverandørvelgeren (fallback: første linje av notatet). Giver: bare i giverpanelet, ikke i Søknad-fanen eller Årshjul. Lenker som liten «Åpne ↗» / «Skriv e-post» ved siden av feltet; `https://` legges på i lenken, ikke i det lagrede feltet.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.
