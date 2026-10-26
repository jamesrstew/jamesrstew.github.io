#!/usr/bin/env node
// Builds jamesstew.art into _site/.
//
//   node build.mjs          build once
//   node build.mjs serve    build, serve at http://localhost:8000, rebuild on change
//
// No dependencies beyond Node itself and vendor/marked.esm.js (a frozen, single-file
// copy of marked v18.0.14, MIT). There is nothing to install and nothing to upgrade.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { Marked } from './vendor/marked.esm.js';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, '_site');
const CONTENT = path.join(ROOT, 'content');
const STATIC = ['img', 'video', 'favicon.svg', 'favicon.png', 'favicon.ico', 'apple-touch-icon.png', 'CNAME', 'robots.txt', 'style.css'];

// URLs from earlier versions of the site. Each one gets a redirect page so old links keep working.
const LEGACY = {
  '/notes.html': '/notes/',
  '/notes/new_products.html': '/notes/new-products/',
  ...Object.fromEntries([
    'advice-for-aspiring-pms', 'ai', 'good-eggs', 'hydration', 'low-no-tech', 'new-dad',
    'new-products', 'principles', 'recipes', 'self-inquiry',
  ].map((slug) => [`/notes/${slug}.html`, `/notes/${slug}/`])),
};

// Paths on jamesstew.art served by other repos (GitHub Pages project sites). Never generate these.
const RESERVED = ['telluride-splitwise', 'mock-interview-machine', 'stablecoin-payouts-poc'];

const FRONT_MATTER_KEYS = ['title', 'date', 'updated', 'description', 'image', 'originally', 'draft'];

class BuildError extends Error {}
const fail = (msg) => { throw new BuildError(msg); };

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const stripTags = (html) => html.replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const longDate = (iso) => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });

const truncate = (s, n) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(' ', n - 1))}…`);

// Root-relative links work on the site; LLM-facing text gets absolute URLs.
const absolutize = (text, base) => text
  .replace(/\]\(\//g, `](${base}/`)
  .replace(/(src|href|poster)="\//g, `$1="${base}/`);

function write(rel, contents) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

// ---------------------------------------------------------------- markdown

const marked = new Marked({ gfm: true });
let headingIds = new Set();

marked.use({
  renderer: {
    // `## Heading {#custom-id}` sets the anchor explicitly (keeps old links working);
    // otherwise the id is derived from the heading text.
    heading({ tokens, depth }) {
      let html = this.parser.parseInline(tokens);
      let id;
      html = html.replace(/\s*\{#([\w-]+)\}\s*$/, (_, explicit) => { id = explicit; return ''; });
      id ||= slugify(stripTags(html)) || 'section';
      for (let base = id, n = 2; headingIds.has(id); n++) id = `${base}-${n}`;
      headingIds.add(id);
      return `<h${depth} id="${id}">${html}</h${depth}>\n`;
    },
    image({ href, title, text }) {
      const t = title ? ` title="${esc(title)}"` : '';
      return `<img src="${esc(href)}" alt="${esc(text)}"${t} loading="lazy" decoding="async">`;
    },
  },
});

function renderMarkdown(md) {
  headingIds = new Set();
  return marked.parse(md);
}

// ---------------------------------------------------------------- content

function parseFrontMatter(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) fail(`${file}: must start with front matter (a block between two "---" lines)`);
  const data = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) fail(`${file}: front matter line has no "key: value": ${line}`);
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (!FRONT_MATTER_KEYS.includes(key)) {
      fail(`${file}: unknown front matter key "${key}" (allowed: ${FRONT_MATTER_KEYS.join(', ')})`);
    }
    data[key] = value === 'true' ? true : value === 'false' ? false : value;
  }
  return { data, body: src.slice(m[0].length) };
}

function checkDate(value, key, file) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    fail(`${file}: "${key}" must be a date like 2026-09-11 (got "${value}")`);
  }
}

function loadNotes() {
  const dir = path.join(CONTENT, 'notes');
  const notes = [];
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const file = `content/notes/${name}`;
    const slug = name.slice(0, -3);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      fail(`${file}: file names become URLs, so use lowercase words joined by hyphens (e.g. my-essay.md)`);
    }
    const src = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const { data, body } = parseFrontMatter(src, file);
    if (data.draft === true) continue;
    if (!data.title) fail(`${file}: missing "title"`);
    if (!data.date) fail(`${file}: missing "date" (the original publish date, e.g. 2026-09-11)`);
    checkDate(data.date, 'date', file);
    if (data.updated) {
      checkDate(data.updated, 'updated', file);
      if (data.updated < data.date) fail(`${file}: "updated" is earlier than "date"`);
    }
    const html = renderMarkdown(body);
    const firstParagraph = stripTags((html.match(/<p>([\s\S]*?)<\/p>/) || ['', ''])[1]);
    notes.push({
      ...data,
      slug,
      body: body.trim(),
      html,
      url: `/notes/${slug}/`,
      description: data.description || truncate(firstParagraph, 160),
      words: body.split(/\s+/).filter(Boolean).length,
    });
  }
  // Newest first; ties broken by file name so the order is stable.
  return notes.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------- templates

function person(site) {
  return {
    '@type': 'Person',
    '@id': `${site.url}/#person`,
    name: site.name,
    alternateName: site.alternateName,
    url: `${site.url}/`,
    image: site.image,
    email: `mailto:${site.email}`,
    jobTitle: site.jobTitle,
    description: site.summary,
    disambiguatingDescription: site.disambiguation,
    worksFor: site.experience.filter((e) => !e.to).map((e) => ({
      '@type': 'Organization', name: e.org, ...(e.url && { url: e.url }),
      ...(e.founder && { founder: { '@id': `${site.url}/#person` } }),
    })),
    knowsAbout: site.knowsAbout,
    // sameAs is for profiles that *are* this person; things he made are linked from the page instead.
    sameAs: site.elsewhere.map((e) => e.url),
  };
}

function layout(site, page) {
  const url = `${site.url}${page.path}`;
  const image = page.card?.url || site.image;
  const imageAlt = page.card?.alt || site.name;
  const title = page.path === '/' ? `${site.name} | ${site.role}` : `${page.title} | ${site.name}`;
  const header = page.path === '/' ? '' : `
<header class="site">
  <a href="/" class="name">${esc(site.name)}</a>
  <nav><a href="/notes/"${page.path.startsWith('/notes/') ? ' aria-current="page"' : ''}>Notes</a></nav>
</header>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="author" content="${esc(site.name)}">
${page.path === '/404.html' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css">
<link rel="alternate" type="application/atom+xml" title="${esc(site.name)}: Notes" href="/feed.xml">
${page.markdown ? `<link rel="alternate" type="text/markdown" href="${page.markdown}">\n` : ''}<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta property="og:locale" content="en_US">
${page.published ? `<meta property="article:published_time" content="${page.published}">\n<meta property="article:modified_time" content="${page.modified || page.published}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': page.schema })}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.analytics}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${site.analytics}');</script>
</head>
<body>${header}
<main>
${page.body}
</main>
<footer class="site">
  <a href="mailto:${site.email}">${esc(site.email)}</a> · <a href="/feed.xml">RSS</a> · <a href="/llms.txt">llms.txt</a>
</footer>
</body>
</html>
`;
}

const noteList = (notes) => `<ul class="index">
${notes.map((n) => `  <li><time datetime="${n.date}">${n.date}</time> <a href="${n.url}">${esc(n.title)}</a></li>`).join('\n')}
</ul>`;

function homePage(site, notes, aboutHtml, card) {
  const recent = notes.slice(0, 5);
  const body = `<section class="card" aria-label="Contact">
  <h1>${esc(site.name)}</h1>
  <p class="role">${esc(site.role)}</p>
  <p><s>${esc(site.location.former)}</s> ${esc(site.location.current)}</p>
  <p><a href="mailto:${site.email}?subject=Hello,%20James!">${esc(site.email)}</a><br>
  <a href="tel:${site.phone.replace(/\D/g, '')}">${esc(site.phone)}</a></p>
  <p><a class="button" href="${site.calendar}">Connect with me →</a></p>
</section>

<section class="about" aria-label="About">
${aboutHtml}</section>

<section aria-labelledby="writing">
<h2 id="writing">Writing</h2>
${noteList(recent)}
<p><a href="/notes/">All ${notes.length} notes →</a></p>
</section>

<section aria-labelledby="elsewhere">
<h2 id="elsewhere">Elsewhere</h2>
<p>${site.elsewhere.map((e) => `<a href="${e.url}">${esc(e.name)}</a>`).join(' · ')}</p>
</section>

<!-- It is not the critic who counts; not the man who points out how the strong man stumbles,
or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena,
whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again,
because there is no effort without error and shortcoming; but who does actually strive to do the deeds;
who knows great enthusiasms, the great devotions; who spends himself in a worthy cause;
who at the best knows in the end the triumph of high achievement, and who at the worst, if he fails,
at least fails while daring greatly, so that his place shall never be with those cold and timid souls who neither know victory nor defeat. -->`;
  return layout(site, {
    path: '/',
    title: site.name,
    description: site.summary,
    card,
    body,
    schema: [
      { '@type': 'ProfilePage', '@id': `${site.url}/`, url: `${site.url}/`, name: site.name, mainEntity: { '@id': `${site.url}/#person` } },
      person(site),
      { '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: site.name, author: { '@id': `${site.url}/#person` } },
      ...site.research.map((r) => ({
        '@type': 'ScholarlyArticle', headline: r.title, url: r.url, datePublished: r.date,
        publisher: { '@type': 'Organization', name: r.publisher }, author: { '@id': `${site.url}/#person` },
      })),
      ...site.press.map((p) => ({
        '@type': 'NewsArticle', headline: p.title, url: p.url, datePublished: p.date,
        publisher: { '@type': 'Organization', name: p.publisher },
        about: { '@type': 'Organization', name: p.about, founder: { '@id': `${site.url}/#person` } },
      })),
    ],
  });
}

function notesPage(site, notes, card) {
  const body = `<h1>Hello World</h1>
<p>Notes on product management, technology, and personal obsessions.</p>
${noteList(notes)}`;
  return layout(site, {
    path: '/notes/',
    title: 'Notes',
    description: 'Notes on product management, technology, and personal obsessions.',
    card,
    body,
    schema: [{
      '@type': 'Blog',
      '@id': `${site.url}/notes/`,
      url: `${site.url}/notes/`,
      name: `Notes | ${site.name}`,
      author: { '@id': `${site.url}/#person` },
      blogPost: notes.map((n) => ({ '@type': 'BlogPosting', headline: n.title, url: `${site.url}${n.url}`, datePublished: n.date })),
    }, person(site)],
  });
}

function notePage(site, note, card) {
  const dates = `<p class="meta">Published <time datetime="${note.date}">${longDate(note.date)}</time>${
    note.updated ? ` · Updated <time datetime="${note.updated}">${longDate(note.updated)}</time>` : ''}</p>`;
  const original = note.originally
    ? `<p class="meta">Originally published on <a href="${esc(note.originally)}">LinkedIn</a>.</p>\n` : '';
  const body = `<article>
<header>
<h1>${esc(note.title)}</h1>
${dates}
</header>
${note.html}
<footer>
${original}<p><a href="/notes/">← All notes</a></p>
</footer>
</article>`;
  return layout(site, {
    path: note.url,
    title: note.title,
    description: note.description,
    ogType: 'article',
    published: note.date,
    modified: note.updated,
    markdown: `${note.url}index.md`,
    card,
    body,
    schema: [{
      '@type': 'BlogPosting',
      '@id': `${site.url}${note.url}`,
      url: `${site.url}${note.url}`,
      mainEntityOfPage: `${site.url}${note.url}`,
      headline: note.title,
      description: note.description,
      datePublished: note.date,
      dateModified: note.updated || note.date,
      wordCount: note.words,
      image: card?.url || (note.image ? `${site.url}${note.image}` : site.image),
      author: { '@id': `${site.url}/#person` },
      publisher: { '@id': `${site.url}/#person` },
      isPartOf: { '@id': `${site.url}/notes/` },
      ...(note.originally && { sameAs: note.originally }),
    }, person(site)],
  });
}

function notFoundPage(site) {
  return layout(site, {
    path: '/404.html',
    title: 'Page not found',
    description: 'Page not found.',
    body: `<h1>404</h1>
<p>Oops! This page went on a coffee break ☕</p>
<p><a href="/">Go home</a> or <a href="/notes/">read the notes</a>.</p>`,
    schema: [person(site)],
  });
}

const redirectPage = (site, to) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved</title>
<link rel="canonical" href="${site.url}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<meta name="robots" content="noindex">
</head>
<body><p>This page has moved to <a href="${to}">${to}</a>.</p></body>
</html>
`;

// ---------------------------------------------------------------- machine-readable files

// The Markdown twin of each note, served next to it at /notes/<slug>/index.md.
const noteMarkdown = (site, n) => absolutize(`# ${n.title}

By ${site.name} · Published ${longDate(n.date)}${n.updated ? ` · Updated ${longDate(n.updated)}` : ''}
Source: ${site.url}${n.url}

${n.body}
`, site.url);

function llmsTxt(site, notes) {
  const exp = site.experience.map((e) => `- ${e.title}, ${e.org} (${e.from}–${e.to || 'present'}): ${e.note}`).join('\n');
  return `# ${site.name}

> ${site.summary}

${site.disambiguation}

## Facts

- Name: ${site.name} (also written ${site.alternateName})
- Role: ${site.jobTitle}
- Location: ${site.location.current}
- Website: ${site.url}
- Contact: ${site.email}
${site.elsewhere.map((e) => `- ${e.name}: ${e.url}`).join('\n')}

## Experience

${exp}

## Projects

${[...site.building, ...site.projects].map((p) => `- [${p.name}](${p.url}): ${p.blurb}`).join('\n')}

## Research

${site.research.map((r) => `- [${r.title}](${r.url}) (${r.publisher}, ${r.date}), by ${site.name}`).join('\n')}

## Press

${site.press.map((p) => `- [${p.title}](${p.url}) (${p.publisher}, ${p.date}), about ${p.about}`).join('\n')}

## Notes

Essays by ${site.name}, newest first. Each link is a clean Markdown version of the page.

${notes.map((n) => `- [${n.title}](${site.url}${n.url}index.md) (${n.date}): ${n.description}`).join('\n')}

## Optional

- [Full text of every note](${site.url}/llms-full.txt)
- [Atom feed](${site.url}/feed.xml)
`;
}

const llmsFullTxt = (site, notes) => `# ${site.name}: all notes

> ${site.summary}

${notes.map((n) => noteMarkdown(site, n)).join('\n---\n\n')}`;

function feed(site, notes) {
  const updated = notes.reduce((max, n) => [n.updated || n.date, max].sort().pop(), '');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${esc(site.name)}: Notes</title>
<link href="${site.url}/notes/"/>
<link rel="self" href="${site.url}/feed.xml"/>
<id>${site.url}/notes/</id>
<updated>${updated}T00:00:00Z</updated>
<author><name>${esc(site.name)}</name><uri>${site.url}/</uri></author>
${notes.map((n) => `<entry>
<title>${esc(n.title)}</title>
<link href="${site.url}${n.url}"/>
<id>${site.url}${n.url}</id>
<published>${n.date}T00:00:00Z</published>
<updated>${n.updated || n.date}T00:00:00Z</updated>
<summary>${esc(n.description)}</summary>
<content type="html">${esc(absolutize(n.html, site.url))}</content>
</entry>`).join('\n')}
</feed>
`;
}

function sitemap(site, notes) {
  const urls = [
    ['/', notes[0].updated || notes[0].date],
    ['/notes/', notes[0].date],
    ...notes.map((n) => [n.url, n.updated || n.date]),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `<url><loc>${site.url}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------- social cards
//
// Each page gets its own 1200×630 preview image (Open Graph / Twitter card) at /og/<name>.png.
// Cards are tiny HTML pages screenshotted by headless Chrome. This step is optional: with no
// Chrome, or if a screenshot fails, that page falls back to site.image and the build carries on.

const CARD_W = 1200;
const CARD_H = 630;
const CARD_CONCURRENCY = 4;
const CARD_TIMEOUT = 15_000;
const CARD_CACHE = path.join(os.tmpdir(), 'jamesstew-og-cache');

function findChrome() {
  const runnable = (p) => { try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; } };
  if (process.env.CHROME_PATH && runnable(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    for (const dir of dirs) if (runnable(path.join(dir, name))) return path.join(dir, name);
  }
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return runnable(mac) ? mac : null;
}

// The card markup. Tokens match style.css (light theme); fonts are local monospace only.
function cardHtml(c) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${CARD_W}px; height: ${CARD_H}px; overflow: hidden; }
  body {
    background: #faf9f6; color: #111;
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, "DejaVu Sans Mono", "Liberation Mono", Consolas, monospace;
    font-variant-ligatures: none; -webkit-font-smoothing: antialiased;
  }
  .card {
    position: absolute; left: 64px; top: 52px; right: ${64 + 16}px; bottom: ${52 + 16}px;
    display: flex; flex-direction: column; padding: 0 60px 44px;
    background: #fff; border: 2px solid #111; box-shadow: 16px 16px 0 #111;
  }
  .card.lifted { box-shadow: 4px 4px 0 #03045e, 8px 8px 0 #023e8a, 12px 12px 0 #0077b6, 16px 16px 0 #0096c7, 20px 20px 0 #00b4d8; }
  .head {
    display: flex; justify-content: space-between; align-items: baseline; gap: 32px;
    margin: 0 -60px; padding: 38px 60px 24px; border-bottom: 3px solid #e0414f;
    font-size: 26px; letter-spacing: .2em; text-transform: uppercase; color: #66665f; white-space: nowrap;
  }
  .head b { color: #111; }
  .main { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  .title {
    font-size: 96px; line-height: 1.08; letter-spacing: -.04em; font-weight: 700;
    text-wrap: balance; overflow-wrap: normal; hyphens: none;
  }
  .sub { margin-top: 28px; font-size: 32px; line-height: 1.4; color: #111; text-wrap: pretty; }
  .home .main { padding-top: 12px; }
  .home .main { overflow: visible; }
  .home .title { margin: 0 -60px; padding: 0 60px 28px; border-bottom: 3px solid #e0414f; }
  .role { margin-top: 30px; font-size: 34px; letter-spacing: .3em; text-transform: uppercase; }
  .foot { display: flex; justify-content: space-between; align-items: center; font-size: 28px; white-space: nowrap; }
  .foot .url { color: #cc3700; text-decoration: underline 2px; text-underline-offset: .22em; }
  .stack { display: flex; gap: 6px; }
  .stack i { width: 16px; height: 16px; }
</style>
</head>
<body>
<div class="card${c.home ? ' home lifted' : ''}">
  ${c.kicker ? `<div class="head"><b>${esc(c.kicker)}</b><span>${esc(c.aside || '')}</span></div>` : ''}
  <div class="main"><div class="title">${esc(c.title)}</div>${c.role ? `<div class="role">${esc(c.role)}</div>` : ''}${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ''}</div>
  <div class="foot"><span>${c.byline ? `${esc(c.byline)} · ` : ''}<span class="url">jamesstew.art</span></span>
    <span class="stack" aria-hidden="true"><i style="background:#03045e"></i><i style="background:#023e8a"></i><i style="background:#0077b6"></i><i style="background:#0096c7"></i><i style="background:#00b4d8"></i></span></div>
</div>
<script>
  // Shrink the title until the whole card fits: no clipped lines, no word wider than the card.
  const main = document.querySelector('.main'), title = document.querySelector('.title');
  for (let size = parseFloat(getComputedStyle(title).fontSize); size > 36; size -= 2) {
    if (main.scrollHeight <= main.clientHeight && title.scrollWidth <= title.clientWidth) break;
    title.style.fontSize = size - 2 + 'px';
  }
</script>
</body>
</html>
`;
}

function cardSpecs(site, notes) {
  const tagline = 'Notes on product management, technology, and personal obsessions.';
  return [
    { name: 'home', alt: `${site.name}, ${site.role}. jamesstew.art`, home: true, title: site.name, role: site.role },
    { name: 'notes', alt: `Notes by ${site.name}: ${tagline}`,
      kicker: site.name, aside: `${notes.length} essays`, title: 'Notes', sub: tagline },
    ...notes.map((n) => ({
      name: n.slug, alt: `${n.title}, by ${site.name}. jamesstew.art`,
      kicker: 'Notes', aside: longDate(n.date), title: n.title, byline: site.name,
    })),
  ];
}

// A complete PNG: right signature, ends with the IEND chunk.
function isPng(file) {
  try {
    const b = fs.readFileSync(file);
    return b.length > 64 && b.readUInt32BE(0) === 0x89504e47 && b.toString('latin1', b.length - 8, b.length - 4) === 'IEND';
  } catch { return false; }
}

function screenshot(chrome, html, out) {
  return new Promise((resolve) => {
    let dir, child, timer, done = false;
    // Judge by the file, not the exit code: Chrome occasionally writes the screenshot and then hangs.
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      let ok = false;
      try {
        const shot = path.join(dir, 'card.png');
        if (isPng(shot)) { fs.renameSync(shot, out); ok = true; }
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
      } catch { /* a leftover temp dir is harmless */ }
      resolve(ok);
    };
    try {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jamesstew-og-'));
      const page = path.join(dir, 'card.html');
      fs.writeFileSync(page, html);
      child = spawn(chrome, [
        '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
        '--disable-extensions', '--mute-audio', '--force-device-scale-factor=1', `--window-size=${CARD_W},${CARD_H}`,
        `--user-data-dir=${path.join(dir, 'profile')}`, `--screenshot=${path.join(dir, 'card.png')}`,
        // GitHub's Ubuntu runners block Chrome's user-namespace sandbox; the page is our own static HTML.
        ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
        `file://${page}`,
      ], { stdio: 'ignore' });
    } catch { finish(); return; }
    timer = setTimeout(() => { child.kill('SIGKILL'); finish(); }, CARD_TIMEOUT);
    child.on('error', finish);
    child.on('close', finish);
  });
}

// Renders every card into _site/og/ and returns { name: { url, alt } } for the ones that exist.
// Results are cached by the card's HTML, so `serve` rebuilds don't relaunch Chrome.
async function renderCards(site, notes) {
  const specs = cardSpecs(site, notes);
  const made = {};
  const failed = [];
  const chrome = findChrome();
  if (!chrome) {
    console.warn(`Warning: Chrome not found (set CHROME_PATH), so every page uses the default social image ${site.image}`);
    return made;
  }
  fs.mkdirSync(path.join(OUT, 'og'), { recursive: true });
  fs.mkdirSync(CARD_CACHE, { recursive: true });
  const queue = [...specs];
  const worker = async () => {
    for (let spec; (spec = queue.shift());) {
      const html = cardHtml(spec);
      const cached = path.join(CARD_CACHE, `${crypto.createHash('sha256').update(html).digest('hex').slice(0, 24)}.png`);
      const out = path.join(OUT, 'og', `${spec.name}.png`);
      const ok = isPng(cached) || await screenshot(chrome, html, cached) || await screenshot(chrome, html, cached);
      if (ok) {
        fs.copyFileSync(cached, out);
        made[spec.name] = { url: `${site.url}/og/${spec.name}.png`, alt: spec.alt };
      } else {
        failed.push(spec.name);
      }
    }
  };
  await Promise.all(Array.from({ length: CARD_CONCURRENCY }, worker));
  if (!fs.readdirSync(path.join(OUT, 'og')).length) fs.rmdirSync(path.join(OUT, 'og'));
  if (failed.length) {
    console.warn(`Warning: couldn't render ${failed.length} social card(s) (${failed.join(', ')}) with ${chrome}, so those pages use the default social image`);
  }
  return made;
}

// Never point a page at a card that isn't actually on disk.
function cardFor(cards, name) {
  const c = cards[name];
  return c && fs.existsSync(path.join(OUT, 'og', `${name}.png`)) ? c : null;
}

// ---------------------------------------------------------------- build

// Every root-relative link and image in the generated HTML must point at a real file.
function checkLinks() {
  const missing = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
  for (const file of walk(OUT).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, ref] of html.matchAll(/(?:href|src|poster)="(\/[^"#?]*)/g)) {
      const target = path.join(OUT, ref);
      const ok = ref.endsWith('/') ? fs.existsSync(path.join(target, 'index.html')) : fs.existsSync(target);
      if (!ok) missing.push(`${path.relative(OUT, file)} → ${ref}`);
    }
  }
  if (missing.length) fail(`broken internal links:\n  ${missing.join('\n  ')}`);
}

async function build() {
  const started = Date.now();
  const site = JSON.parse(fs.readFileSync(path.join(CONTENT, 'site.json'), 'utf8'));
  const notes = loadNotes();
  const about = renderMarkdown(fs.readFileSync(path.join(CONTENT, 'about.md'), 'utf8'));

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT);
  for (const p of STATIC) fs.cpSync(path.join(ROOT, p), path.join(OUT, p), { recursive: true });

  const clash = fs.readdirSync(OUT).filter((p) => RESERVED.includes(p));
  if (clash.length) fail(`${clash.join(', ')} would shadow a project site served from another repo`);

  const cardsStarted = Date.now();
  const cards = await renderCards(site, notes);
  const cardsMs = Date.now() - cardsStarted;

  write('index.html', homePage(site, notes, about, cardFor(cards, 'home')));
  write('notes/index.html', notesPage(site, notes, cardFor(cards, 'notes')));
  for (const n of notes) {
    write(`notes/${n.slug}/index.html`, notePage(site, n, cardFor(cards, n.slug)));
    write(`notes/${n.slug}/index.md`, noteMarkdown(site, n));
  }
  write('404.html', notFoundPage(site));
  for (const [from, to] of Object.entries(LEGACY)) write(from, redirectPage(site, to));
  write('feed.xml', feed(site, notes));
  write('sitemap.xml', sitemap(site, notes));
  write('llms.txt', llmsTxt(site, notes));
  write('llms-full.txt', llmsFullTxt(site, notes));
  checkLinks();

  console.log(`Built ${notes.length} notes and ${Object.keys(cards).length} social cards into _site/ in ${Date.now() - started}ms (cards: ${cardsMs}ms)`);
}

// ---------------------------------------------------------------- local preview

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4',
};

function serve(port = 8000) {
  // Mimics GitHub Pages: /dir → /dir/, /dir/ → /dir/index.html, unknown → 404.html.
  http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(OUT, urlPath);
    if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: `${urlPath}/` }).end(); return; }
      file = path.join(file, 'index.html');
    }
    const found = fs.existsSync(file);
    if (!found) file = path.join(OUT, '404.html');
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(found ? 200 : 404, { 'Content-Type': type });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`Serving http://localhost:${port}`));

  let timer;
  let rebuild = Promise.resolve();
  for (const p of ['content', 'style.css', 'img', 'video']) {
    fs.watch(path.join(ROOT, p), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => { rebuild = rebuild.then(build).catch((e) => console.error(e.message)); }, 100);
    });
  }
}

try {
  await build();
  if (process.argv[2] === 'serve') serve();
} catch (e) {
  if (!(e instanceof BuildError)) throw e;
  console.error(`Build failed: ${e.message}`);
  process.exit(1);
}
