import fs from "fs/promises";
import path from "path";

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

export async function loadClientFile(clientName) {
  // Save into backend/data/<slug>/appointments.json
  const slug = slugify(clientName);
  const dir = path.join(process.cwd(), "data", slug);
  const file = path.join(dir, "appointments.json");

  await fs.mkdir(dir, { recursive: true });

  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return {
      file,
      lastPageFetched: parsed.lastPageFetched || 0,
      map: new Map((parsed.appointments || []).map(a => [a.Id, a]))
    };
  } catch {
    return { file, lastPageFetched: 0, map: new Map() };
  }
}

export async function saveClientFile(file, page, map) {
  const tmp = file + ".tmp";
  const payload = {
    lastPageFetched: page,
    appointments: [...map.values()]
  };

  await fs.writeFile(tmp, JSON.stringify(payload, null, 2));
  await fs.rename(tmp, file);
}

export function clientNameToSlug(clientName) {
  return slugify(clientName);
}
