import CryptoJS from "crypto-js"

// Generate a session-specific encryption key
let sessionKey: string | null = null

function getSessionKey(): string {
  if (!sessionKey) {
    // Generate a random session key
    sessionKey = CryptoJS.lib.WordArray.random(256 / 8).toString()
  }
  return sessionKey
}

export function generateSecurePIN(): string {
  // Generate cryptographically secure 6-digit PIN
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  const pin = ((array[0] % 900000) + 100000).toString()
  return pin
}

export function encryptPIN(pin: string): string {
  const key = getSessionKey()
  const encrypted = CryptoJS.AES.encrypt(pin, key).toString()
  return encrypted
}

export function decryptPIN(encryptedPIN: string): string | null {
  try {
    const key = getSessionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedPIN, key)
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error("Decryption failed:", error)
    return null
  }
}

export function clearSessionKey(): void {
  sessionKey = null
}

// PIN expiration (10 minutes)
export function isPINExpired(timestamp: number): boolean {
  const now = Date.now()
  const expirationTime = 10 * 60 * 1000 // 10 minutes
  return now - timestamp > expirationTime
}
