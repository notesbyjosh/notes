# Notes by Josh

A Jekyll portfolio and searchable notebook, published through GitHub Pages.

## Pages

- `/`: introduction, three featured projects, and recent notes.
- `/work/`: selected projects with links to their build stories and demos.
- `/notebook/`: all notes, with full-text search and topic filtering.
- `/about/`: background and links to GitHub.
- `/learnings/:title/`: existing article URLs, preserved during the redesign.

All paths above are relative to the configured `/notes` base URL. Existing visualization and timeline URLs are unchanged. Old homepage bookmarks such as `/notes/#tag=rag` forward to the notebook filter.

## Add a note

Create `_posts/YYYY-MM-DD-short-title.md` with front matter:

```yaml
---
layout: post
title: "What I learned"
tags: [fabric, ai]
---
```

Write the article in Markdown beneath it. An optional `description` supplies the notebook preview; otherwise the first paragraph is used. Search includes the full article, not only the preview.

## Add or feature a project

Edit `_data/projects.yml`. Each item has `title`, `category`, `description`, `image`, `url`, and `label`. Add `demo` for a live demo link and `featured: true` to show it on the homepage. Keep three featured projects for the intended desktop layout. Project `url` can point to an existing build story. Store preview images in `assets/images/`.

## Design and content

- `_layouts/default.html`: shared header, navigation, theme control, and footer.
- `_layouts/post.html`: article layout.
- `_includes/project-card.html`: reusable project card.
- `index.html`, `work/index.html`, `notebook/index.html`, `about/index.html`: page content.
- `assets/style.css`: responsive light and dark themes.
- `assets/app.js`: theme persistence, notebook filtering, and legacy tag links.
- `_config.yml`: title, description, site URL, and base URL.

## Preview and publish

Use a Ruby version compatible with the GitHub Pages gem bundle:

```sh
bundle install
bundle exec jekyll serve
```

Open `http://localhost:4000/notes/`. Push to `main` to publish through GitHub Pages.
