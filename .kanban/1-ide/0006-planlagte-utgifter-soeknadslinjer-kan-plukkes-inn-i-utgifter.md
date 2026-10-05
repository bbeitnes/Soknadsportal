---
id: 0006
tittel: Planlagte utgifter: søknadslinjer kan plukkes inn i Utgifter
status: idé
opprettet: 2026-10-05
---

# 0006 · Planlagte utgifter: søknadslinjer kan plukkes inn i Utgifter

## Brukerhistorie

Som **bruker som fører en søknad** ønsker jeg å plukke en linje vi har søkt om
inn i Utgifter og koble den faktiske fakturaen til den, slik at søknader som
bare gjelder utgifter (ikke innkjøp med tilbud) kan føres og revideres uten at
jeg må lage et innkjøp eller skrive utgiften inn én gang til.

## Kontekst

Noen søknader har ingen innkjøp. Vi har søkt om dekning for utgifter
(dirigenthonorar, leie av lokale, reise …), og de står i Søknad-fanen som frie
linjer – skrevet rett inn, ikke hentet fra Behov.

I dag er de to tingene ikke koblet:

- En søknadslinje kan bare følges opp gjennom Innkjøp (linje → tilbud → valgt
  pris → faktura). For en ren utgift er tilbudsrunde og leverandørmatrise
  meningsløst.
- Utgifter-fanen har «løse utgifter» (`soknader.<id>.utgifter`), som kan kobles
  til faktura i Revisjon. Men de må skrives inn på nytt og har ingen kobling
  til linjen vi søkte om, så det går ikke fram hva som var planlagt og hva som
  dukket opp underveis.

Utgifter blir dermed to ting: **planlagte** (står i søknaden) og **uplanlagte**
(kommer opp underveis, som i dag).

Forslag til løsning (prøves i grillingen):

- Utgifter-fanen får «+ Fra søknaden»: et panel med søknadslinjene som verken
  ligger i et innkjøp eller allerede er plukket. Valgte linjer blir utgifter med
  `soknadLinjeId`, beskrivelsen og typen fra linjen og estimatet som beløp.
- Beløpet på utgiften er det faktiske og kan rettes; estimatet står urørt på
  søknadslinjen (B-16). Faktura kobles som for løse utgifter i dag.
- «Planlagt» lagres ikke som eget felt – en utgift er planlagt når den har
  `soknadLinjeId` (B-15).

## Akseptansekriterier

- [ ] Gitt en søknad med frie linjer som ikke ligger i noe innkjøp, når jeg
      trykker «+ Fra søknaden» i Utgifter-fanen, så viser et sidepanel disse
      linjene med tittel, type og estimert sum, og jeg kan krysse av én eller
      flere.
- [ ] Gitt at jeg har krysset av linjer og bekrefter, når panelet lukkes, så
      står hver linje som en utgift i Utgifter-fanen med linjens tittel som
      beskrivelse, linjens type og estimatet (antall × pris) som beløp.
- [ ] Gitt en linje som allerede er plukket inn i Utgifter eller ligger i et
      innkjøp, når panelet åpnes, så er den ikke med i listen.
- [ ] Gitt en planlagt utgift, når jeg ser Utgifter-fanen, så er den merket
      «Fra søknaden» og viser hva vi søkte om ved siden av det faktiske beløpet;
      utgifter uten kobling ser ut som i dag.
- [ ] Gitt en planlagt utgift, når jeg endrer beløpet, så er estimatet på
      søknadslinjen og «Søkt beløp» uendret.
- [ ] Gitt en planlagt utgift, når jeg kobler en faktura til den i Revisjon,
      så oppfører den seg som en løs utgift gjør i dag (tilbudt, fakturert,
      avvik, «mangler faktura», pott), og den regnes inn i sin type i
      sluttoppgjøret og rapporten.
- [ ] Gitt en planlagt utgift, når jeg sletter den i Utgifter-fanen, så står
      søknadslinjen igjen i søknaden og kan plukkes på nytt.
- [ ] Gitt en låst søknad (status ≠ utkast), når jeg plukker linjer inn i
      Utgifter, så går det – det vi søkte om endres ikke av det.
- [ ] Gitt en revisor på en tildelt søknad, når hen åpner Revisjon, så vises
      planlagte utgifter på linje med andre poster, skrivebeskyttet.
- [ ] `node --test test/` er grønn, med nye tester for hvilke linjer som kan
      plukkes og for at koblingen ikke endrer `sumEstimert()` eller `pott()`
      ut over utgiftens eget beløp.

## Avgrensning

- Ingen endring i Innkjøp: linjer som skal ha tilbud, går dit som før.
- Ingen ny samling og ingen regelendring – utgiftene ligger fortsatt som kart
  på søknaden (B-11).
- Uplanlagte (løse) utgifter, egeninnsats og kvitteringer fra mobil virker som
  i dag.
- Ikke delvis plukking (én linje fordelt på flere utgifter) – avklares i
  grillingen om det trengs.
- PDF-rapporten skiller ikke planlagt fra uplanlagt ut over typen, med mindre
  grillingen sier noe annet.

## Grilling

_Fylles av `planlegging.mjs svar 0006` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.
