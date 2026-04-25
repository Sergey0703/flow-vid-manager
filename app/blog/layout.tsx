import Link from 'next/link';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-page" style={{ minHeight: '100vh', background: '#ffffff' }}>

      {/* Dark header — matches main site style */}
      <header style={{
        background: 'hsl(220, 20%, 8%)',
        borderBottom: '1px solid hsl(220, 25%, 18%)',
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 700, fontSize: 18, fontFamily: 'sans-serif', letterSpacing: '-0.3px' }}>
              <span style={{ color: '#ef4444' }}>AI</span><span style={{ color: '#ffffff' }}>MediaFlow</span>
            </span>
          </Link>
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <Link href="/" style={{ color: 'hsl(200, 20%, 65%)', fontSize: 14, textDecoration: 'none', fontFamily: 'sans-serif' }}>
              Home
            </Link>
            <Link href="/blog" style={{ color: 'hsl(190, 100%, 50%)', fontSize: 14, textDecoration: 'none', fontWeight: 600, fontFamily: 'sans-serif' }}>
              Blog
            </Link>
            <a
              href="https://wa.me/353852007612"
              style={{
                background: 'hsl(190, 100%, 50%)',
                color: 'hsl(220, 20%, 8%)',
                padding: '7px 18px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'sans-serif',
              }}
            >
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* White content area */}
      <div style={{ background: '#ffffff', color: '#1e293b' }}>
        {children}
      </div>

    </div>
  );
}
