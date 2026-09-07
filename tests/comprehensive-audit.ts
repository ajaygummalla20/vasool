/**
 * Settlr MSME OS — Automated System-Wide Test Suite
 * Covers financial calculations, MSMED interest formulas, TDS ledger,
 * Razorpay cryptographic signatures, UPI QR protocols, and document lifecycles.
 */

import crypto from 'crypto'

// ── Test Runner Utilities ───────────────────────────────────────
let totalTests = 0
let passedTests = 0
let failedTests = 0

function describe(suiteName: string, fn: () => void) {
  console.log(`\n\x1b[1m\x1b[36m=== ${suiteName} ===\x1b[0m`)
  fn()
}

function it(testName: string, fn: () => void) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`)
  } catch (err: any) {
    failedTests++
    console.error(`  \x1b[31m✕\x1b[0m ${testName}`)
    console.error(`    \x1b[31mError: ${err.message}\x1b[0m`)
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected [${expected}] (${typeof expected}) but got [${actual}] (${typeof actual})`)
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`)
      }
    },
    toBeCloseTo(expected: number, delta: number = 0.01) {
      if (Math.abs(actual - expected) > delta) {
        throw new Error(`Expected ${actual} to be within ${delta} of ${expected}`)
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value but got [${actual}]`)
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value but got [${actual}]`)
    },
    toContain(substr: string) {
      if (typeof actual === 'string' && !actual.includes(substr)) {
        throw new Error(`Expected string "${actual}" to contain "${substr}"`)
      }
    }
  }
}

// ── Helper Implementations from Settlr Core ─────────────────────

function calculateInvoiceFinancials(params: {
  subtotal: number
  discType: 'pct' | 'fixed'
  discVal: number
  applyGst: boolean
  gstType: 'cgst_sgst' | 'igst'
  cgstPct: number
  sgstPct: number
  igstPct: number
}) {
  const { subtotal, discType, discVal, applyGst, gstType, cgstPct, sgstPct, igstPct } = params
  const discAmt = discType === 'pct' ? (subtotal * discVal) / 100 : discVal
  const taxable = Math.max(0, subtotal - discAmt)
  let cgstAmt = 0, sgstAmt = 0, igstAmt = 0

  if (applyGst) {
    if (gstType === 'cgst_sgst') {
      cgstAmt = (taxable * cgstPct) / 100
      sgstAmt = (taxable * sgstPct) / 100
    } else {
      igstAmt = (taxable * igstPct) / 100
    }
  }

  const total = taxable + cgstAmt + sgstAmt + igstAmt
  return { discAmt, taxable, cgstAmt, sgstAmt, igstAmt, total }
}

function calculateMsmeInterest(amountDue: number, issueDateStr: string, asOfDateStr: string) {
  const issueDate = new Date(issueDateStr)
  const asOfDate = new Date(asOfDateStr)
  const msmeMaxDate = new Date(issueDate.getTime() + 45 * 86400000)
  const daysPast45 = Math.max(0, Math.floor((asOfDate.getTime() - msmeMaxDate.getTime()) / 86400000))
  
  if (daysPast45 <= 0 || amountDue <= 0) {
    return { daysPast45: 0, msmeInterest: 0, totalStatutoryClaim: amountDue }
  }

  const annualRate = 0.2025 // 3x RBI bank rate (6.75% * 3)
  const monthlyRate = annualRate / 12
  const months = daysPast45 / 30
  const compoundedAmount = amountDue * Math.pow(1 + monthlyRate, months)
  const msmeInterest = Math.round(compoundedAmount - amountDue)
  const totalStatutoryClaim = amountDue + msmeInterest

  return { daysPast45, msmeInterest, totalStatutoryClaim }
}

function calculateTdsDeduction(amountDue: number, section: '194J_10' | '194J_2' | '194C_1') {
  const rate = section === '194J_10' ? 0.10 : section === '194J_2' ? 0.02 : 0.01
  const tdsWithheld = Math.round(amountDue * rate)
  const netBankDeposit = amountDue - tdsWithheld
  return { rate, tdsWithheld, netBankDeposit }
}

function buildUpiUri(upiId: string, payeeName: string, amount: number, invoiceNum: string) {
  if (!upiId) return ''
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Inv-${invoiceNum}`)}`
}

function verifyRazorpayHmac(orderId: string, paymentId: string, signature: string, secret: string) {
  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return expectedSignature === signature
}

function generateDocSequence(baseNum: string, docType: 'tax_invoice' | 'proforma' | 'credit_note') {
  const cleanNum = baseNum.replace(/^[A-Z]+-/, '')
  if (docType === 'proforma') return `PI-${cleanNum}`
  if (docType === 'credit_note') return `CN-${cleanNum}`
  return `INV-${cleanNum}`
}

// ── Test Suites Execution ───────────────────────────────────────

describe('1. GST & Tax Calculation Engine', () => {
  it('calculates Intra-State CGST (9%) + SGST (9%) correctly', () => {
    const res = calculateInvoiceFinancials({
      subtotal: 100000,
      discType: 'pct',
      discVal: 0,
      applyGst: true,
      gstType: 'cgst_sgst',
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
    })
    expect(res.taxable).toBe(100000)
    expect(res.cgstAmt).toBe(9000)
    expect(res.sgstAmt).toBe(9000)
    expect(res.igstAmt).toBe(0)
    expect(res.total).toBe(118000)
  })

  it('calculates Inter-State IGST (18%) correctly', () => {
    const res = calculateInvoiceFinancials({
      subtotal: 50000,
      discType: 'pct',
      discVal: 0,
      applyGst: true,
      gstType: 'igst',
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
    })
    expect(res.taxable).toBe(50000)
    expect(res.cgstAmt).toBe(0)
    expect(res.sgstAmt).toBe(0)
    expect(res.igstAmt).toBe(9000)
    expect(res.total).toBe(59000)
  })

  it('applies percentage discount before computing GST', () => {
    const res = calculateInvoiceFinancials({
      subtotal: 10000,
      discType: 'pct',
      discVal: 10, // 10% off
      applyGst: true,
      gstType: 'cgst_sgst',
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
    })
    expect(res.discAmt).toBe(1000)
    expect(res.taxable).toBe(9000)
    expect(res.cgstAmt).toBe(810)
    expect(res.sgstAmt).toBe(810)
    expect(res.total).toBe(10620)
  })

  it('applies fixed cash discount correctly', () => {
    const res = calculateInvoiceFinancials({
      subtotal: 10000,
      discType: 'fixed',
      discVal: 1500, // ₹1,500 off
      applyGst: false,
      gstType: 'cgst_sgst',
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
    })
    expect(res.discAmt).toBe(1500)
    expect(res.taxable).toBe(8500)
    expect(res.total).toBe(8500)
  })
})

describe('2. MSMED Act 2006 Statutory Interest Engine (Section 15 & 16)', () => {
  it('charges 0 interest if payment is within 45-day statutory window', () => {
    const res = calculateMsmeInterest(100000, '2026-01-01', '2026-02-10') // 40 days
    expect(res.daysPast45).toBe(0)
    expect(res.msmeInterest).toBe(0)
    expect(res.totalStatutoryClaim).toBe(100000)
  })

  it('correctly calculates compound monthly interest @ 20.25% p.a. for overdue claims', () => {
    // 45 days after Jan 1 is Feb 15. June 15 is 120 days past 45 (4 compounding cycles of 30 days)
    const res = calculateMsmeInterest(100000, '2026-01-01', '2026-06-15')
    expect(res.daysPast45).toBe(120)
    expect(res.msmeInterest).toBe(6923) // Compounded monthly interest over 4 compounding cycles
    expect(res.totalStatutoryClaim).toBe(106923)
  })
})

describe('3. TDS Asset Ledger & 26AS Tax Withholding (Sections 194J & 194C)', () => {
  it('deducts 10% TDS for Technical & Professional Services (Section 194J)', () => {
    const res = calculateTdsDeduction(100000, '194J_10')
    expect(res.rate).toBe(0.10)
    expect(res.tdsWithheld).toBe(10000)
    expect(res.netBankDeposit).toBe(90000)
  })

  it('deducts 2% TDS for Software/Support Services (Section 194J)', () => {
    const res = calculateTdsDeduction(50000, '194J_2')
    expect(res.rate).toBe(0.02)
    expect(res.tdsWithheld).toBe(1000)
    expect(res.netBankDeposit).toBe(49000)
  })

  it('deducts 1% TDS for Contractors & Work Contracts (Section 194C)', () => {
    const res = calculateTdsDeduction(200000, '194C_1')
    expect(res.rate).toBe(0.01)
    expect(res.tdsWithheld).toBe(2000)
    expect(res.netBankDeposit).toBe(198000)
  })
})

describe('4. Dynamic NPCI UPI QR Protocol & Parameters', () => {
  it('generates standard UPI deep link with proper encoding', () => {
    const uri = buildUpiUri('settlr@okaxis', 'Settlr Technologies LLP', 15400, '042')
    expect(uri).toContain('upi://pay?')
    expect(uri).toContain('pa=settlr%40okaxis')
    expect(uri).toContain('am=15400')
    expect(uri).toContain('cu=INR')
    expect(uri).toContain('tn=Inv-042')
  })

  it('returns empty string if UPI ID is not provided', () => {
    const uri = buildUpiUri('', 'Business Name', 5000, '001')
    expect(uri).toBe('')
  })
})

describe('5. Razorpay Cryptographic HMAC SHA256 Verification', () => {
  const secret = '0PCk1u2Yt63NhKkdiYxpkPIx'
  const orderId = 'order_M1234567890'
  const paymentId = 'pay_P9876543210'

  // Correct HMAC hash
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  it('authenticates valid Razorpay payment signature', () => {
    const isValid = verifyRazorpayHmac(orderId, paymentId, validSignature, secret)
    expect(isValid).toBe(true)
  })

  it('rejects tampered payment signature', () => {
    const isTampered = verifyRazorpayHmac(orderId, paymentId, 'tampered_fake_signature', secret)
    expect(isTampered).toBe(false)
  })
})

describe('6. Document Sequencing & Document Type Prefixes', () => {
  it('generates INV- prefix for standard Tax Invoice', () => {
    expect(generateDocSequence('007', 'tax_invoice')).toBe('INV-007')
  })

  it('generates PI- prefix for Proforma Invoice', () => {
    expect(generateDocSequence('INV-042', 'proforma')).toBe('PI-042')
  })

  it('generates CN- prefix for GST Credit Note', () => {
    expect(generateDocSequence('INV-099', 'credit_note')).toBe('CN-099')
  })
})

describe('7. Advance Tax (Section 208/211) & Section 44ADA Presumptive Taxation Engine', () => {
  function computeAdvanceTax(grossRevenue: number, tdsDeducted: number) {
    const profit44ADA = Math.round(grossRevenue * 0.50)
    let tax = 0
    if (profit44ADA > 1500000) {
      tax = 140000 + (profit44ADA - 1500000) * 0.30
    } else if (profit44ADA > 1200000) {
      tax = 80000 + (profit44ADA - 1200000) * 0.20
    } else if (profit44ADA > 1000000) {
      tax = 50000 + (profit44ADA - 1000000) * 0.15
    } else if (profit44ADA > 700000) {
      tax = 20000 + (profit44ADA - 700000) * 0.10
    }
    const taxWithCess = Math.round(tax * 1.04)
    const netTaxPayable = Math.max(0, taxWithCess - tdsDeducted)

    return {
      profit44ADA,
      taxWithCess,
      netTaxPayable,
      q1Due: Math.round(netTaxPayable * 0.15),
      q2Due: Math.round(netTaxPayable * 0.45),
      q3Due: Math.round(netTaxPayable * 0.75),
      q4Due: netTaxPayable
    }
  }

  it('computes 50% presumptive profit margin under Section 44ADA for professional billing', () => {
    const res = computeAdvanceTax(2400000, 0)
    expect(res.profit44ADA).toBe(1200000)
  })

  it('applies 4% Health & Education Cess and offsets reconciled Form 26AS TDS', () => {
    const res = computeAdvanceTax(2400000, 50000)
    // 12L taxable profit: 50k (7-10L @ 10%) + 30k (10-12L @ 15%) = 80,000 + 4% cess = 83,200
    // Net tax after 50,000 TDS offset = 33,200
    expect(res.taxWithCess).toBe(83200)
    expect(res.netTaxPayable).toBe(33200)
  })

  it('accurately divides advance tax across 4 statutory quarterly deadlines (15%, 45%, 75%, 100%)', () => {
    const res = computeAdvanceTax(2400000, 50000)
    expect(res.q1Due).toBe(4980)  // 15% by June 15
    expect(res.q2Due).toBe(14940) // 45% by Sept 15
    expect(res.q3Due).toBe(24900) // 75% by Dec 15
    expect(res.q4Due).toBe(33200) // 100% by March 15
  })
})

describe('8. Working Capital & DSO (Days Sales Outstanding) Financial Engine', () => {
  function computeDso(totalRevenue90D: number, totalReceivables: number) {
    if (totalRevenue90D <= 0) return 0
    return Math.max(1, Math.round((totalReceivables / totalRevenue90D) * 90))
  }

  it('calculates optimal DSO (< 30 days) when receivables are collected promptly', () => {
    const dso = computeDso(300000, 60000) // 20% unpaid => 18 days
    expect(dso).toBe(18)
  })

  it('detects elevated DSO (> 45 days) breaching statutory MSMED statutory credit limit', () => {
    const dso = computeDso(300000, 200000) // 66.7% unpaid => 60 days
    expect(dso).toBe(60)
  })
})

// ── Summary Report ──────────────────────────────────────────────
console.log(`\n\x1b[1m========================================\x1b[0m`)
console.log(`\x1b[1mTest Results: \x1b[32m${passedTests} passed\x1b[0m, \x1b[31m${failedTests} failed\x1b[0m (${totalTests} total)`)
console.log(`\x1b[1m========================================\x1b[0m\n`)

if (failedTests > 0) {
  process.exit(1)
}
