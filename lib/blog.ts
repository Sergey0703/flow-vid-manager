import { Client } from '@notionhq/client';
import type { PageObjectResponse, BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  meta_description: string;
  cover_image: string;
  content: string;
  category: string;
  post_type: 'pillar' | 'cluster' | '';
}

export const CATEGORY_LABELS: Record<string, string> = {
  dental: 'Dental Clinics',
  legal: 'Legal & Solicitors',
  hospitality: 'Hotels & Hospitality',
  sme: 'SME General',
  retail: 'Retail',
  compliance: 'Compliance & Tax',
  healthcare: 'Healthcare',
  hr: 'HR & Onboarding',
  finance: 'Finance',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function richTextToString(rt: any[]): string {
  return rt.map((t: any) => t.plain_text).join('');
}

function blocksToMarkdown(blocks: BlockObjectResponse[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const b = block as any;
    switch (b.type) {
      case 'paragraph':
        lines.push(richTextToString(b.paragraph.rich_text));
        lines.push('');
        break;
      case 'heading_1':
        lines.push(`# ${richTextToString(b.heading_1.rich_text)}`);
        lines.push('');
        break;
      case 'heading_2':
        lines.push(`## ${richTextToString(b.heading_2.rich_text)}`);
        lines.push('');
        break;
      case 'heading_3':
        lines.push(`### ${richTextToString(b.heading_3.rich_text)}`);
        lines.push('');
        break;
      case 'bulleted_list_item':
        lines.push(`- ${richTextToString(b.bulleted_list_item.rich_text)}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${richTextToString(b.numbered_list_item.rich_text)}`);
        break;
      case 'quote':
        lines.push(`> ${richTextToString(b.quote.rich_text)}`);
        lines.push('');
        break;
      case 'code':
        lines.push('```');
        lines.push(richTextToString(b.code.rich_text));
        lines.push('```');
        lines.push('');
        break;
      case 'divider':
        lines.push('---');
        lines.push('');
        break;
      default:
        break;
    }
  }

  return lines.join('\n');
}

function extractPost(page: PageObjectResponse): Omit<BlogPost, 'content'> {
  const props = page.properties as any;
  const title = richTextToString(props.Name?.title || props.Title?.rich_text || []);
  const slug = richTextToString(props.Slug?.rich_text || []) || page.id;
  const date = props.Date?.date?.start || '';
  const meta_description = richTextToString(props['Meta Description']?.rich_text || []);
  const cover_image = props['Cover URL']?.url || '';
  const category = (props['Category']?.select?.name || '').toLowerCase();
  const post_type = (props['Post Type']?.select?.name || '') as BlogPost['post_type'];
  return { slug, title, date, meta_description, cover_image, category, post_type };
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Status', select: { equals: 'ready' } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return response.results.map(page => ({
    ...extractPost(page as PageObjectResponse),
    content: '',
  }));
}

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const all = await getAllPosts();
  return all.filter(p => p.category === category.toLowerCase());
}

export async function getPillarByCategory(category: string): Promise<BlogPost | null> {
  const posts = await getPostsByCategory(category);
  return posts.find(p => p.post_type === 'pillar') || null;
}

export async function getAllCategories(): Promise<string[]> {
  const posts = await getAllPosts();
  const cats = new Set(posts.map(p => p.category).filter(Boolean));
  return Array.from(cats);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Slug', rich_text: { equals: slug } },
  });

  if (!response.results.length) return null;

  const page = response.results[0] as PageObjectResponse;
  const blocksResp = await notion.blocks.children.list({ block_id: page.id });
  const content = blocksToMarkdown(blocksResp.results as BlockObjectResponse[]);

  return { ...extractPost(page), content };
}
