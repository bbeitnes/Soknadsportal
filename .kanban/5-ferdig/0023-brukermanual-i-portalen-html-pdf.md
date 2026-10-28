---
id: 0023
tittel: Brukermanual i portalen (HTML + PDF)
status: ferdig
opprettet: 2026-10-28
---

# 0023 · Brukermanual i portalen (HTML + PDF)

## Brukerhistorie

Som **bruker, leser, revisor eller administrator** ønsker jeg en brukermanual
jeg kan lese inne i portalen og laste ned som PDF, skrevet for min rolle, slik
at jeg finner ut hvordan skjermene og arbeidsgangene henger sammen uten å
spørre den som satte opp portalen.

## Kontekst

Portalen har hjelpetekster i skjermene, men ingen samlet beskrivelse av
rollene, skjermbildene og arbeidsgangene. Nye styremedlemmer, en leser i
styret og eksterne revisorer trenger noe de kan lese på forhånd og ta ut på
papir. Bedt om 2026-10-28; ni avklaringer i chatten samme dag (se Grilling).

**Løsning:** én HTML-side, `app/hjelp.html`, uten byggesteg og uten innlogging,
med utskrifts-CSS og knappen «Last ned som PDF» (nettleserens utskrift, med
innholdsfortegnelse og sidetall der nettleseren støtter det). Lenken «Hjelp»
står i toppmenyen for alle roller, på innloggingsskjermen og nederst på
mobilskjermen (Kvittering). Revisor får `hjelp.html?rolle=revisor`, som bare
viser innledningen og revisorkapitlet. Versjon og dato står øverst.

Innhold: roller · komme i gang (innlogging, lagring uten lagreknapper,
sidepaneler, taster) · ett avsnitt per skjermbilde · seks arbeidsganger i
detalj (ny søknad fra behov til sendt; innkjøp med tilbud og bestilling;
fakturaer og revisjon; kvittering fra mobil; årshjul og frister;
revisorgodkjenning) · begreper (pott, ramme, egenandel, egne midler,
momskompensasjon …) · egne kapitler for leser, revisor og administrator ·
vanlige spørsmål. Ingen skjermbilder; knappenavn i fet skrift.

## Akseptansekriterier

- [ ] Gitt at jeg er logget inn (bruker, administrator, leser eller revisor),
      når jeg ser på toppmenyen, så står lenken «Hjelp» til høyre, og den åpner
      manualen i en ny fane.
- [ ] Gitt innloggingsskjermen, så står det en lenke til brukermanualen under
      skjemaet, og den virker uten innlogging.
- [ ] Gitt mobilskjermen (Kvittering, første steg), så står det en liten
      «Hjelp»-lenke nederst.
- [ ] Gitt at jeg er revisor, så åpner «Hjelp» manualen med bare innledningen
      (roller, komme i gang) og revisorkapitlet, og en lenke til hele manualen.
- [ ] Gitt manualen, så har den versjon og dato øverst, en innholdsfortegnelse,
      og kapitler for: roller, komme i gang, hvert skjermbilde (Behov, Søknader,
      Søknad med fanene Søknad/Tekst/Innkjøp/Utgifter/Revisjon, Årshjul,
      Innstillinger med Organisasjon/Givere/Leverandører/Brukere, Kvittering),
      seks arbeidsganger, begreper, leser, revisor, administrator og vanlige
      spørsmål.
- [ ] Gitt manualen, så stemmer knappenavn, fanenavn og statusnavn med det som
      står på skjermen i portalen (f.eks. «+ Behov fra listen», «Billigst per
      linje», «Revisjonsrapport (PDF)», «Godkjenn revisjon»).
- [ ] Gitt at jeg trykker «Last ned som PDF», så åpnes nettleserens
      utskriftsdialog, og utskriften har hvert hovedkapittel på ny side, uten
      knappene og menyen fra skjermen.
- [ ] Gitt manualen på en smal skjerm, så kan den leses uten sidelengs
      rulling.
- [ ] Gitt CLAUDE.md, så står det at et kort som endrer skjermen også
      oppdaterer manualen og datoen øverst.

## Avgrensning

- Ingen skjermbilder (blir utdaterte ved hver endring).
- Oppsett i Firebase (OPPSETT.md) er ikke med; administratorkapitlet dekker bare
  det som gjøres i portalen.
- Ingen PDF laget med pdf-lib og ingen ferdig PDF-fil i repoet: PDF-en lages
  av nettleseren ved utskrift.
- Ingen søkefunksjon, ingen hjelp per felt («?»-ikoner) og ingen lenker fra
  skjermene inn til riktig kapittel – kan komme som eget kort.
- Manualen skrives for et korps («korpset»), ikke nøytralt.
- Ingen engelsk utgave.

## Grilling

Ikke grillet med `/grill-me`. Avklart med ni spørsmål i chatten 2026-10-28, alle
besvart «enig» av brukeren:

1. **Form:** HTML-side i `app/` med utskrifts-CSS og «Last ned som PDF» via
   nettleserens utskrift (ikke pdf-lib, ikke ferdig PDF-fil).
2. **Hvor:** «Hjelp» i toppmenyen for alle roller, også fra innloggingsskjermen;
   liten lenke nederst på mobilskjermen.
3. **Én manual** med kapitler per rolle; revisorkapitlet kan skrives ut alene,
   og revisor ser bare det i portalen.
4. **Omfang:** oversikt per skjermbilde pluss seks arbeidsganger i detalj.
5. **Uten skjermbilder.** Knappenavn i fet skrift og små tabeller.
6. **Målgruppe:** styremedlemmer og tillitsvalgte uten teknisk bakgrunn, i et
   korps.
7. **Administratorkapitlet:** bare det som gjøres i portalen, ikke Firebase.
8. **Vedlikehold:** regel i CLAUDE.md om at kort som endrer skjermen oppdaterer
   manualen; dato og versjon øverst.
9. **Kanban:** eget kort uten grilling.

Mot beslutningsloggen: B-02 (bare det som er bedt om – ingen søk, ingen
felthjelp), B-05 (ingen byggesteg – ren HTML-fil), B-06 (ingen data – siden
leser ingenting fra Firebase), B-30 (leser får lenken; den åpner bare en side).
Ingen nye felt, ingen regler, ingen migrering. Verifiseres ved å åpne siden på
dev i `?demo`, `?demo=leser` og `?demo=revisor`, og ved utskrift til PDF.

**Konklusjon:** neste.

## Notater

- Lagt inn 2026-10-28 etter spørsmål i chatten: «Kan du lage en brukermanual
  til Søknadsportalen? Ta hensyn til roller og funksjoner … Den skal kunne tas
  ut i PDF, og finnes som en del av Søknadsportalen.»
- Bygget 2026-10-28: `app/hjelp.html` (ti kapitler, seks arbeidsganger, rollefilter
  `?rolle=revisor`, utskrifts-CSS), «Hjelp» i toppmenyen (`#hjelp` i `index.html`,
  satt i `visMeg()` i `app.js`, skjult på mobilskjermen i `app.css`), «Brukermanual →»
  på innloggingsskjermen, «Hjelp» nederst i Kvittering, regel i CLAUDE.md. Sjekket på
  dev: full visning, `?rolle=revisor` (bare kapittel 1, 2 og 8), smal skjerm uten
  sidelengs rulling, lenkene i `?demo`, `?demo=revisor`, `?demo=leser` og på
  innloggingsskjermen. Skrevet ut til PDF med Chrome: 22 sider, innholdsfortegnelse
  på forsiden, topptekst og sidetall, nytt kapittel på ny side. Gjenstår for brukeren:
  lese gjennom teksten og prøve «Last ned som PDF» i sin egen nettleser (Safari viser
  ikke sidetall i margen).
