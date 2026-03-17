import type { VercelRequest, VercelResponse } from '@vercel/node';

// LiveKit Agent Builder sends end-of-call summary here.
// Payload shape (approximate, fields may vary):
// {
//   summary: string,           // LLM-generated call summary
//   room_name?: string,
//   participant_identity?: string,
//   duration?: number,         // seconds
//   transcript?: string,       // full conversation text
//   metadata?: object,
//   ... (any other fields Builder sends)
// }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const TO_EMAIL = process.env.CONTACT_EMAIL || 'info@aimediaflow.net';

  if (!BREVO_API_KEY) {
    console.error('call-summary: BREVO_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const payload = req.body ?? {};
  const now = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' });

  // Extract known fields with fallbacks
  const summary     = payload.summary     ?? payload.call_summary ?? '';
  const roomName    = payload.room_name   ?? payload.roomName     ?? 'unknown';
  const identity    = payload.participant_identity ?? payload.identity ?? 'visitor';
  const duration    = payload.duration    != null ? `${Math.round(payload.duration)}s` : 'unknown';
  const transcript  = payload.transcript  ?? '';

  // Format remaining fields as a table
  const knownKeys = new Set(['summary', 'call_summary', 'room_name', 'roomName',
    'participant_identity', 'identity', 'duration', 'transcript']);
  const extra = Object.entries(payload)
    .filter(([k]) => !knownKeys.has(k))
    .map(([k, v]) => `<tr>
      <td style="padding:6px 0;color:#666;width:160px;vertical-align:top"><strong>${k}:</strong></td>
      <td style="padding:6px 0;white-space:pre-wrap">${JSON.stringify(v, null, 2)}</td>
    </tr>`)
    .join('');

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="color:#e63946;border-bottom:2px solid #e63946;padding-bottom:10px">
        📞 Voice Call Summary — AIMediaFlow
      </h2>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;color:#666;width:160px"><strong>Time:</strong></td>
          <td style="padding:6px 0">${now}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666"><strong>Room:</strong></td>
          <td style="padding:6px 0;font-family:monospace">${roomName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666"><strong>Visitor:</strong></td>
          <td style="padding:6px 0">${identity}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666"><strong>Duration:</strong></td>
          <td style="padding:6px 0">${duration}</td>
        </tr>
        ${extra}
      </table>

      ${summary ? `
      <h3 style="margin-top:24px;color:#333">AI Summary</h3>
      <div style="background:#f9f9f9;border-left:4px solid #e63946;padding:12px 16px;border-radius:4px;white-space:pre-wrap">${summary}</div>
      ` : ''}

      ${transcript ? `
      <h3 style="margin-top:24px;color:#333">Transcript</h3>
      <div style="background:#f5f5f5;padding:12px 16px;border-radius:4px;font-size:13px;white-space:pre-wrap;max-height:400px;overflow:auto">${transcript}</div>
      ` : ''}

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee"/>
      <p style="color:#999;font-size:12px">Auto-sent by AIMediaFlow voice agent (LiveKit Agent Builder)</p>
    </div>
  `;

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'AIMediaFlow Voice Agent', email: 'noreply@aimediaflow.net' },
        to: [{ email: TO_EMAIL, name: 'AIMediaFlow Admin' }],
        subject: `📞 Voice call summary — ${now}`,
        htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const err = await brevoRes.text();
      console.error('call-summary Brevo error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    console.log('call-summary: email sent for room', roomName);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('call-summary error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
