# Søknadsportal

Erstatter Bestillingsportal (som IKKE skal endres). Kravene står i `spec.md`,
skjermbildene i prototypene `*.dc.html` i rota. Designsystemet (Modernist) er
kopiert til `app/design/modernist.css`. Manuelt oppsett i Firebase: `OPPSETT.md`.

Svar på norsk i chatten. Kode, UI-tekst, kommentarer og commits på norsk bokmål.

## Hovedregler fra spec
- Forenkle. Ikke bygg inn funksjonalitet som ikke er beskrevet — spør først.
- Ingen lagreknapper: felt lagres ved blur, «Lagret»/feil vises i toppmenyen.
- Minimal scrolling: faner, faste tabelloverskrifter/sumrader, detaljer i sidepanel.
- Bygges i trinn a–e, og brukeren tester mellom hvert.

## Mappekart
| Sti | Ansvar |
|---|---|
| `app/` | Alt som publiseres (deployes med SFTP) |
| `app/config/` | Miljøvalg (demo/test/prod), Firebase-klientoppsett |
| `app/data/` | Lagring + alle beregninger. ENESTE sted som snakker med Firebase |
| `app/data/beregning.js` | Rene funksjoner (status, summer, filtre) — testes med node |
| `app/ui/` | Felles UI: format, felt-lagring, lagrestatus, sidepanel, utskrift |
| `app/sider/` | Én fil per skjerm: `tegn()` gir HTML, `klikk()` håndterer knapper |
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

## Kjøre lokalt
- Preview-serveren `soknadsportal` (`.claude/launch.json`) serverer `app/`.
- `http://localhost:8430/?demo` = data i minnet, ingen innlogging. `demoFeil = true`
  i konsollen simulerer lagringsfeil.
- Uten `?demo` på localhost brukes testdatabasen (krever innlogging).
