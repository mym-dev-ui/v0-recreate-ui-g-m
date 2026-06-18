import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyOTP } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, otp } = body

    if (!userId || !otp) {
      return NextResponse.json({ error: "رمز التحقق مطلوب" }, { status: 400 })
    }

    // Verify OTP
    const isValid = await verifyOTP(userId, otp, "payment")

    if (!isValid) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 })
    }

    // Update payment status to completed
    await sql(
      `UPDATE payment_details 
       SET payment_status = 'completed' 
       WHERE user_id = $1 
       AND payment_status = 'pending'`,
      [userId],
    )

    return NextResponse.json({
      success: true,
      message: "تم التحقق من الدفع بنجاح",
    })
  } catch (error) {
    console.error("[v0] OTP verification error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء التحقق" }, { status: 500 })
  }
}
