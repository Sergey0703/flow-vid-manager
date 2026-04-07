import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');
const COVERS_DIR = path.join(process.cwd(), 'public/blog-covers');

function stripSchemaMarkup(content: string): string {
  // Remove <div itemscope ...>...</div> and <script type="application/ld+json">...</script>
  return content
    .replace(/<div\s+itemscope[\s\S]*?<\/div>/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi, '')
    .trim();
}

function findCoverImage(slug: string, frontmatterCover?: string): string {
  if (frontmatterCover) return frontmatterCover;
  // Check filesystem (works locally and during Vercel build)
  for (const ext of ['jpg', 'jpeg', 'webp', 'png']) {
    const filePath = path.join(COVERS_DIR, `${slug}.${ext}`);
    if (fs.existsSync(filePath)) {
      return `/blog-covers/${slug}.${ext}`;
    }
  }
  return '';
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  meta_description: string;
  keywords: string[];
  cover_image?: string;
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));

  return files
    .map(filename => {
      const slug = filename.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
      const { data, content } = matter(raw);

      if (data.status && data.status !== 'ready' && data.status !== 'published') return null;

      return {
        slug,
        title: data.title || slug,
        date: data.date || '',
        meta_description: data.meta_description || '',
        keywords: data.keywords || [],
        cover_image: findCoverImage(slug, data.cover_image),
        content: stripSchemaMarkup(content),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.date < b!.date ? 1 : -1)) as BlogPost[];
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title || slug,
    date: data.date || '',
    meta_description: data.meta_description || '',
    keywords: data.keywords || [],
    cover_image: findCoverImage(slug, data.cover_image),
    content: stripSchemaMarkup(content),
  };
}
