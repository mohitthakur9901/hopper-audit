import dotenv from "dotenv";
import path from "path";

// Robust loading of environment variables for standalone script executions
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient, Prisma } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

import pg from "pg";
const { Pool } = pg;

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    connectionString = "postgresql://postgres:postgres@localhost:5432/hopper-audit";
    process.env.DATABASE_URL = connectionString;
  }

  try {
    const maxPoolSize = process.env.DATABASE_POOL_SIZE
      ? parseInt(process.env.DATABASE_POOL_SIZE, 10)
      : 50;
    const pool = new Pool({
      connectionString,
      max: maxPoolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool as any);
    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  } catch (err) {
    console.error(
      "[database] Failed to initialize Prisma client with adapter:",
      err,
    );
    return new PrismaClient({} as any);
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "../generated/prisma/client.js";
