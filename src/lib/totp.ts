import crypto from 'crypto'

function base32ToBuf(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  let hex = ''
  
  const cleaned = base32.toUpperCase().replace(/=+$/, '')
  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned.charAt(i))
    if (val === -1) throw new Error('Invalid base32 character')
    bits += val.toString(2).padStart(5, '0')
  }
  
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.substring(i, i + 8)
    hex += parseInt(chunk, 2).toString(16).padStart(2, '0')
  }
  
  return Buffer.from(hex, 'hex')
}

export function generateTOTP(secret: string, timeStep = 30): string {
  const key = base32ToBuf(secret)
  const counter = Math.floor(Date.now() / 1000 / timeStep)
  
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(BigInt(counter), 0)
  
  const hmac = crypto.createHmac('sha1', key)
  hmac.update(buffer)
  const hmacResult = hmac.digest()
  
  const offset = hmacResult[hmacResult.length - 1] & 0xf
  const code = 
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  
  const otp = code % 1000000
  return otp.toString().padStart(6, '0')
}

export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  const cleanToken = token.trim()
  if (cleanToken.length !== 6 || isNaN(Number(cleanToken))) return false
  
  try {
    const key = base32ToBuf(secret)
    const baseCounter = Math.floor(Date.now() / 1000 / 30)
    
    for (let i = -window; i <= window; i++) {
      const counter = baseCounter + i
      const buffer = Buffer.alloc(8)
      buffer.writeBigInt64BE(BigInt(counter), 0)
      
      const hmac = crypto.createHmac('sha1', key)
      hmac.update(buffer)
      const hmacResult = hmac.digest()
      
      const offset = hmacResult[hmacResult.length - 1] & 0xf
      const code = 
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
      
      const otp = (code % 1000000).toString().padStart(6, '0')
      if (otp === cleanToken) return true
    }
  } catch (e) {
    console.error('Error during TOTP verification:', e)
  }
  
  return false
}

export function generateSecret(length = 16): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const randomBytes = crypto.randomBytes(length)
  let secret = ''
  for (let i = 0; i < length; i++) {
    secret += alphabet[randomBytes[i] % alphabet.length]
  }
  return secret
}
