export function getStartDate(range) {
  const now = new Date();

  if (range === "6months") {
    now.setMonth(now.getMonth() - 6);
    return now.toISOString();
  }

  if (range === "1year") {
    now.setFullYear(now.getFullYear() - 1);
    return now.toISOString();
  }

  throw new Error("Invalid range. Use '6months' or '1year'");
}
