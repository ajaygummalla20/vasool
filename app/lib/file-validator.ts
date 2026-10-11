/**
 * Inspects binary file signatures (magic bytes) from base64 strings
 * to prevent MIME-type spoofing attacks before uploading to AI services.
 */

export interface ValidationResult {
  valid: boolean
  detectedMime?: string
  error?: string
}

export function validateBase64FileSignature(
  base64Data: string,
  declaredMime?: string,
  allowedMimes: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
): ValidationResult {
  if (!base64Data || typeof base64Data !== 'string') {
    return { valid: false, error: 'File data is empty or invalid.' }
  }

  // Strip potential data URL prefix (e.g. data:image/png;base64,...)
  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim()

  // Decode the first 64 bytes to inspect magic headers
  let headerBuffer: Buffer
  try {
    const headerBase64 = cleanBase64.slice(0, 88) // 64 bytes ~ 88 chars in base64
    headerBuffer = Buffer.from(headerBase64, 'base64')
  } catch {
    return { valid: false, error: 'Invalid base64 encoding.' }
  }

  if (headerBuffer.length < 4) {
    return { valid: false, error: 'File is too small or corrupted.' }
  }

  let detectedMime: string | undefined

  // PDF signature: %PDF (hex: 25 50 44 46)
  if (
    headerBuffer[0] === 0x25 &&
    headerBuffer[1] === 0x50 &&
    headerBuffer[2] === 0x44 &&
    headerBuffer[3] === 0x46
  ) {
    detectedMime = 'application/pdf'
  }
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  else if (
    headerBuffer[0] === 0x89 &&
    headerBuffer[1] === 0x50 &&
    headerBuffer[2] === 0x4E &&
    headerBuffer[3] === 0x47
  ) {
    detectedMime = 'image/png'
  }
  // JPEG signature: FF D8 FF
  else if (
    headerBuffer[0] === 0xFF &&
    headerBuffer[1] === 0xD8 &&
    headerBuffer[2] === 0xFF
  ) {
    detectedMime = 'image/jpeg'
  }
  // WebP signature: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  else if (
    headerBuffer[0] === 0x52 &&
    headerBuffer[1] === 0x49 &&
    headerBuffer[2] === 0x46 &&
    headerBuffer[3] === 0x46 &&
    headerBuffer.length >= 12 &&
    headerBuffer[8] === 0x57 &&
    headerBuffer[9] === 0x45 &&
    headerBuffer[10] === 0x42 &&
    headerBuffer[11] === 0x50
  ) {
    detectedMime = 'image/webp'
  }
  // Plain text (ASCII/UTF-8 text heuristics)
  else if (declaredMime === 'text/plain') {
    const isPrintable = headerBuffer.every(b => b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126))
    if (isPrintable) {
      detectedMime = 'text/plain'
    }
  }

  if (!detectedMime) {
    return {
      valid: false,
      error: 'File signature does not match any accepted document or image format (PDF, PNG, JPG, WebP).',
    }
  }

  if (!allowedMimes.includes(detectedMime)) {
    return {
      valid: false,
      error: `File format ${detectedMime} is not allowed for this operation.`,
    }
  }

  return {
    valid: true,
    detectedMime,
  }
}
