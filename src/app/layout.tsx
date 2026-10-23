import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptGuard AI - Secure Chatbot & Threat Dashboard",
  description: "Next.js TypeScript Prompt Injection Firewall with Gemini AI and Real-time Security Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
