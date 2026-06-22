# UNION VM-fantasy — live på Netlify

Selvoppdaterende utgave av poengtavla. Resultatene hentes **på serveren** fra ESPN
(med TheSportsDB som reserve), lagres i **Netlify Blobs** (gratis delt lager), og deles
med alle som åpner siden. En planlagt jobb oppdaterer hvert 30. minutt – så tabellen
holder seg fersk uten at noen trenger å trykke på noe.

Tips, deltakere og bilder ligger fast i appen (de endrer seg ikke). Det er kun
**resultatene** som er live og delt.

---

## Sånn får du den opp (engangsjobb)

Du trenger en GitHub-konto og Netlify-kontoen du allerede har.

1. **Legg filene i et GitHub-repo.**
   Lag et nytt, tomt repo på github.com (f.eks. `union-vm-fantasy`) og last opp alt
   innholdet i denne mappa (dra inn filene i GitHubs «upload files», eller bruk Git).
   Ikke last opp `node_modules/` eller `dist/` – de bygges automatisk.

2. **Koble repoet til Netlify.** To måter:
   - **Behold samme adresse** (`union-vm-fantasy.netlify.app`): åpne det eksisterende
     nettstedet i Netlify → *Site configuration → Build & deploy → Continuous deployment*
     → **Link repository** → velg GitHub-repoet.
   - **Eller nytt nettsted:** *Add new site → Import an existing project →* velg repoet.
     (Vil du ha samme navn, døp om det gamle først under *Site configuration → Change site name*.)

3. **Bygg-innstillinger:** ingenting å fylle ut – Netlify leser `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Deploy.** Trykk deploy. Det er alt.
   - **Netlify Blobs** (det delte lageret) virker automatisk – ingen nøkler, ingen oppsett.
   - Den planlagte jobben dukker opp under *Functions → cron* og kjører hvert 30. min av seg selv.

Første gang siden lastes vises de innbakte resultatene umiddelbart. Innen 30 minutter
(eller med en gang noen trykker «Hent») hentes nyere ferdigspilte kamper inn live og deles
med hele gruppa.

---

## Hvordan det henger sammen

```
Nettleser (React, statisk)
   │  GET  /api/state     → leser delt resultattavle
   │  POST /api/refresh   → ber serveren hente ferskt nå ("Hent"-knappen)
   ▼
Netlify-funksjoner (kjører på serveren)
   • state.mjs    – les/lagre delt tilstand
   • refresh.mjs  – hent fra ESPN + TheSportsDB, fyll hull, lagre
   • cron.mjs     – samme henting automatisk hvert 30. min
   ▼
Netlify Blobs  (delt nøkkellager, key "state")
```

- **Gulv:** de 28 innbakte resultatene i `netlify/functions/lib/seed.json` er alltid bunnplanke.
  Henting legger bare til kamper som mangler (overskriver aldri).
- **ESPN** spørres med fast turneringsvindu `20260611–20260720` (ingen klokke- eller CORS-feil
  fordi det skjer på serveren). **TheSportsDB** brukes kun for kamper ESPN ikke gir.

---

## Verdt å vite

- **Tailwind via CDN:** `index.html` laster Tailwind fra cdn.tailwindcss.com. Det gir en
  ufarlig advarsel i nettleserkonsollen om at CDN ikke er ment for produksjon – helt greit
  for en intern pool.
- **Excel-import-knappen** virker ikke på den publiserte siden (den leser lokale filer i
  Claude-miljøet). Det trengs ikke – tipsene er bakt inn.
- **Tvinge oppdatering:** «Hent»/«Oppdater»-knappen kaller `/api/refresh` med en gang.
- **Nye resultater i bunnplanken:** vil du bake flere resultater fast inn (uavhengig av live),
  oppdater `netlify/functions/lib/seed.json` og `src/App.jsx` (SEED) – be Claude om det i en ny chat.

---

## Lokalt (valgfritt)

```bash
npm install
npm run dev        # bare UI (uten backend)
# for å teste backend/Blobs lokalt trengs Netlify CLI:
# npx netlify dev
```
