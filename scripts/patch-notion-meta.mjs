#!/usr/bin/env node
// Reads MD files, extracts meta_description or generates from content,
// updates Notion pages that have empty Meta Description

import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  console.error('Missing NOTION_TOKEN or NOTION_DATABASE_ID');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

function generateMetaDescription(content, title) {
  // Strip frontmatter
  const body = content.replace(/^---[\s\S]*?---\n/, '');
  // Get first non-empty paragraph
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const firstPara = lines[0] || '';
  // Truncate to 160 chars
  const desc = firstPara.length > 160 ? firstPara.slice(0, 157) + '...' : firstPara;
  return desc || `Learn how AI automation helps Irish SMEs with ${title}`;
}

async function main() {
  // Get all pages with empty Meta Description
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: 'Status',
      select: { equals: 'ready' },
    },
  });

  const needsUpdate = response.results.filter(page => {
    const props = page.properties;
    const meta = props['Meta Description']?.rich_text || [];
    const text = meta.map(t => t.plain_text).join('').trim();
    return !text;
  });

  console.log(`Found ${needsUpdate.length} pages with empty Meta Description`);

  const draftsDir = '/home/hermes_user/.hermes/blog-drafts';

  for (const page of needsUpdate) {
    const props = page.properties;
    const slug = (props['Slug']?.rich_text || []).map(t => t.plain_text).join('');
    const title = (props['Name']?.title || props['Title']?.rich_text || []).map(t => t.plain_text).join('');

    console.log(`Processing: ${slug}`);

    // Find matching MD file
    let meta = '';
    if (slug) {
      // Try exact match first
      const mdFiles = fs.readdirSync(draftsDir).filter(f => f.includes(slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')) || f.startsWith(slug));
      if (mdFiles.length > 0) {
        const content = fs.readFileSync(path.join(draftsDir, mdFiles[0]), 'utf8');
        const fm = parseFrontmatter(content);
        if (fm.meta_description) {
          meta = fm.meta_description;
        } else {
          meta = generateMetaDescription(content, title);
        }
        console.log(`  Generated from file: ${mdFiles[0]}`);
      }
    }

    if (!meta) {
      meta = `Discover how AI automation helps Irish SMEs with ${title}. Practical guide for Kerry businesses.`;
    }

    // Truncate to 2000 chars (Notion limit)
    meta = meta.slice(0, 2000);

    await notion.pages.update({
      page_id: page.id,
      properties: {
        'Meta Description': {
          rich_text: [{ type: 'text', text: { content: meta } }],
        },
      },
    });

    console.log(`  Updated: "${meta.slice(0, 80)}..."`);
  }

  console.log('Done.');
}

main().catch(console.error);
