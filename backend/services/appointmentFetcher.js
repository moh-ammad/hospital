import axios from "axios";
import { withRateLimit, sleep } from "../utils/ratelimter.js";
import { loadClientFile, saveClientFile } from "../utils/fileStore.js";
import { saveAppointments } from "./appointmentSaver.js";

const SAFE_DELAY = 7000; // ~8–9 req/min
const MAX_DAILY = 500;

export async function fetchAppointments(config) {
  const { clientName, apiKey, apiUrl } = config;

  const headers = {
    "X-Auth-Key": apiKey,
    "Content-Type": "application/json"
  };

  const { file, lastPageFetched, map } = await loadClientFile(clientName);

  const startingPage = lastPageFetched + 1;
  let page = startingPage;
  let shots = 0;

  console.log(`Starting sync for ${clientName} from page ${page} (previously fetched through page ${lastPageFetched})...`);

  while (true) {
    if (shots >= MAX_DAILY) {
      console.log(`🛑 Daily request limit (${MAX_DAILY}) reached.`);
      break;
    }

    const params = { page };

    const response = await withRateLimit(() =>
      axios.get(apiUrl, {
        headers,
        params
      })
    );

    shots++;

    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`✅ No more appointments to fetch (page ${page} was empty).`);
      break;
    }

    // Add to map (JSON dedupe by Id)
    for (const appt of data) {
      map.set(appt.Id, appt);
    }

    // Save to DB in a batch (pass the practice/client name so we upsert the clinic)
    try {
      await saveAppointments(data, apiKey, clientName);
    } catch (err) {
      console.error(`Failed saving page ${page} to DB:`, err);
      throw err;
    }

    // Save to JSON file
    await saveClientFile(file, page, map);

    const totalRequestsSoFar = lastPageFetched + shots; // includes previous runs
    const shotsLeft = Math.max(0, MAX_DAILY - totalRequestsSoFar);

    console.log(
      `✔ ${clientName} | Page ${page} | ${data.length} records | Total: ${map.size} | Shots left: ${shotsLeft}`
    );

    page++;
    await sleep(SAFE_DELAY + Math.random() * 2000);
  }

  const totalRequestsAll = lastPageFetched + shots;
  console.log(`🎉 Finished. Saved ${map.size} unique appointments. This run: ${shots} requests. Total requests (including previous runs): ${totalRequestsAll}.`);
}

