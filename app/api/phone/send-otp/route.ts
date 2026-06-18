import { type NextRequest, NextResponse } from "next/server"
import { generateOTP, storeOTP } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 })
    }

    // Generate and store OTP for phone verification
    const otp = generateOTP()
    await storeOTP(userId, otp, "phone")

    // In production, send OTP via SMS
    console.log(`[v0] Phone verification OTP for user ${userId}: ${otp}`)

    return NextResponse.json({
      success: true,
      message: "تم إرسال رمز التحقق إلى رقم هاتفك",
    })
  } catch (error) {
    console.error("[v0] Send OTP error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال رمز التحقق" }, { status: 500 })
  }
}
