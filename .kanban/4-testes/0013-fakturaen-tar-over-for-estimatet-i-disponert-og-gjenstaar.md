---
id: 0013
tittel: Fakturaen tar over for estimatet i Disponert og Gjenstår
status: testes
opprettet: 2026-10-05
---

# 0013 · Fakturaen tar over for estimatet i Disponert og Gjenstår

## Brukerhistorie

Som **den som følger opp en søknad** ønsker jeg at «Disponert» og «Gjenstår» bruker det som faktisk er fakturert når fakturaen har kommet, slik at estimatene fra budsjetteringen ikke blir stående og gir et galt bilde av hvor mye som er igjen av rammen.

## Kontekst

Utgifter legges først inn som estimater i budsjetteringsfasen. `pott()` regner «Disponert» av beløpet
på utgiften og den valgte tilbudsprisen i innkjøpene – også etter at fakturaen har kommet med et
annet beløp. I «Driftsstøtte/breddemidler – Rekruttering 2026» (prod, 2026-10-05) ga det ramme
52 322,00, disponert 60 195,00, fakturert 53 195,00 og gjenstår −7 873,00: topplinjen viser et
overforbruk som trolig for det meste er for høye estimater. Sluttoppgjøret per type
(`fordelingPerKategori()`) bruker allerede «fakturert der det finnes, ellers tilbudt», så topplinjen
og rapporten regner i dag ulikt.

I tillegg er topplinjen uklar ved overforbruk: «Gjenstår» står som negativt tall, og linjen under
sier «giver 47 873,00» selv om bare 40 000,00 er innvilget.

## Akseptansekriterier

Eksempel: innvilget 40 000,00, egenandel 12 322,00 (ramme 52 322,00).

- [ ] Gitt en løs utgift på 10 000,00 uten faktura når jeg ser topplinjen så teller den 10 000,00 i «Disponert»
- [ ] Gitt samme utgift med en faktura på 8 500,00 koblet til når jeg ser topplinjen så teller den 8 500,00, og «Gjenstår» er 1 500,00 høyere enn før fakturaen
- [ ] Gitt en valgt innkjøpslinje med tilbudt 22 320,00 og en faktura på 23 000,00 når jeg ser topplinjen så teller den 23 000,00
- [ ] Gitt en post med faktura når jeg åpner fakturaen i Revisjon så står krysset «Flere fakturaer kommer» ved posten under «Gjelder», og når jeg krysser av så teller posten estimatet igjen, og postlisten viser merket «Venter på flere» på den
- [ ] Gitt en post med krysset satt når jeg fjerner krysset så teller posten det fakturerte med en gang
- [ ] Gitt en faktura som ikke er koblet til noen post når jeg ser topplinjen så teller den ikke i «Disponert» (men i «Fakturert»), og Revisjon sier fra om den som i dag
- [ ] Gitt en søknad med poster med og uten faktura når jeg sammenligner «Disponert» i topplinjen, kostnaden i sluttoppgjøret per type i Revisjon og «Disponert (fakturert og planlagt)» på forsiden i PDF-rapporten så er de tre tallene like
- [ ] Gitt en revisor som har godkjent når krysset settes eller fjernes på en post så står godkjenningen som «godkjent»
- [ ] Gitt at disponert overstiger rammen med 7 873,00 når jeg ser topplinjen så heter kolonnen «Overforbruk» og viser 7 873,00 i rødt, og linjen under sier «giver 40 000,00» og «over rammen 7 873,00 – må dekkes selv»
- [ ] Gitt at disponert er innenfor rammen når jeg ser topplinjen så heter kolonnen «Gjenstår» som i dag
- [ ] Gitt en post med egeninnsats når jeg ser topplinjen så teller den estimatet som i dag
- [ ] Gitt `?demo` når jeg åpner demodataene så finnes det en post der fakturaen avviker fra estimatet og en post med krysset satt

## Avgrensning

- Estimatet på utgiften og tilbudsprisen overskrives ikke av fakturaen – det skal fortsatt gå an å se hva som var planlagt og avviket.
- Ingen endring i søkt beløp eller i det som er låst etter sending (B-16).
- Ukoblede fakturaer legges ikke til «Disponert»; de er en uferdig registrering som Revisjon allerede varsler om.
- Krysset er ikke med i revisjonsavtrykket, og versjonen økes ikke.
- Ingen kobling mellom en faktura og hvilken del av posten den gjelder.
- «Disponert» beholder navnet; ingen deling i «fakturert» og «planlagt» i topplinjen.

## Grilling

Grillet 2026-10-06 (intervju med brukeren, ett spørsmål om gangen).

**Avklart i intervjuet**

- **Regelen:** en post teller fakturert så snart den har faktura, ellers estimatet (utgift) eller tilbudt pris (innkjøpslinje). Samme regel som `fordelingPerKategori()` allerede brukte i Revisjon og rapporten.
- **Unntaket:** et kryss på posten, «Flere fakturaer kommer» (`venterFlere`, boolsk på `innkjop.<id>.linjer.<lid>` og `soknader.<id>.utgifter.<uid>`). Satt → estimatet gjelder til krysset fjernes. Vendt slik at det vanlige tilfellet (én faktura per post) ikke krever noen handling.
- **Hvor:** krysset settes i fakturapanelet under «Gjelder», ved hver post fakturaen dekker. Postlisten i Revisjon viser merket «Venter på flere», men endrer ikke krysset.
- **Ukoblede fakturaer:** teller ikke i «Disponert» (som i dag). «Fakturert» i topplinjen tar dem med; Revisjon varsler.
- **Overalt:** topplinjen, Revisjon og PDF-rapporten bruker samme funksjon.
- **Avtrykket:** krysset er ikke med; ingen versjonsøkning. Fakturaene og prisene er allerede i avtrykket, og godkjenning krever Avsluttet.
- **Overforbruk:** kolonnen heter «Overforbruk» (positivt tall i rødt) når rammen er overskredet; linjen under viser aldri mer «giver» enn innvilget, resten som «over rammen – må dekkes selv». Bare visning.
- **Navn:** «Disponert» beholdes; rapporten skriver «Disponert (fakturert og planlagt)».
- **Uendret:** egne midler på posten trekkes fra uansett; egeninnsats teller estimatet; kreditnota er en del av det fakturerte på posten; estimatet overskrives aldri.

**Punktene**

1. **Kollisjon med beslutningsloggen.** Presiserer B-17 («disponert» var det valgte og det førte) – ført som B-31. B-15: krysset lagres fordi det ikke kan utledes (om det kommer flere fakturaer vet bare brukeren). B-16 røres ikke. B-23: revisor og leser kan ikke sette krysset (reglene stopper dem allerede). B-11: feltene ligger som kart på dokumentene.
2. **Datamodell.** Ett nytt boolsk felt per post. Alt annet utledes av fakturaer og estimater som finnes.
3. **Migrering og data i drift.** Ingen. Manglende felt = usant. Regler endres ikke (feltene ligger på dokumenter brukere allerede kan skrive). Tallene i prod endrer seg for søknader der fakturaene avviker fra estimatene – det er meningen.
4. **Låser vi oss?** Nei. Regelen er én funksjon (`postkostnad()`); en senere kobling faktura→del av post kan erstatte krysset.
5. **Er det nødvendig?** Ja – topplinjen viste 7 873 kr i overforbruk i prod som trolig i hovedsak var for høye estimater, og regnet annerledes enn rapporten. Alternativet (rette estimatene for hånd) er nettopp det som er krøllete.
6. **Hvordan verifiseres det?** Tester i `test/beregning.test.js` (uten faktura, lavere/høyere faktura, kryss satt/fjernet, ukoblet faktura, egeninnsats, overforbruk, topplinje = rapport). Demodata med avvikende faktura og kryss; sjekkes på `?demo` og test-siden.
7. **Sikkerhetskopien (B-24, B-25).** Ikke berørt: nye felt på eksisterende dokumenter, ingen nye samlinger eller lagringssteder.

Faller ut som ny beslutning: B-31.

**Konklusjon:** neste.

## Notater

Løpende. Lenke til commits, skjermbilder, avklaringer.

- 2026-10-06: Bygget og sett på dev (`?demo`): «Instrumenter til aspirantkorpset 2026» har faktura 1 på 29 900,00 mot tilbudt 30 600,00 og en delfaktura på rekvisita med krysset satt. Kjent forskjell: frakt teller i topplinjen (til første faktura fra leverandøren), men ikke i sluttoppgjøret per type – som før.
