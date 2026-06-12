# AI Learning Log

A minimalist, static GitHub Pages site for tracking what I learn on my AI journey.
No build step, no framework — just HTML, CSS, and a little vanilla JavaScript.

## Add a learning

Open `entries.json` and add an object to the top of the array:

```json
{
  "date": "2026-06-12",
  "title": "Short, punchy title",
  "body": "What I learned. Supports **bold**, *italic*, `code`, and [links](https://example.com). Separate paragraphs with a blank line.",
  "tags": ["llm", "rag"]
}
```

- `date` — `YYYY-MM-DD`. Entries render newest-first automatically.
- `tags` — power the filter chips at the top. Reuse tags to group topics.
- `body` — supports inline markdown: `**bold**`, `*italic*`, `` `code` ``, `[text](url)`.

Commit the change and GitHub Pages updates within a minute.

## Preview locally

The page fetches `entries.json`, so open it through a local server (not `file://`):

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new repo (e.g. `ai-learning-log`) and push these files to the `main` branch.
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select branch `main`, folder `/ (root)`, then **Save**.
5. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

To use a custom domain later, add a `CNAME` file and configure DNS in the same Pages settings.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `style.css` | Minimalist styling (light + dark, system-aware) |
| `app.js` | Renders `entries.json`, search, tag filter, theme toggle |
| `entries.json` | **Your content** — edit this to add learnings |
