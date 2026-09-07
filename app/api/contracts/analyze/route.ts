import { NextRequest, NextResponse } from 'next/server'

const GEMINI_PROMPT = `You are an expert legal advisor specializing in protecting Indian MSMEs, freelancers, contractors, and agencies against one-sided corporate contracts.

Analyze the attached contract document from the perspective of the CONTRACTOR / SERVICE PROVIDER. Return a JSON response with EXACTLY this structure (no markdown fences, no extra text, raw JSON only):

{
  "title": "Contract title or type",
  "amount": 0,
  "payment_terms": "Net 30",
  "late_fee": "Late fee clause text",
  "scope": "Scope of work summary",
  "due_date": "YYYY-MM-DD or null",
  "summary": "2-3 sentence plain-English summary of the contract",
  "risks": [
    {
      "clause": "The specific clause or area",
      "risk_level": "high",
      "description": "What the risk is for the contractor",
      "recommendation": "What to negotiate or change"
    }
  ],
  "missing_clauses": [
    {
      "clause": "Name of missing clause",
      "importance": "high",
      "description": "Why this clause matters to protect the contractor"
    }
  ],
  "contractor_redlines": [
    {
      "issue": "Brief name of the problematic clause (e.g., Immediate IP Transfer Before Payment)",
      "current_risk": "Why the current clause is dangerous for the contractor",
      "proposed_clause": "Exact replacement legal clause/wording the contractor can send to the client",
      "win_win_justification": "Polite, professional rationale to explain to the client why this amendment is fair to both parties"
    }
  ],
  "msme_legal_rights": [
    {
      "right_name": "Name of legal protection (e.g., MSMED Act Payment Terms)",
      "legal_reference": "Section or law reference (e.g., Section 15-16, MSMED Act 2006)",
      "explanation": "How Indian law protects the contractor regarding this issue"
    }
  ]
}

Guidelines:
- amount should be a number in INR (Indian Rupees). If mentioned in lakhs (e.g. 1.5 Lakhs), convert to number (150000). If no amount found, use 0.
- Identify specific risks for contractors: unlimited revisions (scope creep), subjective payment withholding, IP transfer prior to payment, unilateral indemnification, short termination notice, cap-less liability.
- contractor_redlines: Provide 3-5 ready-to-copy counter-proposal clauses that the contractor can copy-paste into an email or WhatsApp to the client. Make the proposed wording formal, balanced, and professional.
- msme_legal_rights: Include relevant Indian statutory protections (e.g., MSMED Act 45-day payment cap, 3x bank rate interest on delayed payments, GST compliance terms).
- Keep all text clear, actionable, and in English.
`

// Models to try in sequence if one hits rate limits
const MODELS_TO_TRY = [
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileData, mimeType, text } = body

    if (!fileData && (!text || typeof text !== 'string' || text.trim().length < 20)) {
      return NextResponse.json(
        { error: 'Please upload a valid document or provide contract text.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI analysis service is not configured. Please contact support.' },
        { status: 400 }
      )
    }

    // Build multimodal parts array for AI
    const parts: unknown[] = [{ text: GEMINI_PROMPT }]

    if (fileData) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'text/plain',
          data: fileData,
        }
      })
    } else if (text) {
      parts.push({ text: `CONTRACT TEXT:\n${text.slice(0, 40000)}` })
    }

    let lastError: string | null = null
    let responseData: any = null

    // Try available models sequentially to bypass model-specific rate limits
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
              temperature: 0.2,
              maxOutputTokens: 4096,
            }
          }),
        })

        if (response.ok) {
          responseData = await response.json()
          break // Success! Exit loop
        }

        const errBody = await response.text()
        console.warn(`[AI Analysis ${modelName} ${response.status}]`, errBody.slice(0, 300))

        if (response.status === 429) {
          lastError = 'AI rate limit reached. Please wait 10-15 seconds and try again.'
          await new Promise(r => setTimeout(r, 500))
          continue
        }

        if (response.status === 403 || response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid AI service credentials.' },
            { status: 401 }
          )
        }

        lastError = `AI service response error (${response.status})`
      } catch (err) {
        console.error(`[AI Analysis ${modelName} Exception]`, err)
        lastError = 'Network error connecting to AI analysis service.'
      }
    }

    if (!responseData) {
      return NextResponse.json(
        { error: lastError || 'AI service is temporarily busy. Please wait a few seconds and try again.' },
        { status: 429 }
      )
    }

    // Extract text from AI response
    const candidates = responseData?.candidates
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'AI analysis service returned no response candidates.' },
        { status: 500 }
      )
    }

    let rawText = candidates[0]?.content?.parts?.[0]?.text || ''
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

    let analysis
    try {
      analysis = JSON.parse(rawText)
    } catch {
      console.error('[Gemini Parse Error] Raw text:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'Could not parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analysis })

  } catch (e) {
    console.error('[Contract Analysis Error]', e)
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the contract.' },
      { status: 500 }
    )
  }
}
