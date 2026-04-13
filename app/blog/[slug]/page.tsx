import { getAllPosts, getPostBySlug } from '@/lib/blog';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | AIMediaFlow`,
    description: post.meta_description,
    keywords: post.keywords,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main style={{ maxWidth: 740, margin: '0 auto', padding: '48px 24px', fontFamily: 'Georgia, serif' }}>

      {/* Back link */}
      <Link href="/blog" style={{ color: '#0891b2', fontSize: 14, textDecoration: 'none' }}>
        ← All articles
      </Link>

      {/* Header */}
      <header style={{ margin: '24px 0 40px' }}>
        <time style={{ fontSize: 13, color: '#94a3b8', letterSpacing: 1 }}>
          {new Date(post.date).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.25, margin: '12px 0 0', color: '#0f172a' }}>
          {post.title}
        </h1>
      </header>

      {/* Cover image */}
      {post.cover_image && (
        <div style={{ marginBottom: 40, borderRadius: 12, overflow: 'hidden', aspectRatio: '740/400' }}>
          <Image
            src={post.cover_image.startsWith('/') ? post.cover_image : `/${post.cover_image}`}
            alt={post.title}
            width={740}
            height={400}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Article body */}
      <div style={{ fontSize: 18, lineHeight: 1.8, color: '#1e293b' }} className="prose">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      {/* Author block */}
      <div style={{
        marginTop: 64,
        padding: '24px',
        background: '#f8fafc',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        borderLeft: '4px solid #0891b2',
      }}>
        <Image
          src="/photo.png"
          alt="Serhii Baliasnyi"
          width={64}
          height={64}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Serhii Baliasnyi</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Founder & CEO, AIMediaFlow</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>AI automation for Irish businesses</div>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 40,
        padding: '32px',
        background: '#0f172a',
        borderRadius: 12,
        textAlign: 'center',
        color: 'white',
      }}>
        <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Want to implement this for your business?
        </p>
        <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 24 }}>
          Book a free 15-min AI Infrastructure Audit
        </p>
        <a
          href="https://wa.me/353852007612"
          style={{
            background: '#0891b2',
            color: 'white',
            padding: '12px 28px',
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: 16,
          }}
        >
          Message on WhatsApp →
        </a>
      </div>

    </main>
  );
}
