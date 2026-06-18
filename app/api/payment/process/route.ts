import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateOTP, storeOTP } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, cardHolderName, cardNumber, cardExpiry, cvv } = body

    // Validate inputs
    if (!userId || !cardHolderName || !cardNumber || !cardExpiry || !cvv) {
      return NextResponse.json({ error: "جميع بيانات البطاقة مطلوبة" }, { status: 400 })
    }

    // Validate card number (basic check)
    const cleanCardNumber = cardNumber.replace(/\s/g, "")
    if (cleanCardNumber.length !== 16 || !/^\d+$/.test(cleanCardNumber)) {
      return NextResponse.json({ error: "رقم البطاقة غير صالح" }, { status: 400 })
    }

    // Validate CVV
    if (cvv.length !== 3 || !/^\d+$/.test(cvv)) {
      return NextResponse.json({ error: "رمز CVV غير صالح" }, { status: 400 })
    }

    // Store only last 4 digits for security
    const last4Digits = cleanCardNumber
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Insert payment details
    await sql(
      `INSERT INTO payment_details (
        user_id, card_holder_name, card_number_last4, 
        card_expiry, payment_status, transaction_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, cardHolderName, last4Digits, cardExpiry, "pending", transactionId],
    )

    // Generate and store OTP for payment verification
    const otp = generateOTP()
    await storeOTP(userId, otp, "payment")

    // In production, send OTP via SMS/Email
    console.log(`[v0] Payment OTP for user ${userId}: ${otp}`)

    return NextResponse.json({
      success: true,
      transactionId,
      message: "تم إرسال رمز التحقق",
    })
  } catch (error) {
    console.error("[v0] Payment processing error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة الدفع" }, { status: 500 })
  }
}
