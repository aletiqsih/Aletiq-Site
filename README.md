# Aletiq — Legal Metrology Compliance Intelligence Platform

**Smart India Hackathon 2026 • Problem Statement SIH26034**  
*AI-Powered Packaged Commodity Compliance Assessment System*

---

## 📌 Executive Summary

**Aletiq** is a modern full-stack regulatory intelligence platform developed to automate the verification of statutory packaged commodity declarations under the **Legal Metrology (Packaged Commodities) Rules, 2011 (LMPC)** and the **Legal Metrology Act, 2009**.

By ingesting multi-panel package photographs (Front, Back, Left, Right, Top, Bottom) or camera captures, Aletiq utilizes **multimodal optical extraction** to transcribe statutory declarations with side-by-side evidence correlation. The extracted evidence is evaluated by an **independent, deterministic Legal Metrology Rule Engine** to produce verifiable compliance verdicts (`COMPLIANT`, `NON_COMPLIANT`, `NEEDS_REVIEW`, `INSUFFICIENT_EVIDENCE`), structured scores, formal **Statutory Improvement Notice (Form-A Drafts)**, and **E-Commerce Cross-Verification reports**.

---

## 🏛️ Core Capabilities

1. **Multi-Panel Package Ingestion & Quality Diagnostics**
   - Supports uploading or camera capturing multiple sides of a packaged product.
   - Client-side image diagnostic analysis evaluating resolution, blur (Laplacian variance proxy), brightness, and glare detection.
   - Transparent side-coverage awareness: single-panel submissions automatically downgrade certainty and mark unobserved back/side requirements as `NOT_DETERMINABLE` rather than falsely penalizing manufacturers.

2. **Multimodal Statutory Declaration Extraction (OCR)**
   - Transcribes statutory fields: Commodity title, Brand, Manufacturer / Packer / Importer name and full postal address with PIN, Net Quantity with standard metric units, Maximum Retail Price (MRP) with mandatory tax inclusion wording, Unit Sale Price (USP), Date of Manufacture / Packing / Expiry, Consumer Care Grievance details (Name, Address, Phone, Email), Country of Origin, and Import declaration.
   - Preserves source image ID, panel side, extraction confidence, and raw evidence snippets.

3. **Decoupled Legal Metrology Rule Engine**
   - **AI only reads and extracts; Aletiq's rule engine evaluates legal conformity.**
   - Evaluates mandatory rules:
     - `LMPC-R06-MFG`: Manufacturer / Packer Identity & Complete Postal Address with PIN code
     - `LMPC-R06-QTY`: Net Quantity in standard metric units (`g`, `kg`, `ml`, `l`, `m`, `N`) & prohibition of non-standard symbols like `gms`, `ml.`, `approx`
     - `LMPC-R06-MRP`: Maximum Retail Price with mandatory `"inclusive of all taxes"`
     - `LMPC-R06-USP`: Unit Sale Price (USP) for multi-unit / fractional packages
     - `LMPC-R06-DATES`: Month and Year of Manufacture / Pre-packing
     - `LMPC-R06-CC`: Comprehensive Consumer Care Grievance details (Name, Address, Phone, Email)
     - `LMPC-R06-COO`: Mandatory Country of Origin declaration
     - `LMPC-R06-IMP`: Importer name and address for imported commodities
     - `LMPC-R06-ECOMM`: Rule 6(10) E-Commerce marketplace statutory alignment.

4. **Statutory Improvement Notice Generator (Form-A Draft)**
   - Auto-compiles formal rectification notices under Section 18 / Section 36(1) of the Legal Metrology Act, 2009.
   - Identifies specific non-compliances, statutory deadlines (15 days), remedy requirements, and legal disclaimers.

5. **E-Commerce Marketplace vs. Physical Package Cross-Check**
   - Cross-verifies physical package declarations against online listings (e.g., Amazon, Flipkart, Blinkit, Zepto, Instamart).
   - Flags discrepancies in weight, MRP overcharging, or omitted manufacturer identities.

6. **Risk Intelligence & Analytics**
   - Aggregated metrics across audits: Compliance distribution rates, most common rule violations, commodity category risk rates, and single-panel vs. multi-panel coverage ratios.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion.
- **Backend**: Node.js, Express, TypeScript, tsx / esbuild.
- **AI Multimodal Extraction**: `@google/genai` TypeScript SDK (`gemini-3.7-flash` with structured schema).
- **Rule Engine**: Pure deterministic TypeScript rule evaluation engine.
- **Persistence**: File-backed repository (`/data/inspections.json`) with pre-seeded SIH reference scenarios.

---

## 🚀 Quick Start Guide

### 1. Environment Variables
Create or verify `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Install & Start Development Server
```bash
npm install
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 3. Production Build
```bash
npm run build
npm start
```
