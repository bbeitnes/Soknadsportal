# Søknadsportal – versjon 1

## Kontekst
Vi er en frivillig organisasjon som søker penger fra stiftelser og andre givere.
Vi har tidligere laget "Bestillingsportal". Den ble for tung, for rigid og for
tett bygget rundt én bestemt søknad. Søknadsportal er et NYTT prosjekt som
erstatter den.

- Bestillingsportal skal IKKE endres. Søknadsportal lages i eget repo/egen mappe.
- Les gjerne Bestillingsportal for å finne tech stack, innlogging og hosting,
  og gjenbruk dette der det fungerer.
- IKKE kopier datamodell, skjermbilder eller forretningslogikk derfra.

Hovedprinsipp: forenkle. Ikke bygg inn "smartness" eller funksjonalitet som
ikke er beskrevet her. Spør før du legger til noe.

## Absolutte designkrav
1. **Ingen lagreknapper.** Hvert felt lagres umiddelbart når man forlater det
   (blur). Vis en diskret "lagret"-bekreftelse og en tydelig feilmelding hvis
   lagringen feiler.
2. **Minimal scrolling.** Del opp i faner eller steg i stedet for lange sider.
   Tabeller har faste kolonneoverskrifter og faste radtitler. Detaljer vises i
   sidepanel eller sammenleggbare paneler, ikke ved å skyve innhold nedover.
3. **Minimalt med påkrevde felt.** Bare det som er strengt nødvendig.
4. Norsk grensesnitt. Beløp i kroner med tusenskille (12 000).

## Brukere og roller
- **Bruker** kan gjøre alt i søknadene.
- **Administrator** kan i tillegg invitere og fjerne brukere og vedlikeholde givere.
- Brukere inviteres på e-post.
- Ingen finmaskede rettigheter per søknad eller fase.
- Vis "sist endret av [navn], [tidspunkt]" på søknader. Fakturaer og
  tilbudsvalg viser hvem som la dem inn.
- Samtidig redigering: siste lagring per felt vinner.

## Datamodell (konseptuelt)

### Giver
Navn, kontaktinfo/notat og innstillingen "Trekk ut momskompensasjon"
(av/på + standardprosent). Vedlikeholdes av administrator.

### Behov (behovslisten)
Lever UTENFOR søknadene. Felt: tittel, beskrivelse, antall, estimert
stykkpris, status.
- Et behov kan knyttes til flere søknader samtidig.
- Anskaffet antall summeres fra fakturerte innkjøp. Behovslisten viser
  "gjenstår X av Y".
- Behovet kan velges i nye søknader så lenge noe gjenstår.
- Når gjenstående er 0, er behovet anskaffet. Status kan også overstyres
  manuelt (f.eks. "trengs ikke lenger").

Antall finnes på tre nivåer med hver sin betydning:
- **Behov:** hva vi totalt trenger.
- **Søknad:** hva vi søkte om.
- **Innkjøp:** hva vi faktisk kjøper nå (kan avvike, fordi behovet endrer seg
  eller pengene ikke strekker til).

### Søknad
- Giver, tittel, frist, sendt dato.
- Behov den gjelder (valgt fra behovslisten) + mulighet for frie linjer.
  Hvert valgt behov får et antall for denne søknaden (standard: gjenstående
  antall). Estimert kostnad = antall × estimert stykkpris.
- Søknadsteksten. Selve innsendingen skjer utenfor portalen, men teksten skal
  lagres her.
- Status: utkast → sendt → innvilget / avslått → avsluttet.
- Søkt beløp: foreslås som sum av estimerte kostnader (justert for
  momskompensasjon, se under), men kan overstyres.
- Innvilget beløp: ofte LAVERE enn søkt.
- Et behov regnes som finansiert når det er valgt en pris for linjen hos en
  leverandør i et innkjøp. Det er ingen avhuking for dette i søknaden.
- Momskompensasjon-prosent: arves fra giveren, kan justeres per søknad.
- Revisjon: av/på per søknad.

### Pott
Når søknaden er innvilget, blir innvilget beløp en pott. Den brukes gjennom
innkjøp med tilbud og/eller løse utgifter; én søknad kan ha begge deler.
Øverst i søknaden vises alltid: innvilget, disponert, fakturert, gjenstående.

### Egenandel
Vi kan ha sagt til giveren at vi dekker en del selv (f.eks. 40 000 av 560 000).
- **I søknaden:** ett beløp for hele søknaden. Søkt beløp foreslås som estimatet
  minus egenandelen.
- **Etter tildeling:** rammen er innvilget + egenandel. Blir innvilget et annet
  beløp enn søkt, velger vi om egenandelen beholdes som beløp (standard) eller
  som andel (da følger den innvilget/søkt). Portalen regner aldri om av seg selv.
- **Fordeling:** hvilke kjøp egenandelen går til, bestemmes først når vi vet hva
  som kjøpes. Den fordeles per post under Revisjon («Egne midler»), og kan
  legges i sin helhet på én vare. Tilbudsmatrisen påvirkes ikke.
- **Sluttoppgjør:** revisjonsrapporten viser per kategori kostnad, egne midler
  og hva giveren dekker, så det går fram at egenandelen er innfridd.
- Egne midler holdes utenfor momskompensasjonen: de trekkes fra først, og resten
  fordeles mellom giver og momskompensasjon.

## Momskompensasjon
Noen givere krever at vi trekker ut forventet momskompensasjon. Eksempel:
varen koster 1 000 kr, momskompensasjonen er 8 %. Da dekker giveren 920 kr,
og 80 kr må dekkes av momskompensasjonen vi mottar året etter.

Når innstillingen er på, vises kostnader i tre kolonner:
Kostnad | Fra giver (92 %) | Fra momskompensasjon (8 %), med summer.
- **Søknad:** søkt beløp foreslås som giverens andel.
- **Pott:** innvilget sammenlignes med giverens andel. Momskompensasjonen
  vises som egen linje merket "forventes mottatt neste år".
- **Revisjonsrapport:** forsiden viser samme fordeling.
- **Tilbudsmatrisen påvirkes IKKE.** Fordelingen skjer bare på summer.
- Søknader til givere uten innstillingen viser ingen ekstra kolonner.

Dette må være svært oversiktlig.

## Innkjøp med tilbud (tilbudsmatrise)
Et innkjøp hører til en søknad og består av linjer (fra søknadens behov eller
fritekst) og leverandører.

**Flere innkjøp per søknad:**
- En søknad kan ha flere innkjøp (f.eks. "Instrumenter" og "Uniformer"),
  hver med sine egne leverandører og sin egen matrise.
- Innkjøpene vises som en rad med faner/chips over matrisen (navn + sum
  valgt), slik at matrisen beholder hele bredden. Nytt innkjøp legges til
  med "+" i samme rad.
- Hvert innkjøp har en enkel status: innhenter tilbud → valgt → fakturert.
- Et behov/en linje hører til ett innkjøp. Behov i søknaden som ennå ikke er
  lagt i et innkjøp, vises som "ikke fordelt", slik at ingenting blir glemt.
- Disponert i potten = sum valgt i alle innkjøp + løse utgifter.

**Visning:** én matrise. Linjer nedover, leverandører bortover, netto
stykkpris i cellene. Faste overskrifter og radtitler. Ingen kort og ingen
lang scrolling.

**Linjer:** hver linje har et antall som kan endres fritt i innkjøpet,
uavhengig av antallet i søknaden. Antallet vises og redigeres i radtittelen.
Endret antall regner alt om umiddelbart. Valgte celler beholdes.

**Pris i cellene er alltid STYKKPRIS:**
- Standard er ett tall: "vår pris" per stykk.
- Listepris med rabatt kan skrives direkte i cellen:
  `1200 -15%` eller `1200 -180`. Begge gir netto 1 020 per stk.
- Cellen viser netto stykkpris tydelig, med listepris og rabatt i liten
  tekst under.
- Sammenligning skjer ALLTID på netto stykkpris.
- Rabatt finnes kun på linjenivå. Vi godtar IKKE totalrabatt: hver celle er
  en selvstendig pris uavhengig av hvilke andre linjer vi velger. Vis en kort
  hjelpetekst om dette ("Be leverandøren om pris per linje").
- Tom celle betyr at leverandøren ikke har gitt pris.
- Man kan lime inn en eller flere kolonner eller celler fra Excel
  (tabulatorseparert).

**Frakt og faste kostnader:** egen rad med fast beløp per leverandør (ikke
per stykk). Telles bare med hvis minst én linje er valgt hos den leverandøren.

**Tildeling (ingen moduser):**
- Valget er alltid per linje: klikk på en celle for å velge den.
- Hurtigknapp: klikk på en leverandørs kolonneoverskrift for å velge alt fra
  den leverandøren.
- Hurtigknapp: "Billigst per linje".
- Etter hurtigknapp kan enkeltceller justeres med ett klikk.

**Summer:**
- Egen kolonne til høyre, "Valgt": antall × valgt netto stykkpris per linje.
- Sumrad per leverandør: hva alt ville kostet hos den leverandøren
  (inkludert frakt), til sammenligning ved "alt til én".
- Sum for valgt kombinasjon: den REELLE totalen, inkludert frakt fra
  leverandører der minst én linje er valgt.

**Vedlegg:**
- Hver leverandør kan ha ett eller flere vedlegg (tilbudsdokumenter).
- Har leverandøren ett vedlegg, kobles alle cellene til det automatisk.
- Har den flere, velges vedlegg (og eventuelt sidetall) via et lite
  binders-ikon i cellen.
- Fra valgt pris skal man kunne åpne dokumentet som dokumenterer den.

## Løse utgifter
Enkel liste: beskrivelse, beløp, dato. Trekkes fra potten.

## Fakturaer og revisjon
**Faktura:** leverandør, fakturanummer, dato, beløp, vedlegg (PDF eller bilde).
- Kobles til én eller flere valgte tilbudslinjer og/eller løse utgifter.
  En faktura kan dekke flere linjer.
- Får et løpenummer per søknad.
- Avvik mellom fakturabeløp og tilbudt pris (antall × netto stykkpris)
  vises tydelig.

**Revisjonsvisning** (når revisjon er slått på): hva som er fakturert og
dokumentert, hva som mangler faktura, og hva som avviker fra tilbud.

**Revisjonsrapport:** én samlet PDF, generert med én knapp, når som helst.
1. **Forside:** søknad, giver, søkt, innvilget, brukt, gjenstående
   (+ fordeling ved momskompensasjon).
2. **Oversiktstabell:** løpenummer, fakturanummer, dato, leverandør, beløp,
   hva det gjelder. Summen skal stemme med forsiden.
3. **Alle fakturaene** i samme rekkefølge, med løpenummer stemplet i hjørnet.
   Bilder konverteres til egne PDF-sider.

Portalen ER regnskapet for søknaden. Det finnes ingen integrasjon mot
eksternt regnskapssystem.

## Mobil
Resten av portalen er laget for PC, men det må finnes en rask, mobilvennlig
vei for å laste opp kvitteringer: velg søknad → ta bilde → skriv beløp og
fakturanummer → ferdig.

## Skjermbilder og flyt

Prototypene ligger i prosjektet som `Søknader.dc.html`, `Søknad.dc.html`, `Behovsliste.dc.html`, `Givere.dc.html` og `Kvittering mobil.dc.html`. Felles toppmeny: Søknader · Behov · Givere, med «lagret»-status til høyre.

### Søknader (oversikt)
- Én rad per søknad: tittel/giver, frist, status, søkt, innvilget, disponert, gjenstår, sist endret. Klikk åpner søknaden.
- Filter: Aktive · Innvilget · Utkast og sendt · Avsluttet og avslått · Alle. Toppen viser innvilget i år, gjenstår i potter og antall som venter på svar.
- «+ Ny søknad»: sidepanel med giver (viser momsinnstilling), tittel og frist. Opprettes som utkast.

### Søknad (én søknad)
Fast topp: tittel (klikk = bytt søknad), status, giver, frist, sendt, sist endret, og pottlinjen søkt / innvilget / disponert / gjenstår. Med momskompensasjon er «disponert» giverens andel, og en linje under viser full kostnad og forventet momskompensasjon neste år. Med egenandel vises den mellom innvilget og disponert, «gjenstår» er det som er igjen av rammen (innvilget + egenandel), og linjen under viser rammen og hvordan det vi betaler deles på egenandel, giver og momskompensasjon.

Faner:
- **Søknad:** behovstabell (antall og est. stykkpris redigerbare, kostnad, fra giver / fra momskompensasjon når giveren krever det, sumrad). Under: egenandel (med valget beløp/andel når innvilget er et annet beløp enn søkt), søkt beløp (foreslått som giverens andel etter egenandel, kan overstyres), innvilget beløp med hint om estimatet er over/under, momsprosent. Høyre kolonne: giver, tittel, frist, sendt, status, revisjon av/på, dokumenter (opplasting). «Skriv ut» gir behovslisten med de fire første kolonnene.
- **Innkjøp:** innkjøpene som chips over matrisen (navn + sum valgt, status, «+»). Én matrise: linjer nedover med redigerbart antall, leverandører bortover, netto stykkpris i cellene med listepris/rabatt i liten tekst. Klikk celle = velg, dobbeltklikk = rediger (`1200 -15%` / `1200 -180`), klikk leverandørnavn = alt fra én, «Billigst per linje», innliming fra Excel. Fraktrad, «alt hos én»-sumrad og «valgt kombinasjon» (med giverens andel). Binders i cellen for leverandører med flere vedlegg; leverandørpanel med kontakt og vedlegg. «N behov ikke fordelt» åpner panel der behov kan legges i innkjøpet.
- **Utgifter:** enkel liste (beskrivelse, dato, beløp, lagt inn av). Nederste rad er alltid en tom ny utgift.
- **Revisjon:** oppsummering (fakturert av disponert, linjer uten faktura, avvik). Fakturaliste med løpenummer, leverandør, fakturanr, dato, beløp, avvik; klikk gir panel med felter, vedlegg og avhuking av hvilke tilbudslinjer/utgifter fakturaen dekker (flere per faktura). «Hva potten er brukt på»: alle valgte linjer og utgifter med Faktura N / Mangler faktura. Har søknaden egenandel, får hver post et felt «Egne midler», postene grupperes per kategori med delsum, og «fordelt X av egenandelen Y» står over tabellen. «Revisjonsrapport (PDF)» lager forside (med fordeling per kategori når søknaden har egenandel), oversiktstabell og én side per faktura med løpenummer stemplet.

### Behov (behovslisten)
- Tabell: behov, «gjenstår X av Y» med fremdrift, est. stykkpris, gjenstående kroner, søknader behovet ligger i (giver · antall; fylt ramme = finansiert, dvs. pris valgt i et innkjøp), status (Ikke søkt / Søkt / Finansiert / Delvis anskaffet / Anskaffet / Trengs ikke).
- Filter: Åpne · Anskaffet og lukket · Alle. Anskaffede behov beholdes og kan skrives ut («Skriv ut» følger aktivt filter).
- Sidepanel: tittel, beskrivelse, antall, est. pris, anskaffet / i søknader / gjenstår, statusoverstyring (Automatisk / Trengs ikke / Anskaffet), lenker til søknadene.

### Givere og brukere (administrator)
- **Givere:** navn, kontakt/notat, momskompensasjon (av/på + standardprosent med eksempel), antall søknader. Slett bare når giveren ikke har søknader.
- **Brukere:** navn, e-post, rolle (Bruker / Administrator byttes i raden), status Aktiv / Invitert. «+ Inviter bruker» med e-post og rolle; «Send igjen» og «Fjern».

### Kvittering fra mobil
Velg søknad (bare innvilgede) → ta bilde / velg fra bilder / PDF → beløp og valgfritt fakturanummer → ferdig. Kvitteringen får løpenummer og ligger under Revisjon som «ikke koblet» til den kobles på PC.

### Felles mønstre
- Ingen lagreknapper. Felt lagres ved blur; «Lagret» vises diskret i toppmenyen, feil vises som rød melding med «Prøv igjen».
- Detaljer i sidepanel til høyre; Escape lukker.
- Tabeller med faste overskrifter og sumrader; skjermene scroller ikke som helhet, bare tabellen.

## Utenfor versjon 1
- Integrasjon mot regnskapssystem (Tripletex e.l.)
- Automatisk lesing av priser fra tilbuds-PDF
- Finmaskede rettigheter
- E-postvarsler
- Import av data fra Bestillingsportal (kan vurderes senere)

## Arbeidsmåte
1. Les Bestillingsportal. Foreslå stack, innlogging og datamodell.
   Vent på godkjenning før du bygger.
2. Bygg i trinn, og la meg teste mellom hvert:
   a. Givere, behovsliste, søknad med faser og autolagring
   b. Pott, innvilget beløp, momskompensasjon og løse utgifter
   c. Tilbudsmatrisen
   d. Fakturaer, revisjonsvisning og PDF-rapport
   e. Mobil kvitteringsopplasting og brukerinvitasjoner
3. Er noe uklart eller kan løses enklere, spør heller enn å anta.
