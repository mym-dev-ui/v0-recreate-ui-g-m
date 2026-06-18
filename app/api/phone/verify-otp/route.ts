import { type NextRequest, NextResponse } from "next/server"
import { verifyOTP, createSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, otp } = body

    if (!userId || !otp) {
      return NextResponse.json({ error: "رمز التحقق مطلوب" }, { status: 400 })
    }

    // Verify OTP
    const isValid = await verifyOTP(userId, otp, "phone")

    if (!isValid) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 })
    }

    // Create session token
    const sessionToken = await createSession(userId)

    return NextResponse.json({
      success: true,
      sessionToken,
      message: "تم التحقق من رقم الهاتف بنجاح",
    })
  } catch (error) {
    console.error("[v0] Phone OTP verification error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء التحقق" }, { status: 500 })
  }
}
