---
id: 0010
tittel: Neste frist på søknaden
status: testes
opprettet: 2026-10-05
---

# 0010 · Neste frist på søknaden

## Brukerhistorie

Som **bruker** ønsker jeg at en søknad har en «Neste frist», slik at den blir markert når det nærmer seg at vi må gjøre noe med den.

## Kontekst

I dag har søknaden ett felt `frist` (søknadsfristen). Det markeres med aksentfarge i søknadslisten
bare mens søknaden er utkast og fristen ikke er passert. Etter at søknaden er sendt finnes det
ingen dato som sier når vi må gjøre noe igjen (f.eks. rapportere, bruke opp midlene, sende
revisjonsrapport).

Ønsket (2026-10-05): en «Neste frist» på søknaden som gjør at den markeres når det nærmer seg.

Løsningen etter grillingen:

- To nye felt: `soknader.<id>.nesteFrist` (dato) og `nesteFristHva` (tekst). Én frist om gangen.
- `frist` (søknadsfristen) beholdes. For utkast uten egen neste frist utledes neste frist derfra
  med teksten «Send søknaden» (B-15).
- Gjeldende neste frist, «nærmer seg» (≤ 30 dager), «forfalt» og sorteringen regnes ut i
  `beregning.js`. Avsluttet og avslått har ingen neste frist.
- Årshjulet (kort 0009) bruker samme utregning – derfor bygges 0010 først.
- Ingen regelendring i Firebase og ingen endring i sikkerhetskopien.

## Akseptansekriterier

Skrives som Gitt/Når/Så, og skal kunne verifiseres av noen andre enn den som
skrev dem. Unngå «fungerer bra» — si hva som skal stå på skjermen.

**Feltene på søknaden**

- [ ] Gitt en søknad, når jeg åpner Søknad-fanen, så står feltene «Neste frist» (dd.mm.åååå) og «Hva» rett under Frist og Sendt, og de lagres ved blur.
- [ ] Gitt en låst søknad (status ≠ utkast), så kan «Neste frist» og «Hva» fortsatt endres.
- [ ] Gitt en søknad med neste frist 20.10.2026 og «Sluttrapport til giver», så står «Neste frist 20.10.2026 · Sluttrapport til giver» i topplinjen på søknaden der det før sto «Frist …», med samme markering som i listen. Uten neste frist står søknadsfristen der som før.

**Søknadslisten**

- [ ] Gitt at jeg åpner søknadslisten, så heter kolonnen «Neste frist» (ikke «Frist»), og listen har fortsatt åtte kolonner.
- [ ] Gitt en innvilget søknad med neste frist 20.10.2026 og «Sluttrapport til giver», og dagens dato 05.10.2026, så står datoen med aksentfarge og teksten under i liten skrift.
- [ ] Gitt en søknad med neste frist mer enn 30 dager fram, så står dato og tekst uten farge.
- [ ] Gitt en søknad der neste frist er passert, så står datoen med ordet «Forfalt» og tydeligere markering enn aksentfargen, til jeg endrer eller tømmer feltet.
- [ ] Gitt et utkast uten «Neste frist», men med søknadsfrist 15.10.2026, så står «15.10.2026» med «Send søknaden» under, markert etter samme regler (også «Forfalt» når datoen er passert).
- [ ] Gitt et utkast med både søknadsfrist og egen «Neste frist», så er det «Neste frist» som vises.
- [ ] Gitt en sendt eller innvilget søknad uten «Neste frist», så står det en strek i kolonnen, selv om søknadsfristen er satt.
- [ ] Gitt en søknad med dato uten tekst, så vises bare datoen. Gitt tekst uten dato, så står det en strek.
- [ ] Gitt en søknad med status Avsluttet eller Avslått, så står det en strek i kolonnen og ingen markering, og det som er skrevet i feltene står urørt inne i søknaden.
- [ ] Gitt at jeg tømmer «Neste frist», så forsvinner markeringen i listen og i topplinjen.

**Sortering**

- [ ] Gitt tre søknader med neste frist 01.10 (forfalt), 20.10 og 15.01, og to uten, når jeg åpner listen 05.10.2026, så står de tre øverst i rekkefølgen 01.10 – 20.10 – 15.01, og de to uten følger etter i samme rekkefølge som i dag.

**Avgrenset synlighet**

- [ ] Gitt at jeg er revisor, så ser jeg verken feltene eller markeringen, og en endring av neste frist gjør ikke en godkjenning «endret» (inngår ikke i `revisjonsavtrykk()`).

**Demo og tester**

- [ ] Gitt `localhost:8430/?demo`, så finnes det minst én søknad med neste frist innen 30 dager og én forfalt.
- [ ] Gitt `node --test test/`, så er gjeldende neste frist (egen / utledet fra søknadsfristen / ingen for lukkede), markering og sortering dekket av tester i beregningslaget.

## Avgrensning

- Ingen varsling på e-post – portalen sender ingenting selv (B-19).
- Bare én neste frist per søknad, ikke en liste med frister eller gjøremål.
- Ingen automatisk forslag til neste frist når status endres, og feltet tømmes aldri automatisk.
- Ikke filter «Har frist» i søknadslisten.
- Ingen migrering: gamle utkast med passert søknadsfrist blir «Forfalt» og ryddes for hånd.
- Visningen i årshjulet er kort 0009 (bygges etter dette).

## Grilling

Grillet 2026-10-05 med `/grill-me` (ett spørsmål om gangen).

**Valgene**

- **Q1 Én eller liste?** Ett felt for dato og ett for hva. Én neste frist om gangen; ingen gjøremålsliste og ingen forslag ut fra status.
- **Q2 Forholdet til søknadsfristen:** `frist` beholdes. Er søknaden utkast og «Neste frist» tom, regnes søknadsfristen som neste frist med teksten «Send søknaden». Egen neste frist på et utkast går foran.
- **Q3 Søknadslisten:** kolonnen «Frist» blir «Neste frist» (dato, teksten under). Strek når ingenting venter.
- **Q4 Sortering:** søknader med neste frist øverst, nærmeste/forfalte først; resten som i dag.
- **Q5 Markering:** aksentfarge fra 30 dager før (samme grense som årshjulet), «Forfalt» når datoen er passert, til feltet endres eller tømmes. Endrer dagens oppførsel: et utkast med passert søknadsfrist står som forfalt.
- **Q6 Avsluttet/avslått:** markeres ikke og teller ikke; feltet blir stående urørt.
- **Q7 Årshjulet (kort 0009):** viser søknadens neste frist i stedet for søknadsfristen, én linje per søknad. Kriteriet i 0009 er rettet.
- **Q8 Detaljer:** feltene står under Frist/Sendt i Søknad-fanen og er åpne når søknaden er låst; topplinjen viser neste frist; tekst uten dato gir ingenting; revisor ser det ikke; 0010 bygges før 0009.

**Punktene**

1. **Kollisjon med beslutningsloggen.** Ingen brudd. B-03 (lagres ved blur), B-15 (gjeldende frist, markering og sortering utledes), B-16 (feltene er åpne når søknaden er låst, men rører ikke det vi søkte om), B-19 (ingen varsling), B-23 (revisor ser ikke feltene; de inngår ikke i `revisjonsavtrykk()`).
2. **Datamodell.** To nye felt: `soknader.<id>.nesteFrist` (dato) og `nesteFristHva` (tekst). Søknadsfristen dupliseres ikke – for utkast utledes neste frist fra `frist`. «Forfalt», «nærmer seg» og sorteringen regnes ut i `beregning.js`.
3. **Migrering og data i drift.** Ingen. Feltene er valgfrie. Gamle utkast i prod med passert søknadsfrist blir «Forfalt» og ryddes for hånd (endre status eller fjerne fristen). Ingen regelendring: brukere kan allerede skrive søknaden.
4. **Låser vi oss?** Nei. Ett felt kan bygges ut til en liste senere (da blir `nesteFrist` første post).
5. **Er det nødvendig?** Uten dette finnes ingen dato for hva som skal skje etter at søknaden er sendt; rapportfrister huskes utenfor portalen.
6. **Hvordan verifiseres det?** Tester i `test/` for gjeldende neste frist, markering og sortering. Demodata får en innvilget søknad med frist om et par uker og en forfalt; brukeren ser på `localhost:8430/?demo` før push til test (B-10).
7. **Sikkerhetskopien (B-24, B-25).** Ingen ny samling og ikke noe nytt lagringssted – uendret. Ingenting automatisk skriver til prod.

**Konklusjon:** `neste`. Ingen ny beslutning.

## Notater

- 2026-10-05: Bygget på dev. Sett i `?demo`: listen (forfalt, nær, senere, utledet for utkast), feltene på en låst søknad, topplinjen, tømming av feltet. `node --test test/`: 71 av 71. Ikke pushet til test.
Løpende. Lenke til commits, skjermbilder, avklaringer.
