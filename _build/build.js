/**
 * Numbrly Static Site Builder
 * 
 * npm run build → rebuilds homepage, sitemap, verifies robots.txt
 * 
 * Data sources:
 *   _build/data/calculators.json  — all calculator pages
 *   _build/data/guides.json       — all article pages
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const GUIDES_DIR = path.join(ROOT, "guides");
const DOMAIN = "https://numbrly.cc";
const TODAY = new Date().toISOString().split("T")[0];

// ─── HELPERS ──────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── LOAD DATA ────────────────────────────────────────
function loadJSON(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

// ─── BUILD HOMEPAGE ───────────────────────────────────
function buildHomepage(guides, calculators) {
  const tpl = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  // Guide cards (4 most recent)
  const sorted = [...guides].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  const featured = sorted.slice(0, 4);
  const guideCards = featured.map(g => {
    const cat = (g.category || "general").toUpperCase();
    return `<a href="/guides/${g.slug}.html" class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-pri transition-all duration-200">
      <span class="inline-block text-xs font-semibold text-pri bg-pri-light px-2 py-1 rounded mb-3">${cat}</span>
      <h4 class="font-bold mb-2 group-hover:text-pri transition">${g.h1}</h4>
      <p class="text-gray-500 text-sm">Updated ${g.dateHuman} &middot; ${g.readTime} min read</p>
    </a>`;
  }).join("\n                ");

  let html = tpl;
  if (html.includes("{{GUIDE_CARDS}}")) {
    html = html.replace("{{GUIDE_CARDS}}", guideCards);
  }
  html = html.replace(/View all \d+ guides/, `View all ${guides.length} guides`);

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log(`  🏠 Homepage — ${guides.length} guides, ${featured.length} featured cards`);
}

// ─── BUILD SITEMAP ────────────────────────────────────
function buildSitemap(guides, calculators) {
  const urls = [];

  // Homepage
  urls.push({ loc: `${DOMAIN}/`, priority: "1.0", changefreq: "weekly" });

  // Calculator pages
  calculators.forEach(c => {
    urls.push({
      loc: `${DOMAIN}/${c.slug}.html`,
      priority: "0.9",
      changefreq: "monthly"
    });
  });

  // Guide listing
  urls.push({ loc: `${DOMAIN}/guides/`, priority: "0.7", changefreq: "weekly" });

  // Article pages
  guides.forEach(g => {
    urls.push({
      loc: `${DOMAIN}/guides/${g.slug}.html`,
      priority: "0.7",
      changefreq: "monthly"
    });
  });

  // Search + Privacy + 404
  urls.push({ loc: `${DOMAIN}/search.html`, priority: "0.5", changefreq: "monthly" });
  urls.push({ loc: `${DOMAIN}/privacy-policy.html`, priority: "0.3", changefreq: "yearly" });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    <lastmod>${TODAY}</lastmod>
  </url>`).join("\n")}
</urlset>
`;

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
  console.log(`  🗺️  Sitemap — ${urls.length} URLs`);
}

// ─── VERIFY ROBOTS.TXT ────────────────────────────────
function verifyRobots() {
  const robotsPath = path.join(ROOT, "robots.txt");
  let robots = "";
  try { robots = fs.readFileSync(robotsPath, "utf8"); } catch (e) { /* will create */ }

  const expected = `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;

  if (robots.includes("Sitemap:") && robots.includes("Allow: /")) {
    console.log("  🤖 robots.txt — OK");
  } else {
    fs.writeFileSync(robotsPath, expected, "utf8");
    console.log("  🤖 robots.txt — regenerated");
  }
}

// ─── UPDATE SEARCH INDEX ──────────────────────────────
function buildSearchData(guides, calculators) {
  const items = [];

  calculators.forEach(c => {
    items.push({
      title: c.title || c.h1,
      url: `${c.slug}.html`,
      kw: [c.category, c.title].join(" ")
    });
  });

  guides.forEach(g => {
    items.push({
      title: g.h1 || g.title,
      url: `guides/${g.slug}.html`,
      kw: [g.category, g.title].join(" ")
    });
  });

  const js = `// Site search data — auto-generated ${TODAY}
var searchIndex = ${JSON.stringify(items, null, 2)};
`;

  fs.writeFileSync(path.join(ROOT, "search-data.js"), js, "utf8");
  console.log(`  🔍 Search index — ${items.length} entries`);
}

// ─── PRINT STATS ──────────────────────────────────────
function printStats(guides, calculators) {
  const categories = {};
  guides.forEach(g => {
    const cat = g.category || "uncategorized";
    categories[cat] = (categories[cat] || 0) + 1;
  });

  console.log("\n  📊 Stats:");
  console.log(`     Tools:   ${calculators.length}`);
  console.log(`     Guides:  ${guides.length}`);
  console.log(`     Total:   ${calculators.length + guides.length + 1} pages (incl. homepage)`);
  Object.keys(categories).sort().forEach(cat => {
    console.log(`       ${cat}: ${categories[cat]} articles`);
  });
}

// ─── MAIN ─────────────────────────────────────────────
function main() {
  console.log(`📦 Numbrly Builder — ${TODAY}\n`);

  // Load
  const calcData = loadJSON("calculators.json");
  const guideData = loadJSON("guides.json");
  const calculators = calcData.calculators || [];
  const guides = guideData.guides || [];

  if (!guides.length) {
    console.error("❌ No guides found in guides.json — aborting.");
    process.exit(1);
  }

  // Build
  buildHomepage(guides, calculators);
  buildSitemap(guides, calculators);
  verifyRobots();
  buildSearchData(guides, calculators);
  printStats(guides, calculators);

  console.log("\n✨ Build complete!\n");
}

main();