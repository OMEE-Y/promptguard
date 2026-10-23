
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { analyzePrompt } from '@/lib/guardrail';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Valid prompt required' },
        { status: 400 }
      );
    }

    // Step 1: Pre-inference heuristic & signature scan
    const scanResult = analyzePrompt(prompt);

    if (!scanResult.isSafe) {
      return NextResponse.json({
        scanResult,
        reply: `[Blocked by Security Firewall]: Threat level ${scanResult.threatLevel} detected (Risk Score: ${scanResult.score}/100). Triggers: ${scanResult.triggers.join(', ') || 'Known injection vector'}.`,
        actionTaken: 'Quarantined / Blocked',
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        scanResult,
        reply:
          'Prompt is verified safe. Please configure GROQ_API_KEY in .env.local to generate live responses.',
        actionTaken: 'Allowed & Answered',
      });
    }

    const groq = new Groq({ apiKey });

    // Step 3: Stream safe prompt to Groq
    const stream = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `
You are a secure, helpful assistant.

Answer queries directly, concisely, and factually.

IMPORTANT OUTPUT FORMAT RULES:
- Return plain text only.
- Do NOT use Markdown.
- Do NOT use # headings.
- Do NOT use **bold** or *italic* formatting.
- Do NOT use Markdown bullet points such as -, *, or +.
- Do NOT use Markdown numbered lists.
- Do NOT use backticks or code fences.
- Do NOT use Markdown tables.
- Do NOT use links in Markdown format.
- Do NOT wrap the response in quotes.
- Use normal sentences and paragraphs.
- For lists, use simple numbered lines such as "1. Item" only when necessary.
- Keep spacing clean and readable.
- Never output Markdown syntax.
          `.trim(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
      max_tokens: 512,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';

            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Scan-Result': encodeURIComponent(JSON.stringify(scanResult)),
        'X-Action-Taken': 'Allowed & Answered',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}

