import Link from 'next/link';
import { getAllPillars, getCategoryLabel } from '@/lib/blog';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Full Guides — AI Automation for Irish Businesses | AIMediaFlow',
  description: 'Comprehensive guides to AI automation for Irish businesses — dental clinics, hotels, solicitors, compliance, and SMEs.',
};

export default async function GuidesPage() {
  const pillars = await getAllPillars();

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', fontFamily: 'Georgia, serif' }}>
      <Link href="/blog" style={{ color: '#0891b2', fontSize: 14, textDecoration: 'none', fontFamily: 'sans-serif' }}>
        ← All articles
      </Link>

      <h1 style={{ fontSize: 36, fontWeight: 700, margin: '24px 0 8px', color: '#0f172a' }}>
        Full Guides
      </h1>
      <p style={{ fontSize: 18, color: '#64748b', marginBottom: 48 }}>
        Comprehensive AI automation guides for every Irish business sector
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {pillars.map(pillar => (
          <Link key={pillar.slug} href={`/blog/${pillar.slug}`} style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '28px 32px',
              background: '#f5f3ff',
              borderRadius: 12,
              borderLeft: '4px solid #7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#7c3aed', fontFamily: 'sans-serif', marginBottom: 8 }}>
                  {getCategoryLabel(pillar.category)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 8 }}>
                  {pillar.title}
                </div>
                <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                  {pillar.meta_description}
                </div>
              </div>
              <div style={{
                flexShrink: 0,
                background: '#7c3aed',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'sans-serif',
                whiteSpace: 'nowrap',
              }}>
                Read guide →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
