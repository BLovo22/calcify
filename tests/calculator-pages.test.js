"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const MODEL_SOURCE = fs.readFileSync(path.join(ROOT, "assets", "calculators.js"), "utf8");
const UI_SOURCE = fs.readFileSync(path.join(ROOT, "assets", "calculator-ui.js"), "utf8");
const CALCULATOR_FUNCTIONS = {
  "mortgage-calculator.html": "calcMortgage",
  "home-affordability-calculator.html": "calcAffordability",
  "mortgage-payoff-calculator.html": "calcPayoff",
  "compound-interest-calculator.html": "calcCompound",
  "roi-calculator.html": "calcROI",
  "loan-calculator.html": "calcLoan",
  "debt-payoff-calculator.html": "calcDebtPayoff",
  "savings-goal-calculator.html": "calcSavingsGoal",
  "rent-vs-buy-calculator.html": "calcRentVsBuy",
  "inflation-calculator.html": "calcInflation",
  "salary-to-hourly-calculator.html": "calcSalaryToHourly",
  "credit-card-payoff-calculator.html": "calcCC",
  "retirement-calculator.html": "calcRetire",
  "bnpl-payment-planner.html": "calcBnpl",
  "401k-employer-match-calculator.html": "calculateMatch",
  "credit-utilization-calculator.html": "calcUtilization",
  "mortgage-refinance-calculator.html": "calculateRefinance",
  "car-affordability-calculator.html": "runCarAffordability",
  "car-loan-interest-deduction-calculator.html": "runCarInterestDeduction",
  "investment-fee-calculator.html": "calculateFees",
  "mortgage-points-calculator.html": "runMortgagePoints",
  "emergency-fund-calculator.html": "runEmergencyFund",
  "social-security-break-even-calculator.html": "calculateSocialSecurity"
};

function attribute(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + "=[\"']([^\"']*)[\"']", "i"));
  return match ? match[1] : "";
}

function classList(initialValue) {
  const values = new Set(String(initialValue || "").split(/\s+/).filter(Boolean));
  return {
    add: function() {
      Array.from(arguments).forEach(function(value) { values.add(value); });
    },
    remove: function() {
      Array.from(arguments).forEach(function(value) { values.delete(value); });
    },
    contains: function(value) {
      return values.has(value);
    }
  };
}

function createElement(tagName, tag) {
  tag = tag || "";
  const element = {
    tagName: String(tagName || "div").toUpperCase(),
    id: attribute(tag, "id"),
    value: attribute(tag, "value"),
    defaultValue: attribute(tag, "value"),
    min: attribute(tag, "min"),
    max: attribute(tag, "max"),
    textContent: "",
    innerHTML: "",
    hidden: false,
    children: [],
    style: {
      display: "",
      setProperty: function(name, value) { this[name] = value; }
    },
    classList: classList(attribute(tag, "class")),
    addEventListener: function() {},
    appendChild: function(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    replaceChildren: function() {
      this.children = Array.from(arguments);
      this.children.forEach(function(child) { child.parentNode = element; });
    },
    setAttribute: function(name, value) {
      this[name] = String(value);
    },
    scrollIntoView: function() {},
    select: function() {},
    remove: function() {}
  };
  return element;
}

function pageContext(relativePath, html) {
  const elements = new Map();
  const parent = {
    children: [],
    insertBefore: function(child) {
      this.children.push(child);
      child.parentNode = this;
      if (child.id) elements.set(child.id, child);
      return child;
    },
    appendChild: function(child) {
      return this.insertBefore(child);
    }
  };

  for (const match of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid=["'][^"']+["'][^>]*>/gi)) {
    const element = createElement(match[1], match[0]);
    element.parentNode = parent;
    elements.set(element.id, element);
  }

  for (const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const selectTag = "<select " + match[1] + ">";
    const id = attribute(selectTag, "id");
    const select = elements.get(id);
    if (!select) continue;
    const options = Array.from(match[2].matchAll(/<option\b([^>]*)>/gi));
    const selected = options.find(function(option) { return /\bselected\b/i.test(option[1]); }) || options[0];
    if (selected) select.value = attribute("<option " + selected[1] + ">", "value");
  }

  const storage = new Map();
  const document = {
    body: createElement("body"),
    documentElement: createElement("html"),
    getElementById: function(id) { return elements.get(id) || null; },
    querySelectorAll: function() { return []; },
    createElement: function(tagName) { return createElement(tagName); },
    createTextNode: function(text) { return { textContent: String(text), parentNode: null }; },
    addEventListener: function() {},
    execCommand: function() { return true; }
  };
  document.body.appendChild = function(child) {
    child.parentNode = document.body;
    if (child.id) elements.set(child.id, child);
    return child;
  };

  const context = {
    console,
    document,
    location: { pathname: "/" + relativePath },
    localStorage: {
      getItem: function(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem: function(key, value) { storage.set(key, String(value)); },
      removeItem: function(key) { storage.delete(key); }
    },
    navigator: {},
    setTimeout: function(callback) { callback(); return 1; },
    clearTimeout: function() {},
    getComputedStyle: function() {
      return { getPropertyValue: function() { return ""; } };
    }
  };
  context.window = context;
  vm.createContext(context);
  return { context, elements };
}

Object.entries(CALCULATOR_FUNCTIONS).forEach(function(entry) {
  const relativePath = entry[0];
  const functionName = entry[1];

  test(relativePath + " calculates successfully with its default inputs", function() {
    const html = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    const page = pageContext(relativePath, html);
    vm.runInContext(MODEL_SOURCE, page.context, { filename: "assets/calculators.js" });
    vm.runInContext(UI_SOURCE, page.context, { filename: "assets/calculator-ui.js" });

    const calculatorScript = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
      .filter(function(match) { return !/\bsrc\s*=|application\/ld\+json/i.test(match[1]); })
      .map(function(match) { return match[2]; })
      .find(function(source) { return source.includes("function " + functionName); });
    assert.ok(calculatorScript, relativePath + " is missing " + functionName);
    vm.runInContext(calculatorScript, page.context, { filename: relativePath });

    assert.equal(typeof page.context[functionName], "function");
    page.context[functionName](false);

    const error = page.elements.get("calculatorError");
    assert.notEqual(error && error.style.display, "block", error && error.textContent);
    assert.equal(page.elements.get("result").classList.contains("show"), true);
  });
});
