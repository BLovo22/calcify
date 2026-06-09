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

// ─── HELPERS ──────────────────────────────────────────
function loadJSON(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function loadHeader() {
  return fs.readFileSync(path.join(TPL_DIR, "header.html"), "utf8").trim();
}

// ─── UNIFIED DARK MODE SCRIPT ─────────────────────────
const NEW_THEME_SCRIPT = `(function(){var s=localStorage.getItem("theme");if(s){document.documentElement.setAttribute("data-theme",s);if(s==="dark")document.documentElement.classList.add("dark")}else if(window.matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark")}window.toggleTheme=function(){var c=document.documentElement.getAttribute("data-theme");var n=c==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);if(n==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");localStorage.setItem("theme",n);document.getElementById("themeBtn").innerHTML=n==="dark"?"\u2600\uFE0F":"\uD83C\uDF19";};})();`;

// Two patterns to match old theme scripts (non-minified & minified)
const OLD_THEME_RE1 = /\(function\(\)\{\s*var\s+stored\s*=\s*localStorage\.getItem\(['"]theme['"]\);\s*if\(stored\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*stored\);\s*else\s+if\(window\.matchMedia\(['"]\(prefers-color-scheme:\s*dark\)['"]\)\.matches\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*['"]dark['"]\);\s*window\.toggleTheme\s*=\s*function\(\)\s*\{\s*var\s+\w+\s*=\s*document\.documentElement\.getAttribute\(['"]data-theme['"]\);\s*var\s+\w+\s*=\s*\w+\s*===\s*['"]dark['"]\s*\?\s*['"]light['"]\s*:\s*['"]dark['"];\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*\w+\);\s*localStorage\.setItem\(['"]theme['"],\s*\w+\);\s*document\.getElementById\(['"]themeIcon['"]\)\.innerHTML\s*=\s*\w+\s*===\s*['"]dark['"]\s*\?\s*'[^']*'\s*:\s*'[^']*';(?:\s*\};)?\s*\}\)\(\);/;

const OLD_THEME_RE2 = /\(function\(\)\{var\s+\w+=localStorage\.getItem\(['"]theme['"]\);if\(\w+\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*\w+\);else\s+if\(window\.matchMedia\(['"]\(prefers-color-scheme:\s*dark\)['"]\)\.matches\)\s*document\.documentElement\.setAttribute\(['"]data-theme['"],\s*['"]dark['"]\);window\.toggleTheme\s*=\s*function\(\)\{var\s+\w+=document\.documentElement\.getAttribute\(['"]data-theme['"]\);var\s+\w+=\w+===['"]dark['"]\?['"]light['"]:['"]dark['"];document\.documentElement\.setAttribute\(['"]data-theme['"],\s*\w+\);localStorage\.setItem\(['"]theme['"],\s*\w+\);document\.getElementById\(['"]themeIcon['"]\)\.innerHTML\s*=\s*\w+===['"]dark['"]\?['"][^'"]*['"]:['"][^'"]*['"];(?:\s*\};)?\s*\}\)\(\);/;

// ─── INJECT SHARED HEADER INTO ONE FILE ───────────────
function injectHeaderIntoFile(filePath, headerHTML) {
  let html = fs.readFileSync(filePath, "utf8");

  // Replace old <nav class="nav">...</nav> block with shared header
  const navRegex = /<nav class="nav">[\s\S]*?<\/nav>/;
  if (navRegex.test(html)) {
    html = html.replace(navRegex, headerHTML);
  } else if (html.includes("{{HEADER}}")) {
    html = html.replace("{{HEADER}}", headerHTML);
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

  fs.writeFileSync(filePath, html, "utf8");
}

// ─── INJECT HEADER INTO ALL SUB-PAGES ─────────────────
function injectHeaderAll(headerHTML) {
  // Calculator pages (root .html, excluding index/search/privacy/404)
  const excludes = ["index.html","search.html","404.html","googlea340ba91ef6edf90.html"];
  const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith(".html") && !excludes.includes(f));
  rootFiles.forEach(f => {
    injectHeaderIntoFile(path.join(ROOT, f), headerHTML);
    console.log("  \u2713 header: " + f);
  });

  // Guide pages
  if (fs.existsSync(GUIDES_DIR)) {
    const guideFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith(".html") && f !== "index.html");
    guideFiles.forEach(f => {
      injectHeaderIntoFile(path.join(GUIDES_DIR, f), headerHTML);
      console.log("  \u2713 header: guides/" + f);
    });
  }

  // Search page
  const searchPath = path.join(ROOT, "search.html");
  if (fs.existsSync(searchPath)) {
    injectHeaderIntoFile(searchPath, headerHTML);
    console.log("  \u2713 header: search.html");
  }
}

// ─── BUILD HOMEPAGE ───────────────────────────────────
function buildHomepage(guides, headerHTML) {
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  // Inject shared header
  if (html.includes("{{HEADER}}")) {
    html = html.replace("{{HEADER}}", headerHTML);
  } else {
    const headerRegex = /<header class="sticky[^"]*">[\s\S]*?<\/header>/;
    if (headerRegex.test(html)) {
      html = html.replace(headerRegex, headerHTML);
    }
  }

  // Guide cards (4 most recent)
  const sorted = [...guides].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  const featured = sorted.slice(0, 4);
  const guideCards = featured.map(g => {
    const cat = (g.category || "general").toUpperCase();
    return '<a href="/guides/' + g.slug + '.html" class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-pri transition-all duration-200">\n      <span class="inline-block text-xs font-semibold text-pri bg-pri-light px-2 py-1 rounded mb-3">' + cat + '</span>\n      <h4 class="font-bold mb-2 group-hover:text-pri transition">' + g.h1 + '</h4>\n      <p class="text-gray-500 text-sm">Updated ' + g.dateHuman + ' &middot; ' + g.readTime + ' min read</p>\n    </a>';
  }).join("\n                ");

  if (html.includes("{{GUIDE_CARDS}}")) {
    html = html.replace("{{GUIDE_CARDS}}", guideCards);
  }
  html = html.replace(/View all \d+ guides/, "View all " + guides.length + " guides");

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log("  \uD83C\uDFE0 Homepage \u2014 " + guides.length + " guides, " + featured.length + " featured");
}

// ─── BUILD SITEMAP ────────────────────────────────────
function buildSitemap(guides, calculators) {
  const urls = [];
  urls.push({ loc: DOMAIN + "/", priority: "1.0", changefreq: "weekly" });
  calculators.forEach(c => urls.push({ loc: DOMAIN + "/" + c.slug + ".html", priority: "0.9", changefreq: "monthly" }));
  urls.push({ loc: DOMAIN + "/guides/", priority: "0.7", changefreq: "weekly" });
  guides.forEach(g => urls.push({ loc: DOMAIN + "/guides/" + g.slug + ".html", priority: "0.7", changefreq: "monthly" }));
  urls.push({ loc: DOMAIN + "/search.html", priority: "0.5", changefreq: "monthly" });
  urls.push({ loc: DOMAIN + "/privacy-policy.html", priority: "0.3", changefreq: "yearly" });

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => "  <url>\n    <loc>" + u.loc + "</loc>\n    <changefreq>" + u.changefreq + "</changefreq>\n    <priority>" + u.priority + "</priority>\n    <lastmod>" + TODAY + "</lastmod>\n  </url>").join("\n") +
    "\n</urlset>\n";

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
  console.log("  \uD83D\uDDFA\uFE0F Sitemap \u2014 " + urls.length + " URLs");
}

// ─── VERIFY ROBOTS.TXT ────────────────────────────────
function verifyRobots() {
  const robotsPath = path.join(ROOT, "robots.txt");
  let robots = "";
  try { robots = fs.readFileSync(robotsPath, "utf8"); } catch (e) {}

  const expected = "User-agent: *\nAllow: /\n\nSitemap: " + DOMAIN + "/sitemap.xml\n";
  if (robots.includes("Sitemap:") && robots.includes("Allow: /")) {
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

  if (!guides.length) { console.error("\u274C No guides found in guides.json \u2014 aborting."); process.exit(1); }

  console.log("  \uD83D\uDD04 Injecting shared header...");
  injectHeaderAll(headerHTML);

  buildHomepage(guides, headerHTML);
  buildSitemap(guides, calculators);
  verifyRobots();
  buildSearchData(guides, calculators);
  printStats(guides, calculators);

  console.log("\n\u2728 Build complete!\n");
}

main();