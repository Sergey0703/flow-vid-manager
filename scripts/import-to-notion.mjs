import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '346a5fd841ed80a5adbbfd885c9d552b';
const BLOG_DIR = path.join(__dirname, '../content/blog');

const notion = new Client({ auth: NOTION_TOKEN });

function stripSchemaMarkup(content) {
  return content
    .replace(/<div\s+itemscope[\s\S]*?<\/div>/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi, '')
    .trim();
}

function markdownToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4) } }] } });
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3) } }] } });
    } else if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } });
    } else if (/^\d+\. /.test(line)) {
      blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\. /, '') } }] } });
    } else if (line.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } });
    } else if (line.startsWith('---')) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    } else if (line.trim()) {
      // paragraph — max 2000 chars per block
      const text = line.slice(0, 2000);
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: text } }] } });
    }

    i++;
  }

  return blocks;
}

async function importFile(filename) {
  const slug = filename.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
  const { data, content } = matter(raw);

  const status = data.status || 'draft';
  const title = String(data.title || slug);
  // Extract ISO date: slug starts with YYYY-MM-DD, use that as fallback
  let date = '';
  if (data.date) {
    const d = new Date(data.date);
    if (!isNaN(d.getTime())) {
      date = d.toISOString().slice(0, 10);
    }
  }
  if (!date) {
    const m = slug.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) date = m[1];
  }
  const meta = String(data.meta_description || '');
  const coverUrl = data.cover_image ? String(data.cover_image) : '';

  console.log(`Importing: ${slug} [${status}]`);

  const cleanContent = stripSchemaMarkup(content);
  const blocks = markdownToBlocks(cleanContent);

  // Notion limit: 100 blocks per append
  const CHUNK = 100;

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      'Name': { title: [{ type: 'text', text: { content: title.slice(0, 2000) } }] },
      'Title': { rich_text: [{ type: 'text', text: { content: title.slice(0, 2000) } }] },
      Status: { select: { name: status } },
      Date: date ? { date: { start: date } } : { date: null },
      Slug: { rich_text: [{ text: { content: slug } }] },
      'Meta Description': { rich_text: [{ text: { content: meta.slice(0, 2000) } }] },
      'Cover URL': coverUrl ? { url: coverUrl } : { url: null },
    },
    children: blocks.slice(0, CHUNK),
  });

  // Append remaining blocks in chunks
  for (let i = CHUNK; i < blocks.length; i += CHUNK) {
    await notion.blocks.children.append({
      block_id: page.id,
      children: blocks.slice(i, i + CHUNK),
    });
    await new Promise(r => setTimeout(r, 350)); // rate limit
  }

  console.log(`  ✓ ${title}`);
}

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
console.log(`Found ${files.length} files\n`);

for (const file of files) {
  try {
    await importFile(file);
    await new Promise(r => setTimeout(r, 350));
  } catch (e) {
    console.error(`  ✗ ${file}: ${e.message}`);
  }
}

console.log('\nDone!');
