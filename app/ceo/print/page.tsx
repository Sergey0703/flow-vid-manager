"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

export default function CeoPrintPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #e8edf2;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, sans-serif;
          overflow-x: hidden;
        }

        .page {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
          width: 100%;
        }

        .hint {
          font-size: 12px;
          color: #888;
          text-align: center;
        }

        /* ===== CARD ===== */
        .card {
          width: 85mm;
          height: 54mm;
          background: linear-gradient(135deg, #f8fbff 0%, #eef4fb 100%);
          border-radius: 3.5mm;
          padding: 5.5mm 6mm 5mm 6mm;
          display: flex;
          align-items: stretch;
          gap: 0;
          box-shadow: 0 4px 24px rgba(0,0,0,0.13);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* top accent bar */
        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2.5px;
          background: linear-gradient(90deg, #44C8F5 0%, #1a8fb5 60%, #0e5f80 100%);
        }

        /* background geometry — dots grid bottom-right */
        .card::after {
          content: '';
          position: absolute;
          bottom: -4mm;
          right: 18mm;
          width: 28mm;
          height: 28mm;
          background-image: radial-gradient(circle, #44C8F5 1px, transparent 1px);
          background-size: 4mm 4mm;
          opacity: 0.13;
          pointer-events: none;
        }

        /* neural arc top-left */
        .arc {
          position: absolute;
          top: -8mm;
          left: -8mm;
          width: 28mm;
          height: 28mm;
          border-radius: 50%;
          border: 6px solid rgba(68,200,245,0.08);
          pointer-events: none;
        }
        .arc2 {
          position: absolute;
          top: -4mm;
          left: -4mm;
          width: 18mm;
          height: 18mm;
          border-radius: 50%;
          border: 3px solid rgba(68,200,245,0.06);
          pointer-events: none;
        }

        /* ===== LEFT ===== */
        .left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .top {
          display: flex;
          align-items: center;
          gap: 3mm;
        }

        .photo {
          width: 13mm;
          height: 13mm;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(68,200,245,0.5);
          flex-shrink: 0;
          box-shadow: 0 1px 6px rgba(68,200,245,0.15);
        }

        .name {
          font-size: 11.5pt;
          font-weight: 800;
          color: #0d1b2a;
          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .title-wrap {
          display: flex;
          align-items: center;
          gap: 1.5mm;
          margin-top: 1.5px;
        }

        .title {
          font-size: 6.5pt;
          font-weight: 600;
          color: #44C8F5;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .title-dot {
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: #44C8F5;
          opacity: 0.5;
        }

        .company-name {
          font-size: 6.5pt;
          font-weight: 700;
          color: #0d1b2a;
          letter-spacing: 0.02em;
        }

        .company-name span { color: #44C8F5; }

        .tagline {
          font-size: 6pt;
          color: #4a6080;
          line-height: 1.5;
          margin-top: 2.5mm;
          max-width: 46mm;
          font-style: italic;
        }

        .contacts {
          display: flex;
          flex-direction: column;
          gap: 1.8mm;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 2mm;
          font-size: 6.5pt;
          color: #2a3a4a;
          font-weight: 500;
        }

        .contact-icon {
          width: 4mm;
          height: 4mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #44C8F5;
        }

        /* ===== DIVIDER ===== */
        .divider {
          width: 0.3mm;
          background: linear-gradient(to bottom, transparent, rgba(68,200,245,0.25) 20%, rgba(68,200,245,0.25) 80%, transparent);
          margin: 0 5mm;
          flex-shrink: 0;
        }

        /* ===== RIGHT ===== */
        .right {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2mm;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .qr-wrap {
          padding: 1.5mm;
          border: 0.8px solid rgba(68,200,245,0.3);
          border-radius: 2mm;
          background: #fff;
          box-shadow: 0 1px 6px rgba(68,200,245,0.1);
        }

        .qr-label {
          font-size: 5pt;
          color: #7a9ab5;
          text-align: center;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: 1.4;
          font-weight: 600;
        }

        /* screen: scale down so it fits */
        @media screen {
          .card {
            transform: scale(0.85);
            transform-origin: top center;
          }
          .page { gap: 0; }
        }

        /* ===== PRINT ===== */
        @media print {
          body { background: #fff; }
          .hint { display: none; }
          .page { padding: 0; }
          .card {
            transform: none;
            box-shadow: none;
            border: 0.3pt solid #ccc;
          }
        }
      `}</style>

      <div className="page">
        <p className="hint">Ctrl+P → Margins: None → Save as PDF · 85×54mm</p>

        <div className="card">
          {/* decorative arcs */}
          <div className="arc" />
          <div className="arc2" />

          {/* LEFT */}
          <div className="left">
            <div>
              <div className="top">
                <Image
                  src="/photo.png"
                  alt="Serhii Baliasnyi"
                  width={49}
                  height={49}
                  className="photo"
                />
                <div>
                  <div className="name">Serhii Baliasnyi</div>
                  <div className="title-wrap">
                    <span className="title">Founder & CEO</span>
                    <div className="title-dot" />
                    <span className="company-name"><span>AI</span>MediaFlow</span>
                  </div>
                </div>
              </div>
              <div className="tagline">
                Helping businesses automate workflows<br />&amp; content with AI · Kerry, Ireland
              </div>
            </div>

            <div className="contacts">
              <div className="contact-row">
                <div className="contact-icon">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
                </div>
                +353 85 2007 612
              </div>
              <div className="contact-row">
                <div className="contact-icon">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                info@aimediaflow.net
              </div>
              <div className="contact-row">
                <div className="contact-icon">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                aimediaflow.net
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="divider" />

          {/* RIGHT */}
          <div className="right">
            <div className="qr-wrap">
              <QRCodeSVG
                value="https://aimediaflow.net/ceo"
                size={75}
                bgColor="#ffffff"
                fgColor="#0d1b2a"
                level="M"
              />
            </div>
            <div className="qr-label">Scan to<br />save contact</div>
          </div>
        </div>
      </div>
    </>
  );
}
