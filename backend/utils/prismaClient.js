import { createRequire } from "module";

// Load the generated Prisma client directly (handles custom output path)
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

export default prisma;
