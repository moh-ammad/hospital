const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'pure-balance', 'appointments.json');
const emails = process.argv.slice(2).map(e => e.toLowerCase());
if (!emails.length) {
  console.error('Usage: node analyzeAppointments.cjs email1@example.com [email2 ...]');
  process.exit(2);
}

console.log('Analyzing', emails.length, 'emails in', file);
try {
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const arr = obj.appointments || [];
  const stats = {};
  for (const e of emails) stats[e] = { total: 0, confirmed: 0, cancelled: 0, other: 0 };

  for (const appt of arr) {
    const email = (appt.ClientEmail || '').toLowerCase().trim();
    if (!emails.includes(email)) continue;
    const s = String(appt.Status || '').trim().toLowerCase();
    stats[email].total++;
    if (s === 'confirmed' || s === 'confirm' || s === 'confirmed ') stats[email].confirmed++;
    else if (s.includes('cancel')) stats[email].cancelled++;
    else stats[email].other++;
  }

  console.log('Results:');
  for (const e of emails) {
    const v = stats[e];
    console.log(`${e}: total=${v.total} confirmed=${v.confirmed} cancelled=${v.cancelled} other=${v.other}`);
  }
} catch (err) {
  console.error('Failed to analyze:', err.message || err);
  process.exit(1);
}
