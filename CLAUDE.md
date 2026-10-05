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
| `backup/` | Sikkerhetskopi og gjenoppretting (Node + npm, publiseres ikke). Oppskrift: OPPSETT.md §9 |
| `test/` | `node --test test/` |

## Konvensjoner
- Vanilla JS, ES-moduler, ingen byggesteg og ingen npm i `app/`.
- Bare `app/data/lager-firebase.js` importerer Firebase. Sider bruker `data/index.js`.
- Firebase API-nøkkelen skal ALDRI i git (repoet er offentlig). Den ligger i
  `app/config/api-nokkel.js` (i `.gitignore`); deploy-jobbene skriver filen fra GitHub-secret
  `FIREBASE_API_KEY`. Bytte og begrensninger: OPPSETT.md §8.
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
  {utgift|uid}, fraMobil, merknad – fritekst som vises i fakturalisten og PDF-rapporten). Negativt
  `belop` = kreditnota. Avvik regnes per post (`fakturertPerPost()`: en faktura som dekker flere
  poster fordeles etter tilbudt pris); avvik per faktura vises bare når den er alene om postene.
  Rapporten tar med samme bilagsfil én gang («se faktura N»).
- Alle beløp vises med to desimaler: `kr()` (= `belop()`) gir «8 060,80» / «12 000,00». `heltall()`
  er for antall og redigerbare `tall`-felt. Fakturaer, løse utgifter og kvitteringer lagres med øre
  (felttype `belop`, `tolkBelop()`); antall og estimater lagres som hele tall (`tall`, `tolkTall()`).
  Summer i beregningslaget avrundes til øre.
- Priser lagres slik de ble skrevet («1200 -15%»); `tolkPris()` gir netto.
- Tilbudspanelet (`•••` i en priscelle) kobler prisen til et tilbudsdokument (vedlegg + side) og
  har feltet `alternativ` (leverandøren tilbyr et annet produkt). E-posttekst limes inn og lagres
  som et `.txt`-vedlegg. Alternativet vises i matrisen, i Revisjon og i PDF-ens «Gjelder» (`posttittel()`).
- «Les priser fra tilbudet» (leverandørpanelet, per PDF-vedlegg): `ui/pdftekst.js` leser linjene med
  pdf.js fra cdnjs (tabulator mellom tabellceller; tekst som ligger oppå annen tekst blir egen
  celle), `tolkTilbudslinjer()` finner varelinjene (antall, enhetspris, rabatt – også «4,00 Stk» og
  rabatt uten %-tegn; er prosenten avrundet, brukes linjesummen / antall som pris uten rabatt),
  `foreslaKobling()` foreslår varelinje ut fra navn. Brukeren retter i
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
- Ny leverandør fra søknaden (kort 0007): `leverandorpanel()` i `sider/leverandorer.js` er registerpanelet
  og brukes også i Innkjøp («+ Opprett … og legg til» åpner det etterpå, `ui.panel.type === 'register'`)
  og i Revisjon («+ Legg … i leverandørregisteret» under fakturaens leverandørfelt når navnet er ukjent,
  `leverandorIRegister()`). I Revisjon ligger det oppå fakturapanelet (`ui.leverandor`); lukkes det, vises
  fakturaen igjen og får registernavnet (`lukkLeverandor()`). Fakturaens leverandør er fortsatt fritekst.
- Taster i sidepanel (B-28): Enter lagrer feltet, Escape angrer (er feltet uendret, lukker den panelet),
  ⌘/Ctrl+Enter trykker på `nesteknapp()` («+ Ny …» nederst i panelet, `data-handling="neste"`). Faktura,
  behov, leverandør (bare i registeret) og giver har den. Sidens `klikk()` venter på `ferdigLagret()` og
  oppretter ingen ny hvis posten er urørt (`erTomPost()`, verdiene må følge `opprett…()` i `data/index.js`).
- Bestilling: `bestilling()` (beregning) gir linjene som er valgt hos én leverandør; `ui/bestilling.js`
  lager PDF-en med pdf-lib. Knappen ligger i leverandørpanelet i Innkjøp. Portalen sender den ikke.
- En vare fordeles på flere leverandører ved å dele innkjøpslinjen (`delInnkjopslinje()`): to linjer
  med samme `soknadLinjeId`, hver med sitt antall og sin valgte leverandør. `valgt[lid]` er fortsatt
  én leverandør per linje. Priser fra «Les priser» gjelder alle delene av en delt linje.
- Tabellene er bevisst tette (lav radhøyde). I matrisen står antallet til høyre for varenavnet.
- Hengelås på søknaden: `erLast()` (status ≠ utkast, ingen eget felt). I Søknad-fanen er da det vi
  søkte om skrivebeskyttet (søkte linjer, egenandel, søkt beløp, momsprosent, giver; `skrivevern()`),
  og «+ Behov fra listen» / «+ Fri linje» er slått av der – endret behov legges til i Innkjøp.
  Linjer med `etterSoknad`, innvilget beløp, tittel, frist, sendt, status og dokumenter er åpne.
  Låses opp ved å sette status til Utkast; fra innvilget/avsluttet kreves `confirm()`.
- Linjer lagt til i en søknad som ikke lenger er utkast får `etterSoknad: true` og `notat` (fritekst).
  De teller ikke i `sumEstimert()`/søkt beløp (`soktLinjer()` / `tilleggslinjer()`), men går i innkjøp,
  pott og revisjon. PDF-rapporten viser dem ikke spesielt (bare på skjerm).
- Rammen for bruken er alltid tilskudd + egne midler. `soknader.<id>.egenandel` er egenandelen i
  søknaden (trekkes fra i `soktForslag()`); `egenandelValg` ('belop' standard / 'andel') avgjør om
  den beholdes eller justeres forholdsmessig når innvilget ≠ søkt (`egenandel()`).
- Egne midler på varen: `egneMidler` (beløp med øre) på innkjøpslinjen
  (`innkjop.<id>.linjer.<lid>.egneMidler`, settes i tilbudspanelet for den valgte prisen) eller på en
  løs utgift (settes i Revisjon). Teller bare når linjen har valgt pris (`innkjopsberegning().egne`).
- `pott()`: `egne` = egenandelen hvis den er satt, ellers summen på varene (`fordelt`). Er
  egenandelen satt, viser beløpene på varene bare hvor den går (avvik varsles i topplinjen).
  `ramme` = innvilget + egne; `disponert` = det som belaster giveren; `disponertRamme` = brukt av
  rammen; `gjenstar` = ramme − disponertRamme. `fordelingPerKategori()` gir sluttoppgjøret per type
  (kostnad, egne midler, fra giver, momskomp.) til Revisjon og PDF-rapporten.
- Planlagte utgifter (B-27): en fri linje i søknaden kan plukkes inn i Utgifter («+ Fra søknaden»,
  `leggLinjerIUtgifter()`), og en løs utgift kan kobles til en linje (`kobleUtgiftTilLinje()`). Utgiften
  får `utgifter.<uid>.soknadLinjeId`; «planlagt» lagres ikke. `utgiftsliste()` henter da beskrivelse og
  type fra linjen (utgiftens egen type gjelder bare når linjen ikke har noen) og gir `planlagt` og
  `sokt`. Beløpet på utgiften er det faktiske; estimatet står på linjen. `kanBliUtgift()`: frie, søkte
  linjer som verken ligger i et innkjøp eller har en utgift (én utgift per linje, flere fakturaer på
  utgiften). `ikkeFordelte()` utelukker linjer med utgift, og en linje med utgift kan ikke fjernes fra
  søknaden (`linjerMedUtgift()`). Koblingen inngår ikke i `revisjonsavtrykk()`.
- Egeninnsats (dugnad): `utgifter.<uid>.egeninnsats = true` (avkrysning i Utgifter-fanen). Estimert
  verdi uten faktura; hele beløpet er egne midler (`utgiftEgne()`). Posten får `egeninnsats`, teller
  ikke som «mangler faktura», kan ikke kobles til faktura, og rapporten regner den som brukt
  («Brukt i alt») og lister den under fakturaoversikten.
- En løs utgift kan ha `type` (valgfritt, fritekst som for behov). Da får posten `kategori` og regnes
  inn i den typen i `fordelingPerKategori()`; uten type havner den i gruppen «Andre utgifter».
- Behovsstatus «Finansiert»: det er valgt en pris for søknadslinjen i et innkjøp
  (`finansierteLinjer()` → `behovsinfo(…, finansierte)`; sider henter settet med `finansierte()`).
  Det gamle krysset `linjer.<id>.finansieres` er fjernet fra skjermen og leses ikke lenger.
- Anskaffet antall i behovslisten: `anskaffetPerBehov()` – valgt innkjøpslinje som er dekket av en
  faktura eller ligger i et innkjøp med status «Fakturert». Sider henter kartet med `anskaffet()`.
- Behov har `type` (fritekst: Instrument, Uniform …). En søknadslinje kan overstyre med
  `linjer.<id>.type`; null = arv fra behovet (`linjetype()`). Behovslisten og søknadens
  behovstabell grupperes på type med delsum (`grupperPerType()`).
- En fri linje i innkjøpet (uten `soknadLinjeId`) kan ha egen `type` (`innkjop.<id>.linjer.<lid>.type`,
  feltet ved siden av beskrivelsen i matrisen). `innkjopslinjetype()` gir typen for alle innkjøpslinjer;
  den brukes i matrisens grupper og som `kategori` i revisjonspostene.
- Manuell rekkefølge med dra og slipp (`data-dra` / `data-slippmal`, håndteres i `app.js` →
  sidens `slipp()`): behov har `rekkefolge` innen typen; felles typerekkefølge ligger i
  `innstillinger/<orgId>.typeRekkefolge`; søknader har egen `typeRekkefolge` og linjenes
  `rekkefolge`. `innstillinger` er valgfri ved oppstart (tom liste hvis reglene mangler).
- Import av behov fra regneark: `tolkBehovimport()`; `IMPORTFELT` er det panelet viser og
  testes mot det som faktisk gjenkjennes.
- Roller: `bruker`, `administrator`, `revisor` (`brukere.<epost>.rolle`; `erAdmin()`, `erRevisor()`).
  Revisor (B-23) ser bare søknader der e-posten står i `soknader.<id>.tilgang` (liste), og der bare
  pottlinjen, Revisjon (skrivebeskyttet) og dokumentene. Ruten er `#/revisor` (liste,
  `sider/revisor.js`) og `#/soknad/<id>`; alt annet sender revisoren til listen (`lesRute()` i
  `app.js`). `startLytting()` henter for revisor søknadene med `array-contains` på `tilgang` og
  innkjøp/fakturaer per tildelt søknad (`lager.lytt(…, filter)`); brukerlisten leses ikke.
  Reglene i `firebase/firestore.rules` er den reelle sperren – skjermen bare skjuler.
- Revisorer tildeles i Søknad-fanen (`settRevisor()`, bare brukere med rollen Revisor). Hver revisor
  har sin egen oppføring `soknader.<id>.revisorer.<nøkkel>` = `{ epost, navn, godkjent: { tid,
  avtrykk }, merknad }` (`revisornokkel()`: e-posten med alt annet enn a–z/0–9 som «_», samme i
  reglene). Bare revisoren selv kan skrive den (`oppdaterSoknad()` gjør det for revisor og setter
  ikke «sist endret»); brukere og administratorer kan ikke røre `revisorer`. NB: `soknader.<id>.revisjon`
  er det gamle av/på-krysset (boolsk) – ikke bland de to.
- Godkjenning: `revisjonsavtrykk()` er et avtrykk (versjon «v1») av rammen, valgte priser/antall/frakt/
  egne midler, løse utgifter og fakturaene (ikke typer, titler, merknader, status). `revisorstatus()`
  gir 'godkjent' / 'endret' / 'ikke' per tildelt revisor ved å sammenligne med avtrykket nå –
  gyldigheten lagres ikke. Godkjenning krever status Avsluttet (også i reglene); ingenting låses.
  Endres det som inngår i avtrykket, må versjonen økes, og gamle godkjenninger blir «endret».
  Rapporten viser status per revisor nederst på forsiden.
- Revisor kan kommentere enkeltfakturaer: `revisorer.<nøkkel>.kommentarer.<fakturaId>` = `{ tekst, tid }`,
  skrevet fra fakturapanelet (`revisorfelt()` legger på tidspunkt og sletter når feltet tømmes).
  `fakturakommentarer()` gir kommentarene fra tildelte revisorer; fakturalisten får merket «Kommentar»,
  og panelet viser dem. Bare på skjerm: ikke i rapporten, ikke i avtrykket, ingen svar.
- Innlogging: Google eller Firebase e-postlenke. Administrator kan sende lenken til en bruker fra
  brukerlisten (`sendInnloggingslenkeTil()`); Firebase sender e-posten, portalen ser aldri lenken.
- Mobil: `#/kvittering` (default-rute på smal skjerm). `ui/bilde.js` gjør om store bilder til JPEG.
  Kvitteringsbilder fra mobil lagres som PDF (`bildeTilPdf()`: bildet på én A4-side); går det ikke,
  lagres bildet. PDF-en lages i bakgrunnen mens brukeren skriver beløpet (`ui.pdf` er et løfte).
  Opplasting på PC (Revisjon) krymper bilder på samme måte (`klargjorBilde()`, maks 2000 px);
  PDF-er lagres som de er.
- Søkbar kvitterings-PDF: `ui/tekstgjenkjenning.js` leser ordene med Tesseract.js (cdnjs;
  motor og norsk språkpakke fra jsdelivr), og `bildeTilPdf()` legger dem usynlig oppå bildet. Feiler
  det eller tar over 30 s, lagres PDF-en uten tekst.
- Revisjonsrapporten (`ui/rapport.js`) bruker pdf-lib fra cdnjs og `getBytes` fra Storage — krever CORS på bøtta (OPPSETT.md §6).
- «Oversikt over fakturaer» i rapporten lister det fakturaen gjelder linje for linje under
  fakturaraden, med netto stykkpris og tilbudt sum (`navn`, `antall`, `stykkpris` på posten). Postene
  grupperes som på forsiden (`grupperFakturaposter()` → `kategorigrupper()`), med mellomtittel bare
  når fakturaen har flere typer. Typen «Instrument»/«Instrumenter» sorteres i partiturrekkefølge
  (`partiturplass()`, fast liste i `beregning.js`), resten alfabetisk. Ingen sum eller avvik per faktura.
- Rapporten krymper store bilder (`ui/bildekrymp.js`: maks 1600 px på lengste side, men minst
  1000 px på korteste; JPEG-kvalitet 0,6), både løse bildebilag og bilder inne i PDF-bilag – JPEG
  (DCTDecode) og tapsfritt lagrede (FlateDecode, typisk «skriv ut til PDF» av et foto). Tekst og
  vektorgrafikk i PDF-er røres ikke, og originalen i Storage endres ikke. Et bilde byttes bare når
  det blir minst 20 % mindre.
- Endres `firebase/firestore.rules`, må HELE filen limes inn i Console for
  alle tre databasene (prod, test og `soknadsportal-restore`) — si fra om det i svaret.
- Sikkerhetskopi (`backup/`, B-24/B-25): `kopier.mjs` (nattlig GitHub-jobb, bare leserett) legger
  alle samlinger + filer kryptert på ProISP; `hent.mjs` henter til Mac; `gjenopprett.mjs` legger en
  kopi i `soknadsportal-restore` (restore-test) eller, med `--mal soknadsportal` og bekreftelse, i
  prod. Logikken i `backup/lib/kjerne.mjs` kjenner verken Firebase eller SFTP og testes i
  `test/sikkerhetskopi.test.js`. Bare `backup/lib/firebase.mjs` snakker med Google.
  Kopien tar alle samlinger den finner, men nye lagringssteder utenfor `STORAGE_PREFIKS` må legges til.
  Dokumenter lagrer filstier MED miljøprefiks; gjenopprettingen skriver dem om (`byttPrefiks()`).
- Statuslampe for sikkerhetskopien (B-26): jobbene legger `sikkerhetskopi-status.json` (bare tidspunkt,
  antall, bestått – `flettStatus()` i `backup/lib/status.mjs`) i portalens mapper på ProISP.
  `hentKopistatus()` leser filen (ved innlogging, hver halvtime og når Innstillinger åpnes),
  `kopistatus()` i `beregning.js` gir fargen (grønn < 26 t, gul < 50 t, rød, grå = ukjent).
  Prikken i toppmenyen (`#kopilampe`, tegnes i `app.js`) har tekst bare når den er gul/rød; detaljene
  står under Innstillinger → Organisasjon. Revisor og mobilskjermen ser den ikke. På dev finnes ingen
  fil (grå); i `?demo` styres den med `?demo&kopialder=30` i adressen (timer, `ukjent` = grå) eller `demoKopiAlder = 30` i konsollen.

## Kjøre lokalt (dev)
- Dev-serveren er en Docker-container (`docker-compose.yml`, Apache som på ProISP, `app/` montert
  inn). Den står på `http://localhost:8430` og kommer opp sammen med Docker. Svarer den ikke:
  `docker compose up -d`. Preview-oppsettet `soknadsportal` (`.claude/launch.json`) kobler seg til
  den og starter ingen egen server.
- **Arbeidsflyt: dev → test → prod.** Alle endringer vises først på dev. Push til `test` først når
  brukeren har sett på dem der og sier fra.
- `http://localhost:8430/?demo=revisor` = samme demodata, innlogget som revisoren Rita (tildelt to
  søknader; «Noteskap og notemapper 2025» er Avsluttet og kan godkjennes). Reglene gjelder ikke i demo.
- `http://localhost:8430/?demo` = data i minnet, ingen innlogging. `demoFeil = true`
  i konsollen simulerer lagringsfeil.
- Uten `?demo` på localhost brukes testdatabasen (krever innlogging).
- `http://localhost:8430/?restore` = databasen restore-testen fyller (`soknadsportal-restore`). Virker bare på localhost.
