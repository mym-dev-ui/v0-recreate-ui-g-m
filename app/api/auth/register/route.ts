import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

// Input validation schemas
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{8}$/
  return phoneRegex.test(phone)
}

function validateNationalId(id: string): boolean {
  return id.length >= 8 && id.length <= 20
}

function validatePassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  return passwordRegex.test(password)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { accountType, fullName, nationalId, email, phoneNumber, phoneProvider, password, dateOfBirth, nationality } =
      body

    // Input validation
    if (!accountType || !fullName || !nationalId || !email || !phoneNumber || !password) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة يجب ملؤها" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 })
    }

    if (!validatePhone(phoneNumber)) {
      return NextResponse.json({ error: "رقم الهاتف يجب أن يتكون من 8 أرقام" }, { status: 400 })
    }

    if (!validateNationalId(nationalId)) {
      return NextResponse.json({ error: "رقم الهوية غير صالح" }, { status: 400 })
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم" },
        { status: 400 },
      )
    }

    // Check if user already exists
    const existingUser = await sql(`SELECT id FROM users WHERE email = $1 OR national_id = $2`, [email, nationalId])

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "البريد الإلكتروني أو رقم الهوية مسجل مسبقاً" }, { status: 409 })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Insert user into database
    const result = await sql(
      `INSERT INTO users (
        account_type, full_name, national_id, email, 
        phone_number, phone_provider, password_hash, 
        date_of_birth, nationality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id`,
      [
        accountType,
        fullName,
        nationalId,
        email,
        phoneNumber,
        phoneProvider,
        passwordHash,
        dateOfBirth || null,
        nationality || null,
      ],
    )

    const userId = result[0].id

    return NextResponse.json(
      {
        success: true,
        userId,
        message: "تم إنشاء الحساب بنجاح",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 })
  }
}
