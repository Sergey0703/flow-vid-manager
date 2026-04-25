import Link from 'next/link';
import Image from 'next/image';
import { getPostsByCategory, getPillarByCategory, CATEGORY_LABELS } from '@/lib/blog';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const label = CATEGORY_LABELS[category] || category;
  return {
    title: `${label} — AI Automation | AIMediaFlow`,
    description: `AI automation guides for ${label} in Ireland. Practical articles with real ROI numbers.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const posts = await getPostsByCategory(category);
  if (!posts.length) notFound();

  const label = CATEGORY_LABELS[category] || category;
  const pillar = await getPillarByCategory(category);
  const clusters = posts.filter(p => p.post_type !== 'pillar');

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', fontFamily: 'Georgia, serif' }}>
      <Link href="/blog" style={{ color: '#0891b2', fontSize: 14, textDecoration: 'none', fontFamily: 'sans-serif' }}>
        ← All articles
      </Link>

      <h1 style={{ fontSize: 36, fontWeight: 700, margin: '24px 0 8px', color: '#0f172a' }}>
        {label}
      </h1>
      <p style={{ fontSize: 18, color: '#64748b', marginBottom: 48 }}>
        AI automation guides for Irish {label.toLowerCase()} businesses
      </p>

      {/* Pillar article — featured */}
      {pillar && (
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#7c3aed', fontFamily: 'sans-serif', marginBottom: 12 }}>
            Full Guide
          </div>
          {pillar.cover_image && (
            <Link href={`/blog/${pillar.slug}`} style={{ display: 'block', marginBottom: 20, borderRadius: 10, overflow: 'hidden' }}>
              <Image src={pillar.cover_image} alt={pillar.title} width={800} height={420}
                style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
            </Link>
          )}
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>
            <Link href={`/blog/${pillar.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
              {pillar.title}
            </Link>
          </h2>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>{pillar.meta_description}</p>
          <Link href={`/blog/${pillar.slug}`} style={{ color: '#7c3aed', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            Read full guide →
          </Link>
        </div>
      )}

      {/* Cluster articles */}
      {clusters.length > 0 && (
        <>
          {pillar && (
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 24, paddingTop: 24, borderTop: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
              Related articles
            </h2>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {clusters.map(post => {
              const coverSrc = post.cover_image?.startsWith('http') ? post.cover_image : post.cover_image ? `/${post.cover_image}` : null;
              return (
                <article key={post.slug} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 40 }}>
                  {coverSrc && (
                    <Link href={`/blog/${post.slug}`} style={{ display: 'block', marginBottom: 16, borderRadius: 10, overflow: 'hidden' }}>
                      <Image src={coverSrc} alt={post.title} width={800} height={420}
                        style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                    </Link>
                  )}
                  <time style={{ fontSize: 13, color: '#94a3b8' }}>
                    {new Date(post.date).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 10px', lineHeight: 1.3 }}>
                    <Link href={`/blog/${post.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>{post.title}</Link>
                  </h3>
                  <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, marginBottom: 12 }}>{post.meta_description}</p>
                  <Link href={`/blog/${post.slug}`} style={{ color: '#0891b2', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    Read article →
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
