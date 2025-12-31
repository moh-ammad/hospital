import axios from "axios";
import fs from "fs/promises";
import path from "path";
import prisma from "../utils/prismaClient.js";
import { getVtigerSession, clientNameToSlug } from "../utils/vtigerSession.js";

const BATCH_SIZE = 50;
const SAFE_DELAY_MS = 7000; // ~8-9 req/min
const MAX_TRANSIENT_RETRIES = 3; // for 5xx
const MAX_RATE_LIMIT_RETRIES = 5; // for 429

async function readJson(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeAtomic(file, obj) {
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2));
  await fs.rename(tmp, file);
}

export async function fetchVtigerLeads(options) {
  // options: { clientId } or { clientName }
  const { clientId, clientName } = options;
  const client = clientId ? await prisma.client.findUnique({ where: { id: clientId } }) : await prisma.client.findFirst({ where: { name: clientName } });
  if (!client) throw new Error("Client not found");

  if (!client.vtigerUrl || !client.vtigerUsername || !client.vtigerAccessKey) {
    throw new Error("Client missing Vtiger credentials (vtigerUrl/vtigerUsername/vtigerAccessKey)");
  }

  const dir = path.join(process.cwd(), "data", clientNameToSlug(client.name));
  await fs.mkdir(dir, { recursive: true });
  const leadsFile = path.join(dir, "vtigerleads.json");

  // Load existing state
  let state = await readJson(leadsFile) || { lastOffset: 0, leads: [] };
  let offset = state.lastOffset || 0;

  let sessionName = await getVtigerSession(client, dir);

  let requests = 0;
  while (true) {
    const query = `SELECT * FROM Leads LIMIT ${offset},${BATCH_SIZE};`;
    const encodedQuery = encodeURIComponent(query);

    const makeRequest = async (sName) => {
      const url = `${client.vtigerUrl}?operation=query&sessionName=${encodeURIComponent(sName)}&query=${encodedQuery}`;
      return axios.get(url, { validateStatus: null });
    };

    let resp = null;
    let transientRetries = 0;
    let rateRetries = 0;
    let triedRefresh = false;

    while (true) {
      resp = await makeRequest(sessionName);

      // If success true, break to process
      if (resp?.data?.success) break;

      const status = resp?.status;

      // handle authentication errors -> refresh session once
      if ((status === 401 || status === 403) || (resp?.data?.error?.code === 'AUTHENTICATION' || resp?.data?.error?.message?.toLowerCase?.().includes('session'))) {
        if (triedRefresh) {
          throw new Error(`Authentication failed after refresh: ${resp?.data?.error?.message || status}`);
        }
        triedRefresh = true;
        sessionName = await getVtigerSession(client, dir); // forces re-login
        continue; // retry immediately with new sessionName
      }

      // rate limit
      if (status === 429) {
        if (rateRetries >= MAX_RATE_LIMIT_RETRIES) throw new Error('Rate limit exceeded (429) after retries');
        rateRetries++;
        const backoff = SAFE_DELAY_MS * Math.pow(2, rateRetries);
        await new Promise(r => setTimeout(r, backoff + Math.random() * 1000));
        continue;
      }

      // transient server errors
      if (status >= 500 && status < 600) {
        if (transientRetries >= MAX_TRANSIENT_RETRIES) throw new Error(`Server error ${status} after retries`);
        transientRetries++;
        await new Promise(r => setTimeout(r, SAFE_DELAY_MS * transientRetries));
        continue;
      }

      // if API returned success: false but no status code, treat as stop
      if (resp?.data && resp.data.success === false) {
        // VTiger may return success:false when no more records; treat as stop
        break;
      }

      // unexpected fallback
      throw new Error(`VTiger query failed: status=${status} body=${JSON.stringify(resp?.data)}`);
    }

    requests++;

    if (!resp?.data?.success) break;
    const batch = resp.data.result;
    if (!Array.isArray(batch) || batch.length === 0) break;

    // Save raw leads to file (append)
    for (const l of batch) state.leads.push(l);
    state.lastOffset = offset + batch.length;
    await writeAtomic(leadsFile, state);

    // Map and bulk insert into DB (include additional custom fields and safe date parsing)
    const mapped = batch.map(r => ({
      clientId: client.id,

      // IDs
      vtigerId: r.id,
      lead_no: r.lead_no ?? null,

      // Name & contact
      salutationtype: r.salutationtype || null,
      firstname: r.firstname || null,
      lastname: r.lastname || null,
      email: r.email || null,
      phone: r.phone || null,
      mobile: r.mobile || null,
      secondaryemail: r.secondaryemail || null,
      fax: r.fax || null,

      // Company
      company: r.company || null,
      designation: r.designation || null,
      industry: r.industry || null,
      website: r.website || null,

      // Lead metadata
      leadsource: r.leadsource || null,
      leadstatus: r.leadstatus || null,
      annualrevenue: r.annualrevenue || null,
      rating: r.rating || null,
      noofemployees: r.noofemployees || null,
      assigned_user_id: r.assigned_user_id || null,
      source: r.source || "CRM",
      starred: r.starred || "0",
      tags: r.tags || null,

      // Address
      lane: r.lane || null,
      code: r.code || null,
      city: r.city || null,
      country: r.country || null,
      state: r.state || null,
      pobox: r.pobox || null,

      // Custom fields
      cf_883: r.cf_883 || null,
      cf_941: r.cf_941 || null,
      cf_943: r.cf_943 || null,
      cf_945: r.cf_945 || null,
      cf_947: r.cf_947 ?? null,

      // Misc
      description: r.description || null,
      emailoptout: r.emailoptout || "0",

      // Dates (convert vtiger's 'YYYY-MM-DD HH:mm:ss' -> JS Date)
      createdtime: r.createdtime ? new Date(String(r.createdtime).replace(" ", "T")) : null,
      modifiedtime: r.modifiedtime ? new Date(String(r.modifiedtime).replace(" ", "T")) : null,
      modifiedby: r.modifiedby || null,

      // Raw backup
      rawData: r
    }));

    try {
      await prisma.lead.createMany({ data: mapped, skipDuplicates: true });
    } catch (err) {
      console.error("DB insert error for leads batch:", err.message || err);
    }

    offset += batch.length;
    // Respect API rate limits
    await new Promise(r => setTimeout(r, SAFE_DELAY_MS + Math.random() * 2000));
  }

  return { clientId: client.id, totalFetched: state.leads.length, requests };
}
