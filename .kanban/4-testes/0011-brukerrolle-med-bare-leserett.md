---
id: 0011
tittel: Brukerrolle med bare leserett
status: testes
opprettet: 2026-10-05
---

# 0011 · Brukerrolle med bare leserett

## Brukerhistorie

Som **administrator** ønsker jeg å kunne gi noen en rolle som bare har leserett slik at f.eks. styreleder kan følge med på behov, søknader og økonomi uten å kunne endre noe ved et uhell.

## Kontekst

I dag finnes rollene `bruker`, `administrator` og `revisor`. En bruker kan endre alt, og en
revisor ser bare tildelte søknader (pottlinje, Revisjon og dokumenter). Det finnes ingen måte å
slippe noen inn for å se hele bildet uten samtidig å gi skriverett. Styreleder og andre i styret
har behov for innsyn, ikke for å redigere.

## Akseptansekriterier

- [ ] Gitt at jeg er administrator når jeg åpner brukerlisten så kan jeg velge rollen «Leser» for en bruker, ved siden av Bruker, Administrator og Revisor
- [ ] Gitt at jeg er logget inn som leser når jeg åpner Behov, Søknader, en søknad (alle faner) og Innstillinger (Organisasjon, Givere, Leverandører) så ser jeg det samme innholdet som en bruker, men alle felt vises som tekst, og det finnes ingen knapper som oppretter, sletter, laster opp, velger pris eller importerer, og ingenting kan dras
- [ ] Gitt at jeg er logget inn som leser når jeg ser på toppmenyen så står merket «Leserett» der, og fanen Brukere i Innstillinger vises ikke
- [ ] Gitt at jeg er logget inn som leser når jeg blar i faner, åpner sidepanel, filtrerer, åpner et bilag og laster ned revisjonsrapporten eller en bestilling så virker det som for en bruker
- [ ] Gitt at jeg er logget inn som leser når jeg åpner Revisjon så ser jeg revisorenes status, merknader og kommentarer, men kan ikke godkjenne eller kommentere, og jeg kan ikke velges som revisor i Søknad-fanen
- [ ] Gitt at jeg er logget inn som leser på en smal skjerm når jeg åpner portalen uten rute så kommer jeg til søknadslisten, ikke til kvitteringsskjermen, og `#/kvittering` sender meg til søknadslisten
- [ ] Gitt en testbruker med rollen Leser på test-siden når hen prøver å skrive til `soknader`, `behov`, `innkjop`, `fakturaer`, `givere`, `leverandorer` eller `innstillinger` utenom skjermen så avviser Firestore skrivingen
- [ ] Gitt en invitert leser når hen logger inn første gang så blir raden i `brukere` aktiv og navnet kan settes – ingenting annet kan skrives
- [ ] Gitt en bruker med en rolle reglene ikke kjenner når hen prøver å skrive så avvises det (skriverett gis bare til `bruker` og `administrator`)
- [ ] Gitt `?demo=leser` når jeg åpner dev så er jeg innlogget som en leser i demodataene
- [ ] Gitt at reglene er endret når kortet leveres så sier svaret fra om at HELE `firebase/firestore.rules` må limes inn i prod, test og `soknadsportal-restore` – og at det må gjøres FØR noen får rollen Leser

## Avgrensning

- Ingen tilgangsstyring per søknad for leseren (det er det revisor-rollen har).
- Ingen kommentarer eller godkjenning fra leseren.
- Filer i Storage sperres bare i skjermen: en leser som går utenom skjermen kan teknisk sett laste opp eller slette filer, som revisor kan i dag. Bevisst godtatt (B-30); sikkerhetskopien dekker filene.
- Ingen kvitteringsopplasting fra mobil for leseren, og ingen tilpasning av skjermene til smal skjerm (B-22).
- Ingen egne, forenklede leseskjermer.

## Grilling

Grillet 2026-10-05 (intervju med brukeren, ett spørsmål om gangen).

**Avklart i intervjuet**

- **Hva leseren ser:** alt en vanlig bruker ser – Behov, alle søknader med alle faner, og Innstillinger (Organisasjon, Givere, Leverandører). Ingen tildeling per søknad.
- **Håndheving:** Firestore-reglene nekter leseren all skriving (reell sperre). Filer i Storage sperres bare i skjermen, som for revisor – Storage-reglene kan ikke slå opp rollen uten serverdel (B-20). Bevisst godtatt: rollen skal hindre uhell, ikke stå imot angrep.
- **Skjermene:** de samme som for brukere, uten redigering (felt som tekst, ingen handlingsknapper, ingen dra og slipp), med merket «Leserett» i toppmenyen. Lesing, filtrering, sidepanel, bilag og nedlasting av PDF virker.
- **Rollen:** heter «Leser» (`leser`), settes av administrator i brukerlisten. Kan ikke tildeles som revisor.
- **Reglene snus til hviteliste:** i dag er `erBruker()` «ikke revisor», så en ny rolle ville fått full skriverett. Skriverett gis heretter bare til `bruker` og `administrator`. Reglene må derfor limes inn i alle tre databasene FØR noen får rollen.
- **Egen brukerrad:** leseren kan gjøre seg selv aktiv og sette navnet ved første innlogging, som alle andre.
- **Innstillinger og lampe:** ikke fanen Brukere (bare administrator ser den i dag); statuslampen for sikkerhetskopien vises som for brukere.
- **Mobil:** ingen kvitteringsskjerm for leseren; på smal skjerm havner hen i søknadslisten (B-22).

**Punktene**

1. **Kollisjon med beslutningsloggen.** Endrer bevisst B-09 (to roller) og B-23 (revisor som tredje rolle) – ført som B-30. Holder B-09s «ingen rettigheter per søknad». B-20: ingen serverdel, derfor Storage-begrensningen. B-22: ingen ny mobilskjerm. B-29: leseren kan ikke endre givere. B-02: brukeren har bedt om rollen.
2. **Datamodell.** Ingen nye felt – bare en ny verdi i `brukere.<epost>.rolle`. Skrivebeskyttelsen utledes av rollen.
3. **Migrering og data i drift.** Ingen migrering. Eksisterende brukere uten `rolle` regnes fortsatt som bruker. Risikoen ligger i rekkefølgen: reglene først, så rollen.
4. **Låser vi oss?** Nei. Hvitelisten gjør senere roller tryggere. Tildeling per søknad kan komme senere via `tilgang`, som for revisor.
5. **Er det nødvendig?** Ja – i dag må styreleder enten få full skriverett eller ikke slippe inn. Revisor-rollen dekker det ikke (bare tildelte søknader, bare Revisjon). Å dele PDF-rapporter løser ikke innsyn i behov og pågående søknader.
6. **Hvordan verifiseres det?** Skjermene på dev med `?demo=leser`. Regelsperren kan bare bekreftes på test med en testbruker med rollen Leser (reglene gjelder ikke i demo). Ingen ny testinfrastruktur.
7. **Sikkerhetskopien (B-24, B-25).** Ingen nye samlinger, felt eller lagringssteder; ingenting skriver automatisk. Reglene i `soknadsportal-restore` må oppdateres sammen med de andre.

Faller ut som ny beslutning: B-30.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-05: Bygget og sett på dev med `?demo=leser`. Skjermene skrivevernes felles i `app.js` (`skrivevern()`, `LESEHANDLINGER`), datalaget avviser skriving for en leser, og reglene har hviteliste. Gjenstår å bekrefte på test: regelsperren med en ekte testbruker med rollen Leser (krever at reglene er limt inn først).
