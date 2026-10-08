---
id: 0019
tittel: Språkmodell i portalen: utkast, vurdering og forkorting i Tekst-fanen
status: idé
opprettet: 2026-10-08
---

# 0019 · Språkmodell i portalen: utkast, vurdering og forkorting i Tekst-fanen

## Brukerhistorie

Som **bruker** som skriver en søknad i Tekst-fanen, ønsker jeg å få utkast,
vurdering og forkorting rett i portalen – uten å gå veien om Claude.ai eller
ChatGPT med «Kopier underlag» – slik at jeg kan jobbe videre med teksten der
den ligger, felt for felt, og se med en gang om den svarer på giverens spørsmål
og holder seg innenfor grensen.

## Kontekst

Trinn 1 (kort 0018, B-34) ga datamodellen, Tekst-fanen og «Kopier underlag».
Underlaget er det samme som en innebygd modell trenger (`skrivunderlag()` i
`beregning.js`). Det som gjenstår er å sende det til en modell fra portalen og
få svaret inn i feltene.

Dette kortet forutsetter at trinn 1 er prøvd på NMR-søknaden og at svaret var
«ja, men to vinduer er tungvint» – ikke «teksten ble ikke bedre». Ble teksten
ikke bedre, hjelper ikke en innebygd modell, og kortet skal forkastes.

Hindringene er ikke pris (godt under én krone per utkast), men:

- **Nøkkelen.** `app/` er statiske filer (B-05) og nøkkelen kan ikke ligge i
  nettleseren uten å være åpen for alle som har tilgang til portalen.
- **B-19** (portalen snakker ikke med eksterne tjenester) og **B-20** (ingen
  serverfunksjoner). Begge må tas opp på nytt og bruddet føres som beslutning.

Alternativene fra gjennomgangen i kort 0018:

| | Hvor nøkkelen ligger | Serverdel | Modell | Vurdering |
|---|---|---|---|---|
| A. Liten mellomtjener på ProISP (PHP) | Fil utenfor webrota, skrevet av deploy-jobben fra GitHub-secret som `FIREBASE_API_KEY` i dag | Ja, ett PHP-skript som sjekker Firebase ID-token og videresender | Claude (Anthropic API) | Robust, felles for alle brukere, samme deploy som i dag. Første serverkode. |
| B. Firebase AI Logic | Ingen egen nøkkel; sperret med App Check | Nei (Google kjører den) | Gemini | Minst å drifte, men Googles modell og tettere binding til Firebase. |
| C. Nøkkel i nettleseren (BYOK) | localStorage per bruker | Nei | Claude | Bare som eksperiment: hver bruker trenger egen nøkkel, og nøkkel på en delt PC er en risiko. Committes ikke. |

Anbefalingen fra gjennomgangen er A, med C som rask prøve underveis.

## Akseptansekriterier

Grove kriterier – spisses når trinn 1 er vurdert og veien (A/B) er valgt.

- [ ] Gitt Tekst-fanen, når jeg trykker «Skriv utkast» på et tomt felt, så
      fylles feltet med et forslag innenfor grensen, bygget på samme underlag
      som «Kopier underlag», og forslaget er merket som utkast til jeg redigerer
      det eller godtar det. Ingenting lagres før jeg godtar.
- [ ] Gitt et felt med tekst, når jeg trykker «Vurder», så vises en kort
      vurdering ved feltet: om teksten svarer på giverens spørsmål
      (hjelpeteksten), hva som mangler, og om den er over grensen. Vurderingen
      lagres ikke.
- [ ] Gitt et felt over grensen, når jeg trykker «Forkort til grensen», så får
      jeg et forslag innenfor grensen som jeg kan godta eller forkaste.
- [ ] Gitt at kallet feiler (nett, nøkkel, kvote), så vises feilen i
      toppmenyen som andre feil, og «Kopier underlag» virker fortsatt.
- [ ] Gitt leser eller revisor, så finnes ingen av knappene.
- [ ] Gitt `?demo`, så svarer en oppdiktet modell (fast tekst) uten nett.
- [ ] Gitt at nøkkelen ligger utenfor repoet (B-08), så inneholder git aldri
      nøkkelen, og portalen får bare bruke modellen med gyldig innlogging.
- [ ] Gitt vurderingen etter NMR-søknaden (notat på kort 0018), så bygges dette
      bare hvis teksten ble bedre av underlaget.

## Avgrensning

- Ingen chat. Tre faste oppdrag (utkast, vurdering, forkorting) per felt.
- Modellen skriver aldri direkte i Firestore; brukeren godtar hvert forslag.
- Ingen lesing av tidligere søknadstekster (opplastede dokumenter) i første
  omgang – kan bli eget kort.
- Ingen språkmodell andre steder i portalen (ikke behov, ikke rapporten).
- Veivalg A/B/C avgjøres i grillingen, ikke her.

## Grilling

_Fylles av `planlegging.mjs svar 0019` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

Venter på vurderingen av trinn 1 (kort 0018) etter NMR-søknaden. Gjennomgangen
av alternativene står i Notater på kort 0018.

Grilling påbegynt og stoppet 2026-10-08 etter ett spørsmål: sperren står – kortet tas ikke før
vurderingen av trinn 1 (kort 0018) er skrevet. Vi prøver først om «Kopier underlag» og Claude.ai/ChatGPT
holder. Fakta funnet til veivalget: deploy skriver nøkkelfil fra GitHub-secret og laster opp med SFTP;
dev-containeren er ren Apache (`httpd`) uten PHP, så vei A trenger et `php-apache`-bilde på dev eller en
oppdiktet modell i demo.

