# Aletiq System Architecture

## Architectural Philosophy & Design Principles

Aletiq is architected around a strict principle of **Decoupled AI Extraction & Deterministic Legal Evaluation**:

```
 [ Packaging Panels ]
 (Front, Back, Side)
         │
         ▼
 [ Image Diagnostics ] ── (Resolution, Brightness, Blur, Glare)
         │
         ▼
 [ Gemini Multimodal AI ] ── (Reads & Transcribes Statutory Declarations)
         │
         ▼
 [ Structured OCR Schema ] ── (Extracted Declarations with Image & Side Source)
         │
         ▼
 [ Aletiq Legal Rule Engine ] ── (Pure Deterministic Compliance Verification)
         │
 ┌───────┴──────────────────────────────┐
 ▼                                      ▼
[ Compliance Verdict & Score ]       [ Draft Improvement Notice ]
(PASS / FAIL / WARNING / UNRESOLVED)  (Section 36(1) Form-A Notice)
```

### Why Decoupling is Essential for Regulatory Compliance:
1. **Auditability & Explainability**: General Large Language Models (LLMs) can produce non-deterministic legal opinions or hallucinations. In Aletiq, Gemini is strictly constrained to **reading and extracting text from images**.
2. **Deterministic Rules**: Legal thresholds (e.g. checking whether `"g"` or `"gms"` is used, whether `"inclusive of all taxes"` is present, whether a 6-digit Indian PIN code exists in the address) are evaluated by code according to the exact statutory clauses of the **Legal Metrology (Packaged Commodities) Rules, 2011**.
3. **Evidence Correlation**: Every rule finding explicitly links back to the source image, the panel side (`front`, `back`, `left`, etc.), and the verbatim text snippet.

---

## Component Breakdown

### 1. Client Application (`/src`)
- **Vite + React 18 + TypeScript + Tailwind CSS**
- **State Flow**: Centralized in `App.tsx` with asynchronous API synchronization (`api.ts`).
- **Canvas Image Diagnostics (`imageQuality.ts`)**: Fast client-side inspection before upload to alert officers if photos are too blurry, dark, or glared.

### 2. Backend Server (`/server.ts`)
- Express REST API hosting all inspection endpoints (`/api/inspections`, `/api/rules`, `/api/analytics`).
- Bundled via `esbuild` to `dist/server.cjs` for production containerization.

### 3. AI Extraction Service (`/server/ai/geminiExtractor.ts`)
- Multimodal `@google/genai` integration with `gemini-3.7-flash` model.
- Uses `responseSchema` (`Type.OBJECT`) to enforce typed JSON structure.
- Intelligent fallback extractor when operating in offline demo mode.

### 4. Rule Engine (`/server/engine/ruleEngine.ts`)
- Evaluates individual rules: Identity, Net Quantity, MRP & Taxes, Dates, Consumer Grievances, Country of Origin, Import status, and E-Commerce alignment.
- Computes weighted score: `Score = 100 - (30 × Fails) - (10 × Warnings)`.
- Automatically assigns `NOT_DETERMINABLE` for missing unobserved panels.

### 5. Persistence Layer (`/server/db/inspectionRepository.ts`)
- In-memory Map backed by persistent JSON file (`/data/inspections.json`).
- Pre-seeded with 3 realistic reference SIH inspection cases for instant demonstration.
