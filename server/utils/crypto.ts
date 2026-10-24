import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  tag: string
}

function key(): Buffer {
  const secret = process.env.APP_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') throw new Error('APP_SECRET is required in production')
    return createHash('sha256').update('development-only-secret').digest()
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(secret.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(secret.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
