// GET  /api/state  -> { results, lastUpdated, lastSource }   (baked-floor + delt lager)
// POST /api/state  -> lagrer manuelle endringer (fra "Lagre & regn om") til det delte lageret
import { readState, saveState } from "./lib/core.mjs";

export default async (req) => {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const next = await saveState(body);
      return Response.json(next, { headers });
    }
    const state = await readState();
    return Response.json(state, { headers });
  } catch (e) {
    return Response.json({ error: String(e && e.message || e) }, { status: 500, headers });
  }
};
