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

## B-24 · Sikkerhetskopien dekker alle samlinger og filer
**Bestemt** 2026-10-04.
Dataene finnes ellers bare hos Google (kort 0004). Kopien tas daglig i åpent format (JSON per dokument + filene), kryptert, til ProISP, og restore-testen legger den i `soknadsportal-restore` og teller dokumenter per samling og filer. En kopi som mangler en samling eller et lagringssted er ikke en kopi, og mangelen oppdages først når den trengs.
**Snur når:** Aldri for prinsippet. Lagringsstedet (ProISP) kan byttes hvis plassen ikke holder eller vi vil ha kopier som er låst mot sletting.
**Konsekvens for nye kort:** En ny samling, et nytt Storage-prefiks eller data lagret et annet sted må inn i kopiskriptet og i restore-testens kontroll, og restore-testen kjøres på nytt. Filstier i dokumenter har miljøprefiks (`soknadsportal/prod/…`), og gjenopprettingen skriver dem om til målets prefiks – nye felt med filstier må derfor lagre hele stien slik `lager.lastOpp()` gir den.

## B-25 · Automatiske jobber har aldri skriverett til prod
**Bestemt** 2026-10-04.
Kopijobben har en nøkkel som bare kan lese, og restore-testen en tjenestekonto som bare kan skrive til `soknadsportal-restore` og `soknadsportal/restore/`. Da kan verken en feil i et skript eller en lekket GitHub-secret ødelegge det kopien skal beskytte. Skriving til prod utenfor portalen skjer bare med en persons egen innlogging, etter fersk kopi og uttrykkelig bekreftelse.
**Snur når:** Vi får et behov som ikke kan løses uten (for eksempel automatisk migrering) – da tas det opp som eget kort.
**Konsekvens for nye kort:** Ingen kort får gi en GitHub-jobb eller annen automatikk skriverett til `soknadsportal` eller `soknadsportal/prod/`. Status fra jobber vises i GitHub, ikke i portalens data.

## B-26 · Jobber melder status til portalen gjennom en åpen statusfil
**Bestemt** 2026-10-04.
Kopijobben og restore-testen legger `sikkerhetskopi-status.json` i portalens mappe på webhotellet, og portalen henter den fra sin egen adresse (kort 0005). Slik får portalen en statuslampe uten at en jobb får skriverett til prod (B-25) og uten at portalen spør et eksternt system (B-19). Filen er åpen for alle på nettet.
**Snur når:** Status må skjermes – da trengs en annen kanal, og B-25 må tas opp på nytt.
**Konsekvens for nye kort:** Statusfilen inneholder aldri data fra portalen: bare tidspunkt, antall og bestått/ikke bestått. Ingen navn, beløp, e-postadresser eller filstier. Farge og alder regnes ut i portalen, ikke i filen.

## B-27 · En søknadslinje følges opp enten i Innkjøp eller som utgift – aldri begge
**Bestemt** 2026-10-05.
En fri linje i søknaden kan plukkes inn i Utgifter og få faktura koblet til uten innkjøp (kort 0006). Ligger samme linje både i et innkjøp og som utgift, belastes potten to ganger, og «Ikke fordelt» slutter å være en huskeliste over det som gjenstår. Derfor er linjen tatt hånd om når den ligger ett av stedene, og den må fjernes der før den kan føres det andre.
**Snur når:** En linje faktisk må deles mellom tilbudsinnkjøp og direkte utgift – da må delingen bære hvert sitt beløp, som delte innkjøpslinjer (B-13).
**Konsekvens for nye kort:** Alt som lister «ledige» søknadslinjer (for innkjøp eller utgifter) må utelukke linjer som ligger det andre stedet. Bare frie linjer kan føres som utgift; skal behovslinjer det, må «Finansiert» og «Anskaffet» også kunne komme fra en utgift.

## B-28 · Faste taster i sidepanel: Enter lagrer, Escape angrer eller lukker, ⌘/Ctrl+Enter gir neste
**Bestemt** 2026-10-05.
Tastene skal bety det samme i alle sidepanel (kort 0008). Enter i et enlinjefelt lagrer feltet (blur, B-03), Escape i et felt angrer det som er skrevet – er ingenting endret, lukker den panelet, som utenfor felt, og ⌘/Ctrl+Enter i et panel som viser en post opprettet med «+ Ny …» lagrer feltet og åpner en ny tom post – det samme som knappen «+ Ny …» nederst i panelet. Uten en fast regel finner hvert nytt panel på sin egen snarvei.
**Snur når:** Brukerne ber om at Enter skal gå til neste felt, eller en tast kolliderer med noe nettleseren eller et nytt felt trenger.
**Konsekvens for nye kort:** Nye sidepanel bruker disse tastene og gir dem ikke annen betydning. Et nytt panel som oppretter poster med «+ Ny …» får knappen nederst og ⌘/Ctrl+Enter. Alt en hurtigtast gjør skal også kunne gjøres med en synlig knapp.

## B-29 · Alle brukere kan opprette og endre givere – bare administrator sletter
**Bestemt** 2026-10-05.
Endrer bevisst B-09, der administrator alene vedlikeholdt givere (kort 0009). Med årshjulet ligger søknadsfristene på giveren, og den som oppdager en ny ordning eller en flyttet frist skal kunne legge den inn selv – også kontaktinfo og momsinnstilling. Sletting kan ikke angres og blir hos administrator. Brukerlisten er fortsatt bare administrators; resten av B-09 står.
**Snur når:** Momsinnstillingen blir endret ved en feil så tallene i søknader blir gale – da skjermes det feltet igjen.
**Konsekvens for nye kort:** Nye felt på giveren kan skrives av alle brukere og må tåle det. Kort som trenger noe bare administrator kan endre, må si det uttrykkelig og få egen regel. Revisor kan fortsatt bare lese givere.

## B-30 · Leser er en fjerde rolle: ser alt, skriver ingenting
**Bestemt** 2026-10-05.
Endrer bevisst B-09 og B-23 (kort 0011). Styreleder og andre skal kunne følge med på behov, søknader og økonomi uten å kunne endre noe ved et uhell. Leseren ser alt en vanlig bruker ser – ingen tildeling per søknad – på de samme skjermene uten redigering. Firestore-reglene gir skriverett bare til rollene `bruker` og `administrator` (hviteliste), så en ukjent rolle aldri får skrive. Filer i Storage er bare sperret i skjermen, som for revisor: Storage-reglene kan ikke slå opp rollen uten en serverdel (B-20).
**Snur når:** En leser endrer eller sletter filer utenom skjermen, eller organisasjonen vil skjerme enkelte søknader for lesere – da trengs rollen i innloggingen (serverdel) eller tildeling per søknad.
**Konsekvens for nye kort:** Alt nytt som kan skrives må være skrivebeskyttet for leseren, både på skjermen og i reglene, og nye regler gir skriverett med hvitelisten – aldri «alle unntatt …». Nye roller må legges uttrykkelig inn i reglene før de tas i bruk. Leseren kan ikke tildeles som revisor.

## B-31 · Fakturert erstatter estimatet post for post
**Bestemt** 2026-10-06.
Presiserer B-17 (kort 0013). «Disponert» og «Gjenstår» regnet av estimatene (utgiftsbeløp og valgt tilbudspris) også etter at fakturaen hadde kommet, så estimater fra budsjetteringen ble stående og viste et overforbruk som ikke fantes. Nå teller en post det som er fakturert så snart den har faktura, ellers estimatet – samme regel som sluttoppgjøret per type allerede brukte. Unntaket er et kryss «Flere fakturaer kommer» på posten (`venterFlere`), som lar estimatet gjelde til krysset fjernes. Ukoblede fakturaer teller ikke. Regelen er den samme i topplinjen, Revisjon og rapporten, og krysset er ikke med i revisjonsavtrykket.
**Snur når:** Delfakturaer blir så vanlige at krysset glemmes ofte – da må «ferdig fakturert» registreres på en annen måte, eller fakturaen bære hvilken del av posten den gjelder.
**Konsekvens for nye kort:** Alt som viser hva en post koster, bruker samme funksjon i `beregning.js` (`postkostnad()`); ingen skjerm regner sitt eget. Estimatet på posten overskrives aldri av fakturaen. Et negativt «gjenstår» vises som «Overforbruk», og giverens del kan aldri overstige innvilget.
