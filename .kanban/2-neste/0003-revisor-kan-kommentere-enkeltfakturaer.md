---
id: 0003
tittel: Revisor kan kommentere enkeltfakturaer
status: neste
opprettet: 2026-10-03
---

# 0003 · Revisor kan kommentere enkeltfakturaer

## Brukerhistorie

Som **revisor** ønsker jeg å skrive en kommentar på en enkelt faktura, slik at
de som fører søknaden ser nøyaktig hvilket bilag jeg lurer på eller vil ha
rettet, uten at jeg må forklare det i en e-post.

## Kontekst

Skilt ut fra kort 0002 under grillingen 2026-10-03. Brukeren valgte at revisor
skal kunne kommentere per faktura i tillegg til merknaden til godkjenningen, og
at det bygges som eget kort rett etter 0002, slik at tilgang og godkjenning kan
prøves for seg.

Forutsetter 0002: rollen Revisor, `soknader.<id>.tilgang`, revisorens egen
oppføring `soknader.<id>.revisorer.<nøkkel>` og regler som lar revisoren skrive
bare der. Kommentarene legges i den oppføringen
(`revisorer.<nøkkel>.kommentarer.<fakturaId> = { tekst, tid }`), ikke på
fakturaen, så reglene fortsatt nekter revisor å skrive i `fakturaer`. Ingen
regelendring i dette kortet.

## Akseptansekriterier

- [ ] Gitt en revisor som åpner en faktura i sidepanelet, når panelet tegnes,
      så har det et felt «Kommentar fra revisor» som lagres ved blur, uten
      lagreknapp, med tidspunktet for siste endring.
- [ ] Gitt en revisor som tømmer feltet, når det forlates, så er kommentaren
      borte.
- [ ] Gitt en faktura med kommentar, når en bruker, administrator eller en
      annen tildelt revisor ser fakturalisten i Revisjon, så har raden et
      merke «Kommentar», og fakturapanelet viser kommentaren med revisorens
      navn og tidspunkt, skrivebeskyttet.
- [ ] Gitt to revisorer som har kommentert samme faktura, når panelet tegnes,
      så står begge kommentarene, hver med sitt navn, og hver revisor kan bare
      redigere sin egen.
- [ ] Gitt en revisor med kommentarer stående, når hen godkjenner revisjonen,
      så går godkjenningen gjennom som ellers.
- [ ] Gitt en godkjenning, når en kommentar skrives, endres eller slettes, så
      gjelder godkjenningen fortsatt (kommentarer inngår ikke i avtrykket).
- [ ] Gitt en faktura med kommentar, når rapporten lages, så står kommentaren
      ikke i PDF-en.
- [ ] Gitt en faktura med kommentar, når fakturaen slettes, så vises ikke
      kommentaren noe sted.
- [ ] Gitt en revisor som fjernes fra søknaden, når Revisjon tegnes, så vises
      ikke kommentarene hens lenger.
- [ ] Gitt `?demo=revisor`, når en kommentar skrives, så vises den i `?demo`
      som bruker ville sett den (samme demodata har en faktura med kommentar).
- [ ] Gitt testene, når `node --test test/` kjøres, så går de gjennom.

## Avgrensning

- Ingen svar fra brukerne og ingen tråd. Brukeren har sagt at det kan komme
  senere; kommentaren lagres som `{ tekst, tid }` så svar kan legges ved siden
  av uten migrering.
- Ingen «løst»-markering, og kommentarer hindrer ikke godkjenning.
- Kommentarene vises ikke i rapporten. Forbehold giveren skal se, skrives i
  revisorens merknad til godkjenningen (kort 0002).
- Ingen kommentarer på poster, utgifter eller dokumenter – bare fakturaer.
- Ingen varsling og ingen merkelapp i søknadslisten.
- Ingen regelendring; reglene kommer fra kort 0002.

## Grilling

Grillet med brukeren 2026-10-03, som del av grillingen av kort 0002 (spørsmålene om tilbakemelding fra revisor og om oppdeling i to kort).

**1. Kollisjon med beslutningsloggen.** Ingen brudd ut over det B-23 alt har tatt. B-02: brukeren valgte selv kommentarer per faktura framfor bare én merknad; svar, tråder og «løst»-markering er holdt utenfor. B-03: feltet lagres ved blur. B-19: ingen varsling. B-23: revisor skriver bare i sin egen oppføring på søknaden.

**2. Datamodell.** `soknader.<id>.revisorer.<nøkkel>.kommentarer.<fakturaId> = { tekst, tid }` – et kart (B-11), så hver kommentar lagres for seg. Lagt på søknaden og ikke på fakturaen for at revisor ikke skal trenge skrivetilgang til `fakturaer`. Ingenting utledbart lagres.

**3. Migrering og data i drift.** Ingen. Ingen regelendring – reglene fra 0002 dekker revisorens egen oppføring. Slettes en faktura, blir kommentaren liggende som en foreldreløs nøkkel som ikke vises; det ryddes ikke.

**4. Låser vi oss?** Lite. Svar i tråd kan legges til senere, men krever da at brukere får skrive et sted revisor kan lese – en ny avgjørelse om hvor svarene bor. Kommentarer i søknadsdokumentet teller mot 1 MB-grensen (B-11), som ikke er i nærheten.

**5. Er det nødvendig?** Alternativet er revisorens ene merknad og e-post. Brukeren ville ha kommentarer per faktura, så det går fram hvilket bilag det gjelder.

**6. Hvordan verifiseres det?** På dev i `?demo=revisor` og `?demo`, og i testdatabasen med samme testrevisor som i 0002: skriv, endre og slett en kommentar, og se den som vanlig bruker.

**Det grillingen avklarte**
- Kommentarene vises bare på skjerm, ikke i rapporten.
- Brukerne kan ikke svare i portalen nå (kan komme senere).
- En kommentar hindrer ikke godkjenning og gjør ikke en godkjenning ugyldig.
- Eget kort, bygges etter 0002.

**Konklusjon:** neste – men bygges først når 0002 er bygget.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.
