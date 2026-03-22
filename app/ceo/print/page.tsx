"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

export default function CeoPrintPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .page {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
        }

        .hint {
          font-size: 13px;
          color: #888;
          text-align: center;
        }

        /* === CARD === */
        .card {
          width: 85mm;
          height: 54mm;
          background: #fff;
          border-radius: 4mm;
          padding: 6mm 7mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5mm;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12);
          position: relative;
          overflow: hidden;
        }

        /* accent bar top */
        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #44C8F5, #1a8fb5);
        }

        /* LEFT side */
        .left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          flex: 1;
        }

        .top {
          display: flex;
          align-items: center;
          gap: 3mm;
        }

        .photo {
          width: 12mm;
          height: 12mm;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #e0e0e0;
          flex-shrink: 0;
        }

        .name-block {}

        .name {
          font-size: 11pt;
          font-weight: 700;
          color: #111;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .title {
          font-size: 7pt;
          color: #44C8F5;
          font-weight: 600;
          margin-top: 1px;
        }

        .tagline {
          font-size: 6.5pt;
          color: #555;
          line-height: 1.4;
          margin-top: 2mm;
          max-width: 48mm;
        }

        .contacts {
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 2mm;
          font-size: 6.5pt;
          color: #333;
        }

        .contact-row svg {
          flex-shrink: 0;
          color: #44C8F5;
        }

        .brand {
          font-size: 7pt;
          font-weight: 700;
          color: #111;
          letter-spacing: 0.02em;
        }

        .brand span {
          color: #44C8F5;
        }

        /* RIGHT side - QR */
        .right {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2mm;
          flex-shrink: 0;
        }

        .qr-wrap {
          padding: 2mm;
          border: 1px solid #e8e8e8;
          border-radius: 2mm;
          background: #fff;
        }

        .qr-label {
          font-size: 5.5pt;
          color: #999;
          text-align: center;
          letter-spacing: 0.03em;
        }

        /* === PRINT === */
        @media print {
          body { background: #fff; }
          .hint { display: none; }
          .page { padding: 0; gap: 0; }
          .card {
            box-shadow: none;
            border: 0.5pt solid #ddd;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="page">
        <p className="hint">Press Ctrl+P → Save as PDF · Size: 85×54mm (standard business card)</p>

        <div className="card">
          {/* LEFT */}
          <div className="left">
            <div>
              <div className="top">
                <Image
                  src="/photo.png"
                  alt="Serhii Baliasnyi"
                  width={45}
                  height={45}
                  className="photo"
                />
                <div className="name-block">
                  <div className="name">Serhii Baliasnyi</div>
                  <div className="title">Founder & CEO</div>
                </div>
              </div>
              <div className="tagline">
                Helping businesses automate workflows<br />& content with AI
              </div>
            </div>

            <div className="contacts">
              <div className="contact-row">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
                +353 85 2007 612
              </div>
              <div className="contact-row">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                info@aimediaflow.net
              </div>
              <div className="contact-row">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                aimediaflow.net
              </div>
            </div>

            <div className="brand"><span>AI</span>MediaFlow</div>
          </div>

          {/* RIGHT - QR */}
          <div className="right">
            <div className="qr-wrap">
              <QRCodeSVG
                value="https://aimediaflow.net/ceo"
                size={80}
                bgColor="#ffffff"
                fgColor="#111111"
                level="M"
              />
            </div>
            <div className="qr-label">SCAN TO<br />SAVE CONTACT</div>
          </div>
        </div>
      </div>
    </>
  );
}
