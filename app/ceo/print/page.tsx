"use client";

export default function CeoPrintPage() {
  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }

        @page { size: A4 portrait; margin: 0; }

        body { font-family: sans-serif; background: #e0e4e8; }

        .hint {
          text-align: center;
          padding: 12px;
          font-size: 12px;
          color: #666;
          background: #e0e4e8;
        }

        .sheet {
          width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 8mm 8mm 0 8mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          box-sizing: border-box;
        }

        .card-wrap {
          padding: 2mm;
          border: 0.3pt dashed #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-wrap img {
          width: 85mm;
          height: auto;
          display: block;
        }

        @media print {
          body { background: #fff; }
          .hint { display: none; }
          .sheet { width: 210mm; padding: 8mm 8mm 0 8mm; }
          .card-wrap { border-color: #bbb; }
        }

        @media screen {
          .sheet {
            transform: scale(0.68);
            transform-origin: top center;
            margin-bottom: -110mm;
          }
        }
      `}</style>

      <div className="hint">Ctrl+P → Margins: None · Headers and footers: OFF · Scale: 100% · A4</div>

      <div className="sheet">
        {Array.from({ length: 10 }).map((_, i) => (
          <div className="card-wrap" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/card3.png" alt="Business card" />
          </div>
        ))}
      </div>
    </>
  );
}
