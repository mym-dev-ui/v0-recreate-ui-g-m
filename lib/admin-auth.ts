import { sql } from "./db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export interface AdminUser {
  id: number
  username: string
  email: string
  role: "super_admin" | "admin" | "viewer"
  created_at: Date
}

export async function verifyAdminCredentials(username: string, password: string): Promise<AdminUser | null> {
  try {
    console.log("[v0] Attempting admin login for username:", username)

    const result = await sql`
      SELECT id, username, email, password_hash, role, created_at
      FROM admin_users
      WHERE username = ${username} AND is_active = true
    `

    console.log("[v0] Query result length:", result.length)

    if (result.length === 0) {
      console.log("[v0] No admin user found with username:", username)
      return null
    }

    const admin = result[0]
    const isValid = await bcrypt.compare(password, admin.password_hash)

    console.log("[v0] Password validation result:", isValid)

    if (!isValid) {
      return null
    }

    await sql`
      UPDATE admin_users 
      SET last_login = NOW() 
      WHERE id = ${admin.id}
    `

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at,
    }
  } catch (error) {
    console.error("[v0] Admin authentication error:", error)
    throw error
  }
}

export async function createAdminSession(adminId: number): Promise<string> {
  const token = generateSecureToken()
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

  console.log("[v0] Creating admin session for admin ID:", adminId)

  await sql`
    INSERT INTO admin_sessions (admin_id, token, expires_at)
    VALUES (${adminId}, ${token}, ${expiresAt})
  `

  return token
}

export async function verifyAdminSession(token: string): Promise<AdminUser | null> {
  try {
    const result = await sql`
      SELECT a.id, a.username, a.email, a.role, a.created_at
      FROM admin_sessions s
      JOIN admin_users a ON s.admin_id = a.id
      WHERE s.token = ${token} 
        AND s.expires_at > NOW()
        AND a.is_active = true
    `

    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("[v0] Session verification error:", error)
    return null
  }
}

function generateSecureToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
