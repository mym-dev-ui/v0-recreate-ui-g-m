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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const accountType = searchParams.get("accountType") || ""
    const verified = searchParams.get("verified") || ""

    const offset = (page - 1) * limit

    // Build query
    let query = `
      SELECT u.*, 
        p.status as payment_status,
        p.amount as payment_amount,
        p.last_4_digits as card_last_4
      FROM users u
      LEFT JOIN payment_details p ON u.id = p.user_id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    if (accountType) {
      query += ` AND u.account_type = $${paramIndex}`
      params.push(accountType)
      paramIndex++
    }

    if (verified === "true") {
      query += ` AND u.is_verified = true`
    } else if (verified === "false") {
      query += ` AND u.is_verified = false`
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`
    const [{ total }] = await sql(countQuery, params)

    // Add pagination
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const users = await sql(query, params)

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: Number.parseInt(total),
        totalPages: Math.ceil(Number.parseInt(total) / limit),
      },
    })
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "حدث خطأ في جلب المستخدمين" }, { status: 500 })
  }
}
