# jamesstew.art

My personal website. It's plain HTML and CSS, built by one small script with no dependencies to install, so it should keep working for a long time without anyone touching it.

## Publishing an essay

1. Write it in Markdown and save it as `content/notes/your-essay-title.md`. The file name becomes the URL: `jamesstew.art/notes/your-essay-title/`.
2. Put this at the top:

   ```
   ---
   title: Your Essay Title
   date: 2026-10-26
   ---
   ```

   Optional fields: `description` (the one-line summary for search and link previews; otherwise the first paragraph is used), `updated` (a later date, shown as "Updated …"), `originally` (a link to where it first ran, like LinkedIn), and `draft: true` (keeps it off the site).
3. Commit and push to `master`. The site rebuilds and goes live in about a minute.

No computer handy? On GitHub, open `content/notes/`, choose **Add file → Upload files**, drop the `.md` in, and commit.

If something's wrong with the file (a missing title, a bad date, a broken image link), the build fails with a plain-English message and the live site stays as it was. The error is under the repo's **Actions** tab.

## Everything else

| What | Where |
| --- | --- |
| Homepage text | `content/about.md` |
| Name, title, contact info, projects, research, press | `content/site.json` |
| Design | `style.css` |
| Images and videos | `img/`, `video/` (reference them as `/img/name.png`) |
| Page templates and the build | `build.mjs` |

To preview locally: `node build.mjs serve`, then open http://localhost:8000. It rebuilds whenever you save.

## What the build makes

Besides the pages, every build also writes:
- `/feed.xml`, an Atom feed
- `/sitemap.xml`
- `/llms.txt` and `/llms-full.txt`, plain-text summaries for AI assistants
- a Markdown copy of each essay at `/notes/<slug>/index.md`
- redirects so old `.html` links keep working

## Stack

The pages are hand-written templates in `build.mjs`, rendered with [marked](https://github.com/markedjs/marked). Marked is vendored as a single file in `vendor/`, so there is no `package.json` and no `node_modules`. GitHub Actions runs `node build.mjs` and publishes the result to GitHub Pages.
