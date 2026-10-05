---
id: 0012
tittel: Momskompensasjon per år i revisjonsrapporten
status: testes
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

Eksempel: 8 %, fakturert 60 000,00 i 2026 og 40 000,00 i 2027, egne midler 20 000,00.

- [ ] Gitt eksempelet når jeg lager revisjonsrapporten så står totallinjen «Fra momskompensasjon (8 %)» med 6 400,00 på forsiden, uten teksten «neste år», og under den én linje per år: «Kjøp i 2026 – ventes mottatt 2027» 3 840,00 og «Kjøp i 2027 – ventes mottatt 2028» 2 560,00
- [ ] Gitt en søknad der alle fakturaer er datert samme år (2026) når jeg lager rapporten så står det «Fra momskompensasjon (8 %) – ventes mottatt 2027» på én linje, uten underlinjer
- [ ] Gitt at en faktura mangler dato når jeg lager rapporten så får den en egen underlinje «Uten dato» uten mottaksår, også når alle de andre er fra samme år
- [ ] Gitt en kreditnota datert et annet år enn fakturaen den retter når jeg lager rapporten så trekker den ned beløpet for sitt eget år (et år med bare kreditnota får negativt beløp)
- [ ] Gitt flere underlinjer når jeg summerer dem så blir summen nøyaktig lik totallinjen på øret (øreresten ligger på siste linje)
- [ ] Gitt en post med egeninnsats når jeg lager rapporten så gir den ingen momskompensasjon og ingen egen årslinje
- [ ] Gitt en søknad til en giver uten momskompensasjon når jeg lager rapporten så er forsiden uendret (B-18)
- [ ] Gitt `?demo` når jeg åpner demodataene så finnes det en søknad med momskompensasjon og fakturaer i to år som viser oppstillingen

## Avgrensning

- Ingen oversikt på tvers av søknader (samlet momskompensasjon per år for hele organisasjonen) – eget kort hvis behovet melder seg.
- Ingen visning i Revisjon-fanen på skjerm – bare PDF-rapporten.
- Ingen oppfølging av om kompensasjonen faktisk er mottatt.
- Ikke noe eget felt for regnskapsår, og ingen kobling mellom kreditnota og fakturaen den retter.
- Fakturadato blir ikke påkrevd.

## Grilling

Grillet 2026-10-05 (intervju med brukeren, ett spørsmål om gangen).

**Avklart i intervjuet**

- **Kjøpsår:** året i fakturadatoen (`fakturaer.<id>.dato`). Kompensasjonen ventes året etter. Ikke eget felt for regnskapsår.
- **Egne midler:** deles forholdsmessig på årene etter fakturert beløp, så hvert år får samme andel av kompensasjonen som det har av det fakturerte. Én regel enten egne midler står på varene eller som egenandel på søknaden.
- **Fakturaer uten dato:** egen rad «Uten dato» uten mottaksår. Rapporten stoppes ikke, og året gjettes ikke.
- **Hvor:** bare på forsiden i PDF-rapporten, som underlinjer under totallinjen «Fra momskompensasjon». Ikke i Revisjon-fanen.
- **Kreditnota:** følger sin egen dato. Et år kan få negativt beløp.
- **Ett kjøpsår:** årstallet står i selve linjen («ventes mottatt 2027»), uten underlinjer. Underlinjer kommer ved flere år eller når noe er uten dato.
- **Avrunding:** hvert år avrundes til øre; øreresten legges på siste rad, så underlinjene summerer nøyaktig til totalen.
- **Egeninnsats:** gir ingen kompensasjon og hører ikke til noe år.

**Punktene**

1. **Kollisjon med beslutningsloggen.** Berører B-18 (moms fordeles bare på summer) – holdes: fordelingen per år er fortsatt på summer, ikke per linje. B-15: alt utledes. B-20: rapporten lages fortsatt i nettleseren med de samme tre delene. B-02: brukeren har bedt om det. Ingen brudd, ingen ny beslutning.
2. **Datamodell.** Ingen nye felt. Året utledes av fakturadatoen, beløpet av fakturert, egne midler og momsprosenten.
3. **Migrering og data i drift.** Ingen. Eksisterende fakturaer uten dato havner i raden «Uten dato».
4. **Låser vi oss?** Nei. Regelen blir en ren funksjon i `beregning.js`, som en samleoversikt på tvers av søknader eller en skjermvisning kan bygge på senere.
5. **Er det nødvendig?** Ja – i dag sier rapporten «forventes mottatt neste år», som er feil når kjøpene går over flere år, og regnskapet må regne ut fordelingen for hånd. Enklere variant (bare rette teksten) gir ikke tallet per år.
6. **Hvordan verifiseres det?** Tester i `test/` for to år, ett år, uten dato, kreditnota og ørerest. Demodataene får en søknad med fakturaer i to år, så rapporten kan ses på `localhost:8430/?demo`. Ingen ny testinfrastruktur.
7. **Sikkerhetskopien (B-24, B-25).** Ikke berørt: ingen nye samlinger, felt eller lagringssteder, og ingenting skriver automatisk.

Reglene i `firebase/firestore.rules` endres ikke. `revisjonsavtrykk()` endres ikke, så gamle godkjenninger står.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-05: Bygget. `momsPerAr()` i `beregning.js` med fem tester, underlinjene på forsiden i `ui/rapport.js`, og demosøknaden «Uniformer 2026» har fakturaer i 2025 og 2026 (240,00 = 144,00 + 96,00). «Instrumenter til aspirantkorpset 2026» viser ett-års-varianten.
