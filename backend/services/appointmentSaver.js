import prisma from "../utils/prismaClient.js";
import { mapAppointment } from "./appointmentMapper.js";

export async function saveAppointments(appts, intakeQKey, practiceName) {
  const arr = Array.isArray(appts) ? appts : [appts];
  if (!arr || arr.length === 0) return;

  const mapped = arr.map(mapAppointment);

  // Ensure a Client record exists for the incoming appointments
  // `practiceName` is the configured practice/client (e.g. "Pure Balance").
  // Fall back to the mapped appointment `clientName` (patient) only if not provided.
  const clientName = practiceName ?? mapped[0]?.clientName ?? "Unknown";

  try {
    const client = await prisma.client.upsert({
      where: { name: clientName },
      update: {},
      // `vtigerUrl` is required in the schema; provide an empty string when unknown
      create: { name: clientName, intakeQKey: intakeQKey ?? "", vtigerUrl: "" }
    });

    // Attach required clientId for DB inserts
    const data = mapped.map(m => ({ ...m, clientId: client.id }));

    if (data.length === 0) return;

    const result = await prisma.appointment.createMany({ data, skipDuplicates: true });
    console.log(`Inserted ${result.count ?? data.length} appointments (page/batch)`);
    return result;
  } catch (err) {
    console.error("Error saving appointments:", err);
    throw err;
  }
}
