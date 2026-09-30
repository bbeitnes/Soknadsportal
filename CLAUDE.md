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
  tilbudsrunde: linjer, leverandorer{leverandorId,frakt,vedlegg}, priser[lid][sid].raa, valgt[lid]),
  `leverandorer` (register), `fakturaer` (løpenummer per søknad, dekker{innkjopId|lid} eller
  {utgift|uid}, fraMobil).
- Priser lagres slik de ble skrevet («1200 -15%»); `tolkPris()` gir netto.
- Behov har `type` (fritekst: Instrument, Uniform …). En søknadslinje kan overstyre med
  `linjer.<id>.type`; null = arv fra behovet (`linjetype()`). Behovslisten og søknadens
  behovstabell grupperes på type med delsum (`grupperPerType()`).
- Manuell rekkefølge med dra og slipp (`data-dra` / `data-slippmal`, håndteres i `app.js` →
  sidens `slipp()`): behov har `rekkefolge` innen typen; felles typerekkefølge ligger i
  `innstillinger/<orgId>.typeRekkefolge`; søknader har egen `typeRekkefolge` og linjenes
  `rekkefolge`. `innstillinger` er valgfri ved oppstart (tom liste hvis reglene mangler).
- Import av behov fra regneark: `tolkBehovimport()`; `IMPORTFELT` er det panelet viser og
  testes mot det som faktisk gjenkjennes.
- Mobil: `#/kvittering` (default-rute på smal skjerm). `ui/bilde.js` gjør om store bilder til JPEG.
- Revisjonsrapporten (`ui/rapport.js`) bruker pdf-lib fra cdnjs og `getBytes` fra Storage — krever CORS på bøtta (OPPSETT.md §6).
- Endres `firebase/firestore.rules`, må HELE filen limes inn i Console for
  begge databasene — si fra om det i svaret.

## Kjøre lokalt
- Preview-serveren `soknadsportal` (`.claude/launch.json`) serverer `app/`.
- `http://localhost:8430/?demo` = data i minnet, ingen innlogging. `demoFeil = true`
  i konsollen simulerer lagringsfeil.
- Uten `?demo` på localhost brukes testdatabasen (krever innlogging).
