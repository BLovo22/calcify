(function(root) {
  "use strict";

  function element(id) {
    var node = document.getElementById(id);
    if (!node) throw new Error("Calculator field not found: " + id);
    return node;
  }

  function readNumber(id, label, options) {
    options = options || {};
    var node = element(id);
    var raw = String(node.value == null ? "" : node.value).trim();
    if (!raw) throw new Error(label + " is required.");
    var value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(label + " must be a valid number.");
    var min = options.min != null ? options.min : (node.min !== "" ? Number(node.min) : null);
    var max = options.max != null ? options.max : (node.max !== "" ? Number(node.max) : null);
    if (min != null && Number.isFinite(min) && value < min) throw new Error(label + " must be at least " + min + ".");
    if (max != null && Number.isFinite(max) && value > max) throw new Error(label + " must be at most " + max + ".");
    if (options.integer && !Number.isInteger(value)) throw new Error(label + " must be a whole number.");
    return value;
  }

  function money(value, digits) {
    return Number(value).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits == null ? 0 : digits,
      maximumFractionDigits: digits == null ? 0 : digits
    });
  }

  function errorBox() {
    var box = document.getElementById("calculatorError");
    if (box) return box;
    box = document.createElement("div");
    box.id = "calculatorError";
    box.setAttribute("role", "alert");
    box.setAttribute("aria-live", "assertive");
    box.style.cssText = "display:none;max-width:760px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-top:14px;font-size:13px;line-height:1.6";
    var result = document.getElementById("result");
    if (result && result.parentNode) result.parentNode.insertBefore(box, result);
    else document.body.appendChild(box);
    return box;
  }

  function clearError() {
    var box = errorBox();
    box.textContent = "";
    box.style.display = "none";
  }

  function showError(error) {
    var box = errorBox();
    box.textContent = error && error.message ? error.message : String(error);
    box.style.display = "block";
    var result = document.getElementById("result");
    if (result) result.classList.remove("show");
  }

  function run(callback) {
    clearError();
    try {
      return callback();
    } catch (error) {
      showError(error);
      return null;
    }
  }

  function showResult() {
    var result = element("result");
    result.classList.add("show");
  }

  root.NumbrlyCalculatorUI = {
    element: element,
    money: money,
    readNumber: readNumber,
    run: run,
    showError: showError,
    showResult: showResult
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
