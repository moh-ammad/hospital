#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import prisma from "../utils/prismaClient.js";

async function main() {
  const args = process.argv.slice(2);
    const practiceName = args[0] || process.env.PRACTICE_NAME || "Pure Balance";
    const confirm = args.includes("--yes") || args.includes("-y");
    const deleteClients = args.includes("--delete-clients") || args.includes("--delete");
    const backupDir = path.join(process.cwd(), "data", (practiceName || "practice").toLowerCase().replace(/\s+/g, "-"));

  console.log(`Looking up or creating client: ${practiceName}`);

  const client = await prisma.client.upsert({
    where: { name: practiceName },
    update: {},
    create: { name: practiceName, intakeQKey: "", vtigerUrl: "" }
  });

  console.log(`Client id: ${client.id}`);

  // Find all other clients (not the practice)
  const otherClients = await prisma.client.findMany({ where: { name: { not: practiceName } } });
  const otherIds = otherClients.map(c => c.id);

  if (otherIds.length === 0) {
    console.log("No other client records found — nothing to reassign.");
    process.exit(0);
  }

  // Count appointments assigned to other clients
  const count = await prisma.appointment.count({ where: { clientId: { in: otherIds } } });
  console.log(`Found ${otherClients.length} other client records. Appointments assigned to them: ${count}`);

  // Preview list of other client names (sample)
  console.log("Other clients (sample up to 20):", otherClients.slice(0, 20).map(c => ({ id: c.id, name: c.name })));

  // Backup appointments and client records before making destructive changes
  await fs.mkdir(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const appointmentsBackupFile = path.join(backupDir, `appointments-reassign-backup-${ts}.json`);
  const clientsBackupFile = path.join(backupDir, `clients-backup-${ts}.json`);

  // JSON replacer to safely serialize BigInt values returned by Prisma
  const jsonReplacer = (k, v) => (typeof v === "bigint" ? v.toString() : v);

  if (count > 0) {
    const affected = await prisma.appointment.findMany({ where: { clientId: { in: otherIds } } });
    await fs.writeFile(appointmentsBackupFile, JSON.stringify(affected, jsonReplacer, 2), "utf8");
    console.log(`Wrote backup of ${affected.length} appointments to ${appointmentsBackupFile}`);
  } else {
    console.log("No appointments to backup.");
  }

  await fs.writeFile(clientsBackupFile, JSON.stringify(otherClients, jsonReplacer, 2), "utf8");
  console.log(`Wrote backup of ${otherClients.length} client records to ${clientsBackupFile}`);

  if (!confirm) {
    console.log("Dry run complete. To apply changes, re-run with --yes. To also delete old client records, add --delete-clients.");
    console.log(`  node backend/tools/assign-practice-to-appointments.js "${practiceName}" --yes [--delete-clients]`);
    process.exit(0);
  }

  // Reassign appointments to the practice client
  const updated = await prisma.appointment.updateMany({
    where: { clientId: { in: otherIds } },
    data: { clientId: client.id, clientName: practiceName }
  });
  console.log(`Updated ${updated.count} appointments to clientId=${client.id} (${practiceName}).`);

  if (deleteClients) {
    const delRes = await prisma.client.deleteMany({ where: { id: { in: otherIds } } });
    console.log(`Deleted ${delRes.count} old client records.`);
  } else {
    console.log("Old client records were not deleted. Re-run with --delete-clients to remove them.");
  }
  // Done
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
