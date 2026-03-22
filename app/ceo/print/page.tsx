"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

function Card() {
  return (
    <div className="card">
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
            size={72}
            bgColor="#ffffff"
            fgColor="#0d1b2a"
            level="M"
          />
        </div>
        <div className="qr-label">Scan to<br />save contact</div>
      </div>
    </div>
  );
}

export default function CeoPrintPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #d0d5db;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .hint {
          text-align: center;
          padding: 16px;
          font-size: 12px;
          color: #666;
        }

        /* ===== A4 SHEET ===== */
        .sheet {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          margin: 0 auto 24px;
          padding: 10mm;
          display: grid;
          grid-template-columns: 85mm 85mm;
          grid-template-rows: repeat(5, 54mm);
          gap: 5mm 5mm;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          position: relative;
        }

        /* cut lines between cards */
        .sheet::before {
          content: '';
          position: absolute;
          top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
          background-image:
            repeating-linear-gradient(
              to right,
              transparent,
              transparent calc(85mm - 0.5px),
              #ccc calc(85mm - 0.5px),
              #ccc calc(85mm + 4.5px),
              transparent calc(85mm + 4.5px),
              transparent 90mm
            ),
            repeating-linear-gradient(
              to bottom,
              transparent,
              transparent calc(54mm - 0.5px),
              #ccc calc(54mm - 0.5px),
              #ccc calc(54mm + 4.5px),
              transparent calc(54mm + 4.5px),
              transparent 59mm
            );
          pointer-events: none;
          z-index: 10;
        }

        /* ===== CARD ===== */
        .card {
          width: 85mm;
          height: 54mm;
          background: linear-gradient(135deg, #f8fbff 0%, #eef4fb 100%);
          border-radius: 3mm;
          padding: 5mm 5.5mm 4.5mm 5.5mm;
          display: flex;
          align-items: stretch;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2.5px;
          background: linear-gradient(90deg, #44C8F5 0%, #1a8fb5 60%, #0e5f80 100%);
        }

        .card::after {
          content: '';
          position: absolute;
          bottom: -4mm;
          right: 17mm;
          width: 26mm;
          height: 26mm;
          background-image: radial-gradient(circle, #44C8F5 1px, transparent 1px);
          background-size: 4mm 4mm;
          opacity: 0.12;
          pointer-events: none;
        }

        .arc {
          position: absolute;
          top: -8mm; left: -8mm;
          width: 26mm; height: 26mm;
          border-radius: 50%;
          border: 6px solid rgba(68,200,245,0.08);
          pointer-events: none;
        }
        .arc2 {
          position: absolute;
          top: -4mm; left: -4mm;
          width: 16mm; height: 16mm;
          border-radius: 50%;
          border: 3px solid rgba(68,200,245,0.06);
          pointer-events: none;
        }

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
          gap: 2.5mm;
        }

        .photo {
          width: 12mm;
          height: 12mm;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(68,200,245,0.5);
          flex-shrink: 0;
        }

        .name {
          font-size: 11pt;
          font-weight: 800;
          color: #0d1b2a;
          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .title-wrap {
          display: flex;
          align-items: center;
          gap: 1.5mm;
          margin-top: 1px;
        }

        .title {
          font-size: 6pt;
          font-weight: 600;
          color: #44C8F5;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .title-dot {
          width: 2px; height: 2px;
          border-radius: 50%;
          background: #44C8F5;
          opacity: 0.5;
        }

        .company-name {
          font-size: 6pt;
          font-weight: 700;
          color: #0d1b2a;
        }
        .company-name span { color: #44C8F5; }

        .tagline {
          font-size: 5.5pt;
          color: #4a6080;
          line-height: 1.5;
          margin-top: 2mm;
          font-style: italic;
        }

        .contacts {
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 1.8mm;
          font-size: 6pt;
          color: #2a3a4a;
          font-weight: 500;
        }

        .contact-icon {
          width: 3.5mm; height: 3.5mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #44C8F5;
        }

        .divider {
          width: 0.3mm;
          background: linear-gradient(to bottom, transparent, rgba(68,200,245,0.25) 20%, rgba(68,200,245,0.25) 80%, transparent);
          margin: 0 4mm;
          flex-shrink: 0;
        }

        .right {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5mm;
          flex-shrink: 0;
          z-index: 1;
        }

        .qr-wrap {
          padding: 1.5mm;
          border: 0.8px solid rgba(68,200,245,0.3);
          border-radius: 1.5mm;
          background: #fff;
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

        /* ===== PRINT ===== */
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            background: #fff;
          }
          .hint { display: none; }
          .sheet {
            width: 210mm;
            min-height: 0;
            height: 297mm;
            margin: 0;
            box-shadow: none;
            transform: none !important;
            padding: 10mm;
          }
        }

        /* ===== SCREEN — scale down A4 to fit ===== */
        @media screen {
          .sheet {
            transform-origin: top center;
            transform: scale(0.65);
            margin-bottom: -100mm;
          }
        }
      `}</style>

      <div className="hint">Ctrl+P → Paper: A4 · Margins: None · Scale: 100% → Save as PDF · 10 cards per sheet</div>

      <div className="sheet">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} />
        ))}
      </div>
    </>
  );
}
