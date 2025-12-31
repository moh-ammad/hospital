import express from "express";
import prisma from "../utils/prismaClient.js";
import { toSerializable } from "../utils/serializePrisma.js";

const router = express.Router();

// GET /api/clients - get all clients with stats
router.get("/", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" }
    });

    // For each client, get appointment and lead counts + matched/unmatched based on email intersection
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const [appointmentCount, leads] = await Promise.all([
          prisma.appointment.count({ where: { clientId: client.id } }),
          prisma.lead.findMany({ where: { clientId: client.id }, select: { email: true } })
        ]);

        const leadEmails = leads
          .map((l) => String(l.email || "").trim())
          .filter(Boolean);

        // NOTE: MySQL string comparisons are usually case-insensitive by collation.
        // If your collation is case-sensitive, consider normalizing emails on insert.
        const matchedAppointments = leadEmails.length
          ? await prisma.appointment.count({
              where: {
                clientId: client.id,
                clientEmail: { in: leadEmails }
              }
            })
          : 0;

        const leadCount = leads.length;

        return {
          ...client,
          stats: {
            totalAppointments: appointmentCount,
            totalLeads: leadCount,
            matchedAppointments,
            unmatchedAppointments: Math.max(0, appointmentCount - matchedAppointments),
            lastFetch: client.updatedAt
          }
        };
      })
    );

    return res.json({
      success: true,
      clients: toSerializable(clientsWithStats)
    });
  } catch (err) {
    console.error("Failed to get clients:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// POST /api/clients - create new client
router.post("/", async (req, res) => {
  const { name, intakeQKey, intakeQBaseUrl } = req.body;

  if (!name || !intakeQKey) {
    return res.status(400).json({
      success: false,
      error: "name and intakeQKey are required"
    });
  }

  try {
    const client = await prisma.client.create({
      data: {
        name,
        intakeQKey,
        intakeQBaseUrl: intakeQBaseUrl || "https://intakeq.com/api/v1",
        vtigerUrl: "",
        vtigerUsername: "",
        vtigerAccessKey: ""
      }
    });

    return res.json({
      success: true,
      client: toSerializable(client)
    });
  } catch (err) {
    console.error("Failed to create client:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// GET /api/clients/:id/leads
// Optional query: ?page=1&limit=100
router.get("/:id/leads", async (req, res) => {
  const clientId = Number(req.params.id);
  if (!clientId) return res.status(400).json({ success: false, error: "Invalid client id" });

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));
  const skip = (page - 1) * limit;

  try {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.lead.count({ where: { clientId } })
    ]);

    return res.json({ success: true, count: total, page, limit, leads: toSerializable(leads) });
  } catch (err) {
    console.error("Failed fetching leads for client:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clients/:id/appointments
// Optional query: ?page=1&limit=200
router.get("/:id/appointments", async (req, res) => {
  const clientId = Number(req.params.id);
  if (!clientId) return res.status(400).json({ success: false, error: "Invalid client id" });

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));
  const skip = (page - 1) * limit;

  try {
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.appointment.count({ where: { clientId } })
    ]);

    return res.json({ success: true, count: total, page, limit, appointments: toSerializable(appointments) });
  } catch (err) {
    console.error("Failed fetching appointments for client:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients/:id/vtiger - update vtiger credentials for a client
router.post("/:id/vtiger", async (req, res) => {
  const clientId = Number(req.params.id);
  const { vtigerUrl, vtigerUsername, vtigerAccessKey } = req.body;
  if (!clientId) return res.status(400).json({ success: false, error: "Invalid client id" });

  try {
    const client = await prisma.client.update({ where: { id: clientId }, data: { vtigerUrl, vtigerUsername, vtigerAccessKey } });
    return res.json({ success: true, client });
  } catch (err) {
    console.error("Failed to update vtiger creds:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update" });
  }
});

// POST /api/clients/:id/intakeq - update IntakeQ credentials for a client
router.post("/:id/intakeq", async (req, res) => {
  const clientId = Number(req.params.id);
  const { intakeQKey, intakeQBaseUrl } = req.body;
  if (!clientId) return res.status(400).json({ success: false, error: "Invalid client id" });

  try {
    const client = await prisma.client.update({ where: { id: clientId }, data: { intakeQKey, intakeQBaseUrl } });
    return res.json({ success: true, client });
  } catch (err) {
    console.error("Failed to update intakeq creds:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update" });
  }
});

export default router;
