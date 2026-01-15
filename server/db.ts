import "./env";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

export const pool: Pool | null = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

if (pool) {
  pool.on('error', (err: unknown) => {
    console.error('Unexpected database pool error:', err);
  });

  pool.on('connect', () => {
    console.log('Database connection established');
  });

  pool.on('remove', () => {
    console.log('Database connection removed from pool');
  });
} else {
  console.warn(
    "DATABASE_URL is not set; starting without a database (API features that require persistence will be disabled).",
  );
}

export const db = pool ? drizzle({ client: pool, schema }) : null;
