"use client";

import Image from "next/image";

const VCARD = `BEGIN:VCARD
VERSION:3.0
FN:Serhii Baliasnyi
ORG:AIMediaFlow
TITLE:Founder & CEO
EMAIL:info@aimediaflow.net
TEL;TYPE=CELL:+353852007612
URL:https://aimediaflow.net
END:VCARD`;

function downloadVCard() {
  const blob = new Blob([VCARD], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "serhii-baliasnyi.vcf";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CeoPage() {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0f; }
        .card {
          min-height: 100svh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .card-inner {
          width: 100%;
          max-width: 380px;
          background: linear-gradient(145deg, #13131a, #1a1a2e);
          border: 1px solid rgba(68,200,245,0.15);
          border-radius: 24px;
          padding: 40px 32px 32px;
          text-align: center;
          box-shadow: 0 0 60px rgba(68,200,245,0.06), 0 20px 60px rgba(0,0,0,0.5);
        }
        .avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(68,200,245,0.4);
          margin-bottom: 16px;
        }
        .name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }
        .title {
          font-size: 0.9rem;
          color: #44C8F5;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .company {
          font-size: 0.85rem;
          color: #6e7681;
          margin-bottom: 28px;
        }
        .divider {
          height: 1px;
          background: rgba(68,200,245,0.1);
          margin-bottom: 24px;
        }
        .tagline {
          font-size: 0.85rem;
          color: #b0b8c8;
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .link-btn--primary {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-radius: 12px;
          background: rgba(37,211,102,0.12);
          border: 1px solid rgba(37,211,102,0.3);
          color: #e0e0e0;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 12px;
          transition: background 0.2s;
        }
        .link-btn--primary:hover {
          background: rgba(37,211,102,0.2);
        }
        .links-secondary {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .link-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          color: #e0e0e0;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: background 0.2s, border-color 0.2s;
        }
        .link-btn:hover {
          background: rgba(68,200,245,0.08);
          border-color: rgba(68,200,245,0.25);
        }
        .link-btn .icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.1rem;
        }
        .icon-wa { background: rgba(37,211,102,0.15); }
        .icon-email { background: rgba(68,200,245,0.12); }
        .icon-web { background: rgba(255,255,255,0.06); }
        .link-label { text-align: left; }
        .link-label span { display: block; font-size: 0.75rem; color: #6e7681; font-weight: 400; }
        .save-btn {
          width: 100%;
          padding: 15px;
          border-radius: 12px;
          background: linear-gradient(135deg, #44C8F5, #1a8fb5);
          border: none;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: opacity 0.2s;
        }
        .save-btn:hover { opacity: 0.9; }
        .trust {
          margin-top: 16px;
          font-size: 0.75rem;
          color: #44C8F5;
          opacity: 0.6;
          letter-spacing: 0.03em;
        }
        .footer {
          margin-top: 8px;
          font-size: 0.72rem;
          color: #3a3a4a;
        }
      `}</style>

      <div className="card">
        <div className="card-inner">
          <Image
            src="/photo.png"
            alt="Serhii Baliasnyi"
            width={90}
            height={90}
            className="avatar"
          />
          <div className="name">Serhii Baliasnyi</div>
          <div className="title">Founder & CEO · AIMediaFlow</div>
          <div className="tagline">Helping businesses automate workflows & content with AI</div>
          <div className="company">Kerry, Ireland</div>

          <div className="divider" />

          <a href="https://wa.me/353852007612" className="link-btn link-btn--primary" target="_blank" rel="noopener noreferrer">
            <div className="icon icon-wa">💬</div>
            <div className="link-label">
              Message me on WhatsApp
              <span>+353 85 2007 612 · usually replies fast</span>
            </div>
          </a>

          <div className="links-secondary">
            <a href="mailto:info@aimediaflow.net" className="link-btn">
              <div className="icon icon-email">✉️</div>
              <div className="link-label">
                Email
                <span>info@aimediaflow.net</span>
              </div>
            </a>
            <a href="https://aimediaflow.net" className="link-btn" target="_blank" rel="noopener noreferrer">
              <div className="icon icon-web">🌐</div>
              <div className="link-label">
                Website
                <span>aimediaflow.net</span>
              </div>
            </a>
          </div>

          <button className="save-btn" onClick={downloadVCard}>
            💾 Save my contact in 1 tap
          </button>

          <div className="trust">AI automation · Voice agents · Media workflows</div>
          <div className="footer">AIMediaFlow · Kerry, Ireland</div>
        </div>
      </div>
    </>
  );
}
