import bcrypt from "bcryptjs"
import { sql } from "./db"
import crypto from "crypto"

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate secure random token
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Generate OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Create session token
export async function createSession(userId: number): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await sql(
    `INSERT INTO session_tokens (user_id, token, expires_at) 
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt],
  )

  return token
}

// Verify session token
export async function verifySession(token: string): Promise<number | null> {
  const result = await sql(
    `SELECT user_id FROM session_tokens 
     WHERE token = $1 AND expires_at > NOW()`,
    [token],
  )

  return result.length > 0 ? result[0].user_id : null
}

// Store OTP code
export async function storeOTP(userId: number, code: string, type: "payment" | "phone"): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await sql(
    `INSERT INTO verification_codes (user_id, code, code_type, expires_at) 
     VALUES ($1, $2, $3, $4)`,
    [userId, code, type, expiresAt],
  )
}

// Verify OTP code
export async function verifyOTP(userId: number, code: string, type: "payment" | "phone"): Promise<boolean> {
  // Increment attempts
  await sql(
    `UPDATE verification_codes 
     SET attempts = attempts + 1 
     WHERE user_id = $1 AND code_type = $2 AND verified = FALSE`,
    [userId, type],
  )

  // Check if code is valid
  const result = await sql(
    `SELECT id, attempts FROM verification_codes 
     WHERE user_id = $1 
     AND code = $2 
     AND code_type = $3 
     AND expires_at > NOW() 
     AND verified = FALSE 
     AND attempts <= 3
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId, code, type],
  )

  if (result.length > 0) {
    // Mark as verified
    await sql(
      `UPDATE verification_codes 
       SET verified = TRUE 
       WHERE id = $1`,
      [result[0].id],
    )
    return true
  }

  return false
}
