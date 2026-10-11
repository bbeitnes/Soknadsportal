---
id: 0021
tittel: Tilbudsforespørsel som PDF
status: idé
opprettet: 2026-10-11
---

# 0021 · Tilbudsforespørsel som PDF

## Brukerhistorie

Som **bruker** ønsker jeg å laste ned tilbudsforespørselen som PDF, med samme
tabell som den jeg kopierer inn i e-posten, slik at leverandører som vil ha et
dokument (til arkivet sitt, til å skrive ut, eller fordi e-postklienten deres
kaster tabellen) får forespørselen som vedlegg.

## Kontekst

Kort 0020 ga «Tilbudsforespørsel» i Innkjøp: et sidepanel med forhåndsvisning
og «Kopier», som legger en HTML-tabell (Nr · Antall · Vare · Spesifikasjon ·
Pris · Rabatt · Nettopris, typene som mellomtitler) og ren tekst på
utklippstavlen. Innholdet kommer fra `tilbudsforesporsel()` i `beregning.js`
(data) og `foresporselHtml()` i `ui/foresporsel.js` (HTML). PDF-en ble bevisst
holdt utenfor 0020 (grillingen Q5) og avtalt som «eventuelt neste steg».

PDF-en skal bruke **samme data** fra `tilbudsforesporsel()` – ingen ny
beregning – og tegnes med pdf-lib som bestillingen (`ui/bestilling.js`:
A4, Helvetica, tabell med sidebrytning, `hentPdfLib()` fra `ui/rapport.js`).
Bestillingen har allerede hjelpefunksjonene for tekst, høyrestilling, strek,
tabellhode og ny side; de bør deles, ikke kopieres.

Som i 0020: lik for alle leverandørene (ingen «TIL»), ingenting lagres (ulikt
bestillingen, B-32), portalen sender ingenting (B-19). Brukeren laster ned og
legger ved selv.

## Akseptansekriterier

- [ ] Gitt panelet «Tilbudsforespørsel» i Innkjøp, så står knappen «Last ned
      PDF» ved siden av «Kopier».
- [ ] Gitt at jeg trykker «Last ned PDF», så lastes det ned
      «Tilbudsforespørsel ‹innkjøpets navn› ‹dato›.pdf» med overskriften
      «Tilbudsforespørsel», dagens dato og «Ref.: ‹innkjøpets navn›»,
      introlinjen, tabellen med de sju kolonnene (de tre siste tomme, typene
      som mellomtitler i matrisens rekkefølge), «Slik ønsker vi tilbudet»,
      «Leveres til» og signaturlinjen – samme innhold som forhåndsvisningen.
- [ ] Gitt flere linjer enn det er plass til på én side, så fortsetter
      tabellen på neste side med tabellhodet gjentatt (som bestillingen).
- [ ] Gitt at PDF-en lages, så lagres ingenting på innkjøpet, leverandørene
      eller i Storage.
- [ ] Gitt at jeg er leser, så kan jeg laste ned PDF-en (lesehandling); gitt at
      jeg er revisor, så finnes ikke panelet.
- [ ] Gitt `ui/bestilling.js` og PDF-en for forespørselen, så deler de
      hjelpefunksjonene for side, tekst, strek og tabellhode (ingen kopiert
      kode).

## Avgrensning

- Ingen mottaker i PDF-en; samme dokument til alle leverandørene.
- PDF-en lagres ikke i Storage og lages ikke som en «bestilling»; ingen liste
  over sendte forespørsler.
- Ingen endring i innholdet: det er `tilbudsforesporsel()` som bestemmer, og
  endringer der gjelder e-post og PDF likt.
- Ingen e-post fra portalen (B-19).

## Grilling

_Fylles av `planlegging.mjs svar 0021` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

- Lagt inn 2026-10-11 som avtalt neste steg etter kort 0020 (PDF ble tatt ut av
  0020 i grillingen, Q5, og brukeren bekreftet «vi venter litt med PDF'en, det
  blir evt. neste steg»).
