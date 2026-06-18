import { neon } from "@neondatabase/serverless"

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(_target, prop) {
    const s = getSql();
    return (s as any)[prop];
  },
  apply(_target, _thisArg, args) {
    return getSql()(...(args as [any, any]));
  }
}) as unknown as ReturnType<typeof neon>;

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    const result = await getSql()(query, params)
    return result as T
  } catch (error) {
    console.error("[v0] Database query error:", error)
    throw new Error("Database operation failed")
  }
}