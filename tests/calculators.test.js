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

test("calculator models reject blank required values without treating zero as blank", function() {
  assert.throws(function() {
    calculators.loanPayment({ amount: "", annualRate: 5, termYears: 5 });
  }, /required/);
  assert.equal(calculators.monthlyMortgagePayment(12000, 0, 1), 1000);
});

test("amortization caps the last payment and keeps final-month interest", function() {
  const scenario = calculators.amortizationScenario({
    balance: 1000,
    annualRate: 12,
    payment: 600,
    maxMonths: 12
  });
  const last = scenario.payments.at(-1);
  assert.equal(scenario.paidOff, true);
  assert.equal(scenario.months, 2);
  assert.ok(last.payment < 600);
  assert.ok(last.interest > 0);
  assert.ok(Math.abs(scenario.totalPaid - (1000 + scenario.totalInterest)) < 0.000001);
});

test("mortgage plan uses the actual payoff schedule for totals and savings", function() {
  const result = calculators.mortgagePlan({
    homePrice: 400000,
    downPayment: 80000,
    annualRate: 6.5,
    termYears: 30,
    extraMonthly: 200
  });
  assert.ok(Math.abs(result.scheduledPayment - 2022.6176751774892) < 0.000001);
  assert.ok(Math.abs(result.baseline.totalInterest - 408142.3630638903) < 0.01);
  assert.equal(result.accelerated.months, 281);
  assert.equal(result.monthsSaved, 79);
  assert.ok(Math.abs(result.interestSaved - 105428.67407009559) < 0.01);
  assert.equal(result.annualSchedule.at(-1).balance, 0);
});

test("mortgage payoff reports an unpaid balance when the simulation limit is reached", function() {
  const result = calculators.mortgagePayoff({
    balance: 320000,
    annualRate: 6.5,
    yearsRemaining: 30,
    basePayment: 1750,
    extraMonthly: 0,
    lumpSum: 0
  });
  assert.equal(result.baseline.paidOff, false);
  assert.equal(result.baseline.months, 720);
  assert.ok(result.baseline.remainingBalance > 170000);
  assert.equal(result.interestSaved, null);
  assert.equal(result.monthsSaved, null);
});

test("compound interest summary matches its final yearly row", function() {
  const result = calculators.compoundInterest({
    initial: 10000,
    monthlyContribution: 500,
    annualRate: 7,
    years: 30,
    frequency: 12
  });
  assert.ok(Math.abs(result.finalBalance - 691150.4726415668) < 0.01);
  assert.equal(result.yearly.length, 30);
  assert.equal(result.yearly.at(-1).balance, result.finalBalance);
  assert.equal(result.yearly.at(-1).contributions, result.totalContributions);

  const zeroRate = calculators.compoundInterest({
    initial: 1000,
    monthlyContribution: 100,
    annualRate: 0,
    years: 1,
    frequency: 12
  });
  assert.equal(zeroRate.finalBalance, 2200);
  assert.equal(zeroRate.totalEarnings, 0);
});

test("loan calculator handles zero-interest loans", function() {
  const result = calculators.loanPayment({ amount: 12000, annualRate: 0, termYears: 1 });
  assert.equal(result.monthlyPayment, 1000);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalCost, 12000);
});

test("credit card payoff distinguishes paid and non-amortizing plans", function() {
  const paid = calculators.creditCardPayoff({
    balance: 5000,
    annualRate: 20,
    monthlyPayment: 150
  });
  assert.equal(paid.paidOff, true);
  assert.equal(paid.months, 50);
  assert.ok(Math.abs(paid.totalInterest - 2359.094425962423) < 0.01);

  const stalled = calculators.creditCardPayoff({
    balance: 5000,
    annualRate: 24,
    monthlyPayment: 50
  });
  assert.equal(stalled.paidOff, false);
  assert.match(stalled.reason, /does not cover the interest/);
  assert.equal(stalled.remainingBalance, 5000);
});

test("savings goal reports both reached and capped scenarios", function() {
  const reached = calculators.savingsGoal({
    target: 50000,
    current: 5000,
    monthlyContribution: 500,
    annualRate: 5
  });
  assert.equal(reached.reached, true);
  assert.equal(reached.months, 74);
  assert.ok(reached.balance >= 50000);

  const capped = calculators.savingsGoal({
    target: 50000,
    current: 1000,
    monthlyContribution: 0,
    annualRate: 0,
    maxMonths: 120
  });
  assert.equal(capped.reached, false);
  assert.equal(capped.months, 1);
  assert.equal(capped.remaining, 49000);
  assert.match(capped.reason, /not reached/);
});

test("ROI supports losses and salary conversion uses the selected schedule", function() {
  const roi = calculators.roi({ invested: 1000, returned: 750 });
  assert.deepEqual(roi, { invested: 1000, returned: 750, gain: -250, percent: -25 });

  const salary = calculators.salaryToHourly({
    salary: 60000,
    hoursPerWeek: 40,
    weeksPerYear: 50
  });
  assert.equal(salary.hourly, 30);
  assert.equal(salary.daily, 240);
  assert.equal(salary.weekly, 1200);
  assert.equal(salary.monthly, 5000);
});

test("home affordability returns a price whose monthly cost fits the DTI budget", function() {
  const result = calculators.homeAffordability({
    annualIncome: 120000,
    monthlyDebt: 500,
    downPayment: 80000,
    annualRate: 6.5,
    termYears: 30,
    propertyTaxRate: 1.1,
    monthlyInsurance: 125,
    monthlyHoa: 0,
    pmiRate: 0.6,
    backDtiRate: 36
  });
  assert.ok(result.maxPrice > 416000 && result.maxPrice < 417000);
  assert.ok(Math.abs(result.costs.total - result.housingBudget) < 0.01);
  assert.equal(result.totalDti, 33);
});

test("debt payoff preserves debt names as data and avalanche does not cost more", function() {
  const unsafeName = "<img src=x onerror=alert(1)>";
  const result = calculators.debtPayoff({
    monthlyBudget: 500,
    debts: [
      { name: unsafeName, balance: 1000, apr: 5, minimum: 50 },
      { name: "High APR", balance: 5000, apr: 25, minimum: 150 }
    ]
  });
  assert.equal(result.avalanche.valid, true);
  assert.equal(result.snowball.valid, true);
  assert.ok(result.avalanche.totalInterest <= result.snowball.totalInterest);
  assert.ok(result.avalanche.payoffOrder.some(function(item) { return item.name === unsafeName; }));

  const invalid = calculators.debtPayoff({
    monthlyBudget: 100,
    debts: [
      { name: "A", balance: 1000, apr: 10, minimum: 75 },
      { name: "B", balance: 1000, apr: 10, minimum: 75 }
    ]
  });
  assert.equal(invalid.avalanche.valid, false);
  assert.match(invalid.avalanche.reason, /below the current minimum/);
});

test("net worth and budget summaries share validated aggregation logic", function() {
  const netWorth = calculators.netWorth({
    assets: [10000, 5000, 25000],
    liabilities: [3000, 7000]
  });
  assert.deepEqual(netWorth, {
    totalAssets: 40000,
    totalLiabilities: 10000,
    netWorth: 30000,
    debtRatio: 25
  });

  const budget = calculators.budgetSummary({
    income: [5000, 500],
    expenses: [1500, 700, 300, 500, 250],
    needs: [1500, 700, 300],
    wants: [500],
    savings: [250],
    rent: 1500
  });
  assert.equal(budget.income, 5500);
  assert.equal(budget.expenses, 3250);
  assert.equal(budget.remaining, 2250);
  assert.equal(budget.plannedSavings, 2500);
  assert.ok(Math.abs(budget.savingsRate - 45.45454545454545) < 0.000001);
});

test("BNPL planner separates principal, fees, and due dates", function() {
  const result = calculators.calculateBnplPlan({
    purchaseAmount: 400,
    installments: 4,
    upfrontPayment: 0,
    feePerInstallment: 2,
    firstPaymentDate: "2026-07-17",
    intervalDays: 14
  });
  assert.equal(result.installmentPayment, 102);
  assert.equal(result.totalFees, 8);
  assert.equal(result.totalRepayment, 408);
  assert.deepEqual(result.schedule.map(function(item) { return item.dueDate; }), [
    "2026-07-17",
    "2026-07-31",
    "2026-08-14",
    "2026-08-28"
  ]);
  assert.throws(function() {
    calculators.calculateBnplPlan({
      purchaseAmount: 400,
      installments: 4,
      upfrontPayment: 500,
      feePerInstallment: 0,
      firstPaymentDate: "2026-07-17",
      intervalDays: 14
    });
  }, /at most/);
});

test("401(k) match calculator applies the match formula and 2026 employee limit", function() {
  const result = calculators.calculate401kMatch({
    annualSalary: 100000,
    employeeContributionPercent: 6,
    matchPercent: 50,
    matchLimitPercent: 6,
    annualReturn: 7,
    years: 30
  });
  assert.equal(result.employeeContribution, 6000);
  assert.equal(result.employerMatch, 3000);
  assert.equal(result.unclaimedMatch, 0);
  assert.equal(result.totalAnnualContribution, 9000);
  assert.ok(Math.abs(result.projectedMatchValue - 283382.3589712304) < 0.01);

  const capped = calculators.calculate401kMatch({
    annualSalary: 300000,
    employeeContributionPercent: 20,
    matchPercent: 100,
    matchLimitPercent: 6,
    annualReturn: 0,
    years: 1
  });
  assert.equal(capped.employeeContribution, 24500);
  assert.equal(capped.employeeLimitExceeded, true);

  const highlyPaid = calculators.calculate401kMatch({
    annualSalary: 500000,
    employeeContributionPercent: 4,
    matchPercent: 100,
    matchLimitPercent: 4,
    annualReturn: 0,
    years: 1
  });
  assert.equal(highlyPaid.eligibleCompensation, 360000);
  assert.equal(highlyPaid.employerMatch, 14400);
});

test("credit utilization combines limits and ranks the most utilized card first", function() {
  const result = calculators.calculateCreditUtilization({
    cards: [
      { name: "A", balance: 800, limit: 1000 },
      { name: "B", balance: 500, limit: 4000 }
    ],
    targetUtilization: 10
  });
  assert.equal(result.totalBalance, 1300);
  assert.equal(result.totalLimit, 5000);
  assert.equal(result.overallUtilization, 26);
  assert.equal(result.paydownToTarget, 800);
  assert.equal(result.paydownTo30, 0);
  assert.equal(result.priorityOrder[0].name, "A");
});

test("mortgage refinance reports both cash break-even and lifetime cost", function() {
  const result = calculators.calculateMortgageRefinance({
    currentBalance: 300000,
    currentRate: 6.5,
    currentRemainingYears: 25,
    newRate: 5.75,
    newTermYears: 25,
    closingCosts: 6000,
    points: 0,
    monthlySavingsInvestmentReturn: 6
  });
  assert.ok(Math.abs(result.monthlySavings - 138.30227677496532) < 0.01);
  assert.ok(Math.abs(result.cashBreakEvenMonths - 43.38323373925891) < 0.01);
  assert.ok(Math.abs(result.totalCostSavings - 35490.683032489615) < 0.01);
  assert.equal(result.termResetMonths, 0);

  const noPaymentSavings = calculators.calculateMortgageRefinance({
    currentBalance: 300000,
    currentRate: 4,
    currentRemainingYears: 20,
    newRate: 7,
    newTermYears: 20,
    closingCosts: 5000,
    points: 0,
    monthlySavingsInvestmentReturn: 0
  });
  assert.equal(noPaymentSavings.cashBreakEvenMonths, null);

  const immediate = calculators.calculateMortgageRefinance({
    currentBalance: 300000,
    currentRate: 6.5,
    currentRemainingYears: 20,
    newRate: 6,
    newTermYears: 20,
    closingCosts: 0,
    points: 0,
    monthlySavingsInvestmentReturn: 0
  });
  assert.equal(immediate.cashBreakEvenMonths, 0);
});

test("car affordability reserves room for ownership costs before sizing the loan", function() {
  const result = calculators.calculateCarAffordability({
    monthlyTakeHome: 6000,
    targetBudgetPercent: 15,
    downPayment: 5000,
    tradeIn: 0,
    apr: 6,
    termMonths: 60,
    salesTaxPercent: 7,
    fees: 1000,
    monthlyInsurance: 180,
    monthlyFuel: 150,
    monthlyMaintenance: 70
  });
  assert.equal(result.monthlyBudget, 900);
  assert.equal(result.availableLoanPayment, 500);
  assert.ok(result.maxVehiclePrice > 27900 && result.maxVehiclePrice < 27920);
  assert.ok(Math.abs(result.totalMonthlyCost - 900) < 0.01);
  assert.ok(Math.abs(result.budgetShare - 15) < 0.000001);

  const noFeasibleVehicle = calculators.calculateCarAffordability({
    monthlyTakeHome: 1000,
    targetBudgetPercent: 10,
    downPayment: 5000,
    tradeIn: 0,
    apr: 6,
    termMonths: 60,
    salesTaxPercent: 7,
    fees: 0,
    monthlyInsurance: 150,
    monthlyFuel: 100,
    monthlyMaintenance: 50
  });
  assert.equal(noFeasibleVehicle.affordable, false);
  assert.equal(noFeasibleVehicle.maxVehiclePrice, 0);
  assert.equal(noFeasibleVehicle.maxLoanAmount, 0);
  assert.equal(noFeasibleVehicle.totalMonthlyCost, 300);
});

test("car loan interest deduction uses the statutory cap and stepped MAGI phaseout", function() {
  const result = calculators.calculateCarLoanInterestDeduction({
    annualInterestPaid: 8000,
    filingStatus: "single",
    magI: 104001,
    marginalTaxRate: 24,
    qualifyingVehicle: true
  });
  assert.equal(result.phaseoutThreshold, 100000);
  assert.equal(result.phaseoutSteps, 5);
  assert.equal(result.phaseoutReduction, 1000);
  assert.equal(result.allowableDeduction, 7000);
  assert.equal(result.estimatedTaxSavings, 1680);

  const ineligible = calculators.calculateCarLoanInterestDeduction({
    annualInterestPaid: 12000,
    filingStatus: "joint",
    magI: 150000,
    marginalTaxRate: 24,
    qualifyingVehicle: false
  });
  assert.equal(ineligible.allowableDeduction, 0);
  assert.equal(ineligible.eligible, false);
});

test("investment fee comparison compounds net returns consistently", function() {
  const result = calculators.calculateInvestmentFees({
    initialInvestment: 10000,
    monthlyContribution: 500,
    annualReturn: 7,
    lowFeePercent: 0.03,
    highFeePercent: 1,
    years: 30
  });
  assert.ok(Math.abs(result.lowFeeEndingBalance - 686828.9611009263) < 0.01);
  assert.ok(Math.abs(result.highFeeEndingBalance - 562483.2733489394) < 0.01);
  assert.ok(result.difference > 124000);
  assert.equal(result.annualRows.length, 30);
  assert.equal(result.annualRows.at(-1).difference, result.difference);
  assert.throws(function() {
    calculators.calculateInvestmentFees({
      initialInvestment: 1000,
      monthlyContribution: 100,
      annualReturn: 7,
      lowFeePercent: 2,
      highFeePercent: 1,
      years: 10
    });
  }, /must not exceed/);
});

test("mortgage points calculator finds the monthly and holding-period break-even", function() {
  const result = calculators.calculateMortgagePoints({
    loanAmount: 400000,
    rateWithoutPoints: 6.5,
    rateWithPoints: 6.25,
    pointsPurchased: 1,
    otherUpfrontCosts: 0,
    termYears: 30
  });
  assert.equal(result.pointCost, 4000);
  assert.ok(Math.abs(result.monthlySavings - 65.40329226628319) < 0.01);
  assert.ok(Math.abs(result.breakEvenMonths - 61.159000738286785) < 0.01);
  assert.ok(result.netSavingsByYears[5] < 0);
  assert.ok(result.netSavingsByYears[7] > 0);

  const immediate = calculators.calculateMortgagePoints({
    loanAmount: 400000,
    rateWithoutPoints: 6.5,
    rateWithPoints: 6.25,
    pointsPurchased: 0,
    otherUpfrontCosts: 0,
    termYears: 30
  });
  assert.equal(immediate.breakEvenMonths, 0);
});

test("risk-weighted emergency fund adds household and deductible risks", function() {
  const result = calculators.calculateEmergencyFund({
    essentialMonthlyExpenses: 4000,
    incomeStability: "variable",
    dependents: 2,
    insuranceDeductible: 3000,
    jobSearchMonths: 7,
    existingSavings: 10000
  });
  assert.equal(result.minimumMonths, 7);
  assert.equal(result.recommendedMonths, 9);
  assert.equal(result.maximumMonths, 10);
  assert.equal(result.recommendedTarget, 39000);
  assert.equal(result.savingsGap, 29000);
  assert.match(result.ruleSummary, /Variable income/);
  assert.throws(function() {
    calculators.calculateEmergencyFund({
      essentialMonthlyExpenses: 4000,
      incomeStability: "steady",
      dependents: 0,
      insuranceDeductible: 0,
      jobSearchMonths: 19,
      existingSavings: 0
    });
  }, /at most 18/);
});

test("Social Security comparison applies SSA early reductions and delayed credits", function() {
  const result = calculators.calculateSocialSecurityBreakEven({
    monthlyBenefitAtFRA: 2000,
    fullRetirementAge: 67,
    earlyAge: 62,
    delayedAge: 70,
    colaPercent: 0
  });
  assert.equal(result.earlyMonthlyBenefit, 1400);
  assert.equal(result.fraMonthlyBenefit, 2000);
  assert.equal(result.delayedMonthlyBenefit, 2480);
  assert.ok(Math.abs(result.breakEvenEarlyVsFRA - 78.66666666666667) < 0.000001);
  assert.ok(Math.abs(result.breakEvenFRAVsDelayed - 82.5) < 0.000001);
  assert.equal(result.comparisonRows.length, 4);
  assert.equal(result.comparisonRows[0].age, 75);
});
