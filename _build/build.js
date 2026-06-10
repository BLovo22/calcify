/**
 * Numbrly Static Site Builder
 * 
 * node _build/build.js -> injects shared header, rebuilds homepage, sitemap, robots.txt
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const TPL_DIR = path.join(__dirname, "templates");
const GUIDES_DIR = path.join(ROOT, "guides");
const DOMAIN = "https://numbrly.cc";
const TODAY = new Date().toISOString().split("T")[0];
const HOSTNAME = DOMAIN.replace(/^https?:\/\//, "");

// ─── HELPERS ──────────────────────────────────────────
function loadJSON(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function loadHeader() {
  return fs.readFileSync(path.join(TPL_DIR, "header.html"), "utf8").trim();
}

function loadFooter() {
  return fs.readFileSync(path.join(TPL_DIR, "footer.html"), "utf8").trim();
}

function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortGuidesNewestFirst(guides) {
  return [...guides].sort((a, b) => {
    return String(b.datePublished || "").localeCompare(String(a.datePublished || ""));
  });
}

function guideCategoryLabel(guide, uppercase) {
  const label = String(guide.category || "general").replace(/-/g, " ");
  return uppercase ? label.toUpperCase() : label.replace(/\b\w/g, c => c.toUpperCase());
}

function buildHomepageGuideCard(guide) {
  return '    <a href="/guides/' + guide.slug + '.html" class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-pri transition-all duration-200">\n' +
    '      <span class="inline-block text-xs font-semibold text-pri bg-pri-light px-2 py-1 rounded mb-3">' + escapeHTML(guideCategoryLabel(guide, true)) + '</span>\n' +
    '      <h4 class="font-bold mb-2 group-hover:text-pri transition">' + escapeHTML(guide.h1 || guide.title) + '</h4>\n' +
    '      <p class="text-gray-500 text-sm">Updated ' + escapeHTML(guide.dateHuman || "") + ' &middot; ' + escapeHTML(guide.readTime || "") + ' min read</p>\n' +
    '    </a>';
}

function buildGuideIndexCard(guide) {
  return '<a href="' + guide.slug + '.html" class="article-card"><div class="art-cat">' +
    escapeHTML(guideCategoryLabel(guide, false)) + '</div><h4>' +
    escapeHTML(guide.h1 || guide.title) + '</h4><div class="art-date">' +
    escapeHTML(guide.dateHuman || "") + ' &middot; ' + escapeHTML(guide.readTime || "") + ' min read</div></a>';
}

function localPathForUrl(url) {
  if (!url.startsWith(DOMAIN + "/")) return null;
  const pathname = url.slice(DOMAIN.length);
  if (pathname === "/") return path.join(ROOT, "index.html");
  if (pathname === "/guides/") return path.join(GUIDES_DIR, "index.html");
  return path.join(ROOT, pathname.replace(/^\//, ""));
}

function expectedUrlForLocalPath(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (rel === "index.html") return DOMAIN + "/";
  if (rel === "guides/index.html") return DOMAIN + "/guides/";
  return DOMAIN + "/" + rel;
}

function extractAttr(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : "";
}

// ─── UNIFIED DARK MODE SCRIPT ─────────────────────────
const NEW_THEME_SCRIPT = `(function(){var s=localStorage.getItem("theme");if(s){document.documentElement.setAttribute("data-theme",s);if(s==="dark")document.documentElement.classList.add("dark")}else if(window.matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark")}window.toggleTheme=function(){var c=document.documentElement.getAttribute("data-theme");var n=c==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);if(n==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");localStorage.setItem("theme",n);document.getElementById("themeBtn").innerHTML=n==="dark"?"\u2600\uFE0F":"\uD83C\uDF19";};})();`;

// Two patterns to match old theme scripts (non-minified & minified)
const OLD_THEME_RE1 = /\(function\(\)\{\s*var\s+stored\s*=\s*localStorage\.getItem\(['"]theme['"]\);\s*if\(stored\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*stored\);\s*else\s+if\(window\.matchMedia\(['"]\(prefers-color-scheme:\s*dark\)['"]\)\.matches\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*['"]dark['"]\);\s*window\.toggleTheme\s*=\s*function\(\)\s*\{\s*var\s+\w+\s*=\s*document\.documentElement\.getAttribute\(['"]data-theme['"]\);\s*var\s+\w+\s*=\s*\w+\s*===\s*['"]dark['"]\s*\?\s*['"]light['"]\s*:\s*['"]dark['"];\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*\w+\);\s*localStorage\.setItem\(['"]theme['"],\s*\w+\);\s*document\.getElementById\(['"]themeIcon['"]\)\.innerHTML\s*=\s*\w+\s*===\s*['"]dark['"]\s*\?\s*'[^']*'\s*:\s*'[^']*';(?:\s*\};)?\s*\}\)\(\);/;

const OLD_THEME_RE2 = /\(function\(\)\{var\s+\w+=localStorage\.getItem\(['"]theme['"]\);if\(\w+\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*\w+\);else\s+if\(window\.matchMedia\(['"]\(prefers-color-scheme:\s*dark\)['"]\)\.matches\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*['"]dark['"]\);window\.toggleTheme\s*=\s*function\(\)\{var\s+\w+=document\.documentElement\.getAttribute\(['"]data-theme['"]\);var\s+\w+=\w+===['"]dark['"]\?['"]light['"]:['"]dark['"];document\.documentElement\.setAttribute\(['"]data-theme['"],\s*\w+\);localStorage\.setItem\(['"]theme['"],\s*\w+\);document\.getElementById\(['"]themeIcon['"]\)\.innerHTML\s*=\s*\w+===['"]dark['"]\?['"][^'"]*['"]:['"][^'"]*['"];(?:\s*\};)?\s*\}\)\(\);/;

function normalizeThemeScripts(html) {
  let foundThemeScript = false;
  html = html.replace(/<script>[\s\S]*?<\/script>/g, function(block) {
    if (!block.includes("toggleTheme")) return block;
    if (!block.includes("themeIcon") && !block.includes("themeBtn") && !block.includes("data-theme")) return block;
    if (foundThemeScript) return "";
    foundThemeScript = true;
    return "<script>" + NEW_THEME_SCRIPT + "</script>";
  });

  if (!foundThemeScript) {
    html = html.replace("</head>", "<script>" + NEW_THEME_SCRIPT + "</script>\n</head>");
  }

  return html;
}

// ─── INJECT SHARED HEADER INTO ONE FILE ───────────────
function injectHeaderIntoFile(filePath, headerHTML) {
  let html = fs.readFileSync(filePath, "utf8");

  // Replace old <nav class="nav">...</nav> block with shared header
  const navRegex = /<nav class="nav">[\s\S]*?<\/nav>/;
  const headerRegex = /(?:<!-- Header -->\s*)?(?:<!-- SHARED HEADER -->\s*)*<header class="sticky[^"]*">[\s\S]*?<\/header>/;
  if (navRegex.test(html)) {
    html = html.replace(navRegex, headerHTML);
  } else if (html.includes("{{HEADER}}")) {
    html = html.replace("{{HEADER}}", headerHTML);
  } else if (headerRegex.test(html)) {
    html = html.replace(headerRegex, headerHTML);
  }

  // Ensure Tailwind CDN is present
  if (!html.includes("cdn.tailwindcss.com")) {
    html = html.replace(
      "</title>",
      '</title>\n<script src="https://cdn.tailwindcss.com"></script>\n<script>tailwind.config={darkMode:"class"}</script>'
    );
  }

  // Replace old theme toggle scripts with unified version
  if (OLD_THEME_RE1.test(html)) {
    html = html.replace(OLD_THEME_RE1, NEW_THEME_SCRIPT);
  } else if (OLD_THEME_RE2.test(html)) {
    html = html.replace(OLD_THEME_RE2, NEW_THEME_SCRIPT);
  }

  // Fix remaining themeIcon → themeBtn
  html = html.replace(/getElementById\("themeIcon"\)/g, 'getElementById("themeBtn")');
  html = html.replace(/id="themeIcon"/g, 'id="themeBtn"');
  html = normalizeThemeScripts(html);

  fs.writeFileSync(filePath, html, "utf8");
}

// ─── INJECT HEADER INTO ALL SUB-PAGES ─────────────────
function injectFooterIntoFile(filePath, footerHTML) {
  let html = fs.readFileSync(filePath, "utf8");

  if (html.includes("{{FOOTER}}")) {
    html = html.replace("{{FOOTER}}", footerHTML);
  } else {
    const footerRegex = /(?:<!-- SHARED FOOTER -->\s*)?<footer\b[\s\S]*?<\/footer>/;
    if (footerRegex.test(html)) {
      html = html.replace(footerRegex, footerHTML);
    }
  }

  fs.writeFileSync(filePath, html, "utf8");
}

function eachContentPage(callback) {
  const excludes = ["index.html","404.html","googlea340ba91ef6edf90.html"];
  const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith(".html") && !excludes.includes(f));
  rootFiles.forEach(f => callback(path.join(ROOT, f), f));

  if (fs.existsSync(GUIDES_DIR)) {
    const guideFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith(".html"));
    guideFiles.forEach(f => callback(path.join(GUIDES_DIR, f), "guides/" + f));
  }
}

function injectHeaderAll(headerHTML) {
  eachContentPage(function(filePath, label) {
    injectHeaderIntoFile(filePath, headerHTML);
    console.log("  \u2713 header: " + label);
  });
}

function injectFooterAll(footerHTML) {
  eachContentPage(function(filePath, label) {
    injectFooterIntoFile(filePath, footerHTML);
    console.log("  \u2713 footer: " + label);
  });
}

// ─── BUILD HOMEPAGE ───────────────────────────────────
function buildHomepage(guides, headerHTML, footerHTML) {
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  // Inject shared header
  if (html.includes("{{HEADER}}")) {
    html = html.replace("{{HEADER}}", headerHTML);
  } else {
    const headerRegex = /(?:<!-- Header -->\s*)?(?:<!-- SHARED HEADER -->\s*)*<header class="sticky[^"]*">[\s\S]*?<\/header>/;
    if (headerRegex.test(html)) {
      html = html.replace(headerRegex, "<!-- Header -->\n" + headerHTML);
    }
  }

  // Guide cards (4 most recent)
  const sorted = sortGuidesNewestFirst(guides);
  const featured = sorted.slice(0, 4);
  const guideCards = featured.map(buildHomepageGuideCard).join("\n");

  if (html.includes("{{GUIDE_CARDS}}")) {
    html = html.replace("{{GUIDE_CARDS}}", guideCards);
  } else if (html.includes("<!-- AUTO_GUIDE_CARDS_START -->") && html.includes("<!-- AUTO_GUIDE_CARDS_END -->")) {
    html = html.replace(
      /<!-- AUTO_GUIDE_CARDS_START -->[\s\S]*?<!-- AUTO_GUIDE_CARDS_END -->/,
      "<!-- AUTO_GUIDE_CARDS_START -->\n" + guideCards + "\n    <!-- AUTO_GUIDE_CARDS_END -->"
    );
  } else {
    const guideGridRegex = /(<section class="max-w-6xl mx-auto px-4 py-16 border-t border-gray-200">\s*<div class="text-center mb-10">[\s\S]*?Financial Guides[\s\S]*?<div class="grid grid-cols-1 md:grid-cols-2 gap-4">\s*)([\s\S]*?)(\s*<\/div>\s*<div class="text-center mt-8">)/;
    if (guideGridRegex.test(html)) {
      html = html.replace(
        guideGridRegex,
        "$1<!-- AUTO_GUIDE_CARDS_START -->\n" + guideCards + "\n    <!-- AUTO_GUIDE_CARDS_END -->$3"
      );
    }
  }
  html = html.replace(/View all \d+ guides/, "View all " + guides.length + " guides");
  html = html.replace(/(?:<!-- SHARED FOOTER -->\s*)?<footer\b[\s\S]*?<\/footer>/, footerHTML);

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log("  \uD83C\uDFE0 Homepage \u2014 " + guides.length + " guides, " + featured.length + " featured");
}

// 鈹€鈹€鈹€ BUILD GUIDES INDEX 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function buildGuidesIndex(guides, headerHTML, footerHTML) {
  const sorted = sortGuidesNewestFirst(guides);
  const guideCards = sorted.map(buildGuideIndexCard).join("\n");
  const html = '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta property="og:title" content="Money Guides & Financial Articles | Numbrly">\n' +
    '<meta property="og:description" content="Browse all our free financial guides: mortgages, investing, retirement, saving, and more. Expert-written, no paywall.">\n' +
    '<meta property="og:url" content="' + DOMAIN + '/guides/">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="Money Guides & Financial Articles | Numbrly">\n' +
    '<meta name="twitter:description" content="Free financial guides on mortgages, investing, saving, and retirement planning.">\n' +
    '<link rel="canonical" href="' + DOMAIN + '/guides/">\n' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>All Money Guides & Financial Articles | Numbrly</title>\n' +
    '<meta name="description" content="Browse all Numbrly guides: mortgage advice, investing strategies, retirement planning, and smart money tips. Free, no sign-up required.">\n' +
    '<link rel="stylesheet" href="../style.css">\n' +
    '<script src="https://cdn.tailwindcss.com"></script>\n' +
    '<script>tailwind.config={darkMode:"class"}</script>\n' +
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4970468814214538" crossorigin="anonymous"></script>\n' +
    '<script>' + NEW_THEME_SCRIPT + '</script>\n' +
    '</head>\n' +
    '<body>\n' +
    headerHTML + '\n\n' +
    '<main class="main">\n' +
    '<div class="breadcrumb"><a href="/">Home</a> / All Guides</div>\n\n' +
    '<section style="margin-top:20px">\n' +
    '<div class="sec-title">&#x1F4DA; All Money Guides</div>\n' +
    '<p class="sec-desc">' + guides.length + ' in-depth articles covering mortgages, investing, saving, and retirement. Updated regularly.</p>\n\n' +
    guideCards + '\n' +
    '</section>\n' +
    '</main>\n\n' +
    footerHTML + '\n' +
    '</body>\n' +
    '</html>\n';

  fs.writeFileSync(path.join(GUIDES_DIR, "index.html"), html, "utf8");
  console.log("  \uD83D\uDCDA Guides index \u2014 " + guides.length + " guides");
}

// ─── BUILD SITEMAP ────────────────────────────────────
function formatFAQHtml(items) {
  if (!items || !items.length) return "";
  return items.map(function(item, index) {
    return '<details class="card" style="cursor:pointer;padding:0' + (index ? ';margin-top:8px' : '') + '"><summary style="padding:16px 20px;font-weight:600;font-size:15px;list-style:none;display:flex;justify-content:space-between;align-items:center">' +
      escapeHTML(item.q) + '<span style="color:var(--muted);font-size:12px">&#x25BC;</span></summary><div style="padding:0 20px 16px;color:var(--muted);font-size:14px;line-height:1.8;border-top:1px solid var(--border);padding-top:12px">' +
      item.a + '</div></details>';
  }).join("\n");
}

function buildFaqSchema(items) {
  if (!items || !items.length) return "";
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(function(item) {
      return {
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a }
      };
    })
  }, null, 2);
}

function buildBreadcrumbSchema(guide) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Numbrly", "item": DOMAIN + "/" },
      { "@type": "ListItem", "position": 2, "name": "Guides", "item": DOMAIN + "/guides/" },
      { "@type": "ListItem", "position": 3, "name": guide.title, "item": DOMAIN + "/guides/" + guide.slug + ".html" }
    ]
  }, null, 2);
}

function relatedCalculatorTitle(slug, calc) {
  const override = {
    "credit-card-payoff-calculator": "Debt Payoff Calculator",
    "compound-interest-calculator": "Investment Calculator"
  };
  return override[slug] || (calc && (calc.title || calc.h1)) || slug;
}

function buildRelatedCalculatorCards(guide, calculators) {
  const map = new Map((calculators || []).map(function(c) { return [c.slug, c]; }));
  const slugs = (guide.relatedCalculators || []).slice(0, 3);
  return slugs.map(function(slug) {
    const calc = map.get(slug);
    const title = relatedCalculatorTitle(slug, calc);
    const desc = calc ? (calc.description || "") : "";
    return '<a href="../' + slug + '.html" class="card" style="text-decoration:none;color:inherit;padding:16px 18px"><div style="font-weight:600;font-size:14px">' +
      escapeHTML(title) + '</div><div style="color:var(--muted);font-size:12px;margin-top:2px">' + escapeHTML(desc) + '</div></a>';
  }).join("\n");
}

function buildRelatedArticleCards(guide, guideMap) {
  const slugs = (guide.relatedArticles || []).slice(0, 3);
  return slugs.map(function(slug) {
    const related = guideMap.get(slug);
    if (!related) return "";
    const href = "guides/" + related.slug + ".html";
    const category = (related.category || "general").replace(/-/g, " ");
    return '<a href="' + href + '" class="article-card"><div class="art-cat">' +
      escapeHTML(category.replace(/\b\w/g, function(c) { return c.toUpperCase(); })) +
      '</div><h4>' + escapeHTML(related.h1 || related.title) + '</h4><div class="art-date">Updated ' +
      escapeHTML(related.dateHuman || "") + ' &middot; ' + escapeHTML(related.readTime || "") + ' min read</div></a>';
  }).filter(Boolean).join("\n");
}

function buildGuideArticlePage(guide, guideMap, calculators) {
  const template = fs.readFileSync(path.join(TPL_DIR, "article.html"), "utf8");
  const canonical = DOMAIN + "/guides/" + guide.slug + ".html";
  const seoTitle = (guide.title || guide.h1) + " | Numbrly";
  const faqItems = guide.faq || [];
  const adUnit = '<ins class="adsbygoogle" style="display:block;text-align:center;margin:28px 0" data-ad-client="ca-pub-4970468814214538" data-ad-format="auto" data-full-width-responsive="true"></ins>\n    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>';

  const html = template
    .replace("{{SCHEMA_BREADCRUMB}}", buildBreadcrumbSchema(guide))
    .replace("{{SCHEMA_FAQ}}", buildFaqSchema(faqItems))
    .replace("{{ARTICLE_HEADLINE}}", escapeHTML(guide.h1 || guide.title))
    .replaceAll("{{CANONICAL}}", canonical)
    .replace("{{DATE_PUB}}", guide.datePublished || TODAY)
    .replace("{{DATE_MOD}}", guide.dateModified || guide.datePublished || TODAY)
    .replace("{{FAVICON_PATH}}", "../favicon.svg")
    .replace("{{SEO_TITLE}}", escapeHTML(seoTitle))
    .replace("{{META_DESC}}", escapeHTML(guide.description || ""))
    .replaceAll("{{OG_TITLE}}", escapeHTML(seoTitle))
    .replaceAll("{{OG_DESC}}", escapeHTML(guide.ogDescription || guide.description || ""))
    .replace("{{CSS_PATH}}", "../style.css")
    .replaceAll("{{HOME_PATH}}", "../")
    .replace("{{PRIVACY_PATH}}", "../privacy-policy.html")
    .replaceAll("{{H1}}", escapeHTML(guide.h1 || guide.title))
    .replace("{{DATE_HUMAN}}", escapeHTML(guide.dateHuman || ""))
    .replace("{{READ_TIME}}", escapeHTML(guide.readTime || ""))
    .replace("{{INTRODUCTION}}", guide.introduction || "")
    .replace("{{MAIN_CONTENT}}", guide.mainContent || "")
    .replace("{{AD_UNIT}}", adUnit)
    .replace("{{CASE_STUDY}}", guide.caseStudy || "")
    .replace("{{FAQ_HTML}}", formatFAQHtml(faqItems))
    .replace("{{RELATED_CALCS}}", buildRelatedCalculatorCards(guide, calculators))
    .replace("{{RELATED_ARTICLES}}", buildRelatedArticleCards(guide, guideMap))
    .replace("{{SLUG}}", guide.slug);

  fs.writeFileSync(path.join(GUIDES_DIR, guide.slug + ".html"), html, "utf8");
  console.log("  \u2713 article: guides/" + guide.slug + ".html");
}

function buildGuidePages(guides, calculators) {
  const guideMap = new Map(guides.map(function(g) { return [g.slug, g]; }));
  guides.forEach(function(guide) {
    const renderable = guide.introduction && guide.mainContent && !String(guide.mainContent).includes("PLACEHOLDER");
    if (!renderable) return;
    buildGuideArticlePage(guide, guideMap, calculators);
  });
}

function buildSitemap(guides, calculators) {
  const urls = [];
  urls.push({ loc: DOMAIN + "/", priority: "1.0", changefreq: "weekly", lastmod: TODAY });
  calculators.forEach(c => urls.push({ loc: DOMAIN + "/" + c.slug + ".html", priority: "0.9", changefreq: "monthly", lastmod: TODAY }));
  urls.push({ loc: DOMAIN + "/guides/", priority: "0.7", changefreq: "weekly", lastmod: TODAY });
  guides.forEach(g => urls.push({ loc: DOMAIN + "/guides/" + g.slug + ".html", priority: "0.7", changefreq: "monthly", lastmod: g.dateModified || g.datePublished || TODAY }));
  urls.push({ loc: DOMAIN + "/search.html", priority: "0.5", changefreq: "monthly", lastmod: TODAY });
  urls.push({ loc: DOMAIN + "/privacy-policy.html", priority: "0.3", changefreq: "yearly", lastmod: TODAY });

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => "  <url>\n    <loc>" + u.loc + "</loc>\n    <changefreq>" + u.changefreq + "</changefreq>\n    <priority>" + u.priority + "</priority>\n    <lastmod>" + u.lastmod + "</lastmod>\n  </url>").join("\n") +
    "\n</urlset>\n";

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
  console.log("  \uD83D\uDDFA\uFE0F Sitemap \u2014 " + urls.length + " URLs");
  return urls;
}

// ─── VERIFY ROBOTS.TXT ────────────────────────────────
function verifyRobots() {
  const robotsPath = path.join(ROOT, "robots.txt");
  let robots = "";
  try { robots = fs.readFileSync(robotsPath, "utf8"); } catch (e) {}

  const expected = "User-agent: *\nAllow: /\n\nSitemap: " + DOMAIN + "/sitemap.xml\n";
  if (robots.replace(/\r\n/g, "\n") === expected) {
    console.log("  \uD83E\uDD16 robots.txt \u2014 OK");
  } else {
    fs.writeFileSync(robotsPath, expected, "utf8");
    console.log("  \uD83E\uDD16 robots.txt \u2014 regenerated");
  }
}

// ─── BUILD SEARCH INDEX ───────────────────────────────
function buildSearchData(guides, calculators) {
  const items = [];
  calculators.forEach(c => items.push({ title: c.title || c.h1, url: c.slug + ".html", kw: [c.category, c.title].join(" ") }));
  guides.forEach(g => items.push({ title: g.h1 || g.title, url: "guides/" + g.slug + ".html", kw: [g.category, g.title].join(" ") }));

  const js = "// Site search data \u2014 auto-generated " + TODAY + "\nvar searchIndex = " + JSON.stringify(items, null, 2) + ";\n";
  fs.writeFileSync(path.join(ROOT, "search-data.js"), js, "utf8");
  console.log("  \uD83D\uDD0D Search index \u2014 " + items.length + " entries");
}

// ─── PRINT STATS ──────────────────────────────────────
function validateSeoOutputs(sitemapUrls) {
  const errors = [];
  const cnamePath = path.join(ROOT, "CNAME");
  const robotsPath = path.join(ROOT, "robots.txt");
  const sitemapPath = path.join(ROOT, "sitemap.xml");

  const cname = fs.existsSync(cnamePath) ? fs.readFileSync(cnamePath, "utf8").trim() : "";
  if (cname !== HOSTNAME) errors.push("CNAME must be " + HOSTNAME + " but found " + (cname || "<missing>"));

  const robots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, "utf8").replace(/\r\n/g, "\n") : "";
  const expectedRobots = "User-agent: *\nAllow: /\n\nSitemap: " + DOMAIN + "/sitemap.xml\n";
  if (robots !== expectedRobots) errors.push("robots.txt does not match the canonical sitemap directive.");

  const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
  if (locs.length !== sitemapUrls.length) errors.push("sitemap.xml URL count mismatch.");

  locs.forEach(loc => {
    if (!loc.startsWith(DOMAIN + "/")) errors.push("Sitemap URL is outside canonical host: " + loc);
    const localPath = localPathForUrl(loc);
    if (!localPath || !fs.existsSync(localPath)) {
      errors.push("Sitemap URL has no local file: " + loc);
      return;
    }
    const html = fs.readFileSync(localPath, "utf8");
    const canonical = extractAttr(html, /<link rel="canonical" href="([^"]+)"/);
    const ogUrl = extractAttr(html, /<meta property="og:url" content="([^"]+)"/);
    const expectedUrl = expectedUrlForLocalPath(localPath);
    if (canonical !== expectedUrl) errors.push("Canonical mismatch for " + path.relative(ROOT, localPath) + ": " + (canonical || "<missing>"));
    if (ogUrl && ogUrl !== expectedUrl) errors.push("og:url mismatch for " + path.relative(ROOT, localPath) + ": " + ogUrl);
  });

  if (errors.length) {
    console.error("\nSEO output validation failed:");
    errors.forEach(e => console.error("  - " + e));
    process.exit(1);
  }

  console.log("  \u2705 SEO checks \u2014 canonical host, robots, sitemap, canonical tags OK");
}

function printStats(guides, calculators) {
  const cats = {};
  guides.forEach(g => { var c = g.category || "uncategorized"; cats[c] = (cats[c] || 0) + 1; });
  console.log("\n  \uD83D\uDCCA Stats:");
  console.log("     Tools:   " + calculators.length);
  console.log("     Guides:  " + guides.length);
  console.log("     Total:   " + (calculators.length + guides.length + 1) + " pages (incl. homepage)");
  Object.keys(cats).sort().forEach(function(c) { console.log("       " + c + ": " + cats[c] + " articles"); });
}

// ─── MAIN ─────────────────────────────────────────────
function main() {
  console.log("\uD83D\uDCE6 Numbrly Builder \u2014 " + TODAY + "\n");

  const calcData = loadJSON("calculators.json");
  const guideData = loadJSON("guides.json");
  const calculators = calcData.calculators || [];
  const guides = guideData.guides || [];
  const headerHTML = loadHeader();
  const footerHTML = loadFooter();

  if (!guides.length) { console.error("\u274C No guides found in guides.json \u2014 aborting."); process.exit(1); }

  buildGuidePages(guides, calculators);
  console.log("  \uD83D\uDD04 Injecting shared header...");
  injectHeaderAll(headerHTML);
  console.log("  \uD83D\uDD04 Injecting shared footer...");
  injectFooterAll(footerHTML);

  buildHomepage(guides, headerHTML, footerHTML);
  buildGuidesIndex(guides, headerHTML, footerHTML);
  const sitemapUrls = buildSitemap(guides, calculators);
  verifyRobots();
  buildSearchData(guides, calculators);
  validateSeoOutputs(sitemapUrls);
  printStats(guides, calculators);

  console.log("\n\u2728 Build complete!\n");
}

main();
