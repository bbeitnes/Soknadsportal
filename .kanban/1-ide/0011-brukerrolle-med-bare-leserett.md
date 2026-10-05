---
id: 0011
tittel: Brukerrolle med bare leserett
status: idé
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

Utkast – spisses i grillingen.

- [ ] Gitt at jeg er administrator når jeg åpner brukerlisten så kan jeg velge rollen «Leser» for en bruker
- [ ] Gitt at jeg er logget inn som leser når jeg åpner Behov, Søknader og en søknad (alle faner) så ser jeg det samme som en bruker, men ingen felt kan redigeres og ingen knapper som oppretter, sletter eller laster opp er tilgjengelige
- [ ] Gitt at jeg er logget inn som leser når jeg prøver å skrive direkte mot databasen så avviser reglene i `firebase/firestore.rules` skrivingen
- [ ] Gitt at jeg er logget inn som leser når jeg åpner en søknad så kan jeg åpne dokumenter og bilag og laste ned revisjonsrapporten

## Avgrensning

- Ingen tilgangsstyring per søknad for leseren (det er det revisor-rollen har) – med mindre grillingen sier noe annet.
- Ingen kommentarer eller godkjenning fra leseren.
- Åpent til grillingen: skal leseren se Innstillinger (givere, leverandører, organisasjon), brukerlisten og mobilskjermen for kvitteringer?

## Grilling

_Fylles av `planlegging.mjs svar 0011` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.
