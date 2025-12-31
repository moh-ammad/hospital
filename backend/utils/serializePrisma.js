// Utility to convert Prisma results (which may contain BigInt) into
// JSON-serializable objects. BigInt values are converted to strings.
export function toSerializable(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toSerializable);
  if (typeof value === "object") {
    // Handle plain objects and Prisma model instances
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toSerializable(v);
    }
    return out;
  }
  return value;
}

export default toSerializable;
