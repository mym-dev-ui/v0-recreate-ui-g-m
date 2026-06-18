import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const admin = await verifyAdminSession(token)

    if (!admin) {
      return NextResponse.json({ error: "الجلسة منتهية" }, { status: 401 })
    }

    // Get statistics
    const [totalUsers] = await sql`SELECT COUNT(*) as count FROM users`
    const [verifiedUsers] = await sql`SELECT COUNT(*) as count FROM users WHERE is_verified = true`
    const [pendingUsers] = await sql`SELECT COUNT(*) as count FROM users WHERE is_verified = false`
    const [totalPayments] = await sql`SELECT COUNT(*) as count FROM payment_details`
    const [successfulPayments] = await sql`SELECT COUNT(*) as count FROM payment_details WHERE status = 'completed'`

    // Get recent registrations (last 7 days)
    const recentRegistrations = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    // Get account type distribution
    const accountTypes = await sql`
      SELECT account_type, COUNT(*) as count
      FROM users
      GROUP BY account_type
    `

    return NextResponse.json({
      stats: {
        totalUsers: Number.parseInt(totalUsers.count),
        verifiedUsers: Number.parseInt(verifiedUsers.count),
        pendingUsers: Number.parseInt(pendingUsers.count),
        totalPayments: Number.parseInt(totalPayments.count),
        successfulPayments: Number.parseInt(successfulPayments.count),
      },
      charts: {
        recentRegistrations,
        accountTypes,
      },
    })
  } catch (error) {
    console.error("Stats fetch error:", error)
    return NextResponse.json({ error: "حدث خطأ في جلب الإحصائيات" }, { status: 500 })
  }
}
