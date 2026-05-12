import { PrismaClient } from "@prisma/client";

const createClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = createClient();
} else {
  // Bump SCHEMA_VER whenever you run `prisma generate` after a schema change.
  // The new tag causes hot-reload to instantiate a fresh client from the
  // newly-generated code without requiring a full server restart.
  const SCHEMA_VER = 5;
  const tag = `__prisma_v${SCHEMA_VER}__`;
  if (!globalThis[tag]) {
    globalThis[tag] = createClient();
  }
  prisma = globalThis[tag];
}

export default prisma;
