/**
 * Migration script to fix clientName field in appointments table.
 * 
 * Problem: All appointments have clientName = "Pure Balance" (the practice name)
 * Solution: Update clientName from the raw JSON data to use the patient's actual name
 * 
 * Usage: node backend/tools/fix-client-names.js
 */

import prisma from "../utils/prismaClient.js";
import fs from "fs";
import path from "path";

async function fixClientNames() {
  console.log("🔧 Starting client name fix...\n");

  try {
    // Get all clients (practices)
    const clients = await prisma.client.findMany();

    if (clients.length === 0) {
      console.log("No clients found in database.");
      return;
    }

    for (const client of clients) {
      console.log(`\n📁 Processing practice: ${client.name}`);
      
      // Construct path to appointments JSON file
      const folderName = client.name.toLowerCase().replace(/\s+/g, "-");
      const filePath = path.resolve(process.cwd(), "data", folderName, "appointments.json");

      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  No appointments file found at: ${filePath}`);
        continue;
      }

      // Read the original JSON data
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const appts = Array.isArray(parsed) ? parsed : parsed?.appointments ?? [];

      if (!Array.isArray(appts) || appts.length === 0) {
        console.log(`  ⚠️  No appointments found in JSON file.`);
        continue;
      }

      console.log(`  📊 Found ${appts.length} appointments in JSON file`);

      // Create a map: IntakeQ ID -> Patient Name
      const idToPatientName = new Map();
      for (const appt of appts) {
        if (appt.Id && appt.ClientName) {
          idToPatientName.set(appt.Id, appt.ClientName);
        }
      }

      console.log(`  📋 Created mapping for ${idToPatientName.size} appointments`);

      // Get all appointments for this practice from database
      const dbAppointments = await prisma.appointment.findMany({
        where: { clientId: client.id },
        select: { id: true, intakeQId: true, clientName: true }
      });

      console.log(`  💾 Found ${dbAppointments.length} appointments in database`);

      // Update each appointment with the correct patient name
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const dbAppt of dbAppointments) {
        const correctPatientName = idToPatientName.get(dbAppt.intakeQId);
        
        if (!correctPatientName) {
          console.log(`  ⚠️  No patient name found for appointment ID: ${dbAppt.intakeQId}`);
          skippedCount++;
          continue;
        }

        // Only update if the name is different
        if (dbAppt.clientName === correctPatientName) {
          skippedCount++;
          continue;
        }

        try {
          await prisma.appointment.update({
            where: { id: dbAppt.id },
            data: { clientName: correctPatientName }
          });
          updatedCount++;

          if (updatedCount % 100 === 0) {
            console.log(`  ✓ Updated ${updatedCount} appointments...`);
          }
        } catch (err) {
          console.error(`  ❌ Error updating appointment ${dbAppt.id}:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n  ✅ Summary for ${client.name}:`);
      console.log(`     - Updated: ${updatedCount} appointments`);
      console.log(`     - Skipped (already correct): ${skippedCount} appointments`);
      console.log(`     - Errors: ${errorCount} appointments`);
    }

    console.log("\n\n🎉 Migration complete!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Verification function to check the results
async function verifyFix() {
  console.log("\n\n🔍 Verifying fix...\n");

  try {
    const sampleAppointments = await prisma.appointment.findMany({
      take: 10,
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        serviceName: true
      }
    });

    console.log("Sample appointments after fix:");
    console.table(sampleAppointments);

    // Check for any remaining "Pure Balance" or other practice names in clientName
    const incorrectNames = await prisma.appointment.findMany({
      where: {
        clientName: {
          in: ["Pure Balance", "Unknown"]
        }
      },
      take: 5
    });

    if (incorrectNames.length > 0) {
      console.log("\n⚠️  Still found some appointments with practice names:");
      console.table(incorrectNames.map(a => ({
        id: a.id,
        clientName: a.clientName,
        clientEmail: a.clientEmail
      })));
    } else {
      console.log("\n✅ No appointments found with practice names as clientName!");
    }

  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
console.log("=" .repeat(60));
console.log("CLIENT NAME FIX MIGRATION");
console.log("=" .repeat(60));
console.log("\nThis will update all appointment records to use patient names");
console.log("instead of practice names.\n");

fixClientNames()
  .then(() => verifyFix())
  .catch(err => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
