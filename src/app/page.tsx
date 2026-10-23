'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, LayoutDashboard, MessageSquare, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ChatMessage, AuditLogItem, ThreatLevel, ScanResult } from '@/types';

const LEVEL_STYLES: Record<ThreatLevel, string> = {
  SAFE: 'bg-emerald-950/60 border-emerald-800 text-emerald-400',
  SUSPICIOUS: 'bg-amber-950/60 border-amber-800 text-amber-400',
  CRITICAL: 'bg-red-950/60 border-red-800 text-red-400',
};

export default function Home() {
  const [tab, setTab] = useState<'chat' | 'dashboard'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: 'PromptGuard active. Prompts are screened for injection signatures prior to inference.',
      timestamp: 'Ready',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollLockedRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (!isAutoScrollLockedRef.current || !chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAutoScrollLockedRef.current = scrollHeight - (scrollTop + clientHeight) < 50;
  };

  const sendPrompt = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: prompt, timestamp: time },
    ]);
    setInput('');
    setLoading(true);
    isAutoScrollLockedRef.current = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const contentType = res.headers.get('content-type') || '';

      // Blocked prompt or validation error
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request rejected');

        setMessages((prev) => [
          ...prev.map((m) => (m.id === userMsgId ? { ...m, scanResult: data.scanResult } : m)),
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: data.reply,
            timestamp: time,
          },
        ]);

        setAuditLogs((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: time,
            prompt,
            threatLevel: data.scanResult.threatLevel,
            score: data.scanResult.score,
            triggers: data.scanResult.triggers,
            actionTaken: data.actionTaken,
          },
          ...prev,
        ]);
        return;
      }

      // Safe stream response
      const scanHeader = res.headers.get('X-Scan-Result');
      const scanResult: ScanResult = scanHeader
        ? JSON.parse(decodeURIComponent(scanHeader))
        : { isSafe: true, score: 0, threatLevel: 'SAFE', triggers: [], explanation: '' };

      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMsgId ? { ...m, scanResult } : m)),
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: '',
          timestamp: time,
        },
      ]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snap = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, text: snap } : m))
          );
        }
      }

      setAuditLogs((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: time,
          prompt,
          threatLevel: scanResult.threatLevel,
          score: scanResult.score,
          triggers: scanResult.triggers,
          actionTaken: 'Allowed & Answered',
        },
        ...prev,
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, sender: 'assistant', text: `Error: ${err.message}`, timestamp: time },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const safeCount = auditLogs.filter((l) => l.threatLevel === 'SAFE').length;
  const blockedCount = auditLogs.length - safeCount;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-mono text-xs selection:bg-slate-800">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 px-6 py-3 flex items-center justify-between shrink-0 bg-slate-950">
        <span className="font-bold tracking-wider text-slate-200">
          PROMPTGUARD // <span className="text-slate-500 font-normal">SECURE CHAT</span>
        </span>
        <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
              tab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </button>
          <button
            onClick={() => setTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
              tab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            {blockedCount > 0 && (
              <span className="ml-1 text-[10px] text-red-400 font-bold">({blockedCount})</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden p-4 max-w-4xl w-full mx-auto flex flex-col min-h-0">
        {tab === 'chat' ? (
          <>
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded border p-3 ${
                      m.sender === 'user'
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-950 border-slate-800/90 text-slate-300'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed break-words">{m.text}</p>
                    <div className="mt-2 text-[10px] text-slate-500 flex justify-between gap-4">
                      <span suppressHydrationWarning>{m.timestamp}</span>
                      {m.scanResult && (
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-semibold flex items-center gap-1 ${
                            LEVEL_STYLES[m.scanResult.threatLevel]
                          }`}
                        >
                          {m.scanResult.threatLevel === 'SAFE' ? (
                            <ShieldCheck className="h-2.5 w-2.5" />
                          ) : (
                            <ShieldAlert className="h-2.5 w-2.5" />
                          )}
                          {m.scanResult.threatLevel} ({m.scanResult.score}/100)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && <div className="text-slate-500 text-[11px] animate-pulse">Scanning prompt...</div>}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPrompt(input);
              }}
              className="mt-3 flex gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Type a message or prompt injection test..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-slate-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 rounded text-slate-200 border border-slate-700 flex items-center justify-center transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {/* Real-time Telemetry Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-slate-800 bg-slate-900/40 p-3 rounded">
                <span className="text-slate-500 block text-[10px]">TOTAL ANALYZED</span>
                <span className="text-lg font-bold text-slate-200">{auditLogs.length}</span>
              </div>
              <div className="border border-slate-800 bg-slate-900/40 p-3 rounded">
                <span className="text-slate-500 block text-[10px]">SAFE PASS RATE</span>
                <span className="text-lg font-bold text-emerald-400">
                  {auditLogs.length ? `${Math.round((safeCount / auditLogs.length) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="border border-slate-800 bg-slate-900/40 p-3 rounded">
                <span className="text-slate-500 block text-[10px]">UNSAFE / BLOCKED</span>
                <span className="text-lg font-bold text-red-400">{blockedCount}</span>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px]">
                  <tr>
                    <th className="p-2.5">TIME</th>
                    <th className="p-2.5">PROMPT</th>
                    <th className="p-2.5">STATUS</th>
                    <th className="p-2.5">SCORE</th>
                    <th className="p-2.5">IDENTIFIED TRIGGERS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-600">
                        No prompts evaluated yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/30">
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-2.5 max-w-xs truncate text-slate-300">{log.prompt}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] ${LEVEL_STYLES[log.threatLevel]}`}>
                            {log.threatLevel}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-400">{log.score}/100</td>
                        <td className="p-2.5 text-slate-400 truncate max-w-xs">
                          {log.triggers.length > 0 ? log.triggers.join(', ') : 'None'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}