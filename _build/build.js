/**
 * Numbrly Static Site Builder
 * 
 * Usage: node _build/build.js
 * 
 * Reads data/calculators.json and data/guides.json,
 * rebuilds the homepage with live guide cards and counts.
 * Also builds new pages when full content is provided.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const GUIDES_DIR = path.join(ROOT, "guides");

function main() {
  console.log("📦 Numbrly Static Site Builder\n");

  // Load data
  const guides = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "guides.json"), "utf8")).guides || [];
  const calculators = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "calculators.json"), "utf8")).calculators || [];

  console.log(`  Calculators: ${calculators.length}`);
  console.log(`  Guides:      ${guides.length}`);

  // 1. Build homepage (always)
  buildHomepage(guides);
  console.log(`\n✨ Done!`);
}

function buildHomepage(guides) {
  const tpl = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  // Featured guide cards (4 most recent)
  const sorted = [...guides].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  const featured = sorted.slice(0, 4);
  const guideCards = featured.map(g => {
    const cat = g.category.toUpperCase();
    return `<a href="/guides/${g.slug}.html" class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-pri transition-all duration-200">
      <span class="inline-block text-xs font-semibold text-pri bg-pri-light px-2 py-1 rounded mb-3">${cat}</span>
      <h4 class="font-bold mb-2 group-hover:text-pri transition">${g.h1}</h4>
      <p class="text-gray-500 text-sm">Updated ${g.dateHuman} &middot; ${g.readTime} min read</p>
    </a>`;
  }).join("\n                ");

  let html = tpl
    .replace("{{GUIDE_CARDS}}", guideCards)
    .replace("{{GUIDE_COUNT}}", String(guides.length));

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log("  🏠 Homepage rebuilt (" + guides.length + " guides, " + featured.length + " featured)");
}

main();