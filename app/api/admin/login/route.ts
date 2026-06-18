import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials, createAdminSession } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبة" }, { status: 400 })
    }

    // Verify credentials
    const admin = await verifyAdminCredentials(username, password)

    if (!admin) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 })
    }

    // Create session
    const token = await createAdminSession(admin.id)

    // Update last login
    await sql`
      UPDATE admin_users 
      SET last_login = NOW() 
      WHERE id = ${admin.id}
    `

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    })

    // Set HTTP-only cookie
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/dashboard",
    })

    return response
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 })
  }
}
