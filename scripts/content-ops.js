#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "content", "articles");
const GUIDES_DIR = path.join(ROOT, "guides");
const CALCULATORS_FILE = path.join(ROOT, "_build", "data", "calculators.json");
const LEGACY_GUIDES_FILE = path.join(ROOT, "_build", "data", "guides.json");
const DOMAIN = "https://numbrly.cc";
const TODAY = new Date().toISOString().slice(0, 10);

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJSON(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getFlag(args, name, fallback) {
  const index = args.indexOf("--" + name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) return true;
  return value;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function articleFiles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs.readdirSync(ARTICLES_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(ARTICLES_DIR, name));
}

function loadArticles() {
  return articleFiles().map((filePath) => {
    const article = readJSON(filePath);
    return { filePath, article };
  });
}

function loadCalculatorSlugs() {
  const data = readJSON(CALCULATORS_FILE);
  return new Set((data.calculators || []).map((item) => item.slug));
}

function loadKnownGuideSlugs() {
  const slugs = new Set(loadArticles().map((entry) => entry.article.slug));
  if (fs.existsSync(LEGACY_GUIDES_FILE)) {
    const data = readJSON(LEGACY_GUIDES_FILE);
    (data.guides || []).forEach((guide) => slugs.add(guide.slug));
  }
  return slugs;
}

function htmlToPlainText(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function localPathForHref(href, baseDir) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (/^https?:\/\//i.test(href)) {
    if (!href.startsWith(DOMAIN + "/")) return null;
    href = href.slice(DOMAIN.length);
  }
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return path.join(ROOT, "index.html");
  if (clean.startsWith("/")) {
    if (clean.endsWith("/")) return path.join(ROOT, clean.slice(1), "index.html");
    return path.join(ROOT, clean.slice(1));
  }
  if (baseDir) {
    if (clean.endsWith("/")) return path.resolve(baseDir, clean, "index.html");
    return path.resolve(baseDir, clean);
  }
  return null;
}

function checkJsonLd(filePath, errors) {
  const html = readText(filePath);
  const blocks = Array.from(html.matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi));
  blocks.forEach((match, index) => {
    try {
      JSON.parse(match[1].trim());
    } catch (error) {
      errors.push(path.relative(ROOT, filePath) + " has invalid JSON-LD block " + (index + 1) + ": " + error.message);
    }
  });
}

function checkLocalLinksInHtml(label, html, errors, baseDir) {
  const hrefs = Array.from(String(html || "").matchAll(/\bhref=["']([^"']+)["']/gi)).map((match) => match[1]);
  hrefs.forEach((href) => {
    const localPath = localPathForHref(href, baseDir);
    if (localPath && !fs.existsSync(localPath)) {
      errors.push(label + " links to missing local file: " + href);
    }
  });
}

function validateArticle(entry, seenSlugs, guideSlugs, calculatorSlugs, errors, warnings) {
  const rel = path.relative(ROOT, entry.filePath);
  const article = entry.article;
  const expectedSlug = path.basename(entry.filePath, ".json");
  const titleForSeo = article.seoTitle || ((article.title || "") + " | Numbrly");
  const description = article.description || "";
  const body = article.article || {};

  ["slug", "title", "description", "category", "datePublished", "dateModified", "dateHuman", "readTime"].forEach((field) => {
    if (!String(article[field] || "").trim()) errors.push(rel + " is missing " + field);
  });

  if (article.slug !== expectedSlug) errors.push(rel + " slug must match filename");
  if (seenSlugs.has(article.slug)) errors.push("Duplicate article slug: " + article.slug);
  seenSlugs.add(article.slug);

  if (titleForSeo.length < 50 || titleForSeo.length > 60) {
    warnings.push(rel + " SEO title is " + titleForSeo.length + " chars; target is 50-60");
  }
  if (description.length < 120 || description.length > 160) {
    warnings.push(rel + " meta description is " + description.length + " chars; target is 120-160");
  }

  if (!Array.isArray(article.keywords) || article.keywords.length === 0) errors.push(rel + " needs keywords");
  if (!Array.isArray(article.faq) || article.faq.length < 3) warnings.push(rel + " has fewer than 3 FAQ items");
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push(rel + " article must be an object");
  } else if (!["structured", "html"].includes(body.format)) {
    errors.push(rel + " article.format must be structured or html");
  } else if (body.format === "structured" && !String(body.body || "").trim()) {
    errors.push(rel + " structured article is missing body");
  } else if (body.format === "html" && !String(body.content || "").trim()) {
    errors.push(rel + " html article is missing content");
  }

  (article.faq || []).forEach((item, index) => {
    if (!item || !String(item.q || "").trim() || !String(item.a || "").trim()) {
      errors.push(rel + " faq[" + index + "] must include q and a");
    }
  });

  (article.relatedArticles || []).forEach((slug) => {
    if (!guideSlugs.has(slug)) errors.push(rel + " references missing article: " + slug);
    if (slug === article.slug) errors.push(rel + " cannot relate to itself");
  });

  const calculatorRefs = article.recommendedCalculators || article.relatedCalculators || [];
  calculatorRefs.forEach((slug) => {
    if (!calculatorSlugs.has(slug)) errors.push(rel + " references missing calculator: " + slug);
  });

  checkLocalLinksInHtml(rel, [body.introduction, body.body, body.caseStudy, body.content].join("\n"), errors, GUIDES_DIR);
  const bodyText = htmlToPlainText([body.introduction, body.body, body.content].join(" ")).toLowerCase();
  const primaryKeyword = String((article.keywords || [])[0] || "").toLowerCase();
  if (primaryKeyword && !bodyText.includes(primaryKeyword)) {
    warnings.push(rel + " may not mention its primary keyword in body copy");
  }
}

function checkOutputCoverage(entries, errors) {
  const guidesIndexPath = path.join(GUIDES_DIR, "index.html");
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  const searchDataPath = path.join(ROOT, "search-data.js");
  const homepagePath = path.join(ROOT, "index.html");
  const guidesIndex = fs.existsSync(guidesIndexPath) ? readText(guidesIndexPath) : "";
  const sitemap = fs.existsSync(sitemapPath) ? readText(sitemapPath) : "";
  const searchData = fs.existsSync(searchDataPath) ? readText(searchDataPath) : "";
  const homepage = fs.existsSync(homepagePath) ? readText(homepagePath) : "";
  const sorted = entries
    .map((entry) => entry.article)
    .sort((a, b) => String(b.dateModified || b.datePublished || "").localeCompare(String(a.dateModified || a.datePublished || "")));
  const featuredSlugs = new Set(sorted.slice(0, 4).map((article) => article.slug));

  entries.forEach((entry) => {
    const slug = entry.article.slug;
    const outputPath = path.join(GUIDES_DIR, slug + ".html");
    const guideHref = "guides/" + slug + ".html";
    if (!fs.existsSync(outputPath)) errors.push("Missing generated article page: guides/" + slug + ".html");
    if (!guidesIndex.includes(slug + ".html")) errors.push("Guides index is missing: " + slug);
    if (!sitemap.includes(DOMAIN + "/guides/" + slug + ".html")) errors.push("Sitemap is missing: " + slug);
    if (!searchData.includes(guideHref)) errors.push("Search index is missing: " + slug);
    if (featuredSlugs.has(slug) && !homepage.includes("/" + guideHref)) {
      errors.push("Homepage featured guides are missing latest article: " + slug);
    }
  });
}

function checkCommand() {
  const errors = [];
  const warnings = [];
  const entries = loadArticles();
  const seenSlugs = new Set();
  const guideSlugs = loadKnownGuideSlugs();
  const calculatorSlugs = loadCalculatorSlugs();

  entries.forEach((entry) => validateArticle(entry, seenSlugs, guideSlugs, calculatorSlugs, errors, warnings));
  checkOutputCoverage(entries, errors);

  fs.readdirSync(GUIDES_DIR)
    .filter((name) => name.endsWith(".html"))
    .forEach((name) => checkJsonLd(path.join(GUIDES_DIR, name), errors));

  const managedSlugs = new Set(entries.map((entry) => entry.article.slug));
  const unmanagedGuides = fs.readdirSync(GUIDES_DIR)
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .map((name) => path.basename(name, ".html"))
    .filter((slug) => !managedSlugs.has(slug));

  if (unmanagedGuides.length) {
    warnings.push("Guide HTML without content/articles JSON: " + unmanagedGuides.join(", "));
  }

  console.log("Content Ops Check");
  console.log("- Articles: " + entries.length);
  console.log("- Managed guide outputs checked: " + fs.readdirSync(GUIDES_DIR).filter((name) => name.endsWith(".html")).length);
  console.log("- Warnings: " + warnings.length);
  warnings.forEach((warning) => console.log("  warning: " + warning));

  if (errors.length) {
    console.error("- Errors: " + errors.length);
    errors.forEach((error) => console.error("  error: " + error));
    process.exit(1);
  }

  console.log("- Errors: 0");
}

function statusCommand() {
  const entries = loadArticles();
  const guideHtml = fs.readdirSync(GUIDES_DIR).filter((name) => name.endsWith(".html") && name !== "index.html");
  const articleSlugs = new Set(entries.map((entry) => entry.article.slug));
  const unmanaged = guideHtml.map((name) => path.basename(name, ".html")).filter((slug) => !articleSlugs.has(slug));

  console.log("Numbrly Content Status");
  console.log("- Source articles: " + entries.length);
  console.log("- Guide HTML pages: " + guideHtml.length);
  console.log("- Unmanaged guide HTML: " + (unmanaged.length ? unmanaged.join(", ") : "none"));
  console.log("- Latest source articles:");
  entries
    .map((entry) => entry.article)
    .sort((a, b) => String(b.dateModified || b.datePublished || "").localeCompare(String(a.dateModified || a.datePublished || "")))
    .slice(0, 5)
    .forEach((article) => console.log("  " + article.slug + " - " + (article.dateModified || article.datePublished || "")));
}

function newCommand(args) {
  const title = String(getFlag(args, "title", "") || "").trim();
  const slug = slugify(getFlag(args, "slug", title));
  const description = String(getFlag(args, "description", "") || "").trim();
  const keyword = String(getFlag(args, "keyword", title.toLowerCase()) || "").trim();
  const category = String(getFlag(args, "category", "personal-finance") || "personal-finance").trim();
  const readTime = Number(getFlag(args, "read-time", 7)) || 7;
  const force = Boolean(getFlag(args, "force", false));

  if (!slug || !title || !description) {
    console.error("Usage: npm run content:new -- --title \"Title\" --description \"120-160 char meta\" [--slug slug] [--keyword keyword]");
    process.exit(1);
  }

  const filePath = path.join(ARTICLES_DIR, slug + ".json");
  if (fs.existsSync(filePath) && !force) {
    console.error("Article already exists: " + path.relative(ROOT, filePath));
    process.exit(1);
  }

  const article = {
    schemaVersion: "1.0",
    slug,
    title,
    h1: title.replace(/\s*\|\s*Numbrly\s*$/i, ""),
    description,
    ogDescription: description,
    seoTitle: title.endsWith("| Numbrly") ? title : title + " | Numbrly",
    ogTitle: title.endsWith("| Numbrly") ? title : title + " | Numbrly",
    keywords: [keyword],
    category,
    datePublished: TODAY,
    dateModified: TODAY,
    dateHuman: new Date(TODAY + "T00:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    readTime,
    article: {
      format: "structured",
      introduction: "<p>TODO: Write the opening paragraph with the primary keyword.</p>",
      body: "<h2>TODO Section</h2><p>TODO: Add article content.</p>",
      caseStudy: ""
    },
    faq: [
      { q: "TODO question 1?", a: "TODO answer 1." },
      { q: "TODO question 2?", a: "TODO answer 2." },
      { q: "TODO question 3?", a: "TODO answer 3." }
    ],
    relatedArticles: splitList(getFlag(args, "related", "")),
    recommendedCalculators: splitList(getFlag(args, "calculators", ""))
  };

  ensureDir(ARTICLES_DIR);
  writeJSON(filePath, article);
  console.log("Created " + path.relative(ROOT, filePath));
  console.log("Next: fill article.article.body, then run npm run content:check and npm run build.");
}

function run(command, args) {
  console.log("$ " + [command].concat(args).join(" "));
  childProcess.execFileSync(command, args, { cwd: ROOT, stdio: "inherit" });
}

function publishCommand(args) {
  const message = String(getFlag(args, "message", "") || "").trim();
  const shouldPush = Boolean(getFlag(args, "push", false));
  if (!message) {
    console.error("Usage: npm run content:publish -- --message \"Commit message\" [--push]");
    process.exit(1);
  }

  run(process.execPath, [path.join("_build", "build.js")]);
  checkCommand();
  run("git", ["add", "index.html", "guides", "sitemap.xml", "search-data.js", "robots.txt", "content/articles", "scripts/content-ops.js", "package.json"]);
  run("git", ["commit", "-m", message]);
  if (shouldPush) run("git", ["push", "origin", "main"]);
}

function helpCommand() {
  console.log("Numbrly Content Ops");
  console.log("");
  console.log("Commands:");
  console.log("  npm run content:status");
  console.log("  npm run content:check");
  console.log("  npm run content:new -- --title \"SEO Title\" --description \"Meta description\" --keyword \"primary keyword\"");
  console.log("  npm run content:publish -- --message \"Add article\" --push");
}

const args = process.argv.slice(2);
const command = args[0] || "help";
const rest = args.slice(1);

try {
  if (command === "check") checkCommand();
  else if (command === "status") statusCommand();
  else if (command === "new") newCommand(rest);
  else if (command === "publish") publishCommand(rest);
  else helpCommand();
} catch (error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
}
