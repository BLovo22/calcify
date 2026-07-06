(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NumbrlyCalculators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  function number(value, label, options) {
    const parsed = Number(value);
    const min = options && options.min;
    const max = options && options.max;
    if (!Number.isFinite(parsed)) throw new TypeError(label + " must be a finite number");
    if (min != null && parsed < min) throw new RangeError(label + " must be at least " + min);
    if (max != null && parsed > max) throw new RangeError(label + " must be at most " + max);
    return parsed;
  }

  function inflationImpact(input) {
    const amount = number(input.amount, "Amount", { min: 0 });
    const annualRate = number(input.annualRate, "Inflation rate", { min: 0 });
    const years = number(input.years, "Years", { min: 0 });
    const purchasingPower = amount / Math.pow(1 + annualRate / 100, years);
    const valueLost = amount - purchasingPower;
    return {
      purchasingPower,
      valueLost,
      percentLost: amount === 0 ? 0 : valueLost / amount * 100
    };
  }

  function monthlyMortgagePayment(principal, annualRate, termYears) {
    principal = number(principal, "Loan principal", { min: 0 });
    annualRate = number(annualRate, "Mortgage rate", { min: 0 });
    termYears = number(termYears, "Loan term", { min: 1 });
    if (principal === 0) return 0;
    const months = Math.round(termYears * 12);
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return principal * monthlyRate * factor / (factor - 1);
  }

  function rentVsBuy(input) {
    const homePrice = number(input.homePrice, "Home price", { min: 0 });
    const downPayment = number(input.downPayment, "Down payment", { min: 0, max: homePrice });
    const mortgageRate = number(input.mortgageRate, "Mortgage rate", { min: 0 });
    const loanTermYears = number(input.loanTermYears, "Loan term", { min: 1 });
    const years = number(input.years, "Comparison period", { min: 1 });
    const monthlyRent = number(input.monthlyRent, "Monthly rent", { min: 0 });
    const propertyTaxRate = number(input.propertyTaxRate, "Property tax rate", { min: 0 });
    const annualInsurance = number(input.annualInsurance, "Annual insurance", { min: 0 });
    const maintenanceRate = number(input.maintenanceRate, "Maintenance rate", { min: 0 });
    const appreciationRate = number(input.appreciationRate, "Appreciation rate", { min: -99 });
    const rentGrowthRate = number(input.rentGrowthRate, "Rent growth rate", { min: -99 });
    const buyingClosingCostRate = number(input.buyingClosingCostRate, "Buying closing cost rate", { min: 0 });
    const sellingCostRate = number(input.sellingCostRate, "Selling cost rate", { min: 0 });
    const costInflationRate = number(
      input.costInflationRate == null ? rentGrowthRate : input.costInflationRate,
      "Cost inflation rate",
      { min: -99 }
    );

    const principal = homePrice - downPayment;
    const scheduledPayment = monthlyMortgagePayment(principal, mortgageRate, loanTermYears);
    const monthlyRate = mortgageRate / 100 / 12;
    const loanMonths = Math.round(loanTermYears * 12);
    const comparisonMonths = Math.round(years * 12);
    const monthlyAppreciation = Math.pow(1 + appreciationRate / 100, 1 / 12);
    let balance = principal;
    let homeValue = homePrice;
    let buyerCashOut = downPayment + homePrice * buyingClosingCostRate / 100;
    let renterCashOut = 0;
    let mortgagePayments = 0;
    let operatingCosts = 0;

    for (let month = 0; month < comparisonMonths; month++) {
      const yearIndex = Math.floor(month / 12);
      if (balance > 0 && month < loanMonths) {
        const interest = balance * monthlyRate;
        const principalPaid = Math.min(Math.max(scheduledPayment - interest, 0), balance);
        const payment = interest + principalPaid;
        balance = Math.max(0, balance - principalPaid);
        mortgagePayments += payment;
        buyerCashOut += payment;
      }

      const monthlyOperatingCost =
        homeValue * propertyTaxRate / 100 / 12 +
        annualInsurance * Math.pow(1 + costInflationRate / 100, yearIndex) / 12 +
        homeValue * maintenanceRate / 100 / 12;
      operatingCosts += monthlyOperatingCost;
      buyerCashOut += monthlyOperatingCost;
      renterCashOut += monthlyRent * Math.pow(1 + rentGrowthRate / 100, yearIndex);
      homeValue *= monthlyAppreciation;
    }

    const sellingCosts = homeValue * sellingCostRate / 100;
    const saleProceeds = homeValue - balance - sellingCosts;
    const buyNetCost = buyerCashOut - saleProceeds;
    const equity = homeValue - balance;

    return {
      monthlyMortgage: scheduledPayment,
      remainingBalance: balance,
      homeValue,
      equity,
      mortgagePayments,
      operatingCosts,
      saleProceeds,
      buyNetCost,
      rentCost: renterCashOut,
      savingsFromBuying: renterCashOut - buyNetCost
    };
  }

  function retirementProjection(input) {
    const currentAge = number(input.currentAge, "Current age", { min: 0 });
    const retirementAge = number(input.retirementAge, "Retirement age", { min: currentAge });
    const currentSavings = number(input.currentSavings, "Current savings", { min: 0 });
    const monthlyContribution = number(input.monthlyContribution, "Monthly contribution", { min: 0 });
    const annualReturn = number(input.annualReturn, "Annual return", { min: -99 });
    const desiredAnnualIncome = number(input.desiredAnnualIncome, "Desired annual income", { min: 0 });
    const inflationRate = number(input.inflationRate, "Inflation rate", { min: 0 });
    const withdrawalRate = number(input.withdrawalRate == null ? 4 : input.withdrawalRate, "Withdrawal rate", { min: 0.01 });

    const years = retirementAge - currentAge;
    const months = Math.round(years * 12);
    const monthlyRate = annualReturn / 100 / 12;
    const growthFactor = Math.pow(1 + monthlyRate, months);
    const projectedSavings = monthlyRate === 0
      ? currentSavings + monthlyContribution * months
      : currentSavings * growthFactor + monthlyContribution * (growthFactor - 1) / monthlyRate;
    const futureAnnualIncome = desiredAnnualIncome * Math.pow(1 + inflationRate / 100, years);
    const targetSavings = futureAnnualIncome / (withdrawalRate / 100);

    return {
      years,
      projectedSavings,
      futureAnnualIncome,
      targetSavings,
      totalContributions: currentSavings + monthlyContribution * months,
      onTrack: projectedSavings >= targetSavings
    };
  }

  return {
    inflationImpact,
    monthlyMortgagePayment,
    rentVsBuy,
    retirementProjection
  };
});
