"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";

export default function CeoCardPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  async function downloadPNG() {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 4, // 4x resolution → sharp print quality
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = "serhii-baliasnyi-business-card.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }

        body {
          font-family: 'Inter', sans-serif;
          background: #1a1a2e;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 40px 20px;
        }

        .label {
          font-size: 11px;
          color: #44C8F5;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
          opacity: 0.7;
        }

        /* ── CARD ── */
        .card {
          width: 321px;   /* 85mm @ 96dpi */
          height: 204px;  /* 54mm @ 96dpi */
          background: linear-gradient(135deg, #f8fbff 0%, #eef4fb 100%);
          border-radius: 11px;
          padding: 19px 19px 15px 19px;
          display: flex;
          align-items: stretch;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(68,200,245,0.15);
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #44C8F5, #0e5f80);
        }

        .dots {
          position: absolute;
          bottom: -11px; right: 57px;
          width: 91px; height: 91px;
          background-image: radial-gradient(circle, #44C8F5 0.8px, transparent 0.8px);
          background-size: 13px 13px;
          opacity: 0.13;
        }

        .arc {
          position: absolute;
          top: -26px; left: -26px;
          width: 91px; height: 91px;
          border-radius: 50%;
          border: 6px solid rgba(68,200,245,0.08);
        }

        .arc2 {
          position: absolute;
          top: -11px; left: -11px;
          width: 53px; height: 53px;
          border-radius: 50%;
          border: 4px solid rgba(68,200,245,0.06);
        }

        .left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .top { display: flex; align-items: center; gap: 9px; }

        .photo {
          width: 42px; height: 42px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(68,200,245,0.5);
          flex-shrink: 0;
        }

        .name {
          font-size: 13px;
          font-weight: 800;
          color: #0d1b2a;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .title-wrap { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .title { font-size: 7px; font-weight: 700; color: #44C8F5; text-transform: uppercase; letter-spacing: 0.07em; }
        .title-dot { width: 2.5px; height: 2.5px; border-radius: 50%; background: #44C8F5; opacity: 0.5; }
        .co { font-size: 7px; font-weight: 700; color: #0d1b2a; }
        .co span { color: #44C8F5; }

        .tagline { font-size: 6px; color: #4a6080; line-height: 1.5; margin-top: 7px; font-style: italic; }

        .contacts { display: flex; flex-direction: column; gap: 5px; }
        .row { display: flex; align-items: center; gap: 7px; font-size: 7px; color: #2a3a4a; font-weight: 500; }

        .vline {
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(68,200,245,0.3) 20%, rgba(68,200,245,0.3) 80%, transparent);
          margin: 0 13px;
          flex-shrink: 0;
        }

        .right {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px; flex-shrink: 0; z-index: 1;
        }

        .qr-box {
          padding: 5px;
          border: 1px solid rgba(68,200,245,0.35);
          border-radius: 6px;
          background: #fff;
        }

        .qr-lbl {
          font-size: 5.5px; color: #7a9ab5;
          text-align: center; letter-spacing: 0.08em;
          text-transform: uppercase; line-height: 1.4; font-weight: 700;
        }

        /* ── DOWNLOAD BUTTON ── */
        .dl-btn {
          padding: 14px 36px;
          border-radius: 12px;
          background: linear-gradient(135deg, #44C8F5, #1a8fb5);
          border: none;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: opacity 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .dl-btn:hover { opacity: 0.85; }
        .dl-btn:disabled { opacity: 0.5; cursor: default; }

        .note {
          font-size: 11px;
          color: #4a6080;
          text-align: center;
          line-height: 1.6;
        }
      `}</style>

      <div className="label">Business Card Preview — 85 × 54 mm</div>

      <div className="card" ref={cardRef}>
        <div className="arc" />
        <div className="arc2" />
        <div className="dots" />

        <div className="left">
          <div>
            <div className="top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/photo.png" alt="Serhii Baliasnyi" width={42} height={42} className="photo" crossOrigin="anonymous" />
              <div>
                <div className="name">Serhii Baliasnyi</div>
                <div className="title-wrap">
                  <span className="title">Founder &amp; CEO</span>
                  <span className="title-dot" />
                  <span className="co"><span>AI</span>MediaFlow</span>
                </div>
              </div>
            </div>
            <div className="tagline">Helping businesses automate workflows &amp; content with AI · Kerry, Ireland</div>
          </div>
          <div className="contacts">
            <div className="row">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#44C8F5" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
              +353 85 2007 612
            </div>
            <div className="row">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#44C8F5" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              info@aimediaflow.net
            </div>
            <div className="row">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#44C8F5" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              aimediaflow.net
            </div>
          </div>
        </div>

        <div className="vline" />

        <div className="right">
          <div className="qr-box">
            <QRCodeSVG value="https://aimediaflow.net/ceo" size={64} bgColor="#fff" fgColor="#0d1b2a" level="M" />
          </div>
          <div className="qr-lbl">SCAN TO<br />SAVE CONTACT</div>
        </div>
      </div>

      <button className="dl-btn" onClick={downloadPNG} disabled={loading}>
        {loading ? "Generating…" : "⬇ Download PNG"}
      </button>

      <div className="note">
        High-resolution PNG (4× scale) · ready for print or digital use<br />
        Send to print shop or use as digital business card image
      </div>
    </>
  );
}
