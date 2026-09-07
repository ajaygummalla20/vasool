'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

interface Client {
  id: string; name: string; company_name: string | null
  email: string | null; whatsapp: string | null; phone: string | null
  gst_number: string | null; city: string | null; state: string | null
}

interface Contract {
  id: string; title: string; client_id: string | null
  extracted_amount: number | null; extracted_due_date: string | null
  extracted_payment_terms: string | null; extracted_late_fee: string | null
  extracted_scope: string | null
}

interface LineItem {
  id: string; description: string; qty: number; unit: string; rate: number
}

interface DuplicateData {
  client_id: string | null
  contract_id: string | null
  payment_terms: string | null
  late_fee_terms: string | null
  notes: string | null
  cgst_pct: number | null
  sgst_pct: number | null
  igst_pct: number | null
  discount_pct: number | null
  discount_amount: number | null
  items: { description: string; qty: number; unit: string; rate: number }[]
}

interface Props {
  userName: string; userEmail: string
  businessName: string; senderGst: string; senderAddress: string
  previewInvoiceNumber: string; preselectedClientId: string
  clients: Client[]; contracts: Contract[]; userId: string
  duplicateData?: DuplicateData | null
  initialDocType?: 'tax_invoice' | 'proforma' | 'credit_note'
  initialOriginalInvRef?: string
}

const uid = () => Math.random().toString(36).slice(2, 8)

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)
}

function today() { return new Date().toISOString().split('T')[0] }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const COLORS = ['#1B5E3B','#185FA5','#854F0B','#7C3AED','#C85A1A','#0F766E']
function clientColor(name: string) {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function CreateInvoicePage({
  userName, userEmail, previewInvoiceNumber, preselectedClientId,
  clients, contracts, userId, duplicateData,
  initialDocType = 'tax_invoice', initialOriginalInvRef = '',
}: Props) {
  const router = useRouter()

  const [clientId,     setClientId]     = useState(preselectedClientId)
  const [contractId,   setContractId]   = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showDrop,     setShowDrop]     = useState(false)

  const [issueDate,    setIssueDate]    = useState(today())
  const [dueDate,      setDueDate]      = useState(addDays(today(), 30))
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [lateFeeTerms, setLateFeeTerms] = useState('')
  const [clientNotes,  setClientNotes]  = useState('')

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: '', qty: 1, unit: 'hrs', rate: 0 },
  ])

  const [applyGst, setApplyGst] = useState(true)
  const [gstType,  setGstType]  = useState<'cgst_sgst' | 'igst'>('cgst_sgst')
  const [cgstPct,  setCgstPct]  = useState(9)
  const [sgstPct,  setSgstPct]  = useState(9)
  const [igstPct,  setIgstPct]  = useState(18)
  const [discType, setDiscType] = useState<'pct' | 'fixed'>('pct')
  const [discVal,  setDiscVal]  = useState(0)
  const [includeUpi, setIncludeUpi] = useState(true)

  const [openSec,  setOpenSec]  = useState('client')
  const [saving,   setSaving]   = useState(false)
  const [sending,  setSending]  = useState(false)
  const [docType,          setDocType]          = useState<'tax_invoice' | 'proforma' | 'credit_note'>(initialDocType)
  const [originalInvRef,   setOriginalInvRef]   = useState(initialOriginalInvRef)
  const [creditNoteReason, setCreditNoteReason] = useState('Post-sale discount / rate difference')
  const [saved,            setSaved]            = useState(false)
  const [invNum,           setInvNum]           = useState(
    initialDocType === 'proforma'
      ? `PI-${previewInvoiceNumber.replace(/^[A-Z]+-/, '')}`
      : initialDocType === 'credit_note'
      ? `CN-${previewInvoiceNumber.replace(/^[A-Z]+-/, '')}`
      : previewInvoiceNumber
  )

  // Derived
  const selClient   = clients.find(c => c.id === clientId)
  const selContract = contracts.find(c => c.id === contractId)
  const clientCts   = contracts.filter(c => c.client_id === clientId)

  const subtotal  = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const discAmt   = discType === 'pct' ? subtotal * discVal / 100 : discVal
  const taxable   = Math.max(0, subtotal - discAmt)
  const cgstAmt   = applyGst && gstType === 'cgst_sgst' ? taxable * cgstPct / 100 : 0
  const sgstAmt   = applyGst && gstType === 'cgst_sgst' ? taxable * sgstPct / 100 : 0
  const igstAmt   = applyGst && gstType === 'igst'      ? taxable * igstPct / 100 : 0
  const total     = taxable + cgstAmt + sgstAmt + igstAmt

  // Auto-fill from contract
  useEffect(() => {
    if (!selContract) return
    if (selContract.extracted_payment_terms) setPaymentTerms(selContract.extracted_payment_terms)
    if (selContract.extracted_late_fee)      setLateFeeTerms(selContract.extracted_late_fee)
    if (selContract.extracted_due_date)      setDueDate(selContract.extracted_due_date)
    if (selContract.extracted_amount) {
      setItems([{ id: uid(), description: selContract.extracted_scope || 'Professional services', qty: 1, unit: 'job', rate: selContract.extracted_amount! }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  // ── Initial DocType Notes ──
  useEffect(() => {
    if (initialDocType === 'proforma' && !clientNotes) {
      setClientNotes('PROFORMA INVOICE: Advance payment request. Official GST Tax Invoice will be issued upon receipt of payment.')
    } else if (initialDocType === 'credit_note' && !clientNotes) {
      setClientNotes('GST CREDIT NOTE (Under Section 34 of CGST Act 2017). Issued to adjust value of previous supply.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Pre-fill from duplicate invoice ──
  useEffect(() => {
    if (!duplicateData) return
    if (duplicateData.payment_terms) setPaymentTerms(duplicateData.payment_terms)
    if (duplicateData.late_fee_terms) setLateFeeTerms(duplicateData.late_fee_terms)
    if (duplicateData.notes) setClientNotes(duplicateData.notes)
    if (duplicateData.contract_id) setContractId(duplicateData.contract_id)
    // GST
    const hasCgstSgst = (duplicateData.cgst_pct || 0) > 0 || (duplicateData.sgst_pct || 0) > 0
    const hasIgst = (duplicateData.igst_pct || 0) > 0
    if (hasCgstSgst || hasIgst) {
      setApplyGst(true)
      if (hasIgst) { setGstType('igst'); setIgstPct(duplicateData.igst_pct || 18) }
      else { setGstType('cgst_sgst'); setCgstPct(duplicateData.cgst_pct || 9); setSgstPct(duplicateData.sgst_pct || 9) }
    } else {
      setApplyGst(false)
    }
    // Discount
    if (duplicateData.discount_pct && duplicateData.discount_pct > 0) {
      setDiscType('pct'); setDiscVal(duplicateData.discount_pct)
    } else if (duplicateData.discount_amount && duplicateData.discount_amount > 0) {
      setDiscType('fixed'); setDiscVal(duplicateData.discount_amount)
    }
    // Line items
    if (duplicateData.items && duplicateData.items.length > 0) {
      setItems(duplicateData.items.map(it => ({ id: uid(), description: it.description, qty: it.qty, unit: it.unit, rate: it.rate })))
    }
    setOpenSec('items')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addItem    = () => setItems(p => [...p, { id: uid(), description: '', qty: 1, unit: 'hrs', rate: 0 }])
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof LineItem, val: string | number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i))
  const toggle = (s: string) => setOpenSec(p => p === s ? '' : s)

  const buildPayload = useCallback((num: string, status: 'draft' | 'sent') => {
    let finalNotes = clientNotes || ''
    if (docType === 'credit_note' && originalInvRef) {
      finalNotes = `[Credit Note for Invoice #${originalInvRef} | Reason: ${creditNoteReason}]\n${finalNotes}`.trim()
    }
    return {
      user_id: userId, client_id: clientId, contract_id: contractId || null,
      invoice_number: num, issue_date: issueDate, due_date: dueDate,
      payment_terms: paymentTerms, late_fee_terms: lateFeeTerms || null,
      notes: finalNotes || null, client_notes: finalNotes || null, subtotal,
      discount_pct: discType === 'pct' ? discVal : 0,
      discount_amount: discAmt, taxable_amount: taxable,
      cgst_pct: gstType === 'cgst_sgst' ? cgstPct : 0,
      sgst_pct: gstType === 'cgst_sgst' ? sgstPct : 0,
      igst_pct: gstType === 'igst' ? igstPct : 0,
      cgst_amount: cgstAmt, sgst_amount: sgstAmt, igst_amount: igstAmt,
      total_amount: total, amount_due: total, status,
      reminders_enabled: status === 'sent',
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    }
  }, [userId, clientId, contractId, docType, originalInvRef, creditNoteReason,
      issueDate, dueDate, paymentTerms, lateFeeTerms,
      clientNotes, subtotal, discType, discVal, discAmt, taxable, gstType,
      cgstPct, sgstPct, igstPct, cgstAmt, sgstAmt, igstAmt, total])

  const saveInvoice = async (status: 'draft' | 'sent') => {
    if (!clientId)                                { alert('Please select a client'); return }
    if (items.some(i => !i.description.trim()))   { alert('Fill all line item descriptions'); return }
    if (total <= 0)                               { alert('Invoice total must be > ₹0'); return }
    status === 'draft' ? setSaving(true) : setSending(true)
    try {
      const sb = getSupabase()
      const { data: num, error: numErr } = await sb.rpc('generate_invoice_number', { p_user_id: userId })
      if (numErr) throw numErr
      let invoiceNumber = num as string
      if (docType === 'proforma') {
        invoiceNumber = `PI-${invoiceNumber.replace(/^[A-Z]+-/, '')}`
      } else if (docType === 'credit_note') {
        invoiceNumber = `CN-${invoiceNumber.replace(/^[A-Z]+-/, '')}`
      }
      setInvNum(invoiceNumber)

      const { data: inv, error: invErr } = await sb.from('invoices').insert(buildPayload(invoiceNumber, status)).select('id').single()
      if (invErr) throw invErr

      await sb.from('invoice_items').insert(
        items.map((it, idx) => ({ invoice_id: inv.id, description: it.description, quantity: it.qty, unit: it.unit, unit_price: it.rate, sort_order: idx }))
      )

      if (status === 'sent') {
        const dueTs = new Date(dueDate)
        await sb.from('reminders').insert(
          [7, 14, 30].map(d => {
            const t = new Date(dueTs); t.setDate(t.getDate() + d)
            return { invoice_id: inv.id, user_id: userId, channel: 'whatsapp', status: 'scheduled', scheduled_at: t.toISOString(), days_overdue: d, used_contract_context: !!contractId }
          })
        )
      }
      setSaved(true)
      setTimeout(() => router.push('/dashboard/invoices'), 1400)
    } catch (e: unknown) {
      console.error(e); alert('Error saving invoice. Try again.')
    } finally { setSaving(false); setSending(false) }
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(clientSearch.toLowerCase())
  )

  const Spinner = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .r{display:flex;min-height:100vh}
        .m{flex:1;margin-left:200px;display:flex;flex-direction:column;height:100vh;overflow:hidden}

        /* topbar */
        .tp{background:#FDFAF5;border-bottom:1px solid rgba(26,20,13,.10);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .tp-l{display:flex;align-items:center;gap:12px}
        .bk{display:flex;align-items:center;gap:5px;font-size:12px;color:rgba(26,20,13,.42);cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;transition:color .15s}
        .bk:hover{color:#1A140D}
        .vd{width:1px;height:18px;background:rgba(26,20,13,.10)}
        .tp-t{font-family:'Lora',serif;font-size:15px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .tp-s{font-size:10px;color:rgba(26,20,13,.38);margin-top:1px}
        .tp-r{display:flex;gap:8px;align-items:center}

        .b-ghost{background:white;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:500;color:rgba(26,20,13,.55);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
        .b-ghost:hover{border-color:rgba(26,20,13,.22);color:#1A140D}
        .b-draft{background:white;border:1px solid rgba(26,20,13,.18);border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;color:#1A140D;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;display:flex;align-items:center;gap:5px}
        .b-draft:hover:not(:disabled){background:#F7F5F0}
        .b-send{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;padding:7px 20px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(27,94,59,.30);transition:all .18s}
        .b-send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.38)}
        .b-draft:disabled,.b-send:disabled{opacity:.60;cursor:not-allowed;transform:none!important}

        /* body */
        .bd{flex:1;display:grid;grid-template-columns:1fr 290px;overflow:hidden}
        .fc{overflow-y:auto;padding:20px 26px;display:flex;flex-direction:column;gap:12px;background:#F0EDE8}

        /* AI banner */
        .ai-ban{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(27,94,59,.10),rgba(45,138,88,.06));border:1px solid rgba(45,138,88,.25);border-radius:12px;padding:12px 16px;flex-shrink:0}
        .ai-ic{width:32px;height:32px;border-radius:8px;background:rgba(45,138,88,.18);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .ai-t{font-size:12px;font-weight:600;color:#1B5E3B}
        .ai-s{font-size:10px;color:rgba(26,20,13,.50);margin-top:2px}

        /* section cards */
        .sc{background:white;border:1px solid rgba(26,20,13,.08);border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(26,20,13,.04);flex-shrink:0}
        .sc-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(26,20,13,.06);cursor:pointer;user-select:none;transition:background .12s}
        .sc-hd:hover{background:#FAFAF8}
        .sc-hd-l{display:flex;align-items:center;gap:10px}
        .sc-ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .sc-t{font-size:13px;font-weight:600;color:#1A140D}
        .sc-s{font-size:10px;color:rgba(26,20,13,.42);margin-top:1px}
        .chv{transition:transform .2s;flex-shrink:0}
        .chv.op{transform:rotate(180deg)}
        .sc-bd{padding:18px;border-top:1px solid rgba(26,20,13,.05)}

        /* grid helpers */
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .s2{grid-column:span 2}

        /* labels & inputs */
        .lb{font-size:9px;font-weight:600;color:rgba(26,20,13,.48);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px;display:flex;align-items:center;gap:4px}
        .op-lbl{font-size:9px;font-weight:400;color:rgba(26,20,13,.28);text-transform:none;letter-spacing:0}

        .in{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.12);border-radius:9px;padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;transition:all .18s;display:block}
        .in::placeholder{color:rgba(26,20,13,.30)}
        .in:focus{background:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.11)}
        .in[readonly]{background:#EDEAE5;color:rgba(26,20,13,.55);cursor:default}
        .in[readonly]:focus{border-color:rgba(26,20,13,.12);box-shadow:none}

        .sl{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.12);border-radius:9px;padding:10px 32px 10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231A140D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;transition:all .18s;display:block}
        .sl:focus{background-color:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.11)}

        .ta{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.12);border-radius:9px;padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;resize:vertical;min-height:72px;line-height:1.55;transition:all .18s;display:block}
        .ta:focus{background:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.11)}
        .ta::placeholder{color:rgba(26,20,13,.30)}

        /* client dropdown */
        .cd-wrap{position:relative}
        .cd-drop{position:absolute;top:calc(100% + 4px);left:0;right:0;background:white;border:1px solid rgba(26,20,13,.12);border-radius:12px;box-shadow:0 8px 28px rgba(26,20,13,.14);z-index:100;max-height:220px;overflow-y:auto}
        .cd-opt{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background .12s}
        .cd-opt:hover{background:#F7F5F0}
        .cd-av{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0}
        .cd-nm{font-size:12px;font-weight:500;color:#1A140D}
        .cd-co{font-size:10px;color:rgba(26,20,13,.42)}
        .cd-mt{padding:16px;text-align:center;font-size:12px;color:rgba(26,20,13,.40)}

        /* client chip */
        .chip{display:flex;align-items:center;gap:10px;background:#F0F7F4;border:1px solid rgba(45,138,88,.22);border-radius:10px;padding:10px 14px}
        .chip-av{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0}
        .chip-nm{font-size:13px;font-weight:600;color:#1A140D}
        .chip-sub{font-size:10px;color:rgba(26,20,13,.45);margin-top:1px}
        .chip-chg{margin-left:auto;font-size:11px;font-weight:500;color:#1B5E3B;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;padding:4px 8px;border-radius:6px;transition:background .15s}
        .chip-chg:hover{background:rgba(27,94,59,.08)}

        /* contract badge */
        .ct-b{display:flex;align-items:center;gap:9px;background:rgba(27,94,59,.07);border:1px solid rgba(45,138,88,.20);border-radius:9px;padding:9px 12px;margin-top:10px}
        .ct-ic{width:26px;height:26px;border-radius:6px;background:#1B5E3B;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ct-t{font-size:11px;font-weight:600;color:#1B5E3B}
        .ct-s{font-size:9px;color:rgba(26,20,13,.45);margin-top:2px}
        .ct-rm{margin-left:auto;font-size:10px;color:rgba(26,20,13,.38);cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;padding:3px 7px;border-radius:5px;transition:background .15s}
        .ct-rm:hover{background:rgba(26,20,13,.06);color:#1A140D}

        /* ── LINE ITEMS — CSS grid, no HTML table ── */
        .items-hdr{display:grid;grid-template-columns:1fr 70px 80px 110px 90px 32px;gap:8px;padding:0 0 8px;border-bottom:1px solid rgba(26,20,13,.08);margin-bottom:4px}
        .items-col{font-size:9px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.07em}
        .items-col.r{text-align:right}

        .item-row{display:grid;grid-template-columns:1fr 70px 80px 110px 90px 32px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(26,20,13,.04)}
        .item-row:last-of-type{border-bottom:none}

        .ii{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.12);border-radius:7px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;transition:all .15s;display:block;box-sizing:border-box}
        .ii::placeholder{color:rgba(26,20,13,.32)}
        .ii:focus{background:white;border-color:#2D8A58;box-shadow:0 0 0 2px rgba(45,138,88,.10)}
        .ii.r{text-align:right}
        .ii-sl{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.12);border-radius:7px;padding:7px 24px 7px 8px;font-family:'DM Sans',sans-serif;font-size:11px;color:#1A140D;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231A140D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;display:block;box-sizing:border-box}
        .ii-sl:focus{background-color:white;border-color:#2D8A58;box-shadow:0 0 0 2px rgba(45,138,88,.10)}
        .item-amt{font-size:12px;font-weight:600;color:#1A140D;text-align:right;padding-right:2px;white-space:nowrap}
        .del-btn{width:28px;height:28px;border-radius:7px;background:rgba(192,57,43,.08);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}
        .del-btn:hover{background:rgba(192,57,43,.20)}
        .add-item-btn{display:flex;align-items:center;gap:7px;padding:10px 0 2px;font-size:12px;font-weight:500;color:#1B5E3B;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;transition:opacity .15s}
        .add-item-btn:hover{opacity:.72}

        /* gst */
        .gst-tabs{display:flex;gap:2px;background:#F0EDE8;border-radius:8px;padding:3px;margin-bottom:14px}
        .gst-tab{flex:1;padding:7px;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .15s;text-align:center;background:transparent;color:rgba(26,20,13,.42)}
        .gst-tab.on{background:white;color:#1A140D;box-shadow:0 1px 3px rgba(26,20,13,.10)}

        /* totals */
        .tot-box{background:#F7F5F0;border-radius:10px;padding:14px 16px;margin-top:4px}
        .tot-row{display:flex;justify-content:space-between;padding:4px 0}
        .tot-l{font-size:12px;color:rgba(26,20,13,.55)}
        .tot-v{font-size:12px;font-weight:500;color:#1A140D}
        .tot-div{height:1px;background:rgba(26,20,13,.09);margin:8px 0}
        .tot-gl{font-family:'Lora',serif;font-size:15px;font-weight:700;color:#1A140D}
        .tot-gv{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em}

        /* toggle */
        .tog{width:38px;height:21px;border-radius:100px;cursor:pointer;position:relative;flex-shrink:0;transition:background .2s;border:none;padding:0}
        .tog-k{width:15px;height:15px;border-radius:50%;background:white;position:absolute;top:3px;transition:left .18s;box-shadow:0 1px 3px rgba(0,0,0,.18)}
        .tog-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .tog-l{font-size:12px;font-weight:500;color:#1A140D}
        .tog-s{font-size:10px;color:rgba(26,20,13,.42);margin-top:1px}

        /* disc tabs */
        .disc-tabs{display:flex;gap:4px}
        .disc-tab{padding:4px 10px;border-radius:6px;border:1px solid rgba(26,20,13,.12);background:white;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
        .disc-tab.on{background:#1A140D;color:white;border-color:#1A140D}
        .disc-tab.off{color:rgba(26,20,13,.55)}

        /* upi row */
        .upi-row{display:flex;align-items:center;justify-content:space-between;background:rgba(45,138,88,.05);border:1px solid rgba(45,138,88,.18);border-radius:9px;padding:12px 14px;margin-bottom:14px}
        .upi-l{font-size:12px;font-weight:500;color:#1A140D;margin-bottom:1px}
        .upi-s{font-size:10px;color:rgba(26,20,13,.45)}

        /* ── RIGHT PANEL ── */
        .rp{background:#0C1A10;overflow-y:auto;display:flex;flex-direction:column;border-left:1px solid rgba(0,0,0,.18)}
        .rp-hdr{padding:20px 18px 16px;border-bottom:1px solid rgba(238,233,226,.08)}
        .rp-ey{font-size:9px;font-weight:600;color:rgba(238,233,226,.30);text-transform:uppercase;letter-spacing:.10em;margin-bottom:7px}
        .rp-num{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#EEE9E2;letter-spacing:-.02em;margin-bottom:2px}
        .rp-date{font-size:10px;color:rgba(238,233,226,.35)}
        .rp-cl{padding:14px 18px;border-bottom:1px solid rgba(238,233,226,.08)}
        .rp-cl-ey{font-size:9px;font-weight:600;color:rgba(238,233,226,.28);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .rp-cl-nm{font-size:13px;font-weight:500;color:#EEE9E2;margin-bottom:2px}
        .rp-cl-sub{font-size:10px;color:rgba(238,233,226,.38)}
        .rp-cl-empty{font-size:11px;color:rgba(238,233,226,.22);font-style:italic}
        .rp-tot{padding:14px 18px;border-bottom:1px solid rgba(238,233,226,.08)}
        .rp-tot-ey{font-size:9px;font-weight:600;color:rgba(238,233,226,.28);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
        .rp-row{display:flex;justify-content:space-between;padding:4px 0}
        .rp-rl{font-size:11px;color:rgba(238,233,226,.42)}
        .rp-rv{font-size:11px;font-weight:500;color:rgba(238,233,226,.72)}
        .rp-div{height:.5px;background:rgba(238,233,226,.10);margin:8px 0}
        .rp-gl{font-size:13px;font-weight:600;color:#EEE9E2}
        .rp-gv{font-family:'Lora',serif;font-size:20px;font-weight:700;color:#EEE9E2;letter-spacing:-.02em}
        .rp-acts{padding:14px 18px;display:flex;flex-direction:column;gap:7px}
        .act-send{width:100%;background:linear-gradient(135deg,#2D8A58,#1B5E3B);border:none;border-radius:10px;padding:12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:white;cursor:pointer;transition:all .18s;box-shadow:0 4px 12px rgba(45,138,88,.30);display:flex;align-items:center;justify-content:center;gap:7px}
        .act-send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(45,138,88,.40)}
        .act-send:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .act-draft{width:100%;background:rgba(238,233,226,.06);border:1px solid rgba(238,233,226,.12);border-radius:10px;padding:10px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:rgba(238,233,226,.58);cursor:pointer;transition:all .15s}
        .act-draft:hover:not(:disabled){background:rgba(238,233,226,.11);color:rgba(238,233,226,.80)}
        .act-draft:disabled{opacity:.50;cursor:not-allowed}
        .rp-tip{padding:14px 18px;margin-top:auto;border-top:1px solid rgba(238,233,226,.07)}
        .rp-tip-t{font-size:9px;font-weight:600;color:rgba(238,233,226,.26);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .rp-tip-s{font-size:10px;color:rgba(238,233,226,.35);line-height:1.6}
        .lf-pill{background:rgba(238,233,226,.05);border:.5px solid rgba(238,233,226,.10);border-radius:8px;padding:8px 11px;margin-top:10px}
        .lf-l{font-size:8px;font-weight:600;color:rgba(238,233,226,.28);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
        .lf-v{font-size:10px;color:rgba(238,233,226,.48)}

        /* toast */
        .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1B5E3B,#0D3B22);color:white;padding:12px 22px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 8px 28px rgba(27,94,59,.45);z-index:200;animation:su .3s ease}
        @keyframes su{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        @media(max-width:1100px){
          .bd{grid-template-columns:1fr; overflow:visible}
          .rp{display:none}
        }
        @media(max-width:900px){
          .m{margin-left:0; padding-top:56px; padding-bottom:80px; height:auto; min-height:100vh; overflow:visible}
          .tp{padding:12px 16px; height:auto; flex-wrap:wrap; gap:10px}
          .tp-r{width:100%; justify-content:flex-end; gap:6px}
          .fc{padding:16px; overflow:visible}
          .sc{margin-bottom:12px}
          .sc-bd{padding:14px 16px; overflow-x:auto}
          .items-hdr, .item-row{min-width:480px}
        }
        @media(max-width:600px){
          .g2{grid-template-columns:1fr}
          .tp-r{display:grid; grid-template-columns:1fr 1fr; width:100%}
          .b-ghost{display:none}
          .b-draft, .b-send{width:100%; justify-content:center; padding:9px 12px}
        }
      `}</style>

      <div className="r">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="m">

          {/* Topbar */}
          <div className="tp">
            <div className="tp-l">
              <button className="bk" onClick={() => router.push('/dashboard/invoices')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Invoices
              </button>
              <div className="vd"/>
              <div>
                <div className="tp-t">Create invoice</div>
                <div className="tp-s">{invNum} · {new Date(issueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
              </div>
            </div>
            <div className="tp-r">
              <button className="b-ghost" onClick={() => router.push('/dashboard/invoices')}>Cancel</button>
              <button className="b-draft" onClick={() => saveInvoice('draft')} disabled={saving||sending}>
                {saving && <Spinner/>}
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button className="b-send" onClick={() => saveInvoice('sent')} disabled={saving||sending}>
                {sending ? <Spinner/>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
                {sending ? 'Sending…' : 'Send invoice'}
              </button>
            </div>
          </div>

          <div className="bd">
            {/* LEFT FORM */}
            <div className="fc">

              {contractId && (
                <div className="ai-ban">
                  <div className="ai-ic">🤖</div>
                  <div>
                    <div className="ai-t">Auto-filled from contract</div>
                    <div className="ai-s">Amount, due date & payment terms extracted from <strong>{selContract?.title}</strong></div>
                  </div>
                </div>
              )}

              {/* 1. Client */}
              <div className="sc">
                <div className="sc-hd" onClick={() => toggle('client')}>
                  <div className="sc-hd-l">
                    <div className="sc-ic" style={{background:'rgba(27,94,59,.10)'}}>🤝</div>
                    <div>
                      <div className="sc-t">Client</div>
                      <div className="sc-s">{selClient ? selClient.name : 'Select who you are billing'}</div>
                    </div>
                  </div>
                  <svg className={`chv${openSec==='client'?' op':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {(openSec === 'client' || !selClient) && (
                  <div className="sc-bd">
                    {selClient ? (
                      <>
                        <div className="chip">
                          <div className="chip-av" style={{background:clientColor(selClient.name)}}>{selClient.name.slice(0,2).toUpperCase()}</div>
                          <div>
                            <div className="chip-nm">{selClient.name}</div>
                            <div className="chip-sub">{selClient.company_name || selClient.whatsapp || selClient.email || 'No contact info'}</div>
                          </div>
                          <button className="chip-chg" onClick={() => { setClientId(''); setContractId('') }}>Change</button>
                        </div>
                        {clientCts.length > 0 && (
                          <div style={{marginTop:12}}>
                            <div className="lb" style={{marginBottom:6}}>Link a contract <span className="op-lbl">optional — auto-fills invoice</span></div>
                            {contractId ? (
                              <div className="ct-b">
                                <div className="ct-ic">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                </div>
                                <div>
                                  <div className="ct-t">{selContract?.title}</div>
                                  <div className="ct-s">
                                    {selContract?.extracted_amount && `₹${Number(selContract.extracted_amount).toLocaleString('en-IN')} · `}
                                    {selContract?.extracted_payment_terms}
                                  </div>
                                </div>
                                <button className="ct-rm" onClick={() => setContractId('')}>Remove</button>
                              </div>
                            ) : (
                              <select className="sl" value="" onChange={e => { if (e.target.value) setContractId(e.target.value) }}>
                                <option value="">Select a contract to auto-fill…</option>
                                {clientCts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                              </select>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="lb">Search and select client</div>
                        <div className="cd-wrap">
                          <input className="in" placeholder="Type name or company…" value={clientSearch}
                            onChange={e => { setClientSearch(e.target.value); setShowDrop(true) }}
                            onFocus={() => setShowDrop(true)}
                            onBlur={() => setTimeout(() => setShowDrop(false), 180)}
                          />
                          {showDrop && (
                            <div className="cd-drop">
                              {filteredClients.length === 0
                                ? <div className="cd-mt">No clients found — <span style={{color:'#1B5E3B',cursor:'pointer',fontWeight:500}} onClick={() => router.push('/dashboard/clients/new')}>add a client first</span></div>
                                : filteredClients.map(c => (
                                  <div key={c.id} className="cd-opt"
                                    onMouseDown={() => { setClientId(c.id); setClientSearch(''); setShowDrop(false); setOpenSec('details') }}>
                                    <div className="cd-av" style={{background:clientColor(c.name)}}>{c.name.slice(0,2).toUpperCase()}</div>
                                    <div>
                                      <div className="cd-nm">{c.name}</div>
                                      {c.company_name && <div className="cd-co">{c.company_name}</div>}
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                        <p style={{marginTop:8,fontSize:11,color:'rgba(26,20,13,.40)'}}>
                          Don&apos;t see them? <span style={{color:'#1B5E3B',cursor:'pointer',fontWeight:500}} onClick={() => router.push('/dashboard/clients/new')}>Add a new client →</span>
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Invoice Details */}
              <div className="sc">
                <div className="sc-hd" onClick={() => toggle('details')}>
                  <div className="sc-hd-l">
                    <div className="sc-ic" style={{background:'rgba(24,95,165,.10)'}}>📋</div>
                    <div>
                      <div className="sc-t">Invoice details</div>
                      <div className="sc-s">Number · Dates · Payment terms</div>
                    </div>
                  </div>
                  <svg className={`chv${openSec==='details'?' op':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {openSec === 'details' && (
                  <div className="sc-bd">
                    {/* Document Type Selector */}
                    <div style={{ marginBottom: 16 }}>
                      <div className="lb">Document Type</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {([
                          { id: 'tax_invoice', label: '🧾 Tax Invoice', desc: 'Standard GST' },
                          { id: 'proforma',    label: '📑 Proforma Bill', desc: '0 GST Liability' },
                          { id: 'credit_note', label: '📄 GST Credit Note', desc: 'Sec 34 CGST' },
                        ] as const).map(dt => (
                          <button
                            key={dt.id}
                            type="button"
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8,
                              border: docType === dt.id ? '1.5px solid #1B5E3B' : '1px solid rgba(26,20,13,.12)',
                              background: docType === dt.id ? 'rgba(27,94,59,.08)' : 'white',
                              color: docType === dt.id ? '#1B5E3B' : '#1A140D',
                              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                            }}
                            onClick={() => {
                              setDocType(dt.id)
                              if (dt.id === 'proforma') {
                                setInvNum(`PI-${previewInvoiceNumber.replace(/^[A-Z]+-/, '')}`)
                                setClientNotes('PROFORMA INVOICE: Advance payment request. Official GST Tax Invoice will be issued upon receipt of payment.')
                              } else if (dt.id === 'credit_note') {
                                setInvNum(`CN-${previewInvoiceNumber.replace(/^[A-Z]+-/, '')}`)
                                setClientNotes('GST CREDIT NOTE (Under Section 34 of CGST Act 2017). Issued to adjust value of previous supply.')
                              } else {
                                setInvNum(previewInvoiceNumber)
                                setClientNotes('')
                              }
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{dt.label}</div>
                            <div style={{ fontSize: 9, color: 'rgba(26,20,13,.45)' }}>{dt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {docType === 'credit_note' && (
                      <div className="g2" style={{ marginBottom: 14, background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: 12 }}>
                        <div>
                          <div className="lb">Original Invoice No.</div>
                          <input className="in" value={originalInvRef} onChange={e => setOriginalInvRef(e.target.value)} placeholder="e.g. INV-001"/>
                        </div>
                        <div>
                          <div className="lb">Reason for Credit Note</div>
                          <select className="sl" value={creditNoteReason} onChange={e => setCreditNoteReason(e.target.value)}>
                            <option value="Post-sale discount / rate difference">Post-sale discount / rate difference</option>
                            <option value="Deficiency in services / Quality dispute">Deficiency in services / Quality dispute</option>
                            <option value="Order cancellation / Scope reduction">Order cancellation / Scope reduction</option>
                            <option value="Correction in invoice">Correction in invoice</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="g3" style={{marginBottom:14}}>
                      <div>
                        <div className="lb">Document no.</div>
                        <input className="in" value={invNum} readOnly/>
                      </div>
                      <div>
                        <div className="lb">Issue date</div>
                        <input className="in" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}/>
                      </div>
                      <div>
                        <div className="lb">Due date</div>
                        <input className="in" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/>
                      </div>
                    </div>
                    <div className="g2">
                      <div>
                        <div className="lb">Payment terms</div>
                        <input className="in" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Net 30"/>
                      </div>
                      <div>
                        <div className="lb">Late fee <span className="op-lbl">optional</span></div>
                        <input className="in" value={lateFeeTerms} onChange={e => setLateFeeTerms(e.target.value)} placeholder="18% p.a. after due date"/>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Line Items — CSS grid, NOT HTML table */}
              <div className="sc">
                <div className="sc-hd" onClick={() => toggle('items')}>
                  <div className="sc-hd-l">
                    <div className="sc-ic" style={{background:'rgba(133,79,11,.10)'}}>📦</div>
                    <div>
                      <div className="sc-t">Line items</div>
                      <div className="sc-s">{items.length} item{items.length !== 1 ? 's' : ''} · Subtotal {fmtINR(subtotal)}</div>
                    </div>
                  </div>
                  <svg className={`chv${openSec==='items'?' op':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {openSec === 'items' && (
                  <div className="sc-bd">
                    {/* Column headers */}
                    <div className="items-hdr">
                      <div className="items-col">Description</div>
                      <div className="items-col">Qty</div>
                      <div className="items-col">Unit</div>
                      <div className="items-col r">Rate (₹)</div>
                      <div className="items-col r">Amount</div>
                      <div/>
                    </div>

                    {/* Item rows */}
                    {items.map(item => (
                      <div key={item.id} className="item-row">
                        <input className="ii" value={item.description}
                          onChange={e => updateItem(item.id,'description',e.target.value)}
                          placeholder="e.g. Web development services"/>
                        <input className="ii r" type="number" min="0.01" step="0.01" value={item.qty}
                          onChange={e => updateItem(item.id,'qty',parseFloat(e.target.value)||0)}/>
                        <select className="ii-sl" value={item.unit} onChange={e => updateItem(item.id,'unit',e.target.value)}>
                          {['hrs','days','job','units','months','pcs'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input className="ii r" type="number" min="0" step="100" value={item.rate}
                          onChange={e => updateItem(item.id,'rate',parseFloat(e.target.value)||0)}/>
                        <div className="item-amt">{fmtINR(item.qty * item.rate)}</div>
                        <div>
                          {items.length > 1 && (
                            <button className="del-btn" onClick={() => removeItem(item.id)}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button className="add-item-btn" onClick={addItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B5E3B" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Add line item
                    </button>
                  </div>
                )}
              </div>

              {/* 4. GST & Totals */}
              <div className="sc">
                <div className="sc-hd" onClick={() => toggle('gst')}>
                  <div className="sc-hd-l">
                    <div className="sc-ic" style={{background:'rgba(124,58,237,.10)'}}>🧮</div>
                    <div>
                      <div className="sc-t">GST & totals</div>
                      <div className="sc-s">Tax · Discount · Grand total {fmtINR(total)}</div>
                    </div>
                  </div>
                  <svg className={`chv${openSec==='gst'?' op':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {openSec === 'gst' && (
                  <div className="sc-bd">
                    <div className="tog-row">
                      <div>
                        <div className="tog-l">Apply GST</div>
                        <div className="tog-s">Toggle off for non-GST invoices</div>
                      </div>
                      <button className="tog" style={{background:applyGst?'#1B5E3B':'rgba(26,20,13,.15)'}} onClick={() => setApplyGst(p => !p)}>
                        <div className="tog-k" style={{left:applyGst?'20px':'3px'}}/>
                      </button>
                    </div>

                    {applyGst && (
                      <>
                        <div className="gst-tabs">
                          <button className={`gst-tab ${gstType==='cgst_sgst'?'on':''}`} onClick={() => setGstType('cgst_sgst')}>CGST + SGST · same state</button>
                          <button className={`gst-tab ${gstType==='igst'?'on':''}`} onClick={() => setGstType('igst')}>IGST · different state</button>
                        </div>
                        {gstType === 'cgst_sgst' ? (
                          <div className="g2" style={{marginBottom:14}}>
                            <div><div className="lb">CGST %</div><input className="in" type="number" min="0" max="28" step="0.5" value={cgstPct} onChange={e => setCgstPct(parseFloat(e.target.value)||0)}/></div>
                            <div><div className="lb">SGST %</div><input className="in" type="number" min="0" max="28" step="0.5" value={sgstPct} onChange={e => setSgstPct(parseFloat(e.target.value)||0)}/></div>
                          </div>
                        ) : (
                          <div style={{marginBottom:14}}><div className="lb">IGST %</div><input className="in" type="number" min="0" max="28" step="0.5" value={igstPct} onChange={e => setIgstPct(parseFloat(e.target.value)||0)}/></div>
                        )}
                      </>
                    )}

                    {/* Discount */}
                    <div style={{marginBottom:14}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                        <div className="lb" style={{margin:0}}>Discount <span className="op-lbl">optional</span></div>
                        <div className="disc-tabs">
                          <button className={`disc-tab ${discType==='pct'?'on':'off'}`} onClick={() => { setDiscType('pct'); setDiscVal(0) }}>%</button>
                          <button className={`disc-tab ${discType==='fixed'?'on':'off'}`} onClick={() => { setDiscType('fixed'); setDiscVal(0) }}>₹</button>
                        </div>
                      </div>
                      <input className="in" type="number" min="0" value={discVal} onChange={e => setDiscVal(parseFloat(e.target.value)||0)} placeholder={discType==='pct'?'e.g. 5 for 5%':'e.g. 5000'}/>
                    </div>

                    {/* Totals summary */}
                    <div className="tot-box">
                      <div className="tot-row"><span className="tot-l">Subtotal</span><span className="tot-v">{fmtINR(subtotal)}</span></div>
                      {discAmt > 0 && <div className="tot-row"><span className="tot-l">Discount{discType==='pct'?` (${discVal}%)`:''}</span><span className="tot-v" style={{color:'#1B5E3B'}}>− {fmtINR(discAmt)}</span></div>}
                      {discAmt > 0 && <div className="tot-row"><span className="tot-l">Taxable amount</span><span className="tot-v">{fmtINR(taxable)}</span></div>}
                      {cgstAmt > 0 && <div className="tot-row"><span className="tot-l">CGST {cgstPct}%</span><span className="tot-v">{fmtINR(cgstAmt)}</span></div>}
                      {sgstAmt > 0 && <div className="tot-row"><span className="tot-l">SGST {sgstPct}%</span><span className="tot-v">{fmtINR(sgstAmt)}</span></div>}
                      {igstAmt > 0 && <div className="tot-row"><span className="tot-l">IGST {igstPct}%</span><span className="tot-v">{fmtINR(igstAmt)}</span></div>}
                      <div className="tot-div"/>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span className="tot-gl">Total</span>
                        <span className="tot-gv">{fmtINR(total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Payment & Notes */}
              <div className="sc">
                <div className="sc-hd" onClick={() => toggle('notes')}>
                  <div className="sc-hd-l">
                    <div className="sc-ic" style={{background:'rgba(232,105,42,.10)'}}>💬</div>
                    <div>
                      <div className="sc-t">Payment & notes</div>
                      <div className="sc-s">UPI link · Message to client</div>
                    </div>
                  </div>
                  <svg className={`chv${openSec==='notes'?' op':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {openSec === 'notes' && (
                  <div className="sc-bd">
                    <div className="upi-row">
                      <div>
                        <div className="upi-l">Include UPI payment link</div>
                        <div className="upi-s">Client pays instantly — auto-marks invoice paid</div>
                      </div>
                      <button className="tog" style={{background:includeUpi?'#1B5E3B':'rgba(26,20,13,.15)'}} onClick={() => setIncludeUpi(p => !p)}>
                        <div className="tog-k" style={{left:includeUpi?'20px':'3px'}}/>
                      </button>
                    </div>
                    <div><div className="lb">Note to client <span className="op-lbl">optional</span></div>
                    <textarea className="ta" value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="e.g. Thank you for your business. Please process payment by the due date."/></div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT PANEL */}
            <div className="rp">
              <div className="rp-hdr">
                <div className="rp-ey">Invoice preview</div>
                <div className="rp-num">{invNum}</div>
                <div className="rp-date">
                  Issue: {new Date(issueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                  {' · '}
                  Due: {new Date(dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </div>
              </div>

              <div className="rp-cl">
                <div className="rp-cl-ey">Billing to</div>
                {selClient ? (
                  <>
                    <div className="rp-cl-nm">{selClient.name}</div>
                    {selClient.company_name && <div className="rp-cl-sub">{selClient.company_name}</div>}
                    {(selClient.whatsapp||selClient.phone) && <div className="rp-cl-sub">{selClient.whatsapp||selClient.phone}</div>}
                  </>
                ) : <div className="rp-cl-empty">No client selected yet</div>}
              </div>

              <div className="rp-tot">
                <div className="rp-tot-ey">Breakdown</div>
                {items.filter(i => i.description && i.rate > 0).map(i => (
                  <div key={i.id} className="rp-row">
                    <span className="rp-rl" style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.description}</span>
                    <span className="rp-rv">{fmtINR(i.qty * i.rate)}</span>
                  </div>
                ))}
                {discAmt  > 0 && <div className="rp-row"><span className="rp-rl">Discount</span><span className="rp-rv" style={{color:'#2D8A58'}}>− {fmtINR(discAmt)}</span></div>}
                {cgstAmt  > 0 && <div className="rp-row"><span className="rp-rl">CGST {cgstPct}%</span><span className="rp-rv">{fmtINR(cgstAmt)}</span></div>}
                {sgstAmt  > 0 && <div className="rp-row"><span className="rp-rl">SGST {sgstPct}%</span><span className="rp-rv">{fmtINR(sgstAmt)}</span></div>}
                {igstAmt  > 0 && <div className="rp-row"><span className="rp-rl">IGST {igstPct}%</span><span className="rp-rv">{fmtINR(igstAmt)}</span></div>}
                <div className="rp-div"/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span className="rp-gl">Total</span>
                  <span className="rp-gv">{fmtINR(total)}</span>
                </div>
                {contractId && lateFeeTerms && (
                  <div className="lf-pill"><div className="lf-l">Late fee</div><div className="lf-v">{lateFeeTerms}</div></div>
                )}
              </div>

              <div className="rp-acts">
                <button className="act-send" onClick={() => saveInvoice('sent')} disabled={saving||sending||!clientId||total<=0}>
                  {sending ? <Spinner/>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
                  {sending ? 'Sending…' : 'Send invoice + start reminders'}
                </button>
                <button className="act-draft" onClick={() => saveInvoice('draft')} disabled={saving||sending||!clientId||total<=0}>
                  {saving ? 'Saving…' : 'Save as draft'}
                </button>
              </div>

              <div className="rp-tip">
                <div className="rp-tip-t">What happens next</div>
                <div className="rp-tip-s">After sending, Settlr schedules WhatsApp reminders at Day 7, 14, and 30 if unpaid. All reminders stop the moment payment is received.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div className="toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          Invoice saved! Redirecting…
        </div>
      )}
    </>
  )
}