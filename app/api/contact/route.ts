import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://aimediaflow.net',
  'https://www.aimediaflow.net',
  'http://localhost:3000',
  'http://localhost:3001',
];

function corsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  const cors = corsHeaders(origin);

  const body = await req.json().catch(() => ({}));
  const { firstName, lastName, email, phone, message, website } = body;

  // Honeypot check
  if (website) {
    return NextResponse.json({ success: true }, { headers: cors });
  }

  if (!firstName || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: cors });
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const TO_EMAIL = process.env.CONTACT_EMAIL || 'info@aimediaflow.net';

  if (!BREVO_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500, headers: cors });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'AIMediaFlow Contact Form',
          email: 'noreply@aimediaflow.net',
        },
        to: [{ email: TO_EMAIL, name: 'AIMediaFlow Admin' }],
        replyTo: { email, name: `${firstName} ${lastName || ''}`.trim() },
        subject: `New contact from ${firstName} ${lastName || ''} — AIMediaFlow`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e63946; border-bottom: 2px solid #e63946; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0;">${firstName} ${lastName || ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                <td style="padding: 8px 0;"><a href="tel:${phone}">${phone}</a></td>
              </tr>` : ''}
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Message:</strong></td>
                <td style="padding: 8px 0; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
            <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">
              Sent from AIMediaFlow contact form · Reply directly to respond to ${firstName}
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Brevo error:', err);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500, headers: cors });
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: cors });
  }
}
