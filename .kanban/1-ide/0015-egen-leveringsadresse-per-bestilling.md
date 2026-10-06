---
id: 0015
tittel: Egen leveringsadresse per bestilling
status: idé
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

- [ ] Gitt leverandørpanelet i Innkjøp når leverandøren har valgte priser (slik
      at «Last ned bestilling (PDF)» vises) så står det et frivillig tekstområde
      «Leveringsadresse» i samme felt, med hjelpeteksten «Tom = leveringsadressen
      under Innstillinger.» Feltet lagres ved blur (B-03) som
      `innkjop.<id>.leverandorer.<sid>.leveringsadresse`.
- [ ] Gitt at feltet er utfylt når jeg laster ned bestillingen så står
      bestillingens adresse i «LEVERES TIL» i PDF-en, linje for linje som
      skrevet, i stedet for organisasjonens faste adresse. Organisasjonsnavnet
      står ikke automatisk først – det som er skrevet i feltet er hele blokken.
- [ ] Gitt at feltet er tomt når jeg laster ned bestillingen så er PDF-en
      uendret fra i dag (fast leveringsadresse, ellers postadressen).
- [ ] Gitt at feltet er utfylt så viser underteksten under knappen
      «Leveres til egen adresse», slik at det er synlig før PDF-en lages.
- [ ] Gitt et innkjøp opprettet før endringen (feltet mangler) så vises
      feltet tomt, og PDF-en er som før. Ingen migrering.
- [ ] Gitt en leser (B-30) så er feltet skrivebeskyttet og knappen virker.
- [ ] Gitt `node --test test/` så er `bestilling()` dekket for at
      leveringsadressen følger med, og alle tester går.

## Avgrensning

- Adressen lagres bare på bestillingen (leverandørposten i innkjøpet). Ingen
  adressebok eller liste over tidligere brukte adresser.
- Ikke per linje: alle varer i én bestilling går til samme adresse. Skal varer
  fra samme leverandør til to steder, deles innkjøpslinjen og brukes to
  innkjøp – det er ikke støttet her.
- Endrer ikke «FRA», «TIL» eller «FAKTURA SENDES TIL» i PDF-en.
- Inngår ikke i `revisjonsavtrykk()` og vises ikke i revisjonsrapporten.
- Ingen validering av adressen.

## Grilling

_Fylles av `planlegging.mjs svar 0015` etter at `/grill-me` har kjørt mot
underlaget. Kortet kan ikke flyttes ut av «idé» før dette er besvart._

## Notater

Lagt inn 2026-10-06 på slutten av dagen. Mulig avklaring i grillingen: skal
feltet ligge på leverandørposten (én adresse per bestilling, som foreslått) eller
på innkjøpet (samme adresse for alle leverandørene i tilbudsrunden)?
