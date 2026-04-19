import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '../content/blog');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB = process.env.NOTION_DATABASE_ID || '346a5fd841ed80a5adbbfd885c9d552b';

async function getWordCount(pageId) {
  try {
    const r = await notion.blocks.children.list({ block_id: pageId });
    const text = r.results.map(b => {
      const rt = b[b.type]?.rich_text || [];
      return rt.map(t => t.plain_text).join(' ');
    }).join(' ');
    return text.split(/\s+/).filter(Boolean).length;
  } catch { return 0; }
}

// Fetch all pages
const r = await notion.databases.query({ database_id: DB, page_size: 100 });
const pages = r.results.map(p => {
  const props = p.properties;
  const title = (props.Name?.title || []).map(t => t.plain_text).join('')
    || (props.Title?.rich_text || []).map(t => t.plain_text).join('');
  const slug = (props.Slug?.rich_text || []).map(t => t.plain_text).join('');
  const cover = props['Cover URL']?.url || '';
  return { id: p.id, title, slug, cover };
});

// Group by title
const groups = {};
for (const p of pages) {
  if (!p.title) continue;
  if (!groups[p.title]) groups[p.title] = [];
  groups[p.title].push(p);
}

// Find groups with duplicates
const dupes = Object.entries(groups).filter(([, arr]) => arr.length > 1);
console.log(`Found ${dupes.length} duplicate title groups\n`);

for (const [title, arr] of dupes) {
  console.log(`\n"${title}" — ${arr.length} copies`);

  // Get word counts
  for (const p of arr) {
    p.wordCount = await getWordCount(p.id);
    await new Promise(r => setTimeout(r, 300));
    console.log(`  ${p.slug}: ${p.wordCount} words, cover: ${p.cover || 'none'}`);
  }

  // Sort: most words first
  arr.sort((a, b) => b.wordCount - a.wordCount);
  const keep = arr[0];
  const remove = arr.slice(1);

  console.log(`  → KEEP: ${keep.slug} (${keep.wordCount} words)`);

  // If keep has no cover, find one from duplicates
  if (!keep.cover) {
    const withCover = remove.find(p => p.cover);
    if (withCover) {
      console.log(`  → Transfer cover from ${withCover.slug}: ${withCover.cover}`);
      await notion.pages.update({
        page_id: keep.id,
        properties: { 'Cover URL': { url: withCover.cover } }
      });
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Archive duplicates in Notion
  for (const p of remove) {
    console.log(`  → Archive: ${p.slug}`);
    await notion.pages.update({ page_id: p.id, archived: true });
    await new Promise(r => setTimeout(r, 300));

    // Delete MD file if exists
    const mdPath = path.join(BLOG_DIR, `${p.slug}.md`);
    if (fs.existsSync(mdPath)) {
      fs.unlinkSync(mdPath);
      console.log(`  → Deleted: content/blog/${p.slug}.md`);
    }
  }
}

// Also archive the empty page (no title, no slug)
const empty = pages.find(p => !p.title && !p.slug);
if (empty) {
  console.log('\nArchiving empty page...');
  await notion.pages.update({ page_id: empty.id, archived: true });
}

console.log('\nDone!');
