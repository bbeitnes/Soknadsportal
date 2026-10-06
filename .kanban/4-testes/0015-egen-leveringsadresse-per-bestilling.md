---
id: 0015
tittel: Egen leveringsadresse per bestilling
status: testes
opprettet: 2026-10-06
---

# 0015 · Egen leveringsadresse per bestilling

## Brukerhistorie

Som **bruker** ønsker jeg å kunne oppgi en egen leveringsadresse på en
bestilling, slik at leverandøren sender varene dit de faktisk skal (til
dirigenten, til et lager, til den som skal ha instrumentet) og ikke alltid til
organisasjonens faste leveringsadresse. Feltet er frivillig: står det tomt,
gjelder adressen fra Innstillinger som i dag.

## Kontekst

Bestillingen er PDF-en som lastes ned fra leverandørpanelet i Innkjøp
(`bestillingsfelt()` i `sider/innkjop.js`, `lagBestilling()` i
`ui/bestilling.js`). Det lages én bestilling per leverandør i et innkjøp
(linjene som er valgt hos den leverandøren, `bestilling()` i `beregning.js`).

I dag henter PDF-en «LEVERES TIL» fra organisasjonens faste felt i
`innstillinger/<orgId>`: `leveringsadresse`, ellers `adresse`
(`ui/bestilling.js:78`). Det finnes ingen måte å avvike fra dette for en enkelt
bestilling uten å endre den faste adressen midlertidig under Innstillinger – og
da gjelder endringen alle bestillinger som lages i mellomtiden.

Innkjøpets leverandørpost er `innkjop.<id>.leverandorer.<sid>` =
`{ leverandorId, frakt, vedlegg, rekkefolge }` (frie leverandører har også
`navn` og `kontakt`). Innkjøpet eier bare det som er spesielt for denne
tilbudsrunden; alt annet om leverandøren ligger i registeret. En
leveringsadresse som gjelder akkurat denne bestillingen hører hjemme på samme
sted som frakt.

Spec.md nevner ikke bestillingen; den kom som en avledet funksjon (B-19:
portalen lager PDF-en, brukeren sender den selv).

## Akseptansekriterier

- [ ] Gitt leverandørpanelet i Innkjøp (register- eller fri leverandør) når jeg
      åpner det så står det et frivillig tekstområde «Leveringsadresse» under
      «Kontakt», også før priser er valgt, med hjelpeteksten «Mottaker og
      adresse, én linje per rad. Tom = leveringsadressen under Innstillinger.»
- [ ] Gitt at jeg skriver i feltet og går ut av det (blur) så lagres verdien
      som `innkjop.<id>.leverandorer.<sid>.leveringsadresse` uten lagreknapp,
      «Lagret» vises i toppmenyen, og verdien står der etter ny innlasting (B-03).
- [ ] Gitt at feltet er utfylt når jeg laster ned bestillingen så er «LEVERES
      TIL» i PDF-en nøyaktig det som står i feltet, linje for linje.
      Organisasjonsnavnet legges ikke til automatisk.
- [ ] Gitt at feltet er tomt når jeg laster ned bestillingen så er PDF-en
      uendret fra i dag (fast leveringsadresse fra Innstillinger, ellers
      postadressen, med organisasjonsnavnet først).
- [ ] Gitt at feltet er utfylt og leverandøren har valgte priser så står det
      «Leveres til egen adresse» i underteksten under «Last ned bestilling (PDF)».
- [ ] Gitt et innkjøp opprettet før endringen (feltet mangler) så vises feltet
      tomt, og PDF-en er som før. Ingen migrering.
- [ ] Gitt «Fjern fra innkjøpet» så forsvinner adressen sammen med
      leverandørposten, som frakt og vedlegg gjør i dag.
- [ ] Gitt `?demo` så har én leverandør i ett innkjøp en egen leveringsadresse
      fra start, så PDF-en viser den uten at noe skrives inn.
- [ ] Gitt en leser (B-30) så er feltet skrivebeskyttet, og knappen virker.
- [ ] Gitt `node --test test/` så gir `bestilling()` feltet `leveringsadresse`
      (tom streng når det mangler), begge tilfellene er dekket, og alle tester går.

## Avgrensning

- Adressen lagres bare på bestillingen (leverandørposten i innkjøpet). Ingen
  adressebok eller liste over tidligere brukte adresser.
- Ikke per linje: alle varer i én bestilling går til samme adresse. Skal varer
  fra samme leverandør til to steder, må det brukes to innkjøp – det er ikke
  støttet her.
- Endrer ikke «FRA», «TIL» eller «FAKTURA SENDES TIL» i PDF-en.
- Vises ikke i Revisjon-fanen eller revisjonsrapporten, og inngår ikke i
  `revisjonsavtrykk()`.
- Ingen validering av adressen.

## Grilling

Grillet 2026-10-06, ett spørsmål om gangen.

**1. Kollisjon med beslutningsloggen.** Berører B-03 (lagres ved blur, eget felt), B-11 (feltet ligger på leverandørposten, som er et kart på innkjøpet), B-12 (frakt per leverandør er mønsteret feltet følger), B-19 (PDF-en lastes ned og sendes av brukeren) og B-30 (leser ser feltet skrivebeskyttet, knappen virker). Ingen brudd. Ingen regelendring i Firestore; ingen ny beslutning.

**2. Datamodell.** Nytt, frivillig tekstfelt `innkjop.<id>.leverandorer.<sid>.leveringsadresse` – én adresse per bestilling (= per leverandør i innkjøpet), valgt framfor ett felt på innkjøpet fordi to leverandører i samme tilbudsrunde kan levere til hvert sitt sted. Samme felt for register- og frie leverandører. Kan ikke utledes (B-15); er ikke duplikat av `innstillinger.leveringsadresse`, som er standarden feltet avviker fra. Tomt felt = standarden (fast leveringsadresse, ellers postadressen). Utfylt felt er hele «LEVERES TIL»-blokken, uten organisasjonsnavnet automatisk først – mottakeren kan være en privatperson.

**3. Migrering og data i drift.** Ingen migrering. Eldre innkjøp mangler feltet og leses som tomt. Fjernes leverandøren fra innkjøpet, forsvinner adressen med posten, som frakt og vedlegg. Deles en linje (B-13), gjelder adressen begge delene siden leverandørposten er den samme.

**4. Låser vi oss?** Nei. En adressebok eller liste over tidligere adresser kan senere fylle feltet uten å endre lagringen. Visning i Revisjon kan legges til senere uten å røre avtrykket.

**5. Er det nødvendig?** Alternativet er å endre den faste adressen under Innstillinger midlertidig – det gjelder alle bestillinger som lages i mellomtiden, og det er nettopp problemet.

**6. Hvordan verifiseres det?** `bestilling()` i `beregning.js` gir `leveringsadresse` fra leverandørposten (tom streng når den mangler) og testes med node for begge tilfellene. Demodataene får én leverandør med egen adresse. Brukeren tester på dev: lagring ved blur, PDF med adressen, tomt felt gir samme PDF som før, `?demo=leser` viser feltet skrivebeskyttet. Ingen ny testinfrastruktur.

**7. Sikkerhetskopien (B-24, B-25).** Ingen ny samling eller Storage-sti. Ingenting skriver til prod automatisk.

**Plassering.** Feltet står alltid i leverandørpanelet i Innkjøp, under «Kontakt», også før priser er valgt – leverandøren trenger leveringsstedet for å gi frakt. Hjelpetekst: mottaker og adresse, én linje per rad; tom = leveringsadressen under Innstillinger.

**Revisjon og rapport.** Bare på skjerm og i bestillings-PDF-en. Ikke i Revisjon-fanen, ikke i rapporten, ikke i `revisjonsavtrykk()` (versjonen forblir «v1»). Fakturaen er revisors bilag.

**Konklusjon:** neste.

## Notater

Lagt inn 2026-10-06 på slutten av dagen. Grillingen avgjorde at feltet ligger
på leverandørposten i innkjøpet (ikke på innkjøpet), vises alltid, og gjelder
også frie leverandører.
