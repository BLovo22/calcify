# Numbrly

Numbrly is a static financial-calculator and money-guide website published at `https://numbrly.cc`.

## Requirements

- Node.js 20, 22, or 24
- npm

## Local development

```bash
npm install
npm test
npm run build
python -m http.server 8765
```

Open `http://127.0.0.1:8765/` after starting the server. The site does not require a backend.

## Project structure

- Root `*.html`: calculator and site pages
- `tools/`: larger interactive tools
- `content/articles/`: guide source files
- `_build/`: templates, data, and the static-site builder
- `assets/calculators.js`: tested calculation models shared by calculator pages
- `tests/`: formula and generated-site regression tests

## Content workflow

```bash
npm run content:status
npm run content:check
npm run content:new -- --title "Title" --description "120-160 character description"
npm run content:publish -- --slug article-slug
```

Article source filenames must match their `slug`. See `content/articles/README.md` for the full schema.

## Build and deployment

`npm run build` compiles the pinned local Tailwind bundle, regenerates guide pages, refreshes shared navigation and footer markup, and rebuilds the sitemap and search index. Generated files are committed so GitHub Pages can serve the repository directly.

CI runs unit tests, content checks, the production build, and a generated-file diff check on pushes and pull requests.

## Security notes

- Never put access tokens in Git remote URLs or committed files.
- Use the normal credential manager or SSH authentication for GitHub access.
- Calculator results are educational estimates, not financial advice.
