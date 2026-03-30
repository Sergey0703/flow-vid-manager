"use client";


export default function CeoCardPage() {
  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: -apple-system, sans-serif;
          background: #1a1a2e;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
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
        .card-img {
          border-radius: 12px;
          box-shadow: 0 16px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(68,200,245,0.15);
          max-width: min(800px, 100%);
          width: auto;
          height: auto;
          display: block;
        }
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
          text-decoration: none;
          transition: opacity 0.2s;
          display: inline-block;
        }
        .dl-btn:hover { opacity: 0.85; }
        .note {
          font-size: 11px;
          color: #4a6080;
          text-align: center;
          line-height: 1.6;
        }
      `}</style>

      <div className="label">Business Card · 85 × 54 mm</div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/card7.png"
        alt="Serhii Baliasnyi — Founder & CEO, AIMediaFlow"
        className="card-img"
      />

      <a className="dl-btn" href="/card7.png" download="serhii-baliasnyi-business-card.png">
        ⬇ Download PNG
      </a>

      <div className="note">
        Ready for print or digital use · send to print shop or share online
      </div>
    </>
  );
}
