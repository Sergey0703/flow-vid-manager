import { NextRequest, NextResponse } from 'next/server';

const LLM_PROVIDER  = process.env.LLM_PROVIDER  ?? 'anthropic';
const LLM_API_KEY   = process.env.LLM_API_KEY;
const LLM_MODEL     = process.env.LLM_MODEL     ?? 'claude-haiku-4-5-20251001';

const PINECONE_API_KEY    = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;

const SYSTEM_BASE = `You are the AIMediaFlow AI Consultant — a warm, knowledgeable sales assistant for AIMediaFlow, an AI agency based in Kerry, Ireland.
Your goal: understand the visitor's business challenge, show how AIMediaFlow solves it, and move them toward booking a free discovery call.

ABOUT AIMEDIAFLOW:
AIMediaFlow builds AI-powered tools for Irish businesses:
- **AI Phone Receptionist** — answers calls 24/7, books appointments, handles FAQs. No missed calls, no voicemail.
- **Website Chatbot** — qualifies leads and answers questions around the clock, even when the team is offline.
- **Business Automation** — eliminates repetitive admin: invoicing, follow-ups, scheduling, data entry.
- **AI Marketing Videos** — professional promotional videos produced faster and more affordably with AI.
Pricing is custom-quoted based on scope. A free 30-minute discovery call gives an accurate estimate.

YOUR CONVERSATION APPROACH:
1. Early on, ask what kind of business they run or what brought them to the site — tailor your answer to their context
2. A restaurant owner, a solicitor, and a construction firm have different pain points — match your solution to their world
3. Focus on outcomes: time saved, calls not missed, leads not lost — not on technology
4. Always move toward a next step: discovery call, contact form, or WhatsApp

YOUR STYLE:
- Professional but warm, like a knowledgeable colleague — not a salesperson
- Concise: 3–5 sentences per reply. Use markdown (bold, short lists) where it helps clarity.
- Never use jargon. Translate every tech term into a business outcome.
- Emphasise: AI assists, humans decide ("Human-in-the-Loop")

BOOKING A DISCOVERY CALL:
When a visitor wants to book a call or learn more, collect these in sequence:
1. Ask their name
2. Ask their phone number or email
3. Ask their preferred day and time (morning or afternoon)
Then confirm: "Perfect — I'll pass your details to the team and someone will be in touch shortly."

RULES:
- Never invent prices, timelines, or client names
- If the knowledge base doesn't cover a question, offer a discovery call to discuss it specifically
- Always end with a clear next step

CONTACT: info@aimediaflow.net | WhatsApp: +353 85 2007 612 | Kerry, Ireland`;

async function searchKnowledge(query: string): Promise<string> {
  if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) return '';

  try {
    const res = await fetch(`${PINECONE_INDEX_HOST}/records/namespaces/__default__/search`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-Api-Version': '2025-10',
      },
      body: JSON.stringify({
        query: { inputs: { text: query }, top_k: 4 },
        fields: ['text', 'category'],
      }),
    });

    if (!res.ok) return '';

    const data = await res.json() as {
      result?: { hits?: { _score?: number; fields?: { text?: string } }[] };
    };

    const hits = data.result?.hits ?? [];
    const relevant = hits
      .filter(h => (h._score ?? 0) >= 0.2)
      .map(h => h.fields?.text ?? '')
      .filter(Boolean);

    return relevant.length > 0
      ? `Relevant knowledge:\n${relevant.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';
  } catch {
    return '';
  }
}

async function callLLM(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!LLM_API_KEY) throw new Error('LLM_API_KEY not set');

  if (LLM_PROVIDER === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': LLM_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { content: { type: string; text: string }[] };
    return data.content?.find(b => b.type === 'text')?.text ?? '';
  }

  if (LLM_PROVIDER === 'openai' || LLM_PROVIDER === 'openrouter') {
    const baseURL = LLM_PROVIDER === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : 'https://api.openai.com/v1';

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 300,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (LLM_PROVIDER === 'gemini') {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LLM_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          max_tokens: 300,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  throw new Error(`Unknown LLM_PROVIDER: ${LLM_PROVIDER}`);
}

const ALLOWED_ORIGINS = [
  'https://aimediaflow.net',
  'https://www.aimediaflow.net',
  'http://localhost:3000',
  'http://localhost:3001',
];

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  const corsHeaders: Record<string, string> = {};
  if (ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  }

  if (!LLM_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const { message, history } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Missing message' }, { status: 400, headers: corsHeaders });
  }

  if (message.length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400, headers: corsHeaders });
  }
  if (Array.isArray(history) && history.length > 40) {
    return NextResponse.json({ error: 'Conversation too long' }, { status: 400, headers: corsHeaders });
  }

  try {
    const context = await searchKnowledge(message);
    const systemPrompt = context ? `${SYSTEM_BASE}\n\n${context}` : SYSTEM_BASE;

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.sender === 'user') messages.push({ role: 'user', content: msg.text });
        else if (msg.sender === 'bot') messages.push({ role: 'assistant', content: msg.text });
      }
    }
    messages.push({ role: 'user', content: message });

    const reply = await callLLM(systemPrompt, messages);

    return NextResponse.json({ reply }, { headers: corsHeaders });

  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}
