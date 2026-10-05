---
id: 0012
tittel: Momskompensasjon per år i revisjonsrapporten
status: idé
opprettet: 2026-10-05
---

# 0012 · Momskompensasjon per år i revisjonsrapporten

## Brukerhistorie

Som **den som fører regnskapet** ønsker jeg å se forventet momskompensasjon fordelt på året den kommer, med totalsum, slik at jeg vet hvor mye vi får tilbake hvert år når innkjøpene på én tildeling strekker seg over flere år.

## Kontekst

Noen givere krever at forventet momskompensasjon trekkes ut av det de dekker (B-18). Rapporten og
Revisjon viser i dag momskompensasjonen som én sum per type (`fordelingPerKategori()`), uten
tidsdimensjon. Kompensasjonen utbetales året etter kjøpet: kjøper vi noe i 2026 og noe i 2027 på
samme tildeling, kommer pengene i henholdsvis 2027 og 2028. Regnskapet trenger beløpet per år, og
det er uryddig å måtte regne det ut for hånd fra fakturaene.

## Akseptansekriterier

Utkast – spisses i grillingen.

- [ ] Gitt en søknad til en giver med momskompensasjon og fakturaer i både 2026 og 2027 når jeg lager revisjonsrapporten så viser den en oppstilling med én rad per år: kjøpsår, året kompensasjonen ventes (kjøpsår + 1) og beløpet
- [ ] Gitt samme søknad når jeg ser oppstillingen så står det en totalsum nederst som er lik momskompensasjonen ellers i rapporten
- [ ] Gitt en søknad der alle kjøp er gjort samme år når jeg lager rapporten så viser oppstillingen én rad og totalsummen
- [ ] Gitt en søknad til en giver uten momskompensasjon når jeg lager rapporten så vises ingen slik oppstilling (B-18)

## Avgrensning

- Ingen oversikt på tvers av søknader (samlet momskompensasjon per år for hele organisasjonen) – kan bli eget kort.
- Ingen oppfølging av om kompensasjonen faktisk er mottatt.
- Åpent til grillingen: hva bestemmer året – fakturadatoen? Hva med poster uten faktura og egeninnsats? Hvordan fordeles årene når egne midler trekkes fra først (B-18 fordeler bare på summer)? Skal oppstillingen også vises i Revisjon på skjerm?

## Grilling

_Fylles av `planlegging.mjs svar 0012` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.
