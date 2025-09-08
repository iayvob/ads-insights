import crypto from "crypto"

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url")
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash("sha256").update(verifier).digest()
  return hash.toString("base64url")
}

export function validateState(sessionState: string, callbackState: string): boolean {
  return sessionState === callbackState
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt
}

export function refreshTokenIfNeeded(token: any): boolean {
  // Check if token expires within 5 minutes
  const fiveMinutes = 5 * 60 * 1000
  return Date.now() + fiveMinutes >= token.expiresAt
}
