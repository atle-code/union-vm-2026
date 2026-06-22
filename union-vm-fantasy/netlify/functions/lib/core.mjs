// Felles logikk for å hente ferske VM-resultater på serveren (ingen CORS, ingen klokkeproblem)
// og lagre dem i Netlify Blobs (delt lager). Importeres av state.mjs, refresh.mjs og cron.mjs.
import { getStore } from "@netlify/blobs";
import seed from "./seed.json";

const STORE = "vmf";
const STATE_KEY = "state";

// --- navnenormalisering (speiler appen) ---
const ALIAS = {
  unitedstates: "usa", congodr: "drcongo", turkiye: "turkey",
  korearepublic: "southkorea", republicofkorea: "southkorea", iriran: "iran",
  caboverde: "capeverde", cotedivoire: "ivorycoast", bosniaandherzegovina: "bosniaherzegovina",
};
const nz = (s) => {
  const b = (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALIAS[b] || b;
};
const pairKey = (a, b) => [nz(a), nz(b)].sort().join("|");

// fixture-oppslag på lagpar
const FX_BY_PAIR = {};
for (const f of seed.fixtures) FX_BY_PAIR[pairKey(f.h, f.a)] = f;

// --- kilde 1: ESPN (fast turneringsvindu) ---
async function fetchEspn() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720";
  const r = await fetch(url);
  if (!r.ok) throw new Error("ESPN " + r.status);
  const data = await r.json();
  const out = [];
  for (const ev of data.events || []) {
    const comp = (ev.competitions || [])[0]; if (!comp) continue;
    const st = (comp.status || {}).type || {};
    if (!(st.completed || st.state === "post")) continue;
    const cs = comp.competitors || []; if (cs.length < 2) continue;
    const nameOf = (c) => ((c.team || {}).displayName || (c.team || {}).name || (c.team || {}).shortDisplayName || "");
    const A = { name: nameOf(cs[0]), s: parseInt(cs[0].score, 10) };
    const B = { name: nameOf(cs[1]), s: parseInt(cs[1].score, 10) };
    if (!Number.isFinite(A.s) || !Number.isFinite(B.s)) continue;
    out.push({ home: A.name, away: B.name, hs: A.s, as: B.s, date: (ev.date || "").slice(0, 10), src: "ESPN" });
  }
  return out;
}

// --- kilde 2: TheSportsDB (reserve) ---
async function fetchSportsDb() {
  const urls = [
    "https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026",
    "https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4429",
  ];
  const out = [], seen = {};
  for (const u of urls) {
    try {
      const r = await fetch(u); const j = await r.json();
      for (const ev of j.events || []) {
        if (!ev || seen[ev.idEvent]) continue;
        const hs = ev.intHomeScore, as = ev.intAwayScore;
        if (hs == null || as == null || hs === "" || as === "") continue;
        seen[ev.idEvent] = 1;
        out.push({ home: ev.strHomeTeam, away: ev.strAwayTeam, hs: parseInt(hs, 10), as: parseInt(as, 10), date: ev.dateEvent, src: "TheSportsDB" });
      }
    } catch (e) { /* prøv neste */ }
  }
  return out;
}

// hole-filling: skriv kun inn kamper vi mangler, riktig orientert mot fixturen
function absorb(items, results, srcs) {
  for (const it of items || []) {
    if (!it || !it.home || !it.away) continue;
    const fx = FX_BY_PAIR[pairKey(it.home, it.away)];
    if (!fx || results[fx.id] != null) continue;
    const hs = Number(it.hs), as = Number(it.as);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const swap = nz(fx.h) !== nz(it.home);
    results[fx.id] = swap ? [as, hs] : [hs, as];
    if (it.src) srcs.add(it.src);
  }
}

export async function readState() {
  const store = getStore(STORE);
  let state = null;
  try { state = await store.get(STATE_KEY, { type: "json" }); } catch (e) {}
  const results = { ...seed.results, ...((state && state.results) || {}) }; // baked = gulv
  return { results, lastUpdated: (state && state.lastUpdated) || null, lastSource: (state && state.lastSource) || null };
}

export async function saveState(incoming) {
  const store = getStore(STORE);
  const cur = await readState();
  const results = { ...cur.results, ...((incoming && incoming.results) || {}) };
  const next = {
    results,
    lastUpdated: (incoming && incoming.lastUpdated) || Date.now(),
    lastSource: (incoming && incoming.lastSource) || cur.lastSource || null,
  };
  await store.setJSON(STATE_KEY, next);
  return next;
}

export async function refreshResults() {
  const store = getStore(STORE);
  const cur = await readState();
  const results = { ...cur.results };
  const srcs = new Set();

  const open = () => seed.fixtures.filter((f) => results[f.id] == null);
  if (open().length) {
    try { absorb(await fetchEspn(), results, srcs); } catch (e) {}
  }
  if (open().length) {
    try { absorb(await fetchSportsDb(), results, srcs); } catch (e) {}
  }

  const next = {
    results,
    lastUpdated: Date.now(),
    lastSource: srcs.size ? [...srcs].join(", ") : (cur.lastSource || "Live (offisielle kilder)"),
  };
  await store.setJSON(STATE_KEY, next);
  return next;
}
