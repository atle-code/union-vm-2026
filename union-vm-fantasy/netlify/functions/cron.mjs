// Planlagt kjøring: henter ferske resultater automatisk hvert 30. minutt,
// slik at tabellen oppdaterer seg selv uten at noen trykker "Hent".
import { refreshResults } from "./lib/core.mjs";

export const config = { schedule: "*/30 * * * *" };

export default async () => {
  try {
    const next = await refreshResults();
    const played = Object.keys(next.results || {}).length;
    console.log(`[cron] oppdatert – ${played} resultater, kilde: ${next.lastSource}`);
  } catch (e) {
    console.error("[cron] feilet:", e && e.message || e);
  }
  return new Response("ok");
};
