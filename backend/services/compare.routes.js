import { Router } from "express";
import prisma from "../utils/prismaClient.js";
import path from "path";
import fs from "fs/promises";
import { getVtigerSession, updateVtigerLead, clientNameToSlug } from "../utils/vtigerSession.js";

const router = Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const MAX_CF_947_LEN = 900;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function firstNonEmpty(...values) {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function buildLeadCf947Html(lead) {
  const leadNo = firstNonEmpty(lead.lead_no);
  const name = [lead.salutationtype, lead.firstname, lead.lastname]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(" ");

  const email = firstNonEmpty(lead.email);
  const phone = firstNonEmpty(lead.mobile, lead.phone);
  const company = firstNonEmpty(lead.company);

  const rows = [];
  if (leadNo) rows.push(`<div><strong>Lead No:</strong> ${escapeHtml(leadNo)}</div>`);
  if (name) rows.push(`<div><strong>Name:</strong> ${escapeHtml(name)}</div>`);
  if (email) rows.push(`<div><strong>Email:</strong> ${escapeHtml(email)}</div>`);
  if (phone) rows.push(`<div><strong>Phone:</strong> ${escapeHtml(phone)}</div>`);
  if (company) rows.push(`<div><strong>Company:</strong> ${escapeHtml(company)}</div>`);

  // Always return small, readable HTML. If everything is empty, keep a minimal placeholder.
  let html = rows.length > 0 ? `<div>${rows.join("")}</div>` : `<div><em>Lead details not available</em></div>`;

  // Hard cap for CRM field safety.
  if (html.length > MAX_CF_947_LEN) {
    // Drop company first (least essential) before truncating.
    const rowsNoCompany = rows.filter((r) => !r.includes("Company:"));
    html = rowsNoCompany.length > 0 ? `<div>${rowsNoCompany.join("")}</div>` : html;
  }
  if (html.length > MAX_CF_947_LEN) {
    html = html.slice(0, MAX_CF_947_LEN - 7) + "...";
  }

  return html;
}

function dateOnlyFromString(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;

  // IntakeQ local formatted: "12/1/2026 at 01:00:00 PM" -> "12/1/2026"
  const atIdx = s.toLowerCase().indexOf(" at ");
  if (atIdx > 0) return s.slice(0, atIdx).trim();

  // ISO-ish date: "2026-12-01T13:00:00" -> "2026-12-01"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // If it's already a short date-like string, keep it.
  return s;
}

function formatAppointmentStartDate(appt) {
  const preferred = firstNonEmpty(
    appt.startDateLocalFormatted,
    appt.startDateLocal,
    appt.startDateIso
  );
  const preferredDateOnly = dateOnlyFromString(preferred);
  if (preferredDateOnly) return preferredDateOnly;

  const ts = appt.startDate;
  // Handle Date objects (from Prisma), bigint/number timestamps, and numeric strings
  if (ts instanceof Date) {
    if (!isNaN(ts.getTime())) return ts.toLocaleDateString("en-US");
    return null;
  }

  if (typeof ts === "bigint") {
    const ms = Number(ts);
    if (Number.isFinite(ms)) return new Date(ms).toLocaleDateString("en-US");
  }

  if (typeof ts === "number" && Number.isFinite(ts)) {
    return new Date(ts).toLocaleDateString("en-US");
  }

  if (typeof ts === "string") {
    const s = ts.trim();
    // numeric timestamp
    if (/^\d+$/.test(s)) {
      const ms = Number(s);
      if (Number.isFinite(ms)) return new Date(ms).toLocaleDateString("en-US");
    }
    // ISO or other parseable string
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString("en-US");
  }

  return null;
}

function normalizeStatus(s) {
  return String(s || "").trim().toLowerCase();
}

function isConfirmedStatus(s) {
  const n = normalizeStatus(s);
  return n === "confirmed" || n === "confirm" || n.startsWith("confirmed") || n === "attended";
}

function isCancelledStatus(s) {
  const n = normalizeStatus(s);
  // matches 'canceled', 'cancelled', 'missed', 'no-show', etc.
  return n.includes("cancel") || n === "missed" || n.includes("no-show") || n.includes("no show") || n.includes("no_show") || n.includes("miss");
}

async function getClientByIdOrName({ clientId, clientName }) {
  if (!clientId && !clientName) return null;
  return clientId
    ? prisma.client.findUnique({ where: { id: clientId } })
    : prisma.client.findFirst({ where: { name: clientName } });
}

async function buildCompareResult(client, options = {}) {
  const { updateVtiger = false } = options;

  // Fetch all appointments and leads for this client
  const [appointments, leads] = await Promise.all([
    prisma.appointment.findMany({ where: { clientId: client.id } }),
    prisma.lead.findMany({ where: { clientId: client.id } })
  ]);

  // Build a map: email -> appointments[]
  const emailToAppointments = new Map();
  for (const appt of appointments) {
    const email = normalizeEmail(appt.clientEmail);
    if (!email) continue;
    if (!emailToAppointments.has(email)) emailToAppointments.set(email, []);
    emailToAppointments.get(email).push(appt);
  }

  // Optionally prepare VTiger session (only for /sync)
  let sessionName = null;
  let dir = null;
  if (updateVtiger) {
    if (!client.vtigerUrl || !client.vtigerUsername || !client.vtigerAccessKey) {
      const err = new Error("Client missing VTiger credentials");
      err.statusCode = 400;
      throw err;
    }

    dir = path.join(process.cwd(), "data", clientNameToSlug(client.name));
    await fs.mkdir(dir, { recursive: true });
    sessionName = await getVtigerSession(client, dir);
  }

  const matchedLeads = [];
  const matchedDetails = [];
  let totalMatchedAppointments = 0;
  let confirmedCount = 0;
  let cancelledCount = 0;
  const seenAppointmentIds = new Set();

  for (const lead of leads) {
    const leadEmail = normalizeEmail(lead.email);
    if (!leadEmail || !emailToAppointments.has(leadEmail)) continue;

    const allMatchedAppointments = emailToAppointments.get(leadEmail);
    // Filter out appointments already accounted for by previous leads (avoid double counting)
    const matchedAppointments = allMatchedAppointments.filter(a => {
      if (seenAppointmentIds.has(a.id)) return false;
      seenAppointmentIds.add(a.id);
      return true;
    });

    if (matchedAppointments.length === 0) continue;

    totalMatchedAppointments += matchedAppointments.length;

    const confirmedAppts = matchedAppointments.filter(a => isConfirmedStatus(a.status));
    const cancelledAppts = matchedAppointments.filter(a => isCancelledStatus(a.status));

    confirmedCount += confirmedAppts.length;
    cancelledCount += cancelledAppts.length;

    // Keep cf_947 short + consistent: show only essential lead fields.
    const cf_947_html = buildLeadCf947Html(lead);

    let vtigerUpdated = false;
    let lastVtigerError = null;

    if (updateVtiger) {
      // Check if update is needed by comparing with existing data
      const existingCf947 = String(lead.cf_947 ?? "").trim();
      const newCf947 = String(cf_947_html ?? "").trim();
      const needsUpdate =
        String(lead.cf_943 ?? "").toLowerCase() !== "yes" ||
        String(lead.cf_945 ?? "") !== String(matchedAppointments.length) ||
        existingCf947 !== newCf947;

      if (!needsUpdate) {
        // Skip update if data hasn't changed meaningfully
        vtigerUpdated = true; // Mark as "updated" since it's already correct
      } else {
        // Attempt VTiger update with one retry on auth/session failure
        try {
          const payload = {
            firstname: lead.firstname || "",
            lastname: lead.lastname || "",
            company: lead.company || "",
            cf_941: lead.cf_941 || "Pending",
            cf_943: "yes",
            cf_945: String(matchedAppointments.length),
            cf_947: cf_947_html
          };
          if (lead.assigned_user_id) payload.assigned_user_id = lead.assigned_user_id;

          await updateVtigerLead(client, dir, sessionName, lead.vtigerId, payload);
          vtigerUpdated = true;
        } catch (err) {
          lastVtigerError = err;
          const msg = String(err?.message || "");
          if (/auth|session|401|403/i.test(msg)) {
            try {
              const sessionFile = path.join(process.cwd(), "data", clientNameToSlug(client.name), "vtiger_session.json");
              await fs.unlink(sessionFile).catch(() => {});
              dir = path.join(process.cwd(), "data", clientNameToSlug(client.name));
              sessionName = await getVtigerSession(client, dir);

              const retryPayload = {
                firstname: lead.firstname || "",
                lastname: lead.lastname || "",
                company: lead.company || "",
                cf_941: lead.cf_941 || "Pending",
                cf_943: "yes",
                cf_945: String(matchedAppointments.length),
                cf_947: cf_947_html
              };
              if (lead.assigned_user_id) retryPayload.assigned_user_id = lead.assigned_user_id;

              await updateVtigerLead(client, dir, sessionName, lead.vtigerId, retryPayload);
              vtigerUpdated = true;
              lastVtigerError = null;
            } catch (err2) {
              lastVtigerError = err2;
              console.error(`VTiger retry failed for lead ${lead.vtigerId}:`, err2.message || err2);
            }
          } else {
            console.error(`VTiger update failed for lead ${lead.vtigerId}:`, err.message || err);
          }
        }
      }

      // Update local DB only if data actually changed
      if (needsUpdate) {
        try {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              cf_943: "yes",
              cf_945: String(matchedAppointments.length),
              cf_947: cf_947_html
            }
          });
        } catch (dbErr) {
          console.error(`Failed to update local DB for lead ${lead.id}:`, dbErr.message || dbErr);
        }
      }
    }

    matchedLeads.push({
      leadId: lead.id,
      vtigerId: lead.vtigerId,
      email: lead.email,
      appointmentCount: matchedAppointments.length,
      confirmed: confirmedAppts.length,
      cancelled: cancelledAppts.length,
      vtigerUpdated,
      vtigerError: lastVtigerError ? String(lastVtigerError.message || lastVtigerError) : null
    });

    matchedDetails.push({
      lead: {
        id: lead.id,
        email: lead.email,
        vtigerId: lead.vtigerId,
        firstname: lead.firstname,
        lastname: lead.lastname
      },
      appointments: matchedAppointments.map(a => ({
        id: a.id,
        intakeQId: a.intakeQId,
        clientName: a.clientName,
        clientEmail: a.clientEmail,
        clientPhone: a.clientPhone,
        status: a.status,
        normalizedStatus: normalizeStatus(a.status),
        startDate: formatAppointmentStartDate(a),
        startDateLocal: a.startDateLocal,
        startDateLocalFormatted: a.startDateLocalFormatted,
        endDateLocal: a.endDateLocal,
        duration: a.duration,
        serviceName: a.serviceName,
        practitionerName: a.practitionerName,
        practitionerEmail: a.practitionerEmail,
        locationName: a.locationName,
        placeOfService: a.placeOfService,
        invoiceId: a.invoiceId,
        invoiceNumber: a.invoiceNumber,
        price: a.price,
        fullCancellationReason: a.fullCancellationReason,
        cancellationReasonNote: a.cancellationReasonNote
      }))
    });
  }

  const unmatchedAppointmentsCount = appointments.length - totalMatchedAppointments;

  return {
    success: true,
    clientId: client.id,
    clientName: client.name,
    summary: {
      totalAppointments: appointments.length,
      totalLeads: leads.length,
      matchedLeads: matchedLeads.length,
      matchedAppointments: totalMatchedAppointments,
      unmatchedAppointments: unmatchedAppointmentsCount,
      confirmed: confirmedCount,
      cancelled: cancelledCount
    },
    matchedLeads,
    matchedDetails
  };
}

// GET /api/compare/:clientId
// Read-only compare (no VTiger updates). Use this for UI navigation.
router.get("/:clientId", async (req, res) => {
  const clientId = Number(req.params.clientId);
  if (!clientId) {
    return res.status(400).json({ success: false, error: "Invalid client id" });
  }

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ success: false, error: "Client not found" });
    }

    const result = await buildCompareResult(client, { updateVtiger: false });
    return res.json(result);
  } catch (err) {
    console.error("Compare view failed:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal error" });
  }
});

// POST /api/compare/sync
// Body: { clientId: number } or { clientName: string }
router.post("/sync", async (req, res) => {
  const { clientId, clientName } = req.body;
  if (!clientId && !clientName) {
    return res.status(400).json({ success: false, error: "clientId or clientName required" });
  }

  try {
    // Get client
    const client = await getClientByIdOrName({ clientId, clientName });

    if (!client) {
      return res.status(404).json({ success: false, error: "Client not found" });
    }

    const result = await buildCompareResult(client, { updateVtiger: true });
    return res.json(result);
  } catch (err) {
    const statusCode = err?.statusCode;
    if (statusCode) {
      return res.status(statusCode).json({ success: false, error: err.message });
    }
    console.error("Compare sync failed:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal error" });
  }
});

export default router;