(function() {
  "use strict";

  var root = document.documentElement;
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reducedMotion = motionQuery.matches;
  var countObserver;

  root.classList.add("js");

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function classifyPage() {
    var body = document.body;
    var pathname = window.location.pathname.replace(/\/index\.html$/, "/");
    var hasCalculatorModel = document.querySelector('script[src*="assets/calculators.js"]');

    if (pathname === "/" || pathname.endsWith("/index.html")) body.classList.add("home-page");
    if (hasCalculatorModel) body.classList.add("calculator-page");
    if (/\/guides\/[^/]+\.html$/.test(pathname)) body.classList.add("article-page");
    if (/\/guides\/?$/.test(pathname)) body.classList.add("guides-index-page");
    if (/\/search\.html$/.test(pathname)) body.classList.add("search-page");
    if (/\/privacy-policy\.html$/.test(pathname)) body.classList.add("policy-page");
    if (/\/tools\/budget-planner\/?$/.test(pathname)) body.classList.add("budget-page");
    if (/\/tools\/net-worth-calculator\/?$/.test(pathname)) body.classList.add("net-worth-page");
    if (/\/404\.html$/.test(pathname)) body.classList.add("error-page");

    if (body.classList.contains("calculator-page")) {
      Array.from(document.querySelectorAll(".main > section")).forEach(function(section) {
        if (section.querySelector("h1")) section.classList.add("page-hero");
        if (section.querySelector(".result")) section.classList.add("calculator-stage");
        if (!section.classList.contains("page-hero") && !section.classList.contains("calculator-stage")) {
          section.classList.add("explain-section");
        }
      });
    }
  }

  function installSkipLink() {
    if (document.querySelector(".skip-link")) return;
    var main = document.querySelector("main");
    if (!main) return;
    if (!main.id) main.id = "main-content";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    var link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#" + main.id;
    link.textContent = "Skip to content";
    link.addEventListener("click", function() {
      window.setTimeout(function() { main.focus({ preventScroll: true }); }, 0);
    });
    document.body.insertBefore(link, document.body.firstChild);
  }

  function updateActiveNavigation() {
    var pathname = window.location.pathname.replace(/\/index\.html$/, "/");
    var isToolPage = pathname === "/" ||
      document.body.classList.contains("calculator-page") ||
      /^\/tools\//.test(pathname);
    document.querySelectorAll("[data-nav]").forEach(function(link) {
      var target = link.getAttribute("data-nav");
      var active = target === "guides"
        ? pathname.indexOf("/guides/") !== -1
        : target === "tools"
          ? isToolPage
          : false;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function installMobileMenu() {
    var button = document.getElementById("menuBtn");
    var menu = document.getElementById("mobileNav");
    var desktopQuery = window.matchMedia("(min-width: 861px)");
    if (!button || !menu) return;

    function setOpen(open) {
      menu.classList.toggle("is-open", open);
      menu.classList.toggle("hidden", !open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
    }

    button.setAttribute("aria-controls", "mobileNav");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", function() {
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        button.focus();
      }
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
      ) {
        var search = document.querySelector(".site-search input");
        if (search) {
          event.preventDefault();
          search.focus();
          search.select();
        }
      }
    });
    document.addEventListener("click", function(event) {
      if (
        button.getAttribute("aria-expanded") === "true" &&
        !menu.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    function closeAtDesktop(event) {
      if (event.matches) setOpen(false);
    }
    if (desktopQuery.addEventListener) desktopQuery.addEventListener("change", closeAtDesktop);
    else desktopQuery.addListener(closeAtDesktop);
  }

  function installHeaderState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var update = function() {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function installReveal() {
    var candidates = document.querySelectorAll(
      "main > section, .tool-card, .article-card, .home-tool-card, .editorial-guide-card, .category-cluster, .faq-card"
    );
    candidates.forEach(function(node, index) {
      node.classList.add("reveal");
      node.style.setProperty("--reveal-order", String(index % 8));
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      candidates.forEach(function(node) { node.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    candidates.forEach(function(node) { observer.observe(node); });
  }

  function installSpotlights() {
    if (reducedMotion || !window.matchMedia("(pointer:fine)").matches) return;
    document.querySelectorAll(
      ".card, .tool-card, .article-card, .home-tool-card, .editorial-guide-card, .category-cluster"
    ).forEach(function(card) {
      card.classList.add("spotlight-card");
      card.addEventListener("pointermove", function(event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
        card.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
      });
    });
  }

  function numericParts(text) {
    var matches = text.match(/[-+]?\d[\d,]*(?:\.\d+)?/g);
    if (!matches || matches.length !== 1) return null;
    var token = matches[0];
    var start = text.indexOf(token);
    var decimal = token.match(/\.(\d+)$/);
    return {
      value: Number(token.replace(/,/g, "")),
      prefix: text.slice(0, start),
      suffix: text.slice(start + token.length),
      decimals: decimal ? decimal[1].length : 0,
      grouping: token.indexOf(",") !== -1
    };
  }

  function formatNumber(value, parts) {
    return new Intl.NumberFormat("en-US", {
      useGrouping: parts.grouping,
      minimumFractionDigits: parts.decimals,
      maximumFractionDigits: parts.decimals
    }).format(value);
  }

  function accessibleFinalText(node, finalText) {
    node.setAttribute("aria-hidden", "true");
    var sibling = node.nextElementSibling;
    if (!sibling || !sibling.hasAttribute("data-count-announcement")) {
      sibling = document.createElement("span");
      sibling.className = "sr-only";
      sibling.setAttribute("data-count-announcement", "");
      node.insertAdjacentElement("afterend", sibling);
    }
    sibling.textContent = finalText;
  }

  function animateCount(node, requestedText) {
    if (!node) return;
    var finalText = requestedText == null ? node.textContent.trim() : String(requestedText).trim();
    if (node.dataset.counting === "true" && finalText === node.dataset.countFrameText) return;
    if (node.dataset.countTarget === finalText) return;
    var parts = numericParts(finalText);
    if (!parts || !Number.isFinite(parts.value)) {
      var plainVersion = Number(node.dataset.countVersion || 0) + 1;
      node.dataset.countVersion = String(plainVersion);
      node.dataset.countTarget = finalText;
      node.dataset.countFrameText = finalText;
      node.dataset.counting = "false";
      node.removeAttribute("aria-hidden");
      var announcement = node.nextElementSibling;
      if (announcement && announcement.hasAttribute("data-count-announcement")) announcement.remove();
      node.textContent = finalText;
      return;
    }

    var currentParts = numericParts(node.dataset.countFrameText || "");
    var previous = currentParts ? currentParts.value : Number(node.dataset.countValue);
    if (!Number.isFinite(previous)) previous = 0;
    var version = Number(node.dataset.countVersion || 0) + 1;
    node.dataset.countVersion = String(version);
    node.dataset.countTarget = finalText;
    node.dataset.countValue = String(parts.value);
    accessibleFinalText(node, finalText);

    if (reducedMotion) {
      node.dataset.countFrameText = finalText;
      node.textContent = finalText;
      return;
    }

    var start = performance.now();
    var duration = Number(node.getAttribute("data-count-duration")) || 760;
    var difference = parts.value - previous;
    node.dataset.counting = "true";
    node.classList.remove("count-pop");

    function frame(now) {
      if (node.dataset.countVersion !== String(version)) return;
      var progress = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - progress, 4);
      var value = previous + difference * eased;
      var frameText = parts.prefix + formatNumber(value, parts) + parts.suffix;
      node.dataset.countFrameText = frameText;
      node.textContent = frameText;
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        node.dataset.countFrameText = finalText;
        node.textContent = finalText;
        node.dataset.counting = "false";
        node.classList.add("count-pop");
        window.setTimeout(function() { node.classList.remove("count-pop"); }, 420);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function countTargetsWithin(scope) {
    var selector = "[data-count-to], .result-num, #netWorth, #remainingBalance, #goalRemaining";
    function requestedText(node) {
      var requested = node.getAttribute("data-count-to");
      if (requested == null) return null;
      return (node.getAttribute("data-count-prefix") || "") +
        requested +
        (node.getAttribute("data-count-suffix") || "");
    }

    if (scope.matches && scope.matches(selector)) animateCount(scope, requestedText(scope));
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll(selector).forEach(function(node) {
      animateCount(node, requestedText(node));
    });
  }

  function installCountUp() {
    var staticTargets = document.querySelectorAll("[data-count-to]");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      staticTargets.forEach(function(node) { countTargetsWithin(node); });
    } else {
      countObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          countTargetsWithin(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      staticTargets.forEach(function(node) { countObserver.observe(node); });
    }

    document.querySelectorAll(".result.show").forEach(countTargetsWithin);
    var observer = new MutationObserver(function(records) {
      records.forEach(function(record) {
        var target = record.target.nodeType === 3 ? record.target.parentElement : record.target;
        if (!target || target.closest("[data-count-announcement]")) return;
        var result = target.closest && target.closest(".result");
        if (result && result.classList.contains("show")) countTargetsWithin(result);
      });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function wrapDataTables(scope) {
    if (!scope || !scope.querySelectorAll) return;
    var tables = [];
    if (scope.matches && scope.matches(".data-table")) tables.push(scope);
    scope.querySelectorAll(".data-table").forEach(function(table) { tables.push(table); });
    tables.forEach(function(table) {
      if (table.parentElement.classList.contains("table-scroll")) return;
      var wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Scrollable data table");
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function installResponsiveTables() {
    wrapDataTables(document);
    var observer = new MutationObserver(function(records) {
      records.forEach(function(record) {
        record.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) wrapDataTables(node);
        });
      });
    });
    observer.observe(document.body, { subtree: true, childList: true });
  }

  function installArticleEnhancements() {
    var article = document.querySelector(".article-body");
    if (!article) return;

    var progress = document.createElement("div");
    progress.className = "reading-progress";
    progress.setAttribute("aria-hidden", "true");
    progress.innerHTML = "<span></span>";
    document.body.appendChild(progress);
    var fill = progress.firstElementChild;
    var headings = Array.from(article.querySelectorAll("h2[id]"));
    var tocLinks = Array.from(document.querySelectorAll("#tocList a"));

    function updateReadingState() {
      var rect = article.getBoundingClientRect();
      var total = Math.max(1, article.offsetHeight - window.innerHeight);
      var travelled = Math.min(total, Math.max(0, -rect.top));
      fill.style.transform = "scaleX(" + (travelled / total) + ")";

      var activeId = "";
      headings.forEach(function(heading) {
        if (heading.getBoundingClientRect().top < 150) activeId = heading.id;
      });
      tocLinks.forEach(function(link) {
        link.classList.toggle("is-active", link.getAttribute("href") === "#" + activeId);
      });
    }

    updateReadingState();
    window.addEventListener("scroll", updateReadingState, { passive: true });
    window.addEventListener("resize", updateReadingState);
  }

  function installThemeButtonState() {
    function update() {
      var button = document.getElementById("themeBtn");
      if (!button) return;
      var dark = root.getAttribute("data-theme") === "dark";
      button.setAttribute("aria-pressed", String(dark));
      var icon = button.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = dark ? "☀" : "◐";
    }
    update();
    var observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }

  ready(function() {
    classifyPage();
    installSkipLink();
    updateActiveNavigation();
    installMobileMenu();
    installHeaderState();
    installThemeButtonState();
    installReveal();
    installSpotlights();
    installCountUp();
    installResponsiveTables();
    installArticleEnhancements();
  });
})();
