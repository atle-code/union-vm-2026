// POST /api/refresh -> henter ferske resultater fra ESPN/TheSportsDB på serveren,
// fyller hull, lagrer i delt lager, og returnerer { results, lastUpdated, lastSource }.
import { refreshResults } from "./lib/core.mjs";

export default async () => {
  const headers = { "Cache-Control": "no-store" };
  try {
    const next = await refreshResults();
    return Response.json(next, { headers });
  } catch (e) {
    return Response.json({ error: String(e && e.message || e) }, { status: 500, headers });
  }
};
