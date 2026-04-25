import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts, getAllCategories, getCategoryLabel } from '@/lib/blog';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog — AI Automation Insights | AIMediaFlow',
  description: 'Expert articles on AI automation for Irish businesses — hotels, clinics, retail. Practical guides and real ROI numbers.',
};

const POSTS_PER_PAGE = 6;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const activeCategory = params.category || '';

  const allPosts = await getAllPosts();
  const categories = await getAllCategories();

  const filtered = activeCategory
    ? allPosts.filter(p => p.category === activeCategory)
    : allPosts;

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const pagePosts = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
        AI Insights
      </h1>
      <p style={{ fontSize: 18, color: '#64748b', marginBottom: 32 }}>
        Practical guides on AI automation for Irish businesses
      </p>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
          <Link
            href="/blog"
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'sans-serif',
              background: !activeCategory ? '#0f172a' : '#f1f5f9',
              color: !activeCategory ? '#ffffff' : '#475569',
            }}
          >
            All
          </Link>
          {categories.map(cat => (
            <Link
              key={cat}
              href={`/blog?category=${cat}`}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: 'sans-serif',
                background: activeCategory === cat ? '#0f172a' : '#f1f5f9',
                color: activeCategory === cat ? '#ffffff' : '#475569',
              }}
            >
              {getCategoryLabel(cat)}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No articles yet. Check back soon.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {pagePosts.map(post => {
              const coverSrc = post.cover_image
                ? (post.cover_image.startsWith('http') ? post.cover_image : post.cover_image.startsWith('/') ? post.cover_image : `/${post.cover_image}`)
                : null;
              return (
                <article key={post.slug} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 48 }}>
                  {coverSrc && (
                    <Link href={`/blog/${post.slug}`} style={{ display: 'block', marginBottom: 20, borderRadius: 10, overflow: 'hidden' }}>
                      <Image
                        src={coverSrc}
                        alt={post.title}
                        width={800}
                        height={420}
                        style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                      />
                    </Link>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <time style={{ fontSize: 13, color: '#94a3b8', letterSpacing: 1 }}>
                      {new Date(post.date).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                    {post.category && (
                      <Link
                        href={`/blog?category=${post.category}`}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          color: '#0891b2',
                          textDecoration: 'none',
                          fontFamily: 'sans-serif',
                          background: '#e0f2fe',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {getCategoryLabel(post.category)}
                      </Link>
                    )}
                    {post.post_type === 'pillar' && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        color: '#7c3aed',
                        fontFamily: 'sans-serif',
                        background: '#ede9fe',
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}>
                        Full Guide
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>
                    <Link href={`/blog/${post.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                      {post.title}
                    </Link>
                  </h2>
                  <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                    {post.meta_description}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    style={{ color: '#0891b2', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
                  >
                    Read article →
                  </Link>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
              {currentPage > 1 ? (
                <Link
                  href={`/blog?page=${currentPage - 1}${activeCategory ? `&category=${activeCategory}` : ''}`}
                  style={{ color: '#0891b2', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
                >
                  ← Newer articles
                </Link>
              ) : <span />}
              <span style={{ fontSize: 14, color: '#94a3b8' }}>
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={`/blog?page=${currentPage + 1}${activeCategory ? `&category=${activeCategory}` : ''}`}
                  style={{ color: '#0891b2', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
                >
                  Older articles →
                </Link>
              ) : <span />}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
