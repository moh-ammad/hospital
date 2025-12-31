const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'pure-balance', 'appointments.json');
const emails = process.argv.slice(2).map(e => e.toLowerCase());
if (!emails.length) {
  console.error('Usage: node analyzeAppointmentDetails.cjs email1@example.com [email2 ...]');
  process.exit(2);
}

try {
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const arr = obj.appointments || [];
  for (const appt of arr) {
    const email = (appt.ClientEmail || '').toLowerCase().trim();
    if (!emails.includes(email)) continue;
    const s = String(appt.Status || '').trim().toLowerCase();
    if (!(s === 'confirmed' || s.includes('cancel') || s === 'confirm' || s === 'confirmed ')) {
      console.log('---');
      console.log('Id:', appt.Id);
      console.log('Email:', appt.ClientEmail);
      console.log('Status:', appt.Status);
      console.log('Start:', appt.StartDateLocalFormatted || appt.StartDateIso || appt.StartDate);
      console.log('Service:', appt.ServiceName);
      console.log('FullCancellationReason:', appt.FullCancellationReason);
    }
  }
} catch (err) {
  console.error('Error:', err.message || err);
  process.exit(1);
}
