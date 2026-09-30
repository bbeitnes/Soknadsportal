# Søknadsportal

Erstatter Bestillingsportal (som IKKE skal endres). Kravene står i `spec.md`,
skjermbildene i prototypene `*.dc.html` i rota. Designsystemet (Modernist) er
kopiert til `app/design/modernist.css`. Manuelt oppsett i Firebase: `OPPSETT.md`.

Svar på norsk i chatten. Kode, UI-tekst, kommentarer og commits på norsk bokmål.

## Hovedregler fra spec
- Forenkle. Ikke bygg inn funksjonalitet som ikke er beskrevet — spør først.
- Ingen lagreknapper: felt lagres ved blur, «Lagret»/feil vises i toppmenyen.
- Minimal scrolling: faner, faste tabelloverskrifter/sumrader, detaljer i sidepanel.
- Bygget i trinn a–e (alle ferdige per 2026-09-30); brukeren tester på test-siden mellom endringer.

## Mappekart
| Sti | Ansvar |
|---|---|
| `app/` | Alt som publiseres (deployes med SFTP) |
| `app/config/` | Miljøvalg (demo/test/prod), Firebase-klientoppsett |
| `app/data/` | Lagring + alle beregninger. ENESTE sted som snakker med Firebase |
| `app/data/beregning.js` | Rene funksjoner (status, summer, filtre) — testes med node |
| `app/ui/` | Felles UI: format, felt-lagring, lagrestatus, sidepanel, utskrift |
| `app/sider/` | Én fil per skjerm: `tegn()` gir HTML, `klikk()` håndterer knapper. `innkjop.js` er Innkjøp-fanen og kalles fra `soknad.js` |
| `firebase/` | Regler som limes inn manuelt i Firebase Console |
| `docker-compose.yml` | Lokal dev-server (publiseres ikke) |
| `test/` | `node --test test/` |

## Konvensjoner
- Vanilla JS, ES-moduler, ingen byggesteg og ingen npm i `app/`.
- Bare `app/data/lager-firebase.js` importerer Firebase. Sider bruker `data/index.js`.
- UI bygges som `innerHTML`-strenger → alt brukerinnhold gjennom `escapeHtml()`.
- Redigerbare felt merkes `data-felt="samling/id/feltsti"` (se `ui/felt.js`).
  `app.js` lagrer ved focusout hvis verdien er endret. Søknadslinjer ligger som
  kart (`linjer.<id>.antall`) så hvert felt lagres for seg: siste lagring per
  felt vinner.
- Knapper merkes `data-handling="…"` og håndteres i sidens `klikk()`.
- Siden tegnes på nytt ved dataendring, men ALDRI mens et felt har fokus eller
  museknappen er nede (det ville revet bort fokus/klikk). Se `tegn()` i `app.js`.
- Alle dokumenter har `organisasjonId`; `lytt()` filtrerer på det.
- Samlinger: `brukere` (ID = e-post), `givere`, `behov`, `soknader` (linjer,
  utgifter og dokumenter som kart på dokumentet), `innkjop` (én per
  tilbudsrunde: linjer, leverandorer{leverandorId,frakt,vedlegg}, priser[lid][sid]{raa,alternativ,vedleggId,side,tekst}, valgt[lid]),
  `leverandorer` (register), `fakturaer` (løpenummer per søknad, dekker{innkjopId|lid} eller
  {utgift|uid}, fraMobil).
- Priser lagres slik de ble skrevet («1200 -15%»); `tolkPris()` gir netto.
- Tilbudspanelet (`•••` i en priscelle) kobler prisen til et tilbudsdokument (vedlegg + side) og
  har feltet `alternativ` (leverandøren tilbyr et annet produkt). E-posttekst limes inn og lagres
  som et `.txt`-vedlegg. Alternativet vises i matrisen, i Revisjon og i PDF-ens «Gjelder» (`posttittel()`).
- «Les priser fra tilbudet» (leverandørpanelet, per PDF-vedlegg): `ui/pdftekst.js` leser linjene med
  pdf.js fra cdnjs (tabulator mellom tabellceller), `tolkTilbudslinjer()` finner varelinjene
  (antall, enhetspris, rabatt), `foreslaKobling()` foreslår varelinje ut fra navn. Brukeren retter i
  panelet, og `settTilbudspriser()` skriver `raa`, `vedleggId`, `side` og `tekst` (leverandørens
  varetekst) i én skriving. Ekte tilbud til utvikling ligger i `eksempler/` (i `.gitignore` –
  repoet er offentlig). Testene bruker oppdiktede tilbud.
- I «Les priser» kan en tilbudslinje settes til «+ Ny linje» (noe leverandøren tilbyr som vi ikke
  har spurt om): den blir en fri linje i innkjøpet. Leses tilbudet på nytt, gjenopprettes koblingene
  fra `vedleggId` + `tekst` på prisene, og filteret «Ikke koblet» viser resten.
- Toppmeny: Behov · Søknader · Innstillinger. Innstillinger samler Organisasjon (`#/innstillinger`),
  Givere (`#/givere`), Leverandører (`#/leverandorer`) og Brukere (`#/givere/brukere`) med felles
  faner (`innstillingsmeny()`); sidene har `meny: 'innstillinger'`.
- `innstillinger/<orgId>` har `typeRekkefolge` og kontaktinfoen vår (orgNavn, orgNr, kontaktperson,
  telefon, epost, adresse, leveringsadresse, fakturainfo) som flate felt. Skrives alltid med
  `lager.flett()` (setDoc merge) – aldri `sett()`, som ville slettet de andre feltene.
- Bestilling: `bestilling()` (beregning) gir linjene som er valgt hos én leverandør; `ui/bestilling.js`
  lager PDF-en med pdf-lib. Knappen ligger i leverandørpanelet i Innkjøp. Portalen sender den ikke.
- Tabellene er bevisst tette (lav radhøyde). I matrisen står antallet til høyre for varenavnet.
- Linjer lagt til i en søknad som ikke lenger er utkast får `etterSoknad: true` og `notat` (fritekst).
  De teller ikke i `sumEstimert()`/søkt beløp (`soktLinjer()` / `tilleggslinjer()`), men går i innkjøp,
  pott og revisjon. PDF-rapporten viser dem ikke spesielt (bare på skjerm).
- Anskaffet antall i behovslisten: `anskaffetPerBehov()` – valgt innkjøpslinje som er dekket av en
  faktura eller ligger i et innkjøp med status «Fakturert». Sider henter kartet med `anskaffet()`.
- Behov har `type` (fritekst: Instrument, Uniform …). En søknadslinje kan overstyre med
  `linjer.<id>.type`; null = arv fra behovet (`linjetype()`). Behovslisten og søknadens
  behovstabell grupperes på type med delsum (`grupperPerType()`).
- Manuell rekkefølge med dra og slipp (`data-dra` / `data-slippmal`, håndteres i `app.js` →
  sidens `slipp()`): behov har `rekkefolge` innen typen; felles typerekkefølge ligger i
  `innstillinger/<orgId>.typeRekkefolge`; søknader har egen `typeRekkefolge` og linjenes
  `rekkefolge`. `innstillinger` er valgfri ved oppstart (tom liste hvis reglene mangler).
- Import av behov fra regneark: `tolkBehovimport()`; `IMPORTFELT` er det panelet viser og
  testes mot det som faktisk gjenkjennes.
- Innlogging: Google eller Firebase e-postlenke. Administrator kan sende lenken til en bruker fra
  brukerlisten (`sendInnloggingslenkeTil()`); Firebase sender e-posten, portalen ser aldri lenken.
- Mobil: `#/kvittering` (default-rute på smal skjerm). `ui/bilde.js` gjør om store bilder til JPEG.
- Revisjonsrapporten (`ui/rapport.js`) bruker pdf-lib fra cdnjs og `getBytes` fra Storage — krever CORS på bøtta (OPPSETT.md §6).
- Endres `firebase/firestore.rules`, må HELE filen limes inn i Console for
  begge databasene — si fra om det i svaret.

## Kjøre lokalt (dev)
- Dev-serveren er en Docker-container (`docker-compose.yml`, Apache som på ProISP, `app/` montert
  inn). Den står på `http://localhost:8430` og kommer opp sammen med Docker. Svarer den ikke:
  `docker compose up -d`. Preview-oppsettet `soknadsportal` (`.claude/launch.json`) kobler seg til
  den og starter ingen egen server.
- **Arbeidsflyt: dev → test → prod.** Alle endringer vises først på dev. Push til `test` først når
  brukeren har sett på dem der og sier fra.
- `http://localhost:8430/?demo` = data i minnet, ingen innlogging. `demoFeil = true`
  i konsollen simulerer lagringsfeil.
- Uten `?demo` på localhost brukes testdatabasen (krever innlogging).
