# Numbrly article content

Each article lives in its own JSON file. The filename must match `slug`, and the
generated URL remains:

`/guides/{slug}.html`

Run the site build with:

`node _build/build.js`

## Structured article format

```json
{
  "schemaVersion": "1.0",
  "slug": "example-article",
  "title": "SEO Title",
  "h1": "Page Heading",
  "description": "Meta description",
  "ogDescription": "Open Graph description",
  "seoTitle": "SEO Title | Numbrly",
  "ogTitle": "Open Graph Title | Numbrly",
  "keywords": ["primary keyword", "secondary keyword"],
  "category": "personal-finance",
  "datePublished": "2026-06-11",
  "dateModified": "2026-06-11",
  "dateHuman": "June 2026",
  "readTime": 8,
  "article": {
    "format": "structured",
    "introduction": "<p>Introduction</p>",
    "body": "<h2>Main section</h2><p>Article content</p>",
    "caseStudy": "<div class=\"highlight-box\"><p>Optional example</p></div>"
  },
  "faq": [
    {
      "q": "Question?",
      "a": "Answer."
    }
  ],
  "relatedArticles": ["another-article"],
  "recommendedCalculators": ["mortgage-calculator"]
}
```

The builder validates article and calculator references before writing pages.
Legacy articles use `article.format: "html"` to preserve their existing content
while still being generated from an individual JSON file.
