import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Derives a 32-byte key from the PAYLOAD_SECRET environment variable.
 * Uses SHA-256 to normalize any-length secret into a fixed AES-256 key.
 */
function getKey(): Buffer {
  const secret = process.env.TREASURY_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('No encryption key configured (TREASURY_ENCRYPTION_KEY or PAYLOAD_SECRET)')
  }
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a hex-encoded string: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // iv (16) + tag (16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('hex')
}

/**
 * Decrypts a hex-encoded AES-256-GCM ciphertext.
 */
export function decrypt(cipherHex: string): string {
  const key = getKey()
  const data = Buffer.from(cipherHex, 'hex')

  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted) + decipher.final('utf8')
}
