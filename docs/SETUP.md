# Aletiq Setup & Verification Guide

## Prerequisites
- Node.js 18+ or 20+
- npm 9+

## Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

*(Note: If `GEMINI_API_KEY` is not provided or set to a placeholder, Aletiq seamlessly activates its deterministic optical simulation engine so all demo scenarios remain fully interactive for SIH presentations).*

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser at `http://localhost:3000`.

## Testing Pre-set Scenarios

Aletiq includes pre-loaded SIH evaluation test packages in the "New Inspection" screen:
1. **Full Compliance Scenario** (`sample-honey`): Demonstrates complete front & back package assessment achieving score 96/100 (Compliant).
2. **Defective Units & Missing Tax Scenario** (`sample-cookies`): Demonstrates detection of prohibited `250 gms` unit symbol, missing tax inclusive wording, and automatic generation of the Form-A Draft Notice.
3. **Single-Panel Incomplete Scenario** (`sample-tea-single`): Demonstrates how Aletiq handles missing back panel data as `NOT_DETERMINABLE` with low certainty warnings rather than hallucinating or falsely penalizing the manufacturer.
