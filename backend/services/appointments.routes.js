import express from "express";
import { fetchAppointments } from "./appointmentFetcher.js";
import { getClientConfig } from "../config/clientConfig.js";
import { loadClientFile } from "../utils/fileStore.js";


const router = express.Router();

/**
 * POST /api/appointments/sync
 * Body:
 * {
 *   clientName: string,
 *   apiKey: string,
 *   apiUrl: string,
 *   range: "6months" | "1year"
 * }
 */
router.post("/sync", async (req, res) => {
  // `range` is optional; default to 'all' (fetch all appointments)
  const { clientName, apiKey, apiUrl } = req.body;
  let { range } = req.body;

  if (!clientName || !apiKey || !apiUrl) {
    return res.status(400).json({
      success: false,
      error: "clientName, apiKey and apiUrl are required"
    });
  }

  range = range || "all";

  try {
    const config = getClientConfig({
      clientName,
      apiKey,
      apiUrl
    });

    // Run sync in background to avoid client timeouts; respond immediately.
    fetchAppointments(config, range).catch(err => {
      console.error("Background sync failed:", err);
    });

    return res.status(202).json({
      success: true,
      message: `Sync started for ${clientName} (${range}). Check saved JSON or DB.`
    });
  } catch (err) {
    console.error("❌ Sync submission failed:", err);

    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// GET /api/appointments/all/:clientName - return saved appointments JSON for a client
router.get("/all/:clientName", async (req, res) => {
  const { clientName } = req.params;
  try {
    const { file, lastPageFetched, map } = await loadClientFile(clientName);
    const appointments = [...map.values()];
    return res.json({ success: true, lastPageFetched, appointments });
  } catch (err) {
    console.error("Failed reading client file:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
