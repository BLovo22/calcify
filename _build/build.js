/**
 * Numbrly Static Site Builder
 * 
 * Usage: node _build/build.js
 * 
 * Reads data/calculators.json and data/guides.json,
 * applies templates from templates/,
 * outputs static HTML to the project root.
 * 
 * To add a new tool: add an entry to data/calculators.json and run `node _build/build.js`
 * To add a new article: add an entry to data/guides.json and run `node _build/build.js`
 */

const fs = require("fs");
const path = require("path");

// ─── PATHS ────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(__dirname, "templates");
const DATA_DIR = path.join(__dirname, "data");
const GUIDES_DIR = path.join(ROOT, "guides");

// ─── HELPERS ──────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escJSON(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function buildBreadcrumbSchema(items) {
  const listItems = items.map((item, i) => {
    return `{"@type":"ListItem","position":${i + 1},"name":"${escJSON(item.name)}","item":"${item.url}"}`;
  }).join(",");
  return `{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[${listItems}]}`;
}

function buildFAQSchema(faqItems) {
  if (!faqItems || faqItems.length === 0) return "";
  const entities = faqItems.map(qa => {
    return `{"@type":"Question","name":"${escJSON(qa.q)}","acceptedAnswer":{"@type":"Answer","text":"${escJSON(qa.a)}"}}`;
  }).join(",");
  return `{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${entities}]}`;
}

function buildWebAppSchema(title, url, desc) {
  return `{"@context":"https://schema.org","@type":"WebApplication","name":"${escJSON(title)}","url":"${url}","description":"${escJSON(desc)}","applicationCategory":"FinanceApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}`;
}

function buildArticleSchema(headline, url, datePub, dateMod) {
  return `{"@context":"https://schema.org","@type":"Article","headline":"${escJSON(headline)}","url":"${url}","datePublished":"${datePub}","dateModified":"${dateMod}","author":{"@type":"Organization","name":"Numbrly"}}`;
}

function faqToHTML(faqItems) {
  if (!faqItems || faqItems.length === 0) return "";
  return faqItems.map((qa, i) => {
    const mt = i === 0 ? "" : "margin-top:8px";
    return `<details class="card" style="cursor:pointer;padding:0;${mt}"><summary style="padding:16px 20px;font-weight:600;font-size:15px;list-style:none;display:flex;justify-content:space-between;align-items:center">${qa.q}<span style="color:var(--muted);font-size:12px">▼</span></summary><div style="padding:0 20px 16px;color:var(--muted);font-size:14px;line-height:1.8;border-top:1px solid var(--border);padding-top:12px">${qa.a}</div></details>`;
  }).join("\n");
}

function benefitsToHTML(benefits) {
  if (!benefits || benefits.length === 0) return "";
  return benefits.map(b => {
    return `<div class="card" style="padding:20px"><div class="tag">${b.icon} ${b.title}</div><p style="font-size:13px;line-height:1.7">${b.desc}</p></div>`;
  }).join("\n");
}

function mistakesToHTML(mistakes) {
  if (!mistakes || mistakes.length === 0) return "";
  return mistakes.map((m, i) => {
    const mt = i === 0 ? "" : "margin-top:12px;";
    return `<p style="${mt}"><strong style="color:var(--text)">❌ ${m.title}</strong> ${m.desc}</p>`;
  }).join("\n");
}

// ─── LOOKUP MAPS ─────────────────────────────────────
function buildLookupMaps(calculators, guides) {
  const calcMap = {};
  const guideMap = {};
  calculators.forEach(c => { calcMap[c.slug] = c; });
  guides.forEach(g => { guideMap[g.slug] = g; });
  return { calcMap, guideMap };
}

function relatedCalcsHTML(slugs, calcMap) {
  if (!slugs || slugs.length === 0) return "";
  return slugs.map(slug => {
    const c = calcMap[slug];
    if (!c) return "";
    return `<a href="${slug}.html" class="tool-card"><div class="tool-icon">${c.icon}</div><h3>${c.h1}</h3><p>${c.description.substring(0, 100)}</p></a>`;
  }).join("\n");
}

function relatedGuidesHTML(slugs, guideMap) {
  if (!slugs || slugs.length === 0) return "";
  return slugs.map(slug => {
    const g = guideMap[slug];
    if (!g) return "";
    // Determine path: root-level guides or guides/ subfolder
    const href = `guides/${slug}.html`;
    return `<a href="${href}" class="article-card"><div class="art-cat">${g.category.toUpperCase()}</div><h4>${g.h1}</h4><div class="art-date">Updated ${g.dateHuman} · ${g.readTime} min read</div></a>`;
  }).join("\n");
}

function relatedArticleLinks(slugs, guideMap) {
  if (!slugs || slugs.length === 0) return "";
  return slugs.map(slug => {
    const g = guideMap[slug];
    if (!g) return "";
    return `<a href="${slug}.html" class="article-card"><div class="art-cat">${g.category.toUpperCase()}</div><h4>${g.h1}</h4><div class="art-date">Updated ${g.dateHuman} · ${g.readTime} min read</div></a>`;
  }).join("\n");
}

function relatedCalcLinks(slugs, calcMap) {
  if (!slugs || slugs.length === 0) return "";
  return slugs.map(slug => {
    const c = calcMap[slug];
    if (!c) return "";
    return `<a href="../${slug}.html" class="card" style="text-decoration:none;color:inherit;padding:16px 18px"><div style="font-weight:600;font-size:14px">${c.icon} ${c.h1}</div><div style="color:var(--muted);font-size:12px;margin-top:2px">${c.description.substring(0, 60)}</div></a>`;
  }).join("\n");
}

// ─── BUILD CALCULATOR PAGES ──────────────────────────
function buildCalculator(calc, calcMap, guideMap) {
  const tpl = fs.readFileSync(path.join(TEMPLATE_DIR, "calculator.html"), "utf8");
  const canonical = `https://numbrly.cc/${calc.slug}.html`;
  const ogTitle = `${calc.title} — Free Online Calculator | Numbrly`;
  const seoTitle = `${calc.title} — Free Online Calculator | Numbrly`;

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Numbrly", url: "https://numbrly.cc/" },
    { name: "Calculators", url: "https://numbrly.cc/#calculators" },
    { name: calc.h1, url: canonical }
  ]);

  const webapp = buildWebAppSchema(calc.h1, canonical, calc.ogDescription);
  const faqSchema = buildFAQSchema(calc.faq);
  const faqHTML = faqToHTML(calc.faq);
  const benefitsHTML = benefitsToHTML(calc.benefits);
  const mistakesHTML = mistakesToHTML(calc.mistakes);
  const howtoItems = calc.howToUse.map(s => `<li>${s}</li>`).join("\n");

  // Example block
  const ex = calc.example || {};
  const exampleBullets = (ex.bullets || []).map(b => `<li>${b}</li>`).join("\n");
  const exampleAfter = ex.after || "";

  // Related
  const relCalcs = relatedCalcsHTML(calc.relatedCalculators, calcMap);
  const relGuides = relatedGuidesHTML(calc.relatedGuides, guideMap);

  // Schedule (optional)
  const scheduleHTML = calc.scheduleHTML && calc.scheduleHTML !== "SCHEDULE_HTML_PLACEHOLDER" ? calc.scheduleHTML : "";

  return tpl
    .replace(/{{OG_TITLE}}/g, ogTitle)
    .replace(/{{OG_DESC}}/g, calc.ogDescription)
    .replace(/{{CANONICAL}}/g, canonical)
    .replace(/{{SEO_TITLE}}/g, seoTitle)
    .replace(/{{META_DESC}}/g, calc.description)
    .replace(/{{SCHEMA_BREADCRUMB}}/g, `<script type="application/ld+json">${breadcrumb}</script>`)
    .replace(/{{SCHEMA_WEBAPP}}/g, `<script type="application/ld+json">${webapp}</script>`)
    .replace(/{{SCHEMA_FAQ}}/g, faqSchema ? `<script type="application/ld+json">${faqSchema}</script>` : "")
    .replace(/{{H1}}/g, calc.h1)
    .replace(/{{ICON}}/g, calc.icon)
    .replace(/{{INTRO}}/g, calc.intro)
    .replace(/{{INPUTS}}/g, calc.inputs)
    .replace(/{{RESULT_HTML}}/g, calc.resultHTML)
    .replace(/{{SCHEDULE_HTML}}/g, scheduleHTML)
    .replace(/{{HOWTO_ITEMS}}/g, howtoItems)
    .replace(/{{EXAMPLE_TITLE_SUFFIX}}/g, ex.titleSuffix || "")
    .replace(/{{EXAMPLE_SCENARIO}}/g, ex.scenario || "")
    .replace(/{{EXAMPLE_BOX_TITLE}}/g, ex.boxTitle || "")
    .replace(/{{EXAMPLE_BULLETS}}/g, exampleBullets)
    .replace(/{{EXAMPLE_AFTER}}/g, exampleAfter)
    .replace(/{{BENEFITS}}/g, benefitsHTML)
    .replace(/{{MISTAKES}}/g, mistakesHTML)
    .replace(/{{FAQ_HTML}}/g, faqHTML)
    .replace(/{{RELATED_CALCS}}/g, relCalcs)
    .replace(/{{RELATED_GUIDES}}/g, relGuides)
    .replace(/{{CALC_FN}}/g, calc.calcFn)
    .replace(/{{CALC_FN_BODY}}/g, calc.calcFnBody)
    .replace(/{{SLUG}}/g, calc.slug)
    .replace(/{{FAVICON_PATH}}/g, "/favicon.svg")
    .replace(/{{CSS_PATH}}/g, "style.css")
    .replace(/{{HOME_PATH}}/g, "index.html")
    .replace(/{{PRIVACY_PATH}}/g, "privacy-policy.html")
    .replace(/{{SEARCH_PATH}}/g, "search.html");
}

// ─── BUILD ARTICLE PAGES ─────────────────────────────
function buildArticle(guide, calcMap, guideMap) {
  const tpl = fs.readFileSync(path.join(TEMPLATE_DIR, "article.html"), "utf8");
  const canonical = `https://numbrly.cc/guides/${guide.slug}.html`;
  const ogTitle = `${guide.title} — Complete Guide | Numbrly`;
  const seoTitle = `${guide.title} — Complete Guide | Numbrly`;

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Numbrly", url: "https://numbrly.cc/" },
    { name: "Guides", url: "https://numbrly.cc/guides/" },
    { name: guide.h1, url: canonical }
  ]);

  const faqSchema = buildFAQSchema(guide.faq);
  const faqHTML = faqToHTML(guide.faq);
  const relCalcs = relatedCalcLinks(guide.relatedCalculators, calcMap);
  const relArticles = relatedArticleLinks(guide.relatedArticles, guideMap);

  return tpl
    .replace(/{{OG_TITLE}}/g, ogTitle)
    .replace(/{{OG_DESC}}/g, guide.ogDescription)
    .replace(/{{CANONICAL}}/g, canonical)
    .replace(/{{SEO_TITLE}}/g, seoTitle)
    .replace(/{{META_DESC}}/g, guide.description)
    .replace(/{{SCHEMA_BREADCRUMB}}/g, breadcrumb)
    .replace(/{{SCHEMA_FAQ}}/g, faqSchema ? `{"@context":"https://schema.org","@type":"FAQPage","mainEntity":${JSON.stringify(guide.faq.map(qa => ({"@type":"Question","name":qa.q,"acceptedAnswer":{"@type":"Answer","text":qa.a}})))}` : "")
    .replace(/{{ARTICLE_HEADLINE}}/g, guide.h1)
    .replace(/{{H1}}/g, guide.h1)
    .replace(/{{DATE_PUB}}/g, guide.datePublished)
    .replace(/{{DATE_MOD}}/g, guide.dateModified)
    .replace(/{{DATE_HUMAN}}/g, guide.dateHuman)
    .replace(/{{READ_TIME}}/g, guide.readTime)
    .replace(/{{INTRODUCTION}}/g, guide.introduction)
    .replace(/{{MAIN_CONTENT}}/g, guide.mainContent)
    .replace(/{{CASE_STUDY}}/g, guide.caseStudy || "")
    .replace(/{{AD_UNIT}}/g, guide.adUnit || "")
    .replace(/{{FAQ_HTML}}/g, faqHTML)
    .replace(/{{RELATED_CALCS}}/g, relCalcs)
    .replace(/{{RELATED_ARTICLES}}/g, relArticles)
    .replace(/{{FAVICON_PATH}}/g, "/favicon.svg")
    .replace(/{{CSS_PATH}}/g, "../style.css")
    .replace(/{{HOME_PATH}}/g, "../index.html")
    .replace(/{{PRIVACY_PATH}}/g, "../privacy-policy.html")
    .replace(/{{SEARCH_PATH}}/g, "../search.html");
}

// ─── MAIN ────────────────────────────────────────────
function main() {
  console.log("📦 Numbrly Static Site Builder\n");

  // Load data
  const calcData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "calculators.json"), "utf8"));
  const guideData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "guides.json"), "utf8"));
  const calculators = calcData.calculators || [];
  const guides = guideData.guides || [];

  console.log(`  Calculators: ${calculators.length}`);
  console.log(`  Guides:      ${guides.length}`);

  const { calcMap, guideMap } = buildLookupMaps(calculators, guides);

  // Build calculators
  let calcCount = 0;
  calculators.forEach(calc => {
    // Skip placeholder entries
    if (calc.calcFnBody === "CALC_FN_PLACEHOLDER") return;
    const html = buildCalculator(calc, calcMap, guideMap);
    const outPath = path.join(ROOT, `${calc.slug}.html`);
    fs.writeFileSync(outPath, html, "utf8");
    calcCount++;
  });
  console.log(`\n  ✅ ${calcCount} calculator pages built`);

  // Build guides
  let guideCount = 0;
  guides.forEach(guide => {
    if (guide.mainContent === "MAIN_CONTENT_PLACEHOLDER") return;
    const html = buildArticle(guide, calcMap, guideMap);
    const outPath = path.join(GUIDES_DIR, `${guide.slug}.html`);
    fs.writeFileSync(outPath, html, "utf8");
    guideCount++;
  });
  console.log(`  ✅ ${guideCount} article pages built`);
  console.log("\n✨ Done!");
}

main();