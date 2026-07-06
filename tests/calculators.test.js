"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const calculators = require("../assets/calculators.js");

test("inflation uses discounted purchasing power", function() {
  const result = calculators.inflationImpact({ amount: 1000, annualRate: 3, years: 20 });
  assert.ok(Math.abs(result.purchasingPower - 553.6757541863345) < 0.000001);
  assert.ok(Math.abs(result.valueLost - 446.3242458136655) < 0.000001);
});

test("inflation handles zero amount and zero rate", function() {
  const result = calculators.inflationImpact({ amount: 0, annualRate: 0, years: 30 });
  assert.deepEqual(result, { purchasingPower: 0, valueLost: 0, percentLost: 0 });
});

test("mortgage payment matches a 30-year amortizing loan", function() {
  const payment = calculators.monthlyMortgagePayment(320000, 6.5, 30);
  assert.ok(Math.abs(payment - 2022.6176751774892) < 0.000001);
});

test("rent-vs-buy keeps loan term independent from comparison period", function() {
  const result = calculators.rentVsBuy({
    homePrice: 400000,
    downPayment: 80000,
    mortgageRate: 6.5,
    loanTermYears: 30,
    years: 10,
    monthlyRent: 2000,
    propertyTaxRate: 1.1,
    annualInsurance: 1500,
    maintenanceRate: 1,
    appreciationRate: 3,
    rentGrowthRate: 3,
    buyingClosingCostRate: 3,
    sellingCostRate: 6,
    costInflationRate: 3
  });

  assert.ok(Math.abs(result.monthlyMortgage - 2022.6176751774892) < 0.000001);
  assert.ok(Math.abs(result.remainingBalance - 271283.60436164367) < 0.01);
  assert.ok(Math.abs(result.buyNetCost - 215494.5834846975) < 0.01);
  assert.ok(Math.abs(result.rentCost - 275133.1034752975) < 0.01);
  assert.ok(result.savingsFromBuying > 59000 && result.savingsFromBuying < 60000);
});

test("retirement projection compares nominal savings with an inflation-adjusted target", function() {
  const result = calculators.retirementProjection({
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 1000,
    annualReturn: 7,
    desiredAnnualIncome: 60000,
    inflationRate: 3,
    withdrawalRate: 4
  });

  assert.ok(Math.abs(result.projectedSavings - 2376362.193289677) < 0.01);
  assert.ok(Math.abs(result.targetSavings - 4220793.681557289) < 0.01);
  assert.equal(result.totalContributions, 470000);
  assert.equal(result.onTrack, false);
});

test("retirement projection handles a zero return", function() {
  const result = calculators.retirementProjection({
    currentAge: 30,
    retirementAge: 31,
    currentSavings: 1000,
    monthlyContribution: 100,
    annualReturn: 0,
    desiredAnnualIncome: 1000,
    inflationRate: 0,
    withdrawalRate: 4
  });
  assert.equal(result.projectedSavings, 2200);
});
