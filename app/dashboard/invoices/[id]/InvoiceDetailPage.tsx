'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  sort_order: number
}

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  gst_number: string | null
  city: string | null
  state: string | null
  address: string | null
}

interface Payment {
  id: string
  amount: number
  method: string
  paid_at: string
}

interface Reminder {
  id: string
  channel: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  days_overdue: number | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_due: number
  discount_amount: number | null
  cgst_pct: number | null
  sgst_pct: number | null
  igst_pct: number | null
  issue_date: string
  due_date: string
  sent_at: string | null
  paid_at: string | null
  payment_terms: string | null
  late_fee_terms: string | null
  notes: string | null
}

interface Props {
  invoice: Invoice
  invoiceItems: InvoiceItem[]
  client: Client | null
  payments: Payment[]
  reminders: Reminder[]
  senderName: string
  senderGst: string
  senderAddress: string
  upiId?: string
  bankName?: string
  bankAccount?: string
  bankIfsc?: string
  msmeUdyamNumber?: string
  userName: string
  userEmail: string
  userId: string
}

// ── Helpers ────────────────────────────────────────────────────
function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string | null, fallback = '—') {
  if (!d) return fallback
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function daysOverdue(dueDate: string) {
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

// ── Amount In Words (INR) ──────────────────────────────────────
function amountInWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only'
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

  function convertBelow1000(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertBelow1000(n % 100) : '')
  }

  const intPart = Math.floor(Math.abs(num))
  const paise = Math.round((Math.abs(num) - intPart) * 100)

  let result = ''
  const crore = Math.floor(intPart / 10000000)
  const lakh = Math.floor((intPart % 10000000) / 100000)
  const thousand = Math.floor((intPart % 100000) / 1000)
  const remainder = intPart % 1000

  if (crore) result += convertBelow1000(crore) + ' Crore '
  if (lakh) result += convertBelow1000(lakh) + ' Lakh '
  if (thousand) result += convertBelow1000(thousand) + ' Thousand '
  if (remainder) result += convertBelow1000(remainder)

  result = result.trim() + ' Rupees'
  if (paise > 0) result += ' and ' + convertBelow1000(paise) + ' Paise'
  return result + ' Only'
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  draft:          { label: 'Draft',    bg: '#F1EFE8', color: '#444441', dot: '#888780' },
  sent:           { label: 'Sent',     bg: '#E6F1FB', color: '#0C447C', dot: '#185FA5' },
  overdue:        { label: 'Overdue',  bg: '#FCEBEB', color: '#791F1F', dot: '#C0392B' },
  partially_paid: { label: 'Part paid',bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  paid:           { label: 'Paid',     bg: '#E1F5EE', color: '#085041', dot: '#1B5E3B' },
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI', bank_transfer: 'Bank Transfer', cash: 'Cash', cheque: 'Cheque', other: 'Other',
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Component ──────────────────────────────────────────────────
export default function InvoiceDetailPage({
  invoice, invoiceItems, client, payments, reminders,
  senderName, senderGst, senderAddress,
  upiId, bankName, bankAccount, bankIfsc, msmeUdyamNumber,
  userName, userEmail, userId,
}: Props) {
  const router = useRouter()

  const [invStatus,    setInvStatus]    = useState(invoice.status)
  const [amountDue,    setAmountDue]    = useState(invoice.amount_due)
  const [paidAt,       setPaidAt]       = useState(invoice.paid_at)
  const [paymentsList, setPaymentsList] = useState<Payment[]>(payments)
  const [reminderList] = useState<Reminder[]>(reminders)

  // Mark as paid modal
  const [showPaidModal,   setShowPaidModal]   = useState(false)
  const [paidMethod,      setPaidMethod]      = useState<'upi'|'bank_transfer'|'cash'|'cheque'|'other'>('upi')
  const [paidDateInput,   setPaidDateInput]   = useState(new Date().toISOString().split('T')[0])
  const [hasTdsDeduction, setHasTdsDeduction] = useState(false)
  const [tdsSection,      setTdsSection]      = useState<'194J_10'|'194J_2'|'194C_1'>('194J_10')
  const [marking,         setMarking]         = useState(false)
  const [markError,       setMarkError]       = useState('')

  // Proforma conversion
  const [convertingPi,    setConvertingPi]    = useState(false)

  // Account details modal
  const [currentUpi,         setCurrentUpi]         = useState(upiId || '')
  const [currentBankName,    setCurrentBankName]    = useState(bankName || '')
  const [currentBankAccount, setCurrentBankAccount] = useState(bankAccount || '')
  const [currentBankIfsc,    setCurrentBankIfsc]    = useState(bankIfsc || '')
  const [currentUdyam,       setCurrentUdyam]       = useState(msmeUdyamNumber || '')
  const [showAccountModal,   setShowAccountModal]   = useState(false)
  const [savingAccount,      setSavingAccount]      = useState(false)

  // MSMED Legal Notice Modal
  const [showMsmeModal, setShowMsmeModal] = useState(false)
  const [copiedNotice,  setCopiedNotice]  = useState(false)

  const isPaid   = invStatus === 'paid'
  const isOverdue = invStatus === 'overdue'
  const overdueDays = daysOverdue(invoice.due_date)
  const cfg = STATUS_CFG[invStatus] || STATUS_CFG.draft

  // ── Dynamic NPCI UPI QR Code ──
  const effectiveUpi = currentUpi || ''
  const upiUri = effectiveUpi
    ? `upi://pay?pa=${effectiveUpi}&pn=${encodeURIComponent(senderName || 'Business')}&am=${amountDue}&cu=INR&tn=Inv-${invoice.invoice_number}`
    : ''
  const qrCodeUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiUri)}`
    : ''

  const handleSaveAccountDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAccount(true)
    try {
      const sb = getSupabase()
      const { error } = await sb.from('profiles').update({
        upi_id: currentUpi.trim(),
        bank_name: currentBankName.trim(),
        bank_account: currentBankAccount.trim(),
        bank_ifsc: currentBankIfsc.trim().toUpperCase(),
        msme_udyam_number: currentUdyam.trim().toUpperCase(),
      }).eq('id', userId)
      if (error) throw error
      setShowAccountModal(false)
      alert('Bank & UPI details saved successfully! Dynamic QR code activated on invoice.')
    } catch (err: any) {
      console.error(err)
      alert('Failed to save account details. Please try again.')
    } finally {
      setSavingAccount(false)
    }
  }

  // ── MSMED Act 2006 (Section 15 & 16) Calculation ──
  const issueDateObj = new Date(invoice.issue_date)
  const msmeMaxDateObj = new Date(issueDateObj.getTime() + 45 * 86400000)
  const daysPast45 = Math.max(0, Math.floor((Date.now() - msmeMaxDateObj.getTime()) / 86400000))
  // 3x RBI Bank Rate (RBI Bank Rate is 6.75% -> 3x = 20.25% p.a. compounded monthly)
  const monthsDelayed = daysPast45 / 30.416
  const statutoryInterest = daysPast45 > 0
    ? Math.round(Number(amountDue) * (Math.pow(1 + (0.2025 / 12), monthsDelayed) - 1))
    : 0
  const totalMsmeClaim = Number(amountDue) + statutoryInterest

  // Formal Legal Notice Generator
  const legalNoticeText = `FORMAL DEMAND NOTICE UNDER SECTIONS 15, 16 & 18 OF THE MSMED ACT, 2006

Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

To:
The Managing Director / Finance Dept,
${client?.company_name || client?.name || 'Buyer Enterprise'}
${client?.address || ''} ${[client?.city, client?.state].filter(Boolean).join(', ')}

From:
${senderName || userName}
${msmeUdyamNumber ? `MSME Udyam Reg. No.: ${msmeUdyamNumber}` : ''}
${senderGst ? `GSTIN: ${senderGst}` : ''}
${senderAddress}

SUBJECT: STATUTORY DEMAND NOTICE FOR IMMEDIATE PAYMENT OF OUTSTANDING INVOICE NO. ${invoice.invoice_number} WITH COMPOUND INTEREST UNDER SECTION 16 OF THE MSMED ACT, 2006

Dear Sir / Madam,

1. This is a formal legal demand regarding Tax Invoice No. ${invoice.invoice_number} issued on ${fmtDate(invoice.issue_date)} for an amount of ${fmtINR(Number(amountDue))} for services rendered / goods supplied.

2. In accordance with Section 15 of the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006, the statutory payment period cannot exceed 45 days from the date of acceptance. The statutory credit period expired on ${fmtDate(msmeMaxDateObj.toISOString())}.

3. As on today, the invoice has been delayed by ${daysPast45} day(s) beyond the 45-day statutory cap. Under Section 16 of the MSMED Act, 2006, the buyer is liable to pay compound interest with monthly rests to the supplier on that amount from the appointed day at three times (3x) the bank rate notified by the Reserve Bank of India (currently 20.25% p.a.).

SUMMARY OF STATUTORY CLAIM:
• Principal Invoice Amount: ${fmtINR(Number(amountDue))}
• Days Delayed Beyond 45-Day Statutory Cap: ${daysPast45} days
• Statutory Compound Interest @ 20.25% p.a. (3x RBI Rate): ${fmtINR(statutoryInterest)}
• TOTAL RECOVERABLE AMOUNT UNDER LAW: ${fmtINR(totalMsmeClaim)}

4. You are hereby called upon to remit the total outstanding amount of ${fmtINR(totalMsmeClaim)} within 7 (seven) days of receipt of this notice, failing which we shall be constrained to initiate formal proceedings before the Micro & Small Enterprise Facilitation Council (MSEFC) under Section 18 of the MSMED Act, 2006 (MSME Samadhaan Portal) without any further notice, at your entire risk as to costs and consequences.

Payment Details for Remittance:
• Account Name: ${senderName || userName}
• Bank Name: ${bankName || 'Bank'}
• Account Number: ${bankAccount || '—'}
• IFSC Code: ${bankIfsc || '—'}
• UPI ID: ${effectiveUpi || '—'}

Yours faithfully,
For ${senderName || userName}
Authorized Signatory`

  // ── Compute totals ──
  const subtotal   = invoiceItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discount   = Number(invoice.discount_amount || 0)
  const afterDisc  = subtotal - discount
  const hasCgstSgst = (invoice.cgst_pct || 0) > 0 || (invoice.sgst_pct || 0) > 0
  const hasIgst    = (invoice.igst_pct || 0) > 0
  const cgstAmt    = hasCgstSgst ? afterDisc * (invoice.cgst_pct || 0) / 100 : 0
  const sgstAmt    = hasCgstSgst ? afterDisc * (invoice.sgst_pct || 0) / 100 : 0
  const igstAmt    = hasIgst     ? afterDisc * (invoice.igst_pct || 0) / 100 : 0
  const grandTotal = Number(invoice.total_amount)

  // ── Mark as paid ──
  const handleMarkPaid = async () => {
    setMarking(true)
    setMarkError('')
    try {
      const sb = getSupabase()
      const paidAtISO = new Date(paidDateInput).toISOString()

      await sb.from('invoices').update({
        status: 'paid',
        paid_at: paidAtISO,
        amount_due: 0,
      }).eq('id', invoice.id)

      const { data: newPayment } = await sb.from('payments').insert({
        invoice_id: invoice.id,
        user_id: userId,
        amount: amountDue,
        method: paidMethod,
        paid_at: paidAtISO,
      }).select().single()

      await sb.from('reminders')
        .update({ status: 'skipped' })
        .eq('invoice_id', invoice.id)
        .eq('status', 'scheduled')

      setInvStatus('paid')
      setAmountDue(0)
      setPaidAt(paidAtISO)
      if (newPayment) setPaymentsList(p => [newPayment, ...p])
      setShowPaidModal(false)
    } catch (e) {
      console.error(e)
      setMarkError('Something went wrong. Please try again.')
    } finally {
      setMarking(false)
    }
  }

  // ── Send WhatsApp reminder ──
  const sendReminder = () => {
    if (!client?.whatsapp && !client?.phone) {
      alert('No WhatsApp number for this client. Add one in the Clients section.')
      return
    }
    const phone = (client.whatsapp || client.phone || '').replace(/\D/g, '')
    const days  = daysOverdue(invoice.due_date)
    const msg   = encodeURIComponent(
      `Hi ${client.name},\n\nThis is a gentle reminder that Invoice ${invoice.invoice_number} for ${fmtINR(Number(amountDue))} is ${days > 0 ? `${days} days overdue` : 'due soon'}.\n\nKindly process the payment at your earliest convenience.\n\nThank you.`
    )
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
  }

  // ── Print/PDF ──
  const handlePrint = () => window.print()

  // ── Shareable link ──
  const [linkCopied, setLinkCopied] = useState(false)
  const handleCopyLink = () => {
    const url = `${window.location.origin}/invoice/${invoice.id}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        /* ── LAYOUT ── */
        .id-root{display:flex;min-height:100vh}
        .id-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        /* ── TOPBAR ── */
        .id-top{
          background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);
          padding:0 28px;height:56px;
          display:flex;align-items:center;justify-content:space-between;
          position:sticky;top:0;z-index:40;flex-shrink:0;
        }
        .id-top-left{display:flex;align-items:center;gap:12px}
        .id-back{
          width:30px;height:30px;border-radius:8px;border:.5px solid rgba(26,20,13,.12);
          background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all .15s;flex-shrink:0;
        }
        .id-back:hover{border-color:rgba(26,20,13,.25);background:#F7F5F0}
        .id-top-inv{font-family:'Lora',serif;font-size:17px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .id-badge{font-size:10px;font-weight:600;padding:3px 10px;border-radius:100px;display:flex;align-items:center;gap:5px}
        .id-badge-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}

        .id-top-right{display:flex;align-items:center;gap:8px}
        .id-btn-primary{
          background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;
          padding:8px 16px;font-size:12px;font-weight:600;color:white;
          cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;
          box-shadow:0 2px 8px rgba(27,94,59,.28);transition:all .18s;
        }
        .id-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.36)}
        .id-btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}

        .id-btn-sec{
          background:white;border:.5px solid rgba(26,20,13,.12);border-radius:8px;
          padding:8px 14px;font-size:12px;font-weight:500;color:rgba(26,20,13,.65);
          cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;
          transition:all .15s;
        }
        .id-btn-sec:hover{border-color:rgba(26,20,13,.24);color:#1A140D}

        .id-btn-wa{
          background:#25D366;border:none;border-radius:8px;
          padding:8px 14px;font-size:12px;font-weight:600;color:white;
          cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;
          box-shadow:0 2px 8px rgba(37,211,102,.25);transition:all .18s;
        }
        .id-btn-wa:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(37,211,102,.35)}

        /* ── OVERDUE BANNER ── */
        .id-banner{
          background:linear-gradient(90deg,rgba(192,57,43,.06),rgba(192,57,43,.03));
          border-bottom:1px solid rgba(192,57,43,.15);
          padding:10px 28px;display:flex;align-items:center;gap:10px;flex-shrink:0;
        }
        .id-banner-text{font-size:12px;font-weight:500;color:#791F1F}
        .id-banner-action{
          margin-left:auto;font-size:11px;font-weight:600;color:#C0392B;
          background:rgba(192,57,43,.08);border:.5px solid rgba(192,57,43,.20);
          border-radius:6px;padding:4px 10px;cursor:pointer;font-family:'DM Sans',sans-serif;
          transition:all .15s;
        }
        .id-banner-action:hover{background:rgba(192,57,43,.14)}

        /* ── CONTENT ── */
        .id-content{flex:1;padding:24px 28px;display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}

        /* ── INVOICE CARD ── */
        .id-invoice-card{
          background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);
          border-radius:14px;overflow:hidden;
        }
        .id-invoice-body{padding:28px 32px}

        /* sender + client */
        .id-parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
        .id-party-label{font-size:9px;font-weight:600;color:rgba(26,20,13,.35);text-transform:uppercase;letter-spacing:.09em;margin-bottom:8px}
        .id-party-name{font-family:'Lora',serif;font-size:15px;font-weight:700;color:#1A140D;letter-spacing:-.01em;margin-bottom:4px}
        .id-party-line{font-size:11px;color:rgba(26,20,13,.50);line-height:1.55}

        /* dates row */
        .id-dates{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(26,20,13,.06);border-radius:9px;overflow:hidden;margin-bottom:28px}
        .id-date-cell{background:#FDFAF5;padding:11px 14px}
        .id-date-label{font-size:9px;font-weight:600;color:rgba(26,20,13,.35);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
        .id-date-val{font-size:12px;font-weight:600;color:#1A140D}

        /* line items */
        .id-items-hdr{
          display:grid;grid-template-columns:1fr 70px 70px 90px 90px;
          gap:8px;padding:8px 0;
          border-bottom:1px solid rgba(26,20,13,.08);margin-bottom:0;
        }
        .id-th{font-size:9px;font-weight:600;color:rgba(26,20,13,.35);text-transform:uppercase;letter-spacing:.07em}
        .id-th.r{text-align:right}

        .id-item-row{
          display:grid;grid-template-columns:1fr 70px 70px 90px 90px;
          gap:8px;padding:10px 0;
          border-bottom:.5px solid rgba(26,20,13,.05);align-items:start;
        }
        .id-item-row:last-child{border-bottom:none}
        .id-item-desc{font-size:12px;font-weight:500;color:#1A140D;line-height:1.4}
        .id-item-sub{font-size:10px;color:rgba(26,20,13,.40);margin-top:2px}
        .id-item-num{font-size:12px;color:#1A140D;text-align:right}

        /* totals */
        .id-totals{margin-top:16px;padding-top:16px;border-top:.5px solid rgba(26,20,13,.08)}
        .id-total-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
        .id-total-label{font-size:12px;color:rgba(26,20,13,.55)}
        .id-total-val{font-size:12px;font-weight:500;color:#1A140D}
        .id-total-grand{
          display:flex;justify-content:space-between;align-items:center;
          margin-top:10px;padding:12px 16px;
          background:rgba(27,94,59,.06);border-radius:9px;
          border:.5px solid rgba(27,94,59,.14);
        }
        .id-total-grand-label{font-size:13px;font-weight:600;color:#1A140D}
        .id-total-grand-val{font-family:'Lora',serif;font-size:20px;font-weight:700;color:#1B5E3B;letter-spacing:-.02em}

        /* notes */
        .id-notes{margin-top:20px;padding-top:16px;border-top:.5px solid rgba(26,20,13,.06)}
        .id-notes-label{font-size:9px;font-weight:600;color:rgba(26,20,13,.35);text-transform:uppercase;letter-spacing:.09em;margin-bottom:6px}
        .id-notes-text{font-size:11px;color:rgba(26,20,13,.55);line-height:1.6}

        /* ── RIGHT PANEL ── */
        .id-right{display:flex;flex-direction:column;gap:12px}

        .id-card{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;overflow:hidden}
        .id-card-hdr{padding:12px 16px;border-bottom:.5px solid rgba(26,20,13,.06);display:flex;align-items:center;justify-content:space-between}
        .id-card-title{font-size:12px;font-weight:600;color:#1A140D}
        .id-card-body{padding:14px 16px}

        /* status timeline */
        .id-timeline{display:flex;flex-direction:column;gap:0}
        .id-tl-item{display:flex;align-items:flex-start;gap:10px;position:relative}
        .id-tl-item:not(:last-child)::after{
          content:'';position:absolute;left:10px;top:22px;bottom:-4px;
          width:1px;background:rgba(26,20,13,.10);
        }
        .id-tl-dot{
          width:20px;height:20px;border-radius:50%;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;margin-top:1px;
        }
        .id-tl-dot.done{background:#1B5E3B}
        .id-tl-dot.pending{background:rgba(26,20,13,.08);border:1.5px solid rgba(26,20,13,.15)}
        .id-tl-dot.current{background:#E8692A}
        .id-tl-body{flex:1;padding-bottom:14px}
        .id-tl-label{font-size:12px;font-weight:600;color:#1A140D;line-height:1}
        .id-tl-sub{font-size:10px;color:rgba(26,20,13,.45);margin-top:3px;line-height:1.4}
        .id-tl-date{font-size:9px;color:rgba(26,20,13,.35);margin-top:2px}

        /* amount due pill */
        .id-due-pill{
          background:rgba(27,94,59,.05);border:.5px solid rgba(27,94,59,.15);
          border-radius:9px;padding:12px 14px;text-align:center;margin-bottom:12px;
        }
        .id-due-label{font-size:9px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .id-due-amount{font-family:'Lora',serif;font-size:24px;font-weight:700;color:#1B5E3B;letter-spacing:-.02em}
        .id-due-pill.overdue-pill{background:rgba(192,57,43,.05);border-color:rgba(192,57,43,.18)}
        .id-due-pill.overdue-pill .id-due-amount{color:#C0392B}

        /* payments list */
        .id-pay-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:.5px solid rgba(26,20,13,.05)}
        .id-pay-row:last-child{border-bottom:none}
        .id-pay-icon{width:28px;height:28px;border-radius:7px;background:rgba(27,94,59,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px}
        .id-pay-method{font-size:11px;font-weight:600;color:#1A140D}
        .id-pay-date{font-size:9px;color:rgba(26,20,13,.40);margin-top:2px}
        .id-pay-amount{font-size:12px;font-weight:700;color:#1B5E3B;margin-left:auto}

        /* reminder history */
        .id-rem-row{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:.5px solid rgba(26,20,13,.05)}
        .id-rem-row:last-child{border-bottom:none}
        .id-rem-icon{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:1px}
        .id-rem-sent{background:#E1F5EE}
        .id-rem-sched{background:#E6F1FB}
        .id-rem-skip{background:#F1EFE8}
        .id-rem-label{font-size:11px;font-weight:500;color:#1A140D;line-height:1}
        .id-rem-sub{font-size:9px;color:rgba(26,20,13,.45);margin-top:3px;line-height:1.4}

        /* empty states */
        .id-empty{text-align:center;padding:20px 10px}
        .id-empty-sub{font-size:11px;color:rgba(26,20,13,.40);line-height:1.5}

        /* ── MARK PAID MODAL ── */
        .id-modal-overlay{
          position:fixed;inset:0;background:rgba(26,20,13,.45);
          display:flex;align-items:center;justify-content:center;
          z-index:100;backdrop-filter:blur(2px);
        }
        .id-modal{
          background:white;border-radius:16px;padding:28px;
          width:380px;max-width:calc(100vw - 32px);
          box-shadow:0 24px 64px rgba(26,20,13,.22);
        }
        .id-modal-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em;margin-bottom:4px}
        .id-modal-sub{font-size:12px;color:rgba(26,20,13,.50);margin-bottom:20px}
        .id-modal-label{font-size:11px;font-weight:600;color:rgba(26,20,13,.55);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
        .id-method-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px}
        .id-method-btn{
          padding:10px;border-radius:9px;border:1.5px solid rgba(26,20,13,.10);
          background:white;font-size:12px;font-weight:500;color:rgba(26,20,13,.65);
          cursor:pointer;font-family:'DM Sans',sans-serif;text-align:left;
          transition:all .15s;display:flex;align-items:center;gap:7px;
        }
        .id-method-btn:hover{border-color:rgba(27,94,59,.35);color:#1A140D}
        .id-method-btn.sel{border-color:#1B5E3B;background:rgba(27,94,59,.06);color:#1B5E3B;font-weight:600}
        .id-date-input{
          width:100%;border:1.5px solid rgba(26,20,13,.12);border-radius:9px;
          padding:9px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;
          outline:none;transition:border-color .18s;margin-bottom:16px;
        }
        .id-date-input:focus{border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.09)}
        .id-modal-actions{display:flex;gap:8px}
        .id-modal-cancel{
          flex:1;padding:10px;border-radius:9px;border:.5px solid rgba(26,20,13,.12);
          background:white;font-size:13px;font-weight:500;color:rgba(26,20,13,.60);
          cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;
        }
        .id-modal-cancel:hover{background:#F7F5F0}
        .id-modal-confirm{
          flex:2;padding:10px;border-radius:9px;border:none;
          background:linear-gradient(135deg,#1B5E3B,#0D3B22);
          font-size:13px;font-weight:600;color:white;cursor:pointer;
          font-family:'DM Sans',sans-serif;transition:all .18s;
          box-shadow:0 2px 8px rgba(27,94,59,.28);
        }
        .id-modal-confirm:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.36)}
        .id-modal-confirm:disabled{opacity:.65;cursor:not-allowed;transform:none}
        .id-modal-err{font-size:11px;color:#C0392B;margin-bottom:10px}

        /* ── PRINT ── */
        .pdf-print-area { display: none; }

        @media print {
          /* hide everything except the PDF template */
          .id-root { display: none!important; }
          .id-modal-overlay { display: none!important; }

          .pdf-print-area {
            display: block!important;
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: white; z-index: 99999;
            font-family: 'DM Sans', Arial, sans-serif;
            color: #1A140D; font-size: 11px; line-height: 1.5;
            padding: 24px 32px;
          }

          body { background: white!important; margin: 0; padding: 0; }

          .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #1B5E3B; }
          .pdf-brand-name { font-family: 'Lora', serif; font-size: 22px; font-weight: 700; color: #1B5E3B; }
          .pdf-brand-sub { font-size: 9px; color: #666; margin-top: 2px; }
          .pdf-title { font-family: 'Lora', serif; font-size: 18px; font-weight: 700; color: #1A140D; text-align: right; }
          .pdf-inv-num { font-size: 10px; color: #888; text-align: right; margin-top: 2px; }

          .pdf-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
          .pdf-party-label { font-size: 8px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; }
          .pdf-party-name { font-size: 13px; font-weight: 700; color: #1A140D; }
          .pdf-party-line { font-size: 10px; color: #555; margin-top: 1px; }

          .pdf-dates { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; padding: 8px 12px; background: #F9F9F7; border-radius: 6px; }
          .pdf-date-label { font-size: 8px; font-weight: 700; color: #999; text-transform: uppercase; }
          .pdf-date-val { font-size: 11px; font-weight: 600; color: #1A140D; margin-top: 2px; }

          .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .pdf-table th { background: #F3F3F0; font-size: 8px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: .08em; padding: 8px 10px; text-align: left; border-bottom: 1px solid #E5E5E2; }
          .pdf-table th.r { text-align: right; }
          .pdf-table td { padding: 8px 10px; border-bottom: 1px solid #F0F0EE; font-size: 10px; color: #333; }
          .pdf-table td.r { text-align: right; }
          .pdf-table td.bold { font-weight: 700; }

          .pdf-totals { display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 12px; }
          .pdf-total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 3px 0; font-size: 10px; color: #555; width: 280px; }
          .pdf-total-row .label { text-align: left; }
          .pdf-total-row .value { text-align: right; font-weight: 600; min-width: 90px; }
          .pdf-total-grand { display: flex; justify-content: flex-end; gap: 40px; padding: 8px 12px; font-size: 13px; font-weight: 700; color: #1B5E3B; background: rgba(27,94,59,.06); border-radius: 6px; border: 1px solid rgba(27,94,59,.15); width: 280px; margin-top: 4px; }
          .pdf-total-grand .label { text-align: left; }
          .pdf-total-grand .value { text-align: right; min-width: 90px; }

          .pdf-words { font-size: 10px; color: #444; font-style: italic; padding: 6px 10px; background: #FAFAF8; border-radius: 4px; border-left: 3px solid #1B5E3B; margin-bottom: 14px; }

          .pdf-notes { margin-bottom: 10px; }
          .pdf-notes-label { font-size: 8px; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; }
          .pdf-notes-text { font-size: 10px; color: #555; }

          .pdf-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid #E5E5E2; display: flex; justify-content: space-between; align-items: flex-end; }
          .pdf-footer-left { font-size: 8px; color: #AAA; }
          .pdf-footer-right { text-align: right; }
          .pdf-footer-sign-line { width: 140px; border-top: 1px solid #CCC; margin-bottom: 4px; margin-left: auto; }
          .pdf-footer-sign-label { font-size: 8px; color: #999; text-align: center; }

          .pdf-status-badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; }
        }

        @media(max-width:900px){
          .id-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .id-top{padding:12px 16px; height:auto; flex-wrap:wrap; gap:10px}
          .id-top-right{width:100%; flex-wrap:wrap; gap:6px}
          .id-content{grid-template-columns:1fr; padding:16px}
          .id-parties{grid-template-columns:1fr}
          .id-dates{grid-template-columns:1fr 1fr}
          .id-items-table{overflow-x:auto}
          .id-items-table table{min-width:480px}
          .id-modal{width:100%; max-width:calc(100vw - 24px); padding:20px}
        }
        @media(max-width:540px){
          .id-dates{grid-template-columns:1fr}
          .id-top-right button, .id-top-right a{flex:1; text-align:center; justify-content:center}
        }
      `}</style>

      <div className="id-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="id-main">

          {/* Topbar */}
          <div className="id-top">
            <div className="id-top-left">
              <button className="id-back" onClick={() => router.push('/dashboard/invoices')} title="Back to invoices">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.65)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
              <div className="id-top-inv">{invoice.invoice_number}</div>
              <div className="id-badge" style={{ background: cfg.bg, color: cfg.color }}>
                <div className="id-badge-dot" style={{ background: cfg.dot }} />
                {cfg.label}
              </div>
            </div>

            <div className="id-top-right">
              <button className="id-btn-sec" onClick={handlePrint}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>
                </svg>
                Download PDF
              </button>
              <button className="id-btn-sec" onClick={handleCopyLink} title="Copy client-facing invoice link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
                {linkCopied ? '✓ Copied!' : 'Share Link'}
              </button>
              {invoice.invoice_number.startsWith('PI-') && (
                <button
                  className="id-btn-sec"
                  style={{ border: '1px solid #1B5E3B', color: '#1B5E3B', background: 'rgba(27,94,59,.06)', fontWeight: 700 }}
                  onClick={async () => {
                    if (!confirm('Convert this Proforma Invoice to an Official GST Tax Invoice? This will generate a formal Tax Invoice sequence.')) return
                    setConvertingPi(true)
                    try {
                      const sb = getSupabase()
                      const newNumber = invoice.invoice_number.replace(/^PI-/, 'INV-')
                      await sb.from('invoices').update({
                        invoice_number: newNumber,
                        notes: (invoice.notes || '').replace(/PROFORMA INVOICE:.*?\n/g, ''),
                      }).eq('id', invoice.id)
                      alert(`Successfully converted to GST Tax Invoice ${newNumber}!`)
                      window.location.reload()
                    } catch (e) {
                      console.error(e)
                      alert('Failed to convert. Please try again.')
                    } finally {
                      setConvertingPi(false)
                    }
                  }}
                  disabled={convertingPi}
                >
                  ⚡ Convert to Tax Invoice
                </button>
              )}
              <button
                className="id-btn-sec"
                onClick={() => router.push(`/dashboard/invoices/new?type=credit_note&ref=${invoice.invoice_number}&clientId=${client?.id || ''}`)}
                title="Issue GST Credit Note under Section 34"
              >
                📄 Issue Credit Note
              </button>
              {!isPaid && (
                <button className="id-btn-wa" onClick={sendReminder}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                  </svg>
                  Send Reminder
                </button>
              )}
              {!isPaid && (
                <button className="id-btn-primary" onClick={() => setShowPaidModal(true)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Mark as Paid
                </button>
              )}
            </div>
          </div>

          {/* Proforma Banner */}
          {invoice.invoice_number.startsWith('PI-') && (
            <div className="id-banner" style={{ background: '#E6F1FB', borderColor: '#B3D4F0', color: '#0C447C' }}>
              <span>📑</span>
              <span className="id-banner-text" style={{ color: '#0C447C' }}>
                <strong>Proforma Invoice (Advance Estimate)</strong>: Zero GST output liability until advance payment is settled.
              </span>
            </div>
          )}

          {/* Overdue banner */}
          {isOverdue && overdueDays > 0 && (
            <div className="id-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <span className="id-banner-text">
                This invoice is <strong>{overdueDays} days overdue</strong>. Due date was {fmtDate(invoice.due_date)}.
              </span>
              <button className="id-banner-action" onClick={sendReminder}>Send WhatsApp →</button>
            </div>
          )}

          {/* Content grid */}
          <div className="id-content">

            {/* ── LEFT: Invoice Document ── */}
            <div className="id-invoice-card">
              <div className="id-invoice-body">

                {/* Sender + Client */}
                <div className="id-parties">
                  <div>
                    <div className="id-party-label">From</div>
                    <div className="id-party-name">{senderName || 'Your Business'}</div>
                    {senderGst && <div className="id-party-line">GST: {senderGst}</div>}
                    {senderAddress && <div className="id-party-line" style={{ maxWidth: 200 }}>{senderAddress}</div>}
                  </div>
                  <div>
                    <div className="id-party-label">To</div>
                    <div className="id-party-name">{client?.name || 'Unknown Client'}</div>
                    {client?.company_name && <div className="id-party-line">{client.company_name}</div>}
                    {client?.gst_number && <div className="id-party-line">GST: {client.gst_number}</div>}
                    {client?.email && <div className="id-party-line">{client.email}</div>}
                    {(client?.city || client?.state) && (
                      <div className="id-party-line">{[client.city, client.state].filter(Boolean).join(', ')}</div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="id-dates">
                  <div className="id-date-cell">
                    <div className="id-date-label">Issue Date</div>
                    <div className="id-date-val">{fmtDate(invoice.issue_date)}</div>
                  </div>
                  <div className="id-date-cell">
                    <div className="id-date-label">Due Date</div>
                    <div className="id-date-val" style={{ color: isOverdue ? '#C0392B' : undefined }}>{fmtDate(invoice.due_date)}</div>
                  </div>
                  <div className="id-date-cell">
                    <div className="id-date-label">Payment Terms</div>
                    <div className="id-date-val">{invoice.payment_terms || 'Net 30'}</div>
                  </div>
                </div>

                {/* Line items */}
                <div className="id-items-hdr">
                  <div className="id-th">Description</div>
                  <div className="id-th r">Qty</div>
                  <div className="id-th r">Unit</div>
                  <div className="id-th r">Rate</div>
                  <div className="id-th r">Amount</div>
                </div>

                {invoiceItems.map(item => (
                  <div key={item.id} className="id-item-row">
                    <div>
                      <div className="id-item-desc">{item.description || '—'}</div>
                    </div>
                    <div className="id-item-num">{item.quantity}</div>
                    <div className="id-item-num">{item.unit}</div>
                    <div className="id-item-num">{fmtINR(item.unit_price)}</div>
                    <div className="id-item-num" style={{ fontWeight: 600 }}>{fmtINR(item.quantity * item.unit_price)}</div>
                  </div>
                ))}

                {/* Totals */}
                <div className="id-totals">
                  <div className="id-total-row">
                    <span className="id-total-label">Subtotal</span>
                    <span className="id-total-val">{fmtINR(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="id-total-row">
                      <span className="id-total-label">Discount</span>
                      <span className="id-total-val" style={{ color: '#1B5E3B' }}>−{fmtINR(discount)}</span>
                    </div>
                  )}
                  {hasCgstSgst && (
                    <>
                      <div className="id-total-row">
                        <span className="id-total-label">CGST ({invoice.cgst_pct}%)</span>
                        <span className="id-total-val">{fmtINR(cgstAmt)}</span>
                      </div>
                      <div className="id-total-row">
                        <span className="id-total-label">SGST ({invoice.sgst_pct}%)</span>
                        <span className="id-total-val">{fmtINR(sgstAmt)}</span>
                      </div>
                    </>
                  )}
                  {hasIgst && (
                    <div className="id-total-row">
                      <span className="id-total-label">IGST ({invoice.igst_pct}%)</span>
                      <span className="id-total-val">{fmtINR(igstAmt)}</span>
                    </div>
                  )}
                  <div className="id-total-grand">
                    <span className="id-total-grand-label">Grand Total</span>
                    <span className="id-total-grand-val">{fmtINR(grandTotal)}</span>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="id-notes">
                    <div className="id-notes-label">Notes</div>
                    <div className="id-notes-text">{invoice.notes}</div>
                  </div>
                )}

                {/* Late fee terms */}
                {invoice.late_fee_terms && (
                  <div className="id-notes" style={{ marginTop: 12 }}>
                    <div className="id-notes-label">Late Fee Terms</div>
                    <div className="id-notes-text">{invoice.late_fee_terms}</div>
                  </div>
                )}

              </div>
            </div>

            {/* ── RIGHT: Status & Activity ── */}
            <div className="id-right">

              {/* Amount due pill */}
              <div className={`id-due-pill${isOverdue ? ' overdue-pill' : ''}`}>
                <div className="id-due-label">{isPaid ? 'Total Paid' : 'Amount Due'}</div>
                <div className="id-due-amount">
                  {isPaid ? fmtINR(invoice.total_amount) : fmtINR(Number(amountDue))}
                </div>
                {isPaid && paidAt && (
                  <div style={{ fontSize: 10, color: '#1B5E3B', fontWeight: 500, marginTop: 4 }}>
                    Paid on {fmtDate(paidAt)}
                  </div>
                )}
                {isOverdue && overdueDays > 0 && (
                  <div style={{ fontSize: 10, color: '#C0392B', fontWeight: 500, marginTop: 4 }}>
                    {overdueDays} days overdue
                  </div>
                )}
              </div>

              {/* Dynamic NPCI UPI QR Code Card */}
              {!isPaid && (
                <div className="id-card" style={{ border: '1px solid rgba(27,94,59,.2)', background: 'linear-gradient(135deg, rgba(27,94,59,.04), rgba(27,94,59,.01))' }}>
                  <div className="id-card-hdr" style={{ borderBottom: '1px solid rgba(27,94,59,.1)' }}>
                    <span className="id-card-title" style={{ color: '#1B5E3B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📱</span> Instant Scan & Pay (UPI)
                    </span>
                  </div>
                  <div className="id-card-body" style={{ textAlign: 'center' }}>
                    {qrCodeUrl ? (
                      <div>
                        <div style={{ background: 'white', padding: 8, borderRadius: 10, display: 'inline-block', border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                          <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: 140, height: 140, display: 'block' }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1A140D', marginTop: 8 }}>
                          Scan with GPay / PhonePe / Paytm
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(26,20,13,.5)', marginTop: 2 }}>
                          UPI VPA: <strong>{effectiveUpi}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button
                            style={{ flex: 1, padding: '6px 10px', fontSize: 10, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(26,20,13,.15)', background: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                            onClick={() => {
                              navigator.clipboard.writeText(effectiveUpi)
                              alert('UPI ID copied to clipboard!')
                            }}
                          >
                            Copy UPI ID
                          </button>
                          {upiUri && (
                            <a
                              href={upiUri}
                              style={{ flex: 1, padding: '6px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', background: '#1B5E3B', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}
                            >
                              ⚡ Pay on App
                            </a>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                          <button
                            style={{ background: 'none', border: 'none', color: '#1B5E3B', fontSize: 10, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setShowAccountModal(true)}
                          >
                            ⚙️ Edit UPI / Bank Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px 0', fontSize: 11, color: 'rgba(26,20,13,.5)' }}>
                        <div>Set your UPI ID & Bank details to generate dynamic scan-and-pay QR codes.</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: '#1B5E3B', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                            onClick={() => setShowAccountModal(true)}
                          >
                            + Add Account Details
                          </button>
                          <button
                            style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#1B5E3B', background: 'none', border: '1px solid rgba(27,94,59,.2)', borderRadius: 6, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                            onClick={() => router.push('/dashboard/settings?tab=payments')}
                          >
                            Open Settings →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MSMED Act 2006 Statutory Interest & Demand Notice Card */}
              <div className="id-card" style={{ border: daysPast45 > 0 ? '1px solid rgba(192,57,43,.25)' : '1px solid rgba(26,20,13,.08)' }}>
                <div className="id-card-hdr" style={{ background: daysPast45 > 0 ? 'rgba(192,57,43,.04)' : undefined }}>
                  <span className="id-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: daysPast45 > 0 ? '#C0392B' : '#1A140D' }}>
                    <span>🛡️</span> MSMED Act (Section 15 & 16)
                  </span>
                </div>
                <div className="id-card-body">
                  <div style={{ fontSize: 11, color: 'rgba(26,20,13,.6)', lineHeight: 1.4 }}>
                    {daysPast45 > 0 ? (
                      <div>
                        <div style={{ color: '#C0392B', fontWeight: 700, marginBottom: 4 }}>
                          ⚠️ 45-Day Statutory Cap Breached ({daysPast45} days overdue)
                        </div>
                        <div>Legally accrues compound interest @ <strong>20.25% p.a. (3x RBI Bank Rate)</strong> under Section 16.</div>
                        <div style={{ background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.15)', borderRadius: 8, padding: 10, marginTop: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#791F1F' }}>
                            <span>Statutory Interest:</span>
                            <strong>+{fmtINR(statutoryInterest)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#C0392B', marginTop: 4, paddingTop: 4, borderTop: '1px dashed rgba(192,57,43,.2)' }}>
                            <span>Total Legal Claim:</span>
                            <span>{fmtINR(totalMsmeClaim)}</span>
                          </div>
                        </div>
                        <button
                          style={{ width: '100%', marginTop: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid #C0392B', background: '#C0392B', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(192,57,43,.2)' }}
                          onClick={() => setShowMsmeModal(true)}
                        >
                          📜 Generate MSME Legal Notice
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div>Statutory 45-day protection active. Due by <strong>{fmtDate(msmeMaxDateObj.toISOString())}</strong>.</div>
                        <button
                          style={{ marginTop: 8, fontSize: 10, fontWeight: 600, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setShowMsmeModal(true)}
                        >
                          Preview MSMED Legal Demand Draft →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="id-card">
                <div className="id-card-hdr">
                  <span className="id-card-title">Status Timeline</span>
                </div>
                <div className="id-card-body">
                  <div className="id-timeline">
                    {[
                      {
                        label: 'Invoice Created',
                        sub: `Invoice ${invoice.invoice_number} created`,
                        date: fmtDate(invoice.issue_date),
                        done: true,
                        current: false,
                      },
                      {
                        label: 'Invoice Sent',
                        sub: 'Sent to client',
                        date: invoice.sent_at ? fmtDateTime(invoice.sent_at) : undefined,
                        done: !!invoice.sent_at || ['sent','overdue','partially_paid','paid'].includes(invStatus),
                        current: invStatus === 'sent',
                      },
                      {
                        label: 'Reminders Sent',
                        sub: reminderList.filter(r => r.status === 'sent').length > 0
                          ? `${reminderList.filter(r => r.status === 'sent').length} reminder(s) sent`
                          : 'No reminders sent yet',
                        date: reminderList.filter(r => r.status === 'sent').at(-1)?.sent_at
                          ? fmtDateTime(reminderList.filter(r => r.status === 'sent').at(-1)!.sent_at)
                          : undefined,
                        done: reminderList.some(r => r.status === 'sent'),
                        current: invStatus === 'overdue' && !isPaid,
                      },
                      {
                        label: 'Payment Received',
                        sub: isPaid ? 'Invoice fully settled' : 'Awaiting payment',
                        date: paidAt ? fmtDate(paidAt) : undefined,
                        done: isPaid,
                        current: false,
                      },
                    ].map((step, i) => (
                      <div key={i} className="id-tl-item">
                        <div className={`id-tl-dot ${step.done ? 'done' : step.current ? 'current' : 'pending'}`}>
                          {step.done ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          ) : step.current ? (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                          ) : null}
                        </div>
                        <div className="id-tl-body">
                          <div className="id-tl-label" style={{ color: step.done ? '#1A140D' : step.current ? '#E8692A' : 'rgba(26,20,13,.40)' }}>
                            {step.label}
                          </div>
                          <div className="id-tl-sub">{step.sub}</div>
                          {step.date && <div className="id-tl-date">{step.date}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {paymentsList.length > 0 && (
                <div className="id-card">
                  <div className="id-card-hdr">
                    <span className="id-card-title">Payment History</span>
                  </div>
                  <div className="id-card-body">
                    {paymentsList.map(p => (
                      <div key={p.id} className="id-pay-row">
                        <div className="id-pay-icon">💳</div>
                        <div>
                          <div className="id-pay-method">{METHOD_LABELS[p.method] || p.method}</div>
                          <div className="id-pay-date">{fmtDate(p.paid_at)}</div>
                        </div>
                        <div className="id-pay-amount">{fmtINR(Number(p.amount))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminder History */}
              <div className="id-card">
                <div className="id-card-hdr">
                  <span className="id-card-title">Reminder History</span>
                  {!isPaid && (
                    <button
                      style={{ fontSize: 10, fontWeight: 600, color: '#25D366', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      onClick={sendReminder}
                    >
                      + Send now
                    </button>
                  )}
                </div>
                <div className="id-card-body">
                  {reminderList.length === 0 ? (
                    <div className="id-empty">
                      <div className="id-empty-sub">No reminders sent yet</div>
                    </div>
                  ) : (
                    reminderList.map(r => {
                      const isSent   = r.status === 'sent'
                      const isSched  = r.status === 'scheduled'
                      return (
                        <div key={r.id} className="id-rem-row">
                          <div className={`id-rem-icon ${isSent ? 'id-rem-sent' : isSched ? 'id-rem-sched' : 'id-rem-skip'}`}>
                            {isSent ? '✓' : isSched ? '⏰' : '—'}
                          </div>
                          <div>
                            <div className="id-rem-label">
                              {isSent ? 'Reminder sent' : isSched ? 'Reminder scheduled' : 'Reminder skipped'}
                              {r.days_overdue ? ` · Day ${r.days_overdue}` : ''}
                            </div>
                            <div className="id-rem-sub">
                              {r.channel === 'whatsapp' ? 'WhatsApp' : r.channel}
                              {isSent && r.sent_at ? ` · ${fmtDateTime(r.sent_at)}` : ''}
                              {isSched && r.scheduled_at ? ` · ${fmtDate(r.scheduled_at)}` : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── HIDDEN PDF PRINT TEMPLATE ── */}
      <div className="pdf-print-area">
        {/* Header */}
        <div className="pdf-header">
          <div>
            <div className="pdf-brand-name">{senderName || 'Settlr'}</div>
            <div className="pdf-brand-sub">
              {senderGst && <>GSTIN: {senderGst} · </>}
              {senderAddress || 'India'}
            </div>
          </div>
          <div>
            <div className="pdf-title">TAX INVOICE</div>
            <div className="pdf-inv-num">{invoice.invoice_number}</div>
            <div className="pdf-status-badge" style={{ background: cfg.bg, color: cfg.color, marginTop: 4 }}>
              {cfg.label}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="pdf-parties">
          <div>
            <div className="pdf-party-label">Bill From</div>
            <div className="pdf-party-name">{senderName || 'Your Business'}</div>
            {senderGst && <div className="pdf-party-line">GSTIN: {senderGst}</div>}
            {senderAddress && <div className="pdf-party-line">{senderAddress}</div>}
          </div>
          <div>
            <div className="pdf-party-label">Bill To</div>
            <div className="pdf-party-name">{client?.name || 'Client'}</div>
            {client?.company_name && <div className="pdf-party-line">{client.company_name}</div>}
            {client?.gst_number && <div className="pdf-party-line">GSTIN: {client.gst_number}</div>}
            {client?.email && <div className="pdf-party-line">{client.email}</div>}
            {(client?.city || client?.state) && (
              <div className="pdf-party-line">{[client?.address, client?.city, client?.state].filter(Boolean).join(', ')}</div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="pdf-dates">
          <div>
            <div className="pdf-date-label">Issue Date</div>
            <div className="pdf-date-val">{fmtDate(invoice.issue_date)}</div>
          </div>
          <div>
            <div className="pdf-date-label">Due Date</div>
            <div className="pdf-date-val">{fmtDate(invoice.due_date)}</div>
          </div>
          <div>
            <div className="pdf-date-label">Payment Terms</div>
            <div className="pdf-date-val">{invoice.payment_terms || 'Net 30'}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="pdf-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '45%' }}>Description</th>
              <th className="r">Qty</th>
              <th className="r">Unit</th>
              <th className="r">Rate (₹)</th>
              <th className="r">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td>{item.description || '—'}</td>
                <td className="r">{item.quantity}</td>
                <td className="r">{item.unit}</td>
                <td className="r">{fmtINR(item.unit_price)}</td>
                <td className="r bold">{fmtINR(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="pdf-totals">
          <div className="pdf-total-row">
            <span className="label">Subtotal</span>
            <span className="value">{fmtINR(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="pdf-total-row">
              <span className="label">Discount</span>
              <span className="value" style={{ color: '#1B5E3B' }}>−{fmtINR(discount)}</span>
            </div>
          )}
          {hasCgstSgst && (
            <>
              <div className="pdf-total-row">
                <span className="label">CGST ({invoice.cgst_pct}%)</span>
                <span className="value">{fmtINR(cgstAmt)}</span>
              </div>
              <div className="pdf-total-row">
                <span className="label">SGST ({invoice.sgst_pct}%)</span>
                <span className="value">{fmtINR(sgstAmt)}</span>
              </div>
            </>
          )}
          {hasIgst && (
            <div className="pdf-total-row">
              <span className="label">IGST ({invoice.igst_pct}%)</span>
              <span className="value">{fmtINR(igstAmt)}</span>
            </div>
          )}
          <div className="pdf-total-grand">
            <span className="label">Grand Total</span>
            <span className="value">{fmtINR(grandTotal)}</span>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="pdf-words">
          <strong>Amount in Words:</strong> {amountInWords(grandTotal)}
        </div>

        {/* Notes & Terms */}
        {invoice.notes && (
          <div className="pdf-notes">
            <div className="pdf-notes-label">Notes</div>
            <div className="pdf-notes-text">{invoice.notes}</div>
          </div>
        )}
        {invoice.late_fee_terms && (
          <div className="pdf-notes">
            <div className="pdf-notes-label">Late Fee Terms</div>
            <div className="pdf-notes-text">{invoice.late_fee_terms}</div>
          </div>
        )}
        {/* Bank & UPI QR Code Remittance Section for PDF */}
        {(qrCodeUrl || bankAccount || effectiveUpi) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAF8', border: '1px solid #EAEAEA', borderRadius: 8, padding: '12px 16px', margin: '14px 0' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#1B5E3B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                Bank & UPI Payment Details
              </div>
              {effectiveUpi && <div style={{ fontSize: 10, color: '#333' }}>UPI VPA: <strong>{effectiveUpi}</strong></div>}
              {bankName && <div style={{ fontSize: 10, color: '#333' }}>Bank: <strong>{bankName}</strong></div>}
              {bankAccount && <div style={{ fontSize: 10, color: '#333' }}>Account No: <strong>{bankAccount}</strong> · IFSC: <strong>{bankIfsc}</strong></div>}
              {msmeUdyamNumber && <div style={{ fontSize: 9, color: '#666', marginTop: 3 }}>MSME URN: {msmeUdyamNumber} (Protected under Section 15 of MSMED Act 2006)</div>}
            </div>
            {qrCodeUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={qrCodeUrl} alt="UPI QR" style={{ width: 68, height: 68, display: 'block', margin: '0 auto', border: '1px solid #DDD', borderRadius: 4 }} />
                <div style={{ fontSize: 7, color: '#777', marginTop: 2, fontWeight: 600 }}>Scan & Pay via UPI</div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pdf-footer">
          <div className="pdf-footer-left">
            <div>Computer Generated Invoice · Settlr Financial OS</div>
            <div>Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="pdf-footer-right">
            <div className="pdf-footer-sign-line" />
            <div className="pdf-footer-sign-label">Authorised Signatory</div>
          </div>
        </div>
      </div>

      {/* ── MSMED 45-Day Statutory Legal Demand Notice Modal ── */}
      {showMsmeModal && (
        <div className="id-modal-overlay" onClick={() => setShowMsmeModal(false)}>
          <div className="id-modal" style={{ width: 640, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div className="id-modal-title" style={{ color: '#C0392B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📜</span> MSMED Statutory Demand Notice
                </div>
                <div className="id-modal-sub">
                  Formal pre-filing legal notice under Sections 15, 16 & 18 of the MSMED Act, 2006
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(192,57,43,.1)', color: '#C0392B' }}>
                3x RBI Rate: 20.25% p.a.
              </span>
            </div>

            <div style={{ background: '#F8F7F4', border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, padding: 14, fontFamily: 'monospace', fontSize: 11, color: '#1A140D', whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', lineHeight: 1.45 }}>
              {legalNoticeText}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                className="id-modal-cancel"
                onClick={() => setShowMsmeModal(false)}
              >
                Close
              </button>
              <button
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #1B5E3B', background: 'white', color: '#1B5E3B', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                onClick={() => {
                  const blob = new Blob([legalNoticeText], { type: 'text/plain;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `MSME-Notice-${invoice.invoice_number}.txt`
                  a.click()
                }}
              >
                💾 Download Notice (.txt)
              </button>
              <button
                style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#C0392B,#962D22)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 14px rgba(192,57,43,.3)' }}
                onClick={() => {
                  navigator.clipboard.writeText(legalNoticeText)
                  setCopiedNotice(true)
                  setTimeout(() => setCopiedNotice(false), 2500)
                }}
              >
                {copiedNotice ? '✓ Copied to Clipboard!' : '📋 Copy Legal Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark as Paid Modal ── */}
      {showPaidModal && (
        <div className="id-modal-overlay" onClick={() => setShowPaidModal(false)}>
          <div className="id-modal" onClick={e => e.stopPropagation()}>
            <div className="id-modal-title">Mark as Paid</div>
            <div className="id-modal-sub">
              Recording payment of <strong>{fmtINR(Number(amountDue))}</strong> for {invoice.invoice_number}
            </div>

            <div className="id-modal-label">Payment Method</div>
            <div className="id-method-grid">
              {([
                { v: 'upi',           label: 'UPI',           icon: '📱' },
                { v: 'bank_transfer', label: 'Bank Transfer',  icon: '🏦' },
                { v: 'cash',          label: 'Cash',           icon: '💵' },
                { v: 'cheque',        label: 'Cheque',         icon: '📄' },
              ] as const).map(m => (
                <button
                  key={m.v}
                  className={`id-method-btn${paidMethod === m.v ? ' sel' : ''}`}
                  onClick={() => setPaidMethod(m.v)}
                >
                  <span>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>

            <div className="id-modal-label">Payment Date</div>
            <input
              type="date"
              className="id-date-input"
              value={paidDateInput}
              onChange={e => setPaidDateInput(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />

            {/* TDS Deduction at Source Section */}
            <div style={{ marginTop: 14, background: 'rgba(26,20,13,.03)', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#1A140D', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasTdsDeduction}
                  onChange={e => setHasTdsDeduction(e.target.checked)}
                />
                <span>Client deducted TDS at Source (Income Tax)?</span>
              </label>

              {hasTdsDeduction && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(26,20,13,.12)' }}>
                  <div className="id-modal-label" style={{ marginTop: 0 }}>TDS Section & Rate</div>
                  <select
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,20,13,.15)', background: 'white', fontSize: 12, fontFamily: 'inherit', color: '#1A140D' }}
                    value={tdsSection}
                    onChange={e => setTdsSection(e.target.value as any)}
                  >
                    <option value="194J_10">Section 194J — 10% (Technical / Professional Services)</option>
                    <option value="194J_2">Section 194J — 2% (Call Center / Software)</option>
                    <option value="194C_1">Section 194C — 1% (Contractor / Works)</option>
                  </select>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#633806', marginTop: 8, background: '#FAEEDA', padding: '6px 10px', borderRadius: 6 }}>
                    <span>TDS Withheld (Claimable in ITR):</span>
                    <strong>{fmtINR(Math.round(Number(amountDue) * (tdsSection === '194J_10' ? 0.10 : tdsSection === '194J_2' ? 0.02 : 0.01)))}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#085041', marginTop: 4, background: '#E1F5EE', padding: '6px 10px', borderRadius: 6 }}>
                    <span>Net Bank Deposit:</span>
                    <strong>{fmtINR(Number(amountDue) - Math.round(Number(amountDue) * (tdsSection === '194J_10' ? 0.10 : tdsSection === '194J_2' ? 0.02 : 0.01)))}</strong>
                  </div>
                </div>
              )}
            </div>

            {markError && <div className="id-modal-err">{markError}</div>}

            <div className="id-modal-actions">
              <button className="id-modal-cancel" onClick={() => setShowPaidModal(false)}>Cancel</button>
              <button className="id-modal-confirm" onClick={handleMarkPaid} disabled={marking}>
                {marking ? 'Saving...' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Account & UPI Details Modal ── */}
      {showAccountModal && (
        <div className="id-modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="id-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="id-modal-title">💳 Bank & UPI Account Details</div>
            <div className="id-modal-sub">
              Configure your settlement accounts. Dynamic scan-to-pay QR code on this invoice will be updated immediately.
            </div>

            <form onSubmit={handleSaveAccountDetails}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                <div>
                  <div className="id-modal-label" style={{ marginTop: 0 }}>Primary UPI VPA ID</div>
                  <input
                    type="text"
                    className="id-date-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                    value={currentUpi}
                    onChange={e => setCurrentUpi(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 10, color: 'rgba(26,20,13,.4)', marginTop: 3 }}>
                    Used for dynamic Google Pay, PhonePe & Paytm QR code on invoices.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div className="id-modal-label" style={{ marginTop: 0 }}>Bank Name</div>
                    <input
                      type="text"
                      className="id-date-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      placeholder="HDFC / SBI / ICICI"
                      value={currentBankName}
                      onChange={e => setCurrentBankName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="id-modal-label" style={{ marginTop: 0 }}>IFSC Code</div>
                    <input
                      type="text"
                      className="id-date-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      placeholder="HDFC0001234"
                      value={currentBankIfsc}
                      onChange={e => setCurrentBankIfsc(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div>
                  <div className="id-modal-label" style={{ marginTop: 0 }}>Bank Account Number</div>
                  <input
                    type="text"
                    className="id-date-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="50100234567890"
                    value={currentBankAccount}
                    onChange={e => setCurrentBankAccount(e.target.value)}
                  />
                </div>

                <div>
                  <div className="id-modal-label" style={{ marginTop: 0 }}>MSME Udyam Number <span style={{ fontSize: 9, opacity: 0.6 }}>(Optional)</span></div>
                  <input
                    type="text"
                    className="id-date-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="UDYAM-TS-01-0012345"
                    value={currentUdyam}
                    onChange={e => setCurrentUdyam(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="id-modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="id-modal-cancel" onClick={() => setShowAccountModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="id-modal-confirm" disabled={savingAccount}>
                  {savingAccount ? 'Saving...' : '✓ Save & Update QR Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
