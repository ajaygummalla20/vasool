import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { checkRateLimit } from '@/app/lib/rate-limit'
import { logSecurityEvent } from '@/app/lib/security-logger'

const RECEIPT_PROMPT = `You are an expert AI expense and invoice OCR auditor.
Analyze the attached receipt, bill, or invoice image/document. Extract all expense details accurately.

Return a JSON response with EXACTLY this structure (no markdown fences, no extra text, raw JSON only):
{
  "vendor_name": "Vendor or business name",
  "vendor_gstin": "15-digit GSTIN if found on receipt, else null",
  "description": "Short summary of the items or service purchased",
  "amount": 0,
  "gst_amount": 0,
  "expense_date": "YYYY-MM-DD (format date found, or current date if missing)",
  "category": "one of: office, travel, software, hardware, salaries, marketing, professional, utilities, general",
  "payment_method": "one of: upi, credit_card, bank_transfer, cash, other",
  "notes": "Any extra notes like invoice number or payment reference"
}

Guidelines:
- amount: total final paid amount as a clean number (e.g. 1450.50).
- gst_amount: CGST+SGST or IGST tax amount if mentioned on bill, else 0.
- category:
  - 'travel' for fuel, cab/Uber/Ola, flights, hotels, trains.
  - 'office' for rent, stationery, pantry, coffee/food meetings.
  - 'software' for SaaS, subscriptions, hosting, domains, AWS/cloud.
  - 'hardware' for computers, electronics, cables, equipment.
  - 'utilities' for electricity, internet, phone bills.
  - 'marketing' for Google/Meta ads, printing, brochures.
  - 'professional' for CA fees, legal consultation.
  - 'general' for miscellaneous.
- expense_date: format strictly as YYYY-MM-DD.
`

const MODELS_TO_TRY = [
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
]

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce Authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logSecurityEvent({ type: 'AUTH_UNAUTHORIZED', details: { path: '/api/expenses/scan' } })
      return NextResponse.json({ error: 'Unauthorized. Please sign in to scan receipts.' }, { status: 401 })
    }

    // 2. Enforce Rate Limiting (max 15 OCR scans per minute per user)
    const rateLimit = checkRateLimit(`expense_scan_${user.id}`, { windowMs: 60_000, max: 15 })
    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        userId: user.id,
        details: { path: '/api/expenses/scan' }
      })
      return NextResponse.json(
        { error: 'Too many receipt scans. Please wait a minute before scanning another document.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { fileData, mimeType } = body

    if (!fileData) {
      return NextResponse.json(
        { error: 'Please upload a photo or image of the receipt/bill.' },
        { status: 400 }
      )
    }

    // 3. Payload size caps and MIME validation
    if (typeof fileData !== 'string' || fileData.length > 14_000_000) { // ~10MB base64 cap
      return NextResponse.json({ error: 'Receipt file is too large. Maximum size is 10MB.' }, { status: 400 })
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported file format. Please upload a JPG, PNG, WebP, or PDF.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI OCR scanning service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    logSecurityEvent({
      type: 'AI_EXPENSE_SCAN',
      userId: user.id,
      details: { mimeType, fileSize: fileData.length }
    })

    const parts: unknown[] = [
      { text: RECEIPT_PROMPT },
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: fileData,
        }
      }
    ]

    let lastError: string | null = null
    let responseData: any = null

    for (const modelName of MODELS_TO_TRY) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`

      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            }
          }),
        })

        if (response.ok) {
          responseData = await response.json()
          break
        }

        const errBody = await response.text()
        console.warn(`[AI OCR ${modelName} ${response.status}]`, errBody.slice(0, 300))

        if (response.status === 429) {
          lastError = 'Rate limit reached. Retrying...'
          await new Promise(r => setTimeout(r, 500))
          continue
        }

        lastError = `AI OCR service error (${response.status})`
      } catch (err) {
        console.error(`[AI OCR Exception]`, err)
        lastError = 'Network error connecting to AI OCR service.'
      }
    }

    if (!responseData) {
      return NextResponse.json(
        { error: lastError || 'AI OCR service busy. Please try again.' },
        { status: 429 }
      )
    }

    const candidates = responseData?.candidates
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'AI returned no receipt details.' },
        { status: 500 }
      )
    }

    let rawText = candidates[0]?.content?.parts?.[0]?.text || ''
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

    let extracted
    try {
      extracted = JSON.parse(rawText)
    } catch {
      console.error('[Gemini OCR Parse Error]:', rawText)
      return NextResponse.json(
        { error: 'Could not parse receipt details. Please enter manually.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ extracted })

  } catch (e) {
    console.error('[Receipt OCR Error]', e)
    return NextResponse.json(
      { error: 'An unexpected error occurred while scanning the receipt.' },
      { status: 500 }
    )
  }
}
