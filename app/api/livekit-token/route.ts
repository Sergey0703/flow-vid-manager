import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';

const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_URL        = process.env.LIVEKIT_URL ?? 'wss://first-aaelw7kf.livekit.cloud';
const AGENT_NAME         = process.env.LIVEKIT_AGENT_NAME ?? 'aimediaflow-agent';

const RATE_LIMIT_MAX    = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const ALLOWED_ORIGINS = [
  'https://aimediaflow.net',
  'https://www.aimediaflow.net',
  'http://localhost:3000',
  'http://localhost:8080',
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

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500, headers: corsHeaders });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many sessions. Please try again later.' },
      { status: 429, headers: corsHeaders }
    );
  }

  const body = await req.json().catch(() => ({}));
  const requestedAgent = typeof body?.agentName === 'string' ? body.agentName : null;
  const agentName = requestedAgent ?? AGENT_NAME;

  const roomName = `aimediaflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `visitor-${Date.now()}`,
    name: 'Visitor',
    ttl: 3 * 60,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  const jwt = await token.toJwt();

  // Explicit agent dispatch (RoomAgentDispatch via token config doesn't work with self-hosted workers)
  const httpUrl = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
  const dispatchClient = new AgentDispatchClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  await dispatchClient.createDispatch(roomName, agentName).catch((e) =>
    console.error('[livekit-token] dispatch error:', e?.message)
  );

  return NextResponse.json({ wsUrl: LIVEKIT_URL, token: jwt, roomName }, { headers: corsHeaders });
}
