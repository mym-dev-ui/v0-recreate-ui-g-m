import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

console.log("[v0] Initializing database connection...")

export const sql = neon(process.env.DATABASE_URL)

// Helper function to execute queries safely
export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    const result = await sql(query, params)
    return result as T
  } catch (error) {
    console.error("[v0] Database query error:", error)
    throw new Error("Database operation failed")
  }
}
