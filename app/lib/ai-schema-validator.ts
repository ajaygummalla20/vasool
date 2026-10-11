/**
 * Runtime schema validators for AI analysis responses
 * to protect against malformed, unvalidated, or hallucinated payloads.
 */

export interface ContractAnalysis {
  title: string
  amount: number
  payment_terms: string
  late_fee: string
  scope: string
  due_date: string | null
  summary: string
  risks: Array<{
    clause: string
    risk_level: string
    description: string
    recommendation: string
  }>
  missing_clauses: Array<{
    clause: string
    importance: string
    description: string
  }>
  contractor_redlines: Array<{
    issue: string
    current_risk: string
    proposed_clause: string
    win_win_justification: string
  }>
  msme_legal_rights: Array<{
    right_name: string
    legal_reference: string
    explanation: string
  }>
}

export function validateContractAnalysis(raw: any): ContractAnalysis {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI analysis output is not a valid JSON object.')
  }

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Contract Document'
  const amount = typeof raw.amount === 'number' && !isNaN(raw.amount) && raw.amount >= 0 ? raw.amount : 0
  const payment_terms = typeof raw.payment_terms === 'string' ? raw.payment_terms : 'Net 30'
  const late_fee = typeof raw.late_fee === 'string' ? raw.late_fee : ''
  const scope = typeof raw.scope === 'string' ? raw.scope : ''
  const due_date = typeof raw.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.due_date) ? raw.due_date : null
  const summary = typeof raw.summary === 'string' ? raw.summary : ''

  const risks = Array.isArray(raw.risks)
    ? raw.risks.map((r: any) => ({
        clause: String(r?.clause || 'General Clause'),
        risk_level: ['high', 'medium', 'low'].includes(String(r?.risk_level).toLowerCase())
          ? String(r.risk_level).toLowerCase()
          : 'medium',
        description: String(r?.description || ''),
        recommendation: String(r?.recommendation || ''),
      }))
    : []

  const missing_clauses = Array.isArray(raw.missing_clauses)
    ? raw.missing_clauses.map((m: any) => ({
        clause: String(m?.clause || ''),
        importance: ['high', 'medium', 'low'].includes(String(m?.importance).toLowerCase())
          ? String(m.importance).toLowerCase()
          : 'medium',
        description: String(m?.description || ''),
      }))
    : []

  const contractor_redlines = Array.isArray(raw.contractor_redlines)
    ? raw.contractor_redlines.map((cr: any) => ({
        issue: String(cr?.issue || ''),
        current_risk: String(cr?.current_risk || ''),
        proposed_clause: String(cr?.proposed_clause || ''),
        win_win_justification: String(cr?.win_win_justification || ''),
      }))
    : []

  const msme_legal_rights = Array.isArray(raw.msme_legal_rights)
    ? raw.msme_legal_rights.map((ml: any) => ({
        right_name: String(ml?.right_name || ''),
        legal_reference: String(ml?.legal_reference || ''),
        explanation: String(ml?.explanation || ''),
      }))
    : []

  return {
    title,
    amount,
    payment_terms,
    late_fee,
    scope,
    due_date,
    summary,
    risks,
    missing_clauses,
    contractor_redlines,
    msme_legal_rights,
  }
}

export interface ReceiptScan {
  vendor_name: string
  vendor_gstin: string | null
  description: string
  amount: number
  gst_amount: number
  expense_date: string
  category: string
  payment_method: string
  notes: string | null
}

const ALLOWED_EXPENSE_CATEGORIES = [
  'office', 'travel', 'software', 'hardware', 'salaries',
  'marketing', 'professional', 'utilities', 'general'
]

const ALLOWED_PAYMENT_METHODS = ['upi', 'credit_card', 'bank_transfer', 'cash', 'other']

export function validateReceiptScan(raw: any): ReceiptScan {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI OCR output is not a valid JSON object.')
  }

  const vendor_name = typeof raw.vendor_name === 'string' && raw.vendor_name.trim()
    ? raw.vendor_name.trim()
    : 'Unknown Vendor'

  const vendor_gstin = typeof raw.vendor_gstin === 'string' && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(raw.vendor_gstin)
    ? raw.vendor_gstin
    : null

  const description = typeof raw.description === 'string' && raw.description.trim()
    ? raw.description.trim()
    : 'Expense Receipt'

  const amount = typeof raw.amount === 'number' && !isNaN(raw.amount) && raw.amount > 0
    ? raw.amount
    : 0

  const gst_amount = typeof raw.gst_amount === 'number' && !isNaN(raw.gst_amount) && raw.gst_amount >= 0
    ? raw.gst_amount
    : 0

  const todayStr = new Date().toISOString().split('T')[0]
  const expense_date = typeof raw.expense_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.expense_date)
    ? raw.expense_date
    : todayStr

  const rawCat = String(raw.category || 'general').toLowerCase()
  const category = ALLOWED_EXPENSE_CATEGORIES.includes(rawCat) ? rawCat : 'general'

  const rawMethod = String(raw.payment_method || 'upi').toLowerCase()
  const payment_method = ALLOWED_PAYMENT_METHODS.includes(rawMethod) ? rawMethod : 'upi'

  const notes = typeof raw.notes === 'string' ? raw.notes : null

  return {
    vendor_name,
    vendor_gstin,
    description,
    amount,
    gst_amount,
    expense_date,
    category,
    payment_method,
    notes,
  }
}
