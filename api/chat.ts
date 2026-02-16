import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── LLM provider config ──────────────────────────────────────────────────────
// Set LLM_PROVIDER in Vercel env vars: "anthropic" | "openai" | "openrouter"
// Set LLM_API_KEY to the corresponding API key
// Set LLM_MODEL to the model name (e.g. "claude-haiku-4-5-20251001", "gpt-4o-mini")
const LLM_PROVIDER  = process.env.LLM_PROVIDER  ?? 'anthropic';
const LLM_API_KEY   = process.env.LLM_API_KEY;
const LLM_MODEL     = process.env.LLM_MODEL     ?? 'claude-haiku-4-5-20251001';

// ── Pinecone config ──────────────────────────────────────────────────────────
const PINECONE_API_KEY    = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;   // e.g. https://aimediaflow-xxxx.svc.aped-xxxx.pinecone.io

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

// ── RAG: search Pinecone ─────────────────────────────────────────────────────
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
      result?: { hits?: { fields?: { text?: string }; score?: number }[] };
    };

    const hits = data.result?.hits ?? [];
    const relevant = hits
      .filter(h => (h.score ?? 0) >= 0.6)
      .map(h => h.fields?.text ?? '')
      .filter(Boolean);

    return relevant.length > 0
      ? `Relevant knowledge:\n${relevant.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';
  } catch {
    return '';
  }
}

// ── LLM call ─────────────────────────────────────────────────────────────────
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
    // Google Gemini — OpenAI-compatible endpoint (Google AI Studio)
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

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!LLM_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Spam / abuse limits
  if (message.length > 500) {
    return res.status(400).json({ error: 'Message too long (max 500 characters)' });
  }
  if (Array.isArray(history) && history.length > 40) {
    return res.status(400).json({ error: 'Conversation too long' });
  }

  try {
    // 1. RAG — search knowledge base
    const context = await searchKnowledge(message);

    // 2. Build system prompt with context
    const systemPrompt = context
      ? `${SYSTEM_BASE}\n\n${context}`
      : SYSTEM_BASE;

    // 3. Build messages from history
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.sender === 'user') messages.push({ role: 'user', content: msg.text });
        else if (msg.sender === 'bot') messages.push({ role: 'assistant', content: msg.text });
      }
    }
    messages.push({ role: 'user', content: message });

    // 4. Call LLM
    const reply = await callLLM(systemPrompt, messages);

    return res.status(200).json({ reply });

  } catch (err: any) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
