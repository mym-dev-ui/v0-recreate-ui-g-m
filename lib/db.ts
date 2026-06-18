import { neon } from "@neondatabase/serverless"

// Use a placeholder URL at build time — neon() does not connect on creation,
// only when a query is actually executed at runtime.
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://build:build@build.local/build"

export const sql = neon(DATABASE_URL)

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  try {
    const result = await sql(query, params)
    return result as T
  } catch (error) {
    console.error("[v0] Database query error:", error)
    throw new Error("Database operation failed")
  }
}