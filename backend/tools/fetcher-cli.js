#!/usr/bin/env node
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { sleep } from "../utils/ratelimter.js";
import { loadClientFile, saveClientFile, clientNameToSlug } from "../utils/fileStore.js";
import { saveAppointments } from "../services/appointmentSaver.js";

// Simple argv parser: --key value
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      out[key] = val;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv);
const clientName = args.clientName || args.client || process.env.CLIENT_NAME;
const apiKey = args.apiKey || process.env.API_KEY;
const apiUrl = args.apiUrl || process.env.API_URL || "https://intakeq.com/api/v1/appointments";
const range = args.range || process.env.RANGE || "all";

if (!clientName || !apiKey) {
  console.error("Usage: node tools/fetcher-cli.js --clientName " +
    '"Pure Balance" --apiKey "<key>" [--apiUrl "<url>"] [--range 6months|1year|all]');
  process.exit(1);
}

const SAFE_DELAY_MS = Number(args.delay) || 7000;
const MAX_DAILY = Number(args.maxDaily) || 500;
const pushDb = ("push-db" in args) || ("pushDb" in args);

function getStartDateMs(range) {
  const now = new Date();
  if (range === "6months") {
    now.setMonth(now.getMonth() - 6);
    return now.getTime();
  }
  if (range === "1year") {
    now.setFullYear(now.getFullYear() - 1);
    return now.getTime();
  }
  if (range === "all") return null;
  throw new Error("Invalid range. Use '6months', '1year' or 'all'");
}

async function fetchAndSave() {
  const startDate = getStartDateMs(range);
  const headers = { "X-Auth-Key": apiKey, "Content-Type": "application/json" };

  // Use the project's fileStore semantics so saved files match server behavior
  const slug = clientNameToSlug(clientName);
  const dir = path.join(process.cwd(), "data", slug);
  const file = path.join(dir, "appointments.json");

  await fs.mkdir(dir, { recursive: true });

  let page = 1;
  let shots = 0;
  let map = new Map();

  // resume
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    page = (parsed.lastPageFetched || 0) + 1;
    map = new Map((parsed.appointments || []).map(a => [a.Id, a]));
    if (page > 1) console.log(`Resuming from page ${page}`);
  } catch {
    // start fresh
  }

  while (shots < MAX_DAILY) {
    const params = { page };
    if (startDate != null) params.startDate = startDate;

    try {
      const resp = await axios.get(apiUrl, { headers, params });
      shots++;
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) {
        console.log("No more data — finished");
        break;
      }

      for (const a of data) map.set(a.Id, a);

      await saveClientFile(file, page, map);
      console.log(`Saved page ${page} (${data.length} records). Total stored: ${map.size}`);

      if (pushDb) {
        try {
          // saveAppointments accepts array or single item and will upsert client and createMany
          await saveAppointments(data, apiKey, clientName);
          console.log(`Pushed page ${page} to DB.`);
        } catch (dbErr) {
          console.error(`Failed pushing page ${page} to DB:`, dbErr.message || dbErr);
        }
      }

      page++;
      await sleep(SAFE_DELAY_MS + Math.random() * 2000);
    } catch (err) {
      if (err.response?.status === 429) {
        const wait = Number(err.response.headers["retry-after"] || 60) * 1000;
        console.warn(`Rate limited — waiting ${wait/1000}s`);
        await sleep(wait);
        continue;
      }
      if (err.response?.status === 401) {
        console.error("Unauthorized — check API key");
        process.exit(1);
      }
      console.error("Fetch error:", err.message || err);
      break;
    }
  }

  console.log(`Done. Pages fetched: ${page - 1}. Appointments stored: ${map.size}`);
}

fetchAndSave().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
