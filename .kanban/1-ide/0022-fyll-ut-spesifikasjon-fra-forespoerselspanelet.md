---
id: 0022
tittel: Fyll ut spesifikasjon fra forespørselspanelet
status: idé
opprettet: 2026-10-11
---

# 0022 · Fyll ut spesifikasjon fra forespørselspanelet

## Brukerhistorie

Som **bruker** ønsker jeg å fylle ut spesifikasjonen på behovene rett fra
panelet «Tilbudsforespørsel» når panelet sier at linjer mangler den, slik at
jeg kan rette det der jeg oppdager mangelen – uten å gå til Behov-siden og
åpne hvert behov for seg.

## Kontekst

Kort 0020 ga behovet feltet `spesifikasjon` (merke, modell, størrelse – det
leverandøren trenger) og holdt `beskrivelse` (vår begrunnelse) utenfor
forespørselen. Feltet er nytt, og ingenting flyttes automatisk: i eksisterende
data står modellbetegnelsen i beskrivelsen, så kolonnen «Spesifikasjon» i
forespørselen er tom for de fleste linjer, og panelet sier «N linjer mangler
spesifikasjon. Den settes på behovet (Behov → Spesifikasjon)». I praksis må
brukeren da gå ut av Innkjøp, inn på Behov, åpne hvert behov, klippe modellen
ut av beskrivelsen og lime den i spesifikasjonen, og tilbake – for hver linje.

Panelet vet alt som trengs: `tilbudsforesporsel()` gir radene, og hver rad kan
bære behovets id. Spesifikasjonen lagres som alle andre felt: `data-felt=
"behov/<id>/spesifikasjon"`, lagring ved blur (B-03), «Lagret» i toppmenyen.
Forhåndsvisningen tegnes på nytt når behovet endres, så tabellen oppdaterer
seg selv. Frie linjer i innkjøpet (uten behov) har ingen spesifikasjon og kan
ikke fylles ut her.

Forhåndsutfylling med beskrivelsen er en snarvei for det vanlige tilfellet
(modellen står der). Den skrives ikke før brukeren lagrer feltet, og
beskrivelsen røres ikke – brukeren fjerner selv begrunnelsen fra den etterpå
hvis ønskelig.

## Akseptansekriterier

- [ ] Gitt panelet «Tilbudsforespørsel» med linjer som mangler spesifikasjon,
      så erstattes varselteksten av en liste «Mangler spesifikasjon» med én rad
      per behov: varenavnet og et tekstfelt for spesifikasjonen, forhåndsfylt
      med behovets beskrivelse (tom hvis beskrivelsen er tom).
- [ ] Gitt at jeg endrer feltet og går ut av det (blur eller Enter), så lagres
      verdien på `behov.<id>.spesifikasjon`, toppmenyen viser «Lagret», raden
      forsvinner fra listen og spesifikasjonen står i tabellen under.
- [ ] Gitt at jeg lar det forhåndsfylte stå urørt og går ut av feltet, så
      lagres ingenting (ingen endring = ingen lagring, som i resten av portalen).
- [ ] Gitt at samme behov står på flere linjer (delt linje, eller to søknader),
      så står det én gang i listen.
- [ ] Gitt en fri linje i innkjøpet (uten behov), så står den ikke i listen,
      og tabellen viser tom spesifikasjon for den.
- [ ] Gitt at alle linjene har spesifikasjon, så vises verken varsel eller
      liste.
- [ ] Gitt at jeg er leser, så vises listen skrivebeskyttet (`skrivevern()`),
      og ingenting lagres.
- [ ] Gitt at jeg skriver i et felt, så tegnes ikke panelet på nytt mens
      feltet har fokus (regelen i `tegn()`), og det jeg har skrevet beholdes.

## Avgrensning

- Beskrivelsen endres ikke automatisk; begrunnelsen blir stående der til
  brukeren rydder den selv.
- Ingen masseflytting «beskrivelse → spesifikasjon» for alle behov i ett
  trykk. Hvert behov tas for seg, med brukeren som leser teksten.
- Ikke på Behov-siden; der er feltet alt i panelet.
- Ingen endring i selve forespørselen (innhold, kolonner, kopiering).

## Grilling

_Fylles av `planlegging.mjs svar 0022` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

- Lagt inn 2026-10-11. Brukeren så at modellbetegnelsen manglet i
  forespørselen på egne data: den står i «Beskrivelse» fra før feltet
  «Spesifikasjon» fantes (kort 0020). Valgte dette framfor å flytte manuelt per
  behov.
