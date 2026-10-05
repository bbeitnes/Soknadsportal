---
id: 0008
tittel: Sidepanel: «+ Ny …» i panelet og ⌘/Ctrl+Enter for neste post
status: neste
opprettet: 2026-10-05
---

# 0008 · Sidepanel: «+ Ny …» i panelet og ⌘/Ctrl+Enter for neste post

## Brukerhistorie

Som **den som fører en søknad** ønsker jeg en rask vei til å legge inn neste (faktura, behov, leverandør …) når jeg er ferdig med den jeg har åpen i sidepanelet, slik at jeg kan føre flere etter hverandre uten å ta hånden fra tastaturet for å lukke panelet og trykke «+ Ny».

## Kontekst

Det som opprettes med «+ Ny …» åpnes i sidepanelet til høyre (ny faktura i Revisjon, nytt behov, ny giver, ny leverandør, ny søknad). Feltene lagres ved blur (B-03), og Enter i et felt gjør bare blur – panelet blir stående. For å legge inn neste må brukeren i dag trykke Escape eller ✕ og så klikke «+ Ny …» igjen. Ved føring av mange fakturaer på rad blir det mye frem og tilbake.

Slik tastene virker i dag (`app.js`): Enter i et `data-felt`-input = blur (lagrer). Escape i et felt = angre og blur. Escape utenfor felt = lukk panelet. Tab går til neste felt.

Valgt i grillingen: knapp «+ Ny …» nederst i panelet og hurtigtasten ⌘/Ctrl+Enter (B-28).

## Akseptansekriterier

Gjelder de fire panelene som åpnes med «+ Ny …»: faktura (Revisjon), behov, leverandør og giver (Innstillinger). «Posten» er det panelet viser.

- [ ] Gitt at et av de fire panelene er åpent – enten posten er ny eller gammel – så står knappen «+ Ny faktura» / «+ Nytt behov» / «+ Ny leverandør» / «+ Ny giver» nederst i panelet, og tipset på knappen (musepeker over) nevner ⌘/Ctrl+Enter.
- [ ] Gitt at posten har minst ett felt utfylt, når jeg trykker knappen i panelet, så står en ny tom post i panelet med markøren i første felt (leverandør for faktura, tittel/navn for de andre), og den forrige posten ligger i listen med det jeg skrev.
- [ ] Gitt at markøren står i et felt jeg nettopp har endret, når jeg trykker ⌘+Enter (Mac) eller Ctrl+Enter, så lagres feltet, og det samme skjer som når jeg trykker knappen – uten at jeg bruker musen. Det gjelder også i flerlinjefelt (merknad, kontaktinfo).
- [ ] Gitt at jeg fører tre fakturaer etter hverandre med ⌘/Ctrl+Enter mellom hver, så får de tre løpenumre på rad, og alle tre står i fakturalisten med riktig leverandør og beløp.
- [ ] Gitt at feltet jeg står i har en ugyldig verdi (f.eks. bokstaver i beløp), når jeg trykker ⌘/Ctrl+Enter, så vises feilmeldingen i toppmenyen som i dag, og panelet viser fortsatt samme post – ingen ny er opprettet.
- [ ] Gitt at ingenting er fylt ut på posten (for faktura: verken leverandør, fakturanr, dato, beløp, vedlegg, kobling eller merknad), når jeg trykker knappen eller ⌘/Ctrl+Enter, så opprettes ingen ny post, og markøren settes i første felt.
- [ ] Gitt at den nye posten er åpnet fra panelet, så er alle feltene tomme – ingenting er arvet fra den forrige.
- [ ] Gitt at jeg trykker Enter uten ⌘/Ctrl i et enlinjefelt, så lagres feltet og panelet blir stående som i dag. Escape angrer i et felt og lukker ellers panelet, som i dag.
- [ ] Gitt at jeg er revisor, så har fakturapanelet ingen «+ Ny faktura», og ⌘/Ctrl+Enter gjør ingenting. Giverpanelet har knappen bare for administrator.
- [ ] Gitt «+ Ny søknad»-panelet eller leverandørpanelet åpnet fra en søknad (kort 0007), så finnes verken knappen eller hurtigtasten der.

## Avgrensning

- Den tomme raden nederst i Utgifter (den gir allerede «neste» uten panel).
- Paneler som ikke oppretter noe nytt (tilbudspanel, «Les priser», plukklister), «+ Ny søknad» og leverandørpanelet åpnet fra en søknad.
- Arv av verdier til den nye posten (type, leverandør, dato).
- Opprydding av tomme poster ved lukking, og sperre på «+ Ny …» i verktøyraden – begge er som i dag.
- Mobilskjermen (B-22).

## Grilling

Grillet 2026-10-05 med `/grill-me`. Løsningen ble valgt, og kriteriene er skrevet om etter den.

**Avklart i intervjuet**

- Panelet får en knapp «+ Ny …» nederst, og ⌘/Ctrl+Enter gjør det samme. Vanlig Enter og Escape er uendret. Forkastet: Enter i siste felt lukker panelet («siste felt» er uklart når vedlegg og koblinger krever mus), Enter som Tab (endrer Enter overalt og kan lage poster ved uhell), bare hurtigtast (ingen ser den).
- Gjelder de fire panelene der «+ Ny …» oppretter en tom post og åpner den: faktura, behov, leverandør og giver. Ikke «Ny søknad» (skjema med «Opprett») og ikke leverandørpanelet åpnet fra en søknad (kort 0007).
- Knappen vises alltid, også når en gammel post er åpnet. Portalen skal ikke holde rede på hvilke poster som er «nye».
- Er posten brukeren står på tom, opprettes ingen ny – markøren settes i første felt. Hindrer en rekke tomme fakturaer med hvert sitt løpenummer. Knappen i verktøyraden er uendret, og tomme poster ryddes ikke bort ved lukking (kan bli eget kort).
- Den nye posten er helt tom. Ingen arv av type, leverandør eller dato: en arvet verdi som er feil er lettere å overse enn et tomt felt.
- Feltet som har fokus lagres først. Er verdien ugyldig eller feiler lagringen, blir brukeren stående på samme post.

**1. Kollisjon med beslutningsloggen.** Ingen brudd. B-03: ingen lagreknapp – knappen oppretter neste post, feltene lagres fortsatt ved blur, og hurtigtasten blurer feltet før noe annet. B-02: bare det som er bedt om, ingen forhåndsutfylling. B-04: fortsatt ett sidepanel. B-22: gjelder ikke mobilskjermen. B-23: revisor får verken knapp eller hurtigtast. Ny beslutning B-28 fastsetter tastene i sidepanel.

**2. Datamodell.** Ingen nye data. «Tom post» utledes av feltene på posten, og lagres ikke.

**3. Migrering og data i drift.** Ingenting å migrere. Tomme poster som alt ligger i prod berøres ikke.

**4. Låser vi oss?** ⌘/Ctrl+Enter er nå opptatt i paneler som oppretter poster (B-28). Arv av verdier og opprydding av tomme poster er holdt åpne og kan legges til senere uten å endre dette.

**5. Er det nødvendig?** Uten kortet: Escape, så mus opp til «+ Ny …» for hver post. Enkleste alternativ (bare knappen) løser turen til verktøyraden, men ikke ønsket om å holde hendene på tastaturet.

**6. Hvordan verifiseres det?** Brukeren fører tre fakturaer på rad på dev (`?demo`) uten å lukke panelet, og prøver det samme for behov, leverandør og giver. «Er posten tom» legges som ren funksjon i `beregning.js` og testes med `node --test test/`.

**Sikkerhetskopien (B-24, B-25).** Ingen nye data eller lagringssteder, ingen automatikk som skriver.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.
