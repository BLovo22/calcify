"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function(entry) {
    if ([".git", "node_modules", "_build"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function publicHtmlFiles() {
  return walk(ROOT).filter(function(filePath) { return filePath.endsWith(".html"); });
}

function localPathForRef(filePath, ref) {
  if (!ref || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) return null;
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return null;
  let target = clean.startsWith("/")
    ? path.join(ROOT, clean.slice(1))
    : path.resolve(path.dirname(filePath), clean);
  if (clean.endsWith("/")) target = path.join(target, "index.html");
  return target;
}

test("every registered calculator has a unique, existing page", function() {
  const calculators = require("../_build/data/calculators.json").calculators;
  const slugs = calculators.map(function(item) { return item.slug; });
  assert.equal(new Set(slugs).size, slugs.length);
  calculators.forEach(function(item) {
    const rel = item.url ? (item.url.endsWith("/") ? item.url + "index.html" : item.url) : item.slug + ".html";
    assert.ok(fs.existsSync(path.join(ROOT, rel)), "Missing calculator page: " + rel);
  });
});

test("public pages have no broken local links or assets", function() {
  const missing = [];
  publicHtmlFiles().forEach(function(filePath) {
    const html = fs.readFileSync(filePath, "utf8");
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const target = localPathForRef(filePath, match[1]);
      if (target && !fs.existsSync(target)) {
        missing.push(path.relative(ROOT, filePath) + " -> " + match[1]);
      }
    }
  });
  assert.deepEqual(missing, []);
});

test("public pages have unique ids and no damaged currency placeholders", function() {
  const errors = [];
  publicHtmlFiles().forEach(function(filePath) {
    const html = fs.readFileSync(filePath, "utf8");
    const ids = Array.from(html.matchAll(/\bid=["']([^"']+)["']/gi), function(match) { return match[1]; });
    const duplicateIds = Array.from(new Set(ids.filter(function(id, index) { return ids.indexOf(id) !== index; })));
    if (duplicateIds.length) errors.push(path.relative(ROOT, filePath) + " duplicate ids: " + duplicateIds.join(", "));
    if (/>[^<]*\\(?:,|\.|\/)/.test(html)) errors.push(path.relative(ROOT, filePath) + " has a damaged currency placeholder");
  });
  assert.deepEqual(errors, []);
});

test("form controls have accessible labels", function() {
  const errors = [];
  publicHtmlFiles().forEach(function(filePath) {
    const html = fs.readFileSync(filePath, "utf8");
    for (const match of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
      const control = match[0];
      if (/\btype=["'](?:hidden|submit|button)["']/i.test(control)) continue;
      if (/\baria-(?:label|labelledby)=["'][^"']+["']/i.test(control)) continue;
      const id = (control.match(/\bid=["']([^"']+)["']/i) || [])[1];
      const before = html.slice(0, match.index).toLowerCase();
      const wrapped = before.lastIndexOf("<label") > before.lastIndexOf("</label>");
      const explicit = id && new RegExp("<label\\b[^>]*\\bfor=[\\\"']" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\\"']", "i").test(html);
      if (!wrapped && !explicit) errors.push(path.relative(ROOT, filePath) + " unlabeled control: " + (id || control));
    }
  });
  assert.deepEqual(errors, []);
});

test("production pages use local pinned front-end assets", function() {
  const errors = [];
  publicHtmlFiles().forEach(function(filePath) {
    if (path.basename(filePath).startsWith("google") || path.basename(filePath) === "404.html") return;
    const html = fs.readFileSync(filePath, "utf8");
    if (/cdn\.tailwindcss\.com|unpkg\.com|cdn\.jsdelivr\.net/i.test(html)) errors.push(path.relative(ROOT, filePath) + " uses a runtime CDN");
    if (!/href=["'][^"']*tailwind\.css["']/i.test(html)) errors.push(path.relative(ROOT, filePath) + " is missing local Tailwind CSS");
  });
  assert.deepEqual(errors, []);
});

test("JSON-LD blocks parse and generated text has no common mojibake", function() {
  const errors = [];
  publicHtmlFiles().forEach(function(filePath) {
    const html = fs.readFileSync(filePath, "utf8");
    for (const match of html.matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
      try { JSON.parse(match[1].trim()); }
      catch (error) { errors.push(path.relative(ROOT, filePath) + " invalid JSON-LD: " + error.message); }
    }
    if (/[\u9983\u9225\u9239\uFFFD]/.test(html)) errors.push(path.relative(ROOT, filePath) + " contains mojibake");
  });
  assert.deepEqual(errors, []);
});

test("generated guides contain no legacy placeholder FAQ copy", function() {
  const errors = [];
  publicHtmlFiles().filter(function(filePath) {
    return path.dirname(filePath) === path.join(ROOT, "guides");
  }).forEach(function(filePath) {
    const html = fs.readFileSync(filePath, "utf8");
    if (html.includes("Use our related calculators to run your own numbers for this scenario.")) {
      errors.push(path.relative(ROOT, filePath));
    }
  });
  assert.deepEqual(errors, []);
});

test("sitemap and search index include every calculator", function() {
  const calculators = require("../_build/data/calculators.json").calculators;
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const search = fs.readFileSync(path.join(ROOT, "search-data.js"), "utf8");
  calculators.forEach(function(item) {
    const url = item.url || item.slug + ".html";
    assert.ok(sitemap.includes("https://numbrly.cc/" + url), "Sitemap missing " + item.slug);
    assert.ok(search.includes(url), "Search index missing " + item.slug);
  });
});
