# 🛡️ PromptGuard AI (Next.js + TypeScript)

A production-ready **Prompt Injection Secure Chatbot** with a real-time **Security Telemetry Dashboard** built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and the official **Google GenAI SDK** (`@google/genai`).

---

## ✨ Features

- **Pre-Inference Injection Firewall**:
  - Detects **Instruction Override** (*"ignore previous instructions"*).
  - Detects **System Prompt Extraction** (*"repeat/show system prompt"*).
  - Detects **Jailbreaks & Roleplays** (*"DAN", "Do Anything Now", "developer mode"*).
  - Detects **Control Token / Delimiter Injection** (`<|im_start|>`, `[SYSTEM]`, `Human:`).
  - Detects **Obfuscation Patterns** (Base64, rot13, hex, eval).
- **Dual Experience (Chat & Dashboard)**:
  - **Chat Interface**: Interactive chat with inline prompt safety badges (`SAFE`, `SUSPICIOUS`, `CRITICAL`) and quick attack test vectors.
  - **Security Dashboard**: Live analytics metrics, average vulnerability scoring, injection blocks, and an inspection audit log table.
- **Secure Gemini AI Integration**:
  - Safe prompts invoke `gemini-2.5-flash` with robust system instructions.
  - Injections are quarantined at the API boundary before touching the LLM.

---

## 🚀 Quick Start (Local Setup)

1. **Extract and Navigate to Directory**:
   ```bash
   unzip promptguard-nextjs.zip
   cd promptguard-nextjs
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add your Gemini API key from [Google AI Studio](https://aistudio.google.com/):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Push to GitHub & Deploy to Vercel

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: PromptGuard AI Next.js App"
git branch -M main
git remote add origin https://github.com/<your-username>/promptguard-ai.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository `promptguard-ai`.
3. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(your Google Gemini API Key)*
4. Click **Deploy**. Your prompt injection firewall is live!
