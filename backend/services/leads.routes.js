import express from "express";
import fs from "fs/promises";
import path from "path";
import prisma from "../utils/prismaClient.js";
import { clientNameToSlug } from "../utils/fileStore.js";
import { fetchVtigerLeads } from "./leadFetcher.js";

const router = express.Router();

// POST /api/leads/sync
// Body: { clientId: number } preferred, or { clientName: string }
router.post("/sync", async (req, res) => {
  const { clientId, clientName } = req.body;
  if (!clientId && !clientName) return res.status(400).json({ success: false, error: "clientId or clientName required" });

  try {
    // Start background job
    fetchVtigerLeads({ clientId, clientName }).then(result => {
      console.log("Leads sync finished:", result);
    }).catch(err => {
      console.error("Background leads sync failed:", err);
    });

    return res.status(202).json({ success: true, message: "Leads sync started" });
  } catch (err) {
    console.error("Leads sync submission failed:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal error" });
  }
});

// POST /api/clients/:id/vtiger - set/update vtiger credentials for client

// GET /api/leads/all/:clientName - return saved vtiger leads JSON for a client
router.get("/all/:clientName", async (req, res) => {
  const { clientName } = req.params;
  try {
    const slug = clientNameToSlug(clientName);
    const file = path.join(process.cwd(), "data", slug, "vtigerleads.json");
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return res.json({ success: true, leads: parsed.leads || parsed });
  } catch (err) {
    console.error("Failed reading vtiger leads file:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Note: client-specific credential updates and DB reads (leads/appointments)
// are now provided on the `/api/clients` router to avoid duplicate routes.

export default router;

