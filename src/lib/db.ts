import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ============================================
// DATABASE CONNECTION POOL CONFIGURATION
// ============================================
// Proper connection pooling prevents database exhaustion at scale
// 
// Production recommendations:
// - connection_limit: 10-20 per instance
// - pool_timeout: 20 seconds
// - connect_timeout: 10 seconds
// - Use PgBouncer for additional pooling layer
// ============================================

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" 
      ? ["error", "warn"] 
      : ["query", "error", "warn"],
    errorFormat: "pretty",
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Connection pool event handlers for monitoring
db.$on("error" as never, (e: any) => {
  console.error("❌ Prisma Client Error:", e);
});

// Log connection info on startup
if (process.env.NODE_ENV !== "production") {
  console.log("🔌 Database connection pool initialized");
  console.log("📊 Check DATABASE_URL for connection pool settings");
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Graceful shutdown handling
process.on("beforeExit", async () => {
  console.log("🔌 Disconnecting from database...");
  await db.$disconnect();
});

export default db;
