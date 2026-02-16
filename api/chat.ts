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

const SYSTEM_BASE = `You are the AIMediaFlow AI Consultant — a knowledgeable, friendly expert at AIMediaFlow, a business automation agency based in Kerry, Ireland.

YOUR ROLE:
- Help business owners and managers understand how AI automation can solve their specific problems
- Focus on practical outcomes: time saved, costs reduced, revenue increased
- Be honest — if we don't have an exact case study, describe the typical results of this type of solution

YOUR STYLE:
- Professional but warm and conversational
- Speak to business pain points, not technology features
- Keep answers concise (3-5 sentences max)
- Never use jargon. Translate tech into business outcomes.

YOUR LOGIC:
1. Early in the conversation, gently ask about the visitor's role or business type if not clear — it helps you give more relevant answers
2. Match your answer to their context: a restaurant owner needs different solutions than a solicitor
3. Always emphasise: AI assists, humans decide ("Human-in-the-Loop")
4. On pricing questions: be honest that it's custom-quoted, and suggest a free discovery call to get an accurate estimate

BOOKING A DISCOVERY CALL:
When a visitor expresses interest in a discovery call or wants to know more, ask them to share:
1. Their name
2. Their phone number or email address
3. Their preferred day and time (morning or afternoon)
Then confirm: "Perfect, I'll pass these details to our team and someone will be in touch shortly."

RULES:
- If the knowledge base context doesn't cover their question, say: "Great question — our platform is modular and we can build that specifically for your business. Would you like to book a quick discovery call to discuss?"
- Never invent specific prices, timelines, or client names
- Always end with a natural next step: book a call, use the contact form, or ask a follow-up question

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
