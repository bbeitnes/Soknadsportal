# Beslutningslogg

Valg som er tatt, og som nye kort skal grilles mot. Et kort som bryter med noe
her er ikke nødvendigvis feil — men bruddet skal være bevisst og begrunnet i
kortet, ikke oppdaget etterpå.

Formatet er bevisst kort: **hva** vi bestemte, **hvorfor**, og **når det snur**.
Loggen skrives kun ved å legge til på slutten.

---

## B-01 · Søknadsportal er et nytt prosjekt – Bestillingsportal røres ikke
**Bestemt** 2026-09-29.
Bestillingsportal ble for tung, for rigid og for tett bygget rundt én søknad. Stack, innlogging og hosting gjenbrukes derfra, men datamodell, skjermbilder og forretningslogikk kopieres ikke.
**Snur når:** Aldri for selve Bestillingsportal. Import av data derfra kan vurderes senere (se åpne spørsmål).
**Konsekvens for nye kort:** Ingen kort får endre Bestillingsportal eller hente inn datamodellen eller logikken dens.

## B-02 · Forenkle – bygg bare det som er beskrevet, spør først
**Bestemt** 2026-09-29.
Hovedprinsippet i spec.md. Forgjengeren døde av innebygd «smartness»; hver ekstra funksjon må vedlikeholdes av frivillige.
**Snur når:** Brukeren ber uttrykkelig om funksjonen.
**Konsekvens for nye kort:** Kortet skal kunne peke på et uttalt behov. Det som ikke er bedt om, hører hjemme i Avgrensning – ikke i kriteriene.

## B-03 · Ingen lagreknapper – felt lagres ved blur, siste lagring per felt vinner
**Bestemt** 2026-09-29.
Absolutt designkrav. Felt merkes `data-felt`, `app.js` lagrer ved focusout, og «Lagret»/feil vises i toppmenyen. Samtidig redigering løses ved at hvert felt lagres for seg.
**Snur når:** Snur ikke uten at brukeren sier det.
**Konsekvens for nye kort:** Nye skjermer får ingen lagre-/avbryt-knapper. Data som redigeres må kunne skrives felt for felt. Siden tegnes aldri på nytt mens et felt har fokus eller museknappen er nede.

## B-04 · Minimal scrolling – faner, faste overskrifter og sumrader, detaljer i sidepanel
**Bestemt** 2026-09-29.
Absolutt designkrav. Skjermene scroller ikke som helhet, bare tabellen. Tabellene er bevisst tette (lav radhøyde).
**Snur når:** Snur ikke uten at brukeren sier det.
**Konsekvens for nye kort:** Nytt innhold legges i fane, sidepanel eller sammenleggbart panel – ikke som en lengre side. Ingen kortvisninger i stedet for tabell.

## B-05 · Vanilla JS med ES-moduler – ingen byggesteg og ingen npm i `app/`
**Bestemt** 2026-09-29.
Gjenbrukt fra Bestillingsportal: `app/` lastes opp som den er med SFTP til ProISP. Biblioteker (Firebase, pdf-lib, pdf.js, Tesseract.js) hentes fra CDN når de trengs. UI bygges som `innerHTML`-strenger med `escapeHtml()` på alt brukerinnhold.
**Snur når:** Et bibliotek vi må ha finnes ikke på CDN, eller koden blir for stor til å holdes uten rammeverk.
**Konsekvens for nye kort:** Ingen rammeverk, bundler eller TypeScript. Nye avhengigheter lastes fra CDN ved behov og må tåle å feile. Én fil per skjerm i `app/sider/` med `tegn()` og `klikk()`.

## B-06 · Bare `app/data/` snakker med Firebase – beregninger er rene funksjoner
**Bestemt** 2026-09-29.
Bare `lager-firebase.js` importerer Firebase; sidene bruker `data/index.js`. Alt som regnes ut ligger i `beregning.js` og testes med `node --test` uten nettleser. Det gir også demo-modus (`?demo`) med data i minnet.
**Snur når:** Vi bytter lagring – da er det nettopp dette skillet som gjør det mulig.
**Konsekvens for nye kort:** Ny logikk legges i `beregning.js` med test. Sider importerer aldri Firebase. Ny funksjonalitet må virke i `?demo`.

## B-07 · Firebase: samme prosjekt som Bestillingsportal, egne navngitte databaser
**Bestemt** 2026-09-29.
Firestore-databasene `soknadsportal` (prod) og `soknadsportal-test` i prosjektet skiensskolemusikk-b5cbc, med egen regelfil. Storage er felles bøtte med prefiks `soknadsportal/{test|prod}`. Alle dokumenter har `organisasjonId`. Regler og CORS settes manuelt i Console (OPPSETT.md).
**Snur når:** Vi får automatisert utrulling av regler, eller trenger eget Firebase-prosjekt.
**Konsekvens for nye kort:** Endres `firebase/firestore.rules`, må hele filen limes inn i begge databasene – kortet skal si det. Nye samlinger trenger regel og `organisasjonId`.

## B-08 · Firebase API-nøkkelen skal aldri i git
**Bestemt** 2026-10-01.
Repoet er offentlig. Nøkkelen ligger i `app/config/api-nokkel.js` (i `.gitignore`), og deploy-jobbene skriver filen fra GitHub-secret `FIREBASE_API_KEY`. Ekte tilbud til utvikling ligger av samme grunn i `eksempler/` utenfor git.
**Snur når:** Aldri så lenge repoet er offentlig.
**Konsekvens for nye kort:** Ingen nøkler, ekte tilbud eller persondata i filer som committes. Tester bruker oppdiktede data.

## B-09 · Innlogging med Google eller e-postlenke – to roller, ingen finmaskede rettigheter
**Bestemt** 2026-09-29.
Tilgang styres av samlingen `brukere` (ID = e-post) med rolle Bruker/Administrator. Bruker kan alt i søknadene; administrator vedlikeholder i tillegg brukere og givere. Leverandørregisteret er åpent for alle. Finmaskede rettigheter er uttrykkelig utenfor versjon 1.
**Snur når:** Organisasjonen får behov for å skjerme enkelte søknader eller faser.
**Konsekvens for nye kort:** Ingen rettigheter per søknad, fase eller felt. Ingen passord i portalen.

## B-10 · Arbeidsflyt dev → test → prod
**Bestemt** 2026-10-03.
Alle endringer vises først på dev (`localhost:8430`, Docker). Push til `test` skjer først når brukeren har sett på dem og sier fra, og prod kommer etter test. Brukeren tester mellom endringene.
**Snur når:** Snur ikke uten at brukeren sier det.
**Konsekvens for nye kort:** Et kort er ikke «testes» før det kan vises på dev, og ingenting pushes uten klarsignal.

## B-11 · Linjer, utgifter og dokumenter ligger som kart på dokumentet
**Bestemt** 2026-09-29.
Søknadslinjer (`linjer.<id>.antall`), utgifter, dokumenter og innkjøpets linjer/priser er kart, ikke lister eller undersamlinger. Da kan hvert felt skrives for seg, som B-03 krever.
**Snur når:** Et dokument nærmer seg Firestores grense på 1 MB.
**Konsekvens for nye kort:** Nye gjentakende data på en søknad eller et innkjøp legges som kart med id-nøkler og feltsti `samling/id/feltsti`. Lister som må skrives om i ett stykke, unngås.

## B-12 · Priser er alltid stykkpris og lagres slik de ble skrevet – ingen totalrabatt
**Bestemt** 2026-09-29.
Cellen lagrer råteksten («1200 -15%»); `tolkPris()` gir netto, og sammenligning skjer alltid på netto stykkpris. Hver celle er en selvstendig pris uavhengig av hva annet som velges. Frakt er fast beløp per leverandør og teller bare når noe er valgt der.
**Snur når:** Leverandørene bare gir pakkepriser vi ikke får delt opp.
**Konsekvens for nye kort:** Ingen rabatt på tvers av linjer, ingen modus for «alt til én». Nye prisfelt lagrer det brukeren skrev, ikke det utregnede.

## B-13 · Én valgt leverandør per innkjøpslinje – fordeling skjer ved å dele linjen
**Bestemt** 2026-10-03.
`valgt[lid]` er én leverandør. Skal en vare kjøpes hos flere, deles linjen (`delInnkjopslinje()`) i to med samme `soknadLinjeId`. Det holder matrisen og alle summer enkle. (Ført inn i ettertid fra CLAUDE.md.)
**Snur når:** Deling viser seg for tungvint i praksis.
**Konsekvens for nye kort:** Ingen kort får innføre antall per leverandør i samme celle.

## B-14 · Beløp har øre og vises med to desimaler – antall og estimater er hele tall
**Bestemt** 2026-10-03.
Fakturaer, løse utgifter, kvitteringer og egne midler lagres med øre (`belop`, `tolkBelop()`); antall og estimater som hele tall (`tall`). `kr()` viser alltid to desimaler, og summer avrundes til øre i beregningslaget. Negativt fakturabeløp er kreditnota. (Ført inn i ettertid fra CLAUDE.md; spec.md sa opprinnelig «12 000».)
**Snur når:** Snur ikke – regnskapet må stemme på øret.
**Konsekvens for nye kort:** Nye beløpsfelt bruker felttypen `belop` og vises med `kr()`. Avrunding skjer i `beregning.js`, ikke i sidene.

## B-15 · Det som kan utledes, lagres ikke
**Bestemt** 2026-10-03.
Hengelåsen er `erLast()` (status ≠ utkast), «Finansiert» er at det er valgt en pris i et innkjøp, anskaffet antall kommer fra fakturerte innkjøp, og disponert/gjenstår regnes av `pott()`. Det gamle krysset `finansieres` ble fjernet nettopp fordi det kunne komme i utakt. (Ført inn i ettertid fra CLAUDE.md.)
**Snur når:** En utledning blir for treg eller for vanskelig å forklare. Manuell overstyring (som behovsstatus «Trengs ikke») er lov når den er uttalt.
**Konsekvens for nye kort:** Kort som vil lagre en status, sum eller et flagg må vise at verdien ikke kan regnes ut av det som finnes.

## B-16 · Det vi søkte om er låst når søknaden er sendt – endringer legges til som tillegg
**Bestemt** 2026-09-30.
Søkte linjer, egenandel, søkt beløp, momsprosent og giver er skrivebeskyttet når status ≠ utkast. Det som kommer til etterpå får `etterSoknad: true` og et fritekst-notat – ingen strukturert «erstatter»-kobling, fordi vi også kjøper ting som ikke sto på lista. Tilleggene teller ikke i søkt beløp, og vises bare på skjerm, ikke i PDF-rapporten.
**Snur når:** Givere begynner å kreve at endringer dokumenteres i rapporten.
**Konsekvens for nye kort:** Ingen kort får endre søkte tall i ettertid uten opplåsing (status til Utkast, med bekreftelse fra innvilget/avsluttet).

## B-17 · Rammen er alltid tilskudd + egne midler – egenandelen på søknaden styrer
**Bestemt** 2026-10-03.
Er egenandelen satt, er den egne midler, og beløpene på varene viser bare hvor den går (avvik varsles). Uten egenandel er egne midler summen på varene. `egenandelValg` avgjør om den beholdes som beløp eller følger innvilget/søkt. Egeninnsats (dugnad) er en løs utgift uten faktura der hele beløpet er egne midler. (Ført inn i ettertid fra CLAUDE.md og spec.md.)
**Snur når:** Snur ikke uten at brukeren sier det.
**Konsekvens for nye kort:** Alt som viser «gjenstår» eller «disponert» skal bruke `pott()`. Nye kostnadstyper må si hvordan de teller mot rammen.

## B-18 · Momskompensasjon fordeles bare på summer
**Bestemt** 2026-09-29.
Innstillingen ligger på giveren og arves til søknaden. Tilbudsmatrisen påvirkes ikke; fordelingen giver/momskompensasjon skjer på summer i søknad, pott og rapport. Egne midler trekkes fra først, resten deles.
**Snur når:** En giver krever fordeling per linje.
**Konsekvens for nye kort:** Ingen momskolonner i matrisen. Søknader til givere uten innstillingen viser ingen ekstra kolonner.

## B-19 · Portalen er regnskapet for søknaden – ingen integrasjoner, og den sender ingenting selv
**Bestemt** 2026-09-29.
Ingen kobling mot regnskapssystem og ingen e-postvarsler. Innsending av søknaden skjer utenfor portalen, bestillings-PDF-en lastes ned og sendes av brukeren, og innloggingslenker sendes av Firebase – portalen ser dem aldri.
**Snur når:** Organisasjonen tar i bruk et regnskapssystem som bør få bilagene direkte.
**Konsekvens for nye kort:** Ingen kort får sende e-post eller snakke med eksterne systemer uten at denne beslutningen tas opp på nytt.

## B-20 · PDF-er lages i nettleseren – originalene i Storage endres aldri
**Bestemt** 2026-09-29.
Revisjonsrapporten (forside, oversiktstabell, alle bilag med løpenummer) og bestillingen lages med pdf-lib på klienten. Rapporten krymper bilder i kopien den lager; det som er lastet opp, røres ikke. Unntaket er selve opplastingen: bilder krympes og kvitteringer fra mobil gjøres om til søkbar PDF før de lagres.
**Snur når:** Rapportene blir for tunge for nettleseren.
**Konsekvens for nye kort:** Ingen serverfunksjoner. Nye rapporter bygges i `app/ui/` med pdf-lib. Rapporten beholder de tre delene sine.

## B-21 · Søknadsteksten lagres bare som opplastet dokument
**Bestemt** 2026-09-29.
Teksten skrives utenfor portalen og lastes opp i Dokumenter-listen. Skriving i portalen er utsatt (se åpne spørsmål).
**Snur når:** Brukeren ber om å skrive søknadsteksten i portalen.
**Konsekvens for nye kort:** Ingen teksteditor før spørsmålet er avklart.

## B-22 · Portalen er laget for PC – mobil er bare kvitteringsopplasting
**Bestemt** 2026-09-29.
`#/kvittering` er eneste mobilskjerm: velg søknad, ta bilde, skriv beløp. Kvitteringen kobles til poster på PC.
**Snur når:** Brukerne trenger å gjøre mer enn å levere kvitteringer fra telefonen.
**Konsekvens for nye kort:** Nye skjermer trenger ikke virke på smal skjerm, og mobilflyten skal ikke få flere steg.


## B-23 · Revisor er en tredje rolle med tilgang per søknad
**Bestemt** 2026-10-03.
Bryter bevisst med B-09 (kort 0002). Revisjonen skal kunne gjøres på nett: revisor logger inn, ser bare søknadene hen er tildelt (`soknader.<id>.tilgang`), er skrivebeskyttet og kan bare skrive sin egen oppføring i `soknader.<id>.revisorer` (godkjenning, merknad, kommentarer). Bare rollen Revisor kan tildeles, så den som fører regnskapet ikke godkjenner det selv. Godkjenningen er en innlogget persons handling med avtrykk av tallene – ikke en BankID-signatur. Bruker og Administrator ser og kan fortsatt alt; resten av B-09 står.
**Snur når:** En giver krever kvalifisert signatur (da signeringstjeneste, som krever serverdel – se B-20), eller organisasjonen vil skjerme søknader også for vanlige brukere (`tilgang`-listen er laget for det).
**Konsekvens for nye kort:** Alt nytt som kan skrives må si om revisor kan lese det, og revisor skal aldri kunne skrive utenfor sin egen oppføring. Nye samlinger knyttet til en søknad må skjermes i reglene på samme måte som innkjøp og fakturaer. Endres det som inngår i avtrykket, blir gamle godkjenninger ugyldige.
