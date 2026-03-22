"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

function Card() {
  return (
    <div className="card">
      <div className="arc" />
      <div className="arc2" />
      <div className="dots" />

      <div className="left">
        <div>
          <div className="top">
            <Image src="/photo.png" alt="Serhii Baliasnyi" width={46} height={46} className="photo" />
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
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#44C8F5" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
            +353 85 2007 612
          </div>
          <div className="row">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#44C8F5" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            info@aimediaflow.net
          </div>
          <div className="row">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#44C8F5" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            aimediaflow.net
          </div>
        </div>
      </div>

      <div className="vline" />

      <div className="right">
        <div className="qr-box">
          <QRCodeSVG value="https://aimediaflow.net/ceo" size={68} bgColor="#fff" fgColor="#0d1b2a" level="M" />
        </div>
        <div className="qr-lbl">SCAN TO<br />SAVE CONTACT</div>
      </div>
    </div>
  );
}

export default function CeoPrintPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }

        @page { size: A4 portrait; margin: 10mm; }

        body { font-family: 'Inter', sans-serif; background: #e0e4e8; }

        .hint {
          text-align: center;
          padding: 12px;
          font-size: 12px;
          color: #666;
          background: #e0e4e8;
        }

        .sheet {
          width: 190mm;
          margin: 0 auto;
          background: white;
          padding: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }

        /* cut guides */
        .card-wrap {
          padding: 2mm;
          border: 0.3pt dashed #ccc;
        }

        /* CARD */
        .card {
          width: 85mm;
          height: 54mm;
          background: linear-gradient(135deg, #f8fbff 0%, #eef4fb 100%);
          border-radius: 3mm;
          padding: 5mm 5mm 4mm 5mm;
          display: flex;
          align-items: stretch;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2.5pt;
          background: linear-gradient(90deg, #44C8F5, #0e5f80);
        }

        .dots {
          position: absolute;
          bottom: -3mm; right: 15mm;
          width: 24mm; height: 24mm;
          background-image: radial-gradient(circle, #44C8F5 0.8px, transparent 0.8px);
          background-size: 3.5mm 3.5mm;
          opacity: 0.13;
        }

        .arc {
          position: absolute;
          top: -7mm; left: -7mm;
          width: 24mm; height: 24mm;
          border-radius: 50%;
          border: 5pt solid rgba(68,200,245,0.08);
        }

        .arc2 {
          position: absolute;
          top: -3mm; left: -3mm;
          width: 14mm; height: 14mm;
          border-radius: 50%;
          border: 3pt solid rgba(68,200,245,0.06);
        }

        .left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .top { display: flex; align-items: center; gap: 2.5mm; }

        .photo {
          width: 11mm; height: 11mm;
          border-radius: 50%;
          object-fit: cover;
          border: 1pt solid rgba(68,200,245,0.5);
          flex-shrink: 0;
        }

        .name {
          font-size: 10.5pt;
          font-weight: 800;
          color: #0d1b2a;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .title-wrap { display: flex; align-items: center; gap: 1.5mm; margin-top: 1pt; }
        .title { font-size: 5.5pt; font-weight: 700; color: #44C8F5; text-transform: uppercase; letter-spacing: 0.07em; }
        .title-dot { width: 2pt; height: 2pt; border-radius: 50%; background: #44C8F5; opacity: 0.5; }
        .co { font-size: 5.5pt; font-weight: 700; color: #0d1b2a; }
        .co span { color: #44C8F5; }

        .tagline { font-size: 5pt; color: #4a6080; line-height: 1.5; margin-top: 2mm; font-style: italic; }

        .contacts { display: flex; flex-direction: column; gap: 1.5mm; }
        .row { display: flex; align-items: center; gap: 1.8mm; font-size: 5.5pt; color: #2a3a4a; font-weight: 500; }

        .vline {
          width: 0.3pt;
          background: linear-gradient(to bottom, transparent, rgba(68,200,245,0.3) 20%, rgba(68,200,245,0.3) 80%, transparent);
          margin: 0 3.5mm;
          flex-shrink: 0;
        }

        .right {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1.5mm; flex-shrink: 0; z-index: 1;
        }

        .qr-box {
          padding: 1.5mm;
          border: 0.8pt solid rgba(68,200,245,0.35);
          border-radius: 1.5mm;
          background: #fff;
        }

        .qr-lbl {
          font-size: 4.5pt; color: #7a9ab5;
          text-align: center; letter-spacing: 0.08em;
          text-transform: uppercase; line-height: 1.4; font-weight: 700;
        }

        @media print {
          body { background: #fff; }
          .hint { display: none; }
          .sheet { width: 100%; }
          .card-wrap { border-color: #ddd; }
        }

        @media screen {
          .sheet {
            transform: scale(0.72);
            transform-origin: top center;
            margin-bottom: -80mm;
          }
        }
      `}</style>

      <div className="hint">Ctrl+P → A4 · Margins: None · Scale: 100% · Save as PDF → send to print shop</div>

      <div className="sheet">
        {Array.from({ length: 10 }).map((_, i) => (
          <div className="card-wrap" key={i}>
            <Card />
          </div>
        ))}
      </div>
    </>
  );
}
