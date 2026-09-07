# ⚡ Settlr — MSME Financial Operating System

> **The all-in-one financial operating system purpose-built for Indian freelancers, contractors, agencies, and MSMEs.**  
> Seamless GST invoicing, MSMED Act 2006 statutory interest enforcement, NPCI UPI QR settlements, TDS ledgers, and AI-powered contract risk analysis.

---

## 🚀 Key Capabilities

- **Smart GST & Proforma Invoicing**: Automatic Intra-state (CGST+SGST) and Inter-state (IGST) tax computation, GST Credit Notes, customizable invoice counters, and GSTR-1 JSON export.
- **MSMED Act 2006 Statutory Protection**: Automated calculation of Section 15 & 16 compound monthly interest claims at **3x RBI Bank Rate (20.25% p.a.)** for overdue invoices beyond 45 days.
- **Direct-to-Bank NPCI UPI Settlements**: Dynamic UPI QR codes embedded directly in invoices and public payment links for 0% MDR instant bank deposits.
- **TDS Asset Ledger (Sections 194J & 194C)**: Form 26AS tax withholding tracking, Form 16A reconciliation, and automated WhatsApp reminder templates.
- **Advance Tax & Section 44ADA Presumptive Planner**: Automatic 50% presumptive profit margin computation with statutory quarterly schedule tracking (June 15, Sept 15, Dec 15, March 15).
- **Working Capital & 90-Day Cashflow Deck**: Cash runway forecasting, monthly burn rates, and Days Sales Outstanding (DSO) health indicators.
- **AI Contract Analyzer & Risk Redlining**: Google Gemini 2.5 Flash integration for automated contract clause risk detection and MSME protection scores.
- **Strix Security Suite**: Cryptographic payment verification (HMAC SHA256), multi-tenant IDOR protection, XSS sanitization, and AI prompt injection defenses.

---

## 🛠️ Technology Stack & $0 Free-Tier Architecture

| Component | Technology | Free Tier Provider | Cost |
| :--- | :--- | :--- | :--- |
| **Frontend & Backend** | Next.js 16 (App Router + Turbopack), React 19, TypeScript 5 | Vercel (Hobby Tier) | **$0 / mo** |
| **Database & Auth** | PostgreSQL, Row Level Security (RLS), Supabase Auth | Supabase Cloud | **$0 / mo** |
| **Styling** | Modern Vanilla CSS & TailwindCSS v4 | — | **$0 / mo** |
| **AI Analysis** | Google Gemini 2.5 Flash API | Google AI Studio | **$0 / mo** |
| **Payments** | Dynamic NPCI UPI QR + Razorpay Gateway | Razorpay Standard | **$0 / mo** |

---

## 📦 Quick Start & Local Development

### 1. Prerequisites
- Node.js >= 20.0.0
- Git

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/settlr.git
cd settlr
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

### 4. Setup Supabase Database
1. Create a free project at [Supabase](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Security Verification

Settlr includes automated unit, financial, and security audit suites:

```bash
# Run Financial & Statutory Compliance Audit (21 Tests)
npm test

# Run Strix Autonomous Penetration & Security Audit (14 Tests)
npm run test:security

# Validate Production Build & Route Compilation
npm run build
```

---

## 🌐 Production Deployment Guide ($0 / Month)

### Step 1: Deploy Database on Supabase
1. Create a project at [supabase.com](https://supabase.com) (Select `ap-south-1` Mumbai region).
2. Execute `supabase/schema.sql` in the SQL Editor.
3. Note down your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Step 2: Push Code to GitHub
```bash
git add .
git commit -m "feat: release Settlr v1.0.0"
git remote add origin https://github.com/<your-username>/settlr.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Select the `settlr` repository.
3. Configure environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_APP_URL` (e.g., `https://settlr.in`)
4. Click **Deploy**.

### Step 4: Configure Custom Domain (Optional)
1. In Vercel -> **Project Settings** -> **Domains**, add your domain (e.g., `settlr.in`).
2. Add DNS records at your domain registrar:
   - **Apex (`@`)**: `A` record pointing to `76.76.21.21`
   - **Subdomain (`www`)**: `CNAME` record pointing to `cname.vercel-dns.com`

### Step 5: Whitelist Auth URLs in Supabase
In Supabase -> **Authentication** -> **URL Configuration**:
- **Site URL**: `https://settlr.in` (or your Vercel URL)
- **Redirect URLs**: Add `https://settlr.in/**` and `https://settlr.in/auth/callback`

---

## ⚖️ Indian Statutory Compliance Checklist

- [x] **MSMED Act 2006 (Sections 15 & 16)**: Statutory 45-day credit limit and 3x RBI bank rate compound interest notice.
- [x] **GST Act 2017**: HSN/SAC directory, Intra/Inter-state tax splitting, GSTR-1 / GSTR-3B tax exports.
- [x] **Income Tax Act 1961 (Sections 194J & 194C)**: 10%/2%/1% TDS asset ledger and Form 26AS matching.
- [x] **Section 44ADA Presumptive Taxation**: 50% profit margin and Advance Tax quarterly calendar.
- [x] **NPCI UPI Protocols**: Verified deep-link generation for zero MDR merchant collections.

---

## 📄 License
Settlr is open-source software licensed under the [MIT License](LICENSE).
