# PromptGuard

A Next.js chat interface and security firewall that screens user prompts for injection attacks, system extraction attempts, and safety violations before querying an LLM.

## Features

- Heuristic analysis to detect instruction overrides, delimiters, and jailbreaks.
- Real-time threat classification (`SAFE`, `SUSPICIOUS`, `CRITICAL`).
- Dual-view UI:
  - Chat window with streaming model responses.
  - Telemetry dashboard logging prompt scores, triggers, and actions.
- Edge API streaming via Groq (`openai/gpt-oss-20b`).

## Tech Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Groq SDK

## Getting Started

### 1. Prerequisites

Node.js 18+ installed on your machine.

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/OMEE-Y/promptguard.git
cd promptguard
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 4. Run Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts   # Guardrail evaluation & Groq streaming endpoint
│   │   ├── globals.css         # Base styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Chat UI & Telemetry dashboard
│   ├── lib/
│   │   └── guardrail.ts        # Detection rules, normalization, scoring logic
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── package.json
└── tsconfig.json
```

## Security Pipeline

1. Pre-processing: Strips invisible unicode characters and standardizes input.
2. Rule Matching: Evaluates the prompt against instruction overrides, delimiter injections, and policy-violating vectors.
3. Scoring and Thresholds:
   - `< 25`: Safe (processed and sent to model)
   - `25 - 59`: Suspicious (flagged, permitted with monitoring)
   - `>= 60`: Critical (quarantined and blocked prior to inference)
4. Execution: Safe requests stream completion tokens from Groq. Unsafe requests return an error payload directly to the client.

