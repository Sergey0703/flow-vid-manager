import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_URL        = process.env.LIVEKIT_URL ?? 'wss://first-aaelw7kf.livekit.cloud';
const AGENT_NAME         = process.env.LIVEKIT_AGENT_NAME ?? 'aimediaflow-agent';

// ── In-memory rate limit ──────────────────────────────────────────────────────
// Max 3 sessions per IP per hour
const RATE_LIMIT_MAX      = 3;
const RATE_LIMIT_WINDOW   = 60 * 60 * 1000; // 1 hour in ms
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

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(500).json({ error: 'LiveKit not configured' });
  }

  // Get IP
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many sessions. Please try again later.' });
  }

  // Generate unique room name per session
  const roomName = `aimediaflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Build token — max 5 minutes session
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `visitor-${Date.now()}`,
    name: 'Visitor',
    ttl: 5 * 60, // token valid 5 minutes
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  // Dispatch agent to the room
  token.roomConfig = {
    agents: [{ agentName: AGENT_NAME }],
    maxParticipantDuration: 5 * 60, // kick after 5 min
  };

  const jwt = await token.toJwt();

  return res.status(200).json({
    wsUrl: LIVEKIT_URL,
    token: jwt,
    roomName,
  });
}
