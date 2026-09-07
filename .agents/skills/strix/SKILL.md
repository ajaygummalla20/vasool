---
name: strix
description: >-
  Autonomous AI-powered security scanner and penetration testing framework (usestrix/strix).
  Use for vulnerability assessment, OWASP Top 10 auditing, Supabase RLS security testing,
  Razorpay HMAC tamper testing, IDOR verification, and AI/file upload security testing.
---

# 🛡️ Strix Security Testing & Penetration Testing Skill

This skill guides the agent in conducting autonomous security audits, dynamic penetration testing (DAST), code vulnerability reviews, and cryptographic integrity verifications across the Settlr application stack using principles from **Strix (`usestrix/strix`)**.

---

## 1. 🎯 Scope & Core Security Domains

Whenever performing security audits or testing vulnerabilities on this project, evaluate all 5 critical domains:

### Domain 1: Supabase Row-Level Security (RLS) & Multi-Tenant Isolation
- **Target Tables**: `invoices`, `clients`, `contracts`, `expenses`, `reminders`, `profiles`, `recurring_templates`.
- **Attack Vectors to Test**:
  - **Cross-Tenant IDOR**: Attempting to read, update, or delete another user's invoice, client, or contract by manipulating UUIDs.
  - **Anonymous / Unauthenticated Access**: Verifying that unauthenticated requests cannot query private database tables directly.
  - **Service Role Key Leaks**: Ensuring `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client-side bundles (only `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be public).

### Domain 2: Cryptographic Payment & Webhook Security (Razorpay)
- **Target Endpoints**: `/api/billing/create-order`, `/api/billing/verify-payment`.
- **Attack Vectors to Test**:
  - **HMAC Signature Tampering**: Verifying that modified `razorpay_payment_id`, `razorpay_order_id`, or `plan_id` payloads are strictly rejected by `crypto.createHmac('sha256', secret)`.
  - **Amount Tampering**: Ensuring plan upgrade amounts and tier limits are validated strictly on the backend, not trusted from client requests.
  - **Replay Attacks**: Ensuring payment verifications cannot be re-executed multiple times to gain unauthorized plan extensions.

### Domain 3: Public Invoices & Token Security
- **Target Endpoints**: `/invoice/[token]`, `/api/invoices/[id]/public`.
- **Attack Vectors to Test**:
  - **Token Brute-Force / Enumeration**: Ensuring public tokens use cryptographically random high-entropy strings.
  - **Data Leakage in Public Invoices**: Ensuring public invoice views only expose essential billing fields and NEVER leak internal user metadata, other clients' records, or secret API keys.
  - **Status Tampering**: Ensuring public viewers cannot mutate the invoice status to `paid` without authorized authenticated transactions.

### Domain 4: AI Endpoints & Document Ingestion
- **Target Endpoints**: `/api/contracts/analyze`, `/api/expenses/scan`.
- **Attack Vectors to Test**:
  - **Prompt Injection & Jailbreaks**: Uploading adversarial contracts or receipts containing system prompt override instructions.
  - **Malicious File Payloads**: Testing file size limits, invalid MIME types (e.g. executable disguised as PDF), and memory exhaustion attacks.
  - **Server-Side Request Forgery (SSRF)**: Ensuring external URLs in analyzed text cannot coerce backend fetches to internal VPC or metadata services.

### Domain 5: OWASP Top 10 Web Application Security
- **XSS (Cross-Site Scripting)**: Verifying that user-supplied input (client names, line item descriptions, invoice notes) is sanitized when rendering HTML/PDFs.
- **Security Headers & CSP**: Ensuring responses include security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
- **CSRF & CORS**: Ensuring sensitive mutation APIs restrict origins and enforce cookie samesite protections.

---

## 2. 🛠️ How to Execute Strix Security Testing

### Step 1: Automated Script Execution
Run the integrated security audit test suite:
```bash
npm run test:security
# or
npx tsx .agents/skills/strix/scripts/security-audit.ts
```

### Step 2: Static Vulnerability & Policy Inspection
Inspect backend routes for security best practices:
1. Verify authentication checks (`supabase.auth.getUser()`) at the start of all protected route handlers.
2. Cross-check cryptographic signature verifications against constant-time comparison.
3. Check that user inputs in PDF rendering are escaped to prevent print-dialog HTML injection.

### Step 3: Containerized Strix Penetration Run (Docker)
When running full containerized Strix dynamic penetration tests against local or staging URLs:
```bash
docker run --rm -v $(pwd):/workspace usestrix/strix:latest scan --target http://localhost:3000 --output ./security-report.json
```

---

## 3. 📋 Security Remediation Guidelines

When vulnerabilities are found, follow these standard remediation patterns:

1. **For RLS Flaws**: Ensure all Supabase tables have `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` and policies checking `auth.uid() = user_id`.
2. **For HMAC Tampering**: Use constant-time buffer comparison with sha256 HMAC digest.
3. **For Public Invoice Route Protection**: Enforce select projection to avoid returning internal columns:
   ```typescript
   .select('id, invoice_number, total_amount, amount_due, issue_date, due_date, status, notes, clients(name, company_name)')
   ```
4. **For AI File Uploads**: Enforce strict file size limits (< 10MB) and validate magic bytes before parsing.
