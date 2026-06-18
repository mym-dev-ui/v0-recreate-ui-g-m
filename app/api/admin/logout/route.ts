import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value

    if (token) {
      // Delete session from database
      await sql`DELETE FROM admin_sessions WHERE token = ${token}`
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("admin_token")

    return response
  } catch (error) {
    console.error("Admin logout error:", error)
    return NextResponse.json({ error: "حدث خطأ في تسجيل الخروج" }, { status: 500 })
  }
}
