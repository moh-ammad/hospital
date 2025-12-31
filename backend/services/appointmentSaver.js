import prisma from "../utils/prismaClient.js";
import { mapAppointment } from "./appointmentMapper.js";
import fs from "fs";
import path from "path";

export async function saveAppointments(appts, intakeQKey, practiceName) {
  const arr = Array.isArray(appts) ? appts : [appts];
  if (!arr || arr.length === 0) return;

  const mapped = arr.map(mapAppointment);
  const clientName = practiceName ?? mapped[0]?.clientName ?? "Unknown";

  try {
    // Upsert client using intakeQKey as unique identity
    // Replace the entire client lookup/create block in saveAppointmentsFromJson with this:
    const client = await prisma.client.upsert({
      where: { intakeQKey: intakeQKey ?? "" }, // Uses intakeQKey as the unique identifier
      update: { name: clientName },            // Update name if it changed
      create: {
        name: clientName ?? "Unknown",
        intakeQKey: intakeQKey ?? "",
        intakeQBaseUrl: "https://intakeq.com/api/v1",
        vtigerUrl: "",
      },
    });


    // Attach clientId to all appointments
    const data = mapped.map((m) => ({ ...m, clientId: client.id }));

    if (data.length === 0) return;

    const result = await prisma.appointment.createMany({
      data,
      skipDuplicates: true, // ensures no duplicates based on intakeQId
    });

    console.log(`Inserted ${result.count ?? data.length} appointments for '${client.name}'.`);
    return result;
  } catch (err) {
    console.error("Error saving appointments:", err);
    throw err;
  }
}

/**
 * Read stored JSON for a client and bulk-insert appointments.
 * Looks for file: backend/data/<client-folder>/appointments.json
 * @param {string} clientName - client folder/name (e.g. "Pure Balance")
 * @param {string} [intakeQKey] - optional intakeQKey; used to identify the client when present
 */
export async function saveAppointmentsFromJson(clientName, intakeQKey) {
  const folderName = clientName ? clientName.toLowerCase().replace(/\s+/g, "-") : "unknown";
  const filePath = path.resolve(process.cwd(), "backend", "data", folderName, "appointments.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Appointments file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  // support both { lastPageFetched, appointments: [...] } and plain array
  const appts = Array.isArray(parsed) ? parsed : parsed?.appointments ?? [];

  if (!Array.isArray(appts) || appts.length === 0) {
    console.log("No appointments found in JSON file.");
    return;
  }

  // Map appointments
  const mapped = appts.map(mapAppointment);

  // Find or create client. Prefer lookup by intakeQKey when provided.
  let client = null;
  if (intakeQKey) {
    client = await prisma.client.findFirst({ where: { intakeQKey } });
  }

  if (!client) {
    client = await prisma.client.findUnique({ where: { name: clientName } });
  }

  if (client) {
    // ensure intakeQKey is stored if we received one now
    if (intakeQKey && !client.intakeQKey) {
      client = await prisma.client.update({ where: { id: client.id }, data: { intakeQKey } });
    }
  } else {
    client = await prisma.client.create({
      data: {
        name: clientName ?? "Unknown",
        intakeQKey: intakeQKey ?? "",
        intakeQBaseUrl: "https://intakeq.com/api/v1",
        vtigerUrl: "",
      },
    });
  }

  // Attach clientId to all mapped appointments
  const data = mapped.map((m) => ({ ...m, clientId: client.id }));

  if (data.length === 0) {
    console.log("No mapped appointments to insert.");
    return;
  }

  const result = await prisma.appointment.createMany({ data, skipDuplicates: true });
  console.log(`Inserted ${result.count ?? data.length} appointments for client '${client.name}'.`);
  return result;
}
