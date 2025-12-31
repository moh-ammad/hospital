import axios from "axios";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

function md5(input) {
  return crypto.createHash("md5").update(input).digest("hex");
}

export function clientNameToSlug(clientName) {
  return String(clientName).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

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

export async function getVtigerSession(client, clientDir) {
  const sessionFile = path.join(clientDir, "vtiger_session.json");

  // Try cached session
  const cached = await readJson(sessionFile);
  if (cached && cached.sessionName && cached.timestamp && Date.now() - cached.timestamp < SESSION_EXPIRY_MS) {
    return cached.sessionName;
  }

  // Get challenge
  const challengeUrl = `${client.vtigerUrl}?operation=getchallenge&username=${encodeURIComponent(client.vtigerUsername)}`;
  const challengeRes = await axios.get(challengeUrl);
  if (!challengeRes?.data?.success) throw new Error("VTiger challenge failed");
  const token = challengeRes.data.result.token;

  // Login
  const accessKeyHash = md5(token + client.vtigerAccessKey);
  const body = new URLSearchParams({ operation: "login", username: client.vtigerUsername, accessKey: accessKeyHash }).toString();
  const { data } = await axios.post(client.vtigerUrl, body, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!data?.success) throw new Error("VTiger login failed");

  const sessionName = data.result.sessionName;
  await writeAtomic(sessionFile, { sessionName, timestamp: Date.now() });
  return sessionName;
}

export async function updateVtigerLead(client, clientDir, sessionName, leadId, updateData) {
  const elementData = {
    id: leadId,
    ...updateData
  };

  const body = new URLSearchParams({
    operation: "update",
    sessionName: sessionName,
    element: JSON.stringify(elementData)
  }).toString();

  const { data } = await axios.post(client.vtigerUrl, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    validateStatus: null
  });

  if (!data?.success) {
    throw new Error(`VTiger update failed: ${data?.error?.message || JSON.stringify(data)}`);
  }

  return data.result;
}
