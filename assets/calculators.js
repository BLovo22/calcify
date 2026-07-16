(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NumbrlyCalculators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  function number(value, label, options) {
    options = options || {};
    if (value == null || (typeof value === "string" && !value.trim())) {
      throw new TypeError(label + " is required");
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new TypeError(label + " must be a finite number");
    if (options.integer && !Number.isInteger(parsed)) throw new RangeError(label + " must be a whole number");
    if (options.min != null && parsed < options.min) throw new RangeError(label + " must be at least " + options.min);
    if (options.max != null && parsed > options.max) throw new RangeError(label + " must be at most " + options.max);
    return parsed;
  }

  function sum(values) {
    return values.reduce(function(total, value) { return total + number(value, "Amount", { min: 0 }); }, 0);
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

  function amortizationScenario(input) {
    const originalBalance = number(input.balance, "Balance", { min: 0 });
    const annualRate = number(input.annualRate, "Interest rate", { min: 0 });
    const payment = number(input.payment, "Monthly payment", { min: 0 });
    const lumpSum = number(input.lumpSum == null ? 0 : input.lumpSum, "Lump sum", { min: 0 });
    const maxMonths = number(input.maxMonths == null ? 1200 : input.maxMonths, "Maximum months", { min: 1, integer: true });
    const appliedLumpSum = Math.min(lumpSum, originalBalance);
    const monthlyRate = annualRate / 100 / 12;
    const payments = [];
    let balance = originalBalance - appliedLumpSum;
    let months = 0;
    let totalInterest = 0;
    let totalPaid = appliedLumpSum;
    let reason = "";

    while (balance > 0.005 && months < maxMonths) {
      const interest = balance * monthlyRate;
      const amountDue = balance + interest;
      const actualPayment = Math.min(payment, amountDue);
      const principal = actualPayment - interest;
      if (principal <= 0.0000001) {
        reason = "The monthly payment does not cover the interest.";
        break;
      }

      balance = Math.max(0, balance - principal);
      months += 1;
      totalInterest += interest;
      totalPaid += actualPayment;
      payments.push({
        month: months,
        payment: actualPayment,
        principal,
        interest,
        balance
      });
    }

    const paidOff = balance <= 0.005;
    if (!paidOff && !reason && months >= maxMonths) {
      reason = "The balance was not paid off within the selected simulation period.";
    }

    return {
      paidOff,
      reason,
      months,
      remainingBalance: paidOff ? 0 : balance,
      totalInterest,
      totalPaid,
      appliedLumpSum,
      payments
    };
  }

  function annualizePayments(payments) {
    const years = [];
    payments.forEach(function(payment) {
      const index = Math.floor((payment.month - 1) / 12);
      if (!years[index]) {
        years[index] = { year: index + 1, principal: 0, interest: 0, payments: 0, balance: payment.balance };
      }
      years[index].principal += payment.principal;
      years[index].interest += payment.interest;
      years[index].payments += payment.payment;
      years[index].balance = payment.balance;
    });
    return years;
  }

  function mortgagePlan(input) {
    const homePrice = number(input.homePrice, "Home price", { min: 0 });
    const downPayment = number(input.downPayment, "Down payment", { min: 0, max: homePrice });
    const annualRate = number(input.annualRate, "Mortgage rate", { min: 0 });
    const termYears = number(input.termYears, "Loan term", { min: 1 });
    const extraMonthly = number(input.extraMonthly == null ? 0 : input.extraMonthly, "Extra monthly payment", { min: 0 });
    const principal = homePrice - downPayment;
    const scheduledPayment = monthlyMortgagePayment(principal, annualRate, termYears);
    const scheduledMonths = Math.round(termYears * 12);
    const maxMonths = Math.max(1, scheduledMonths + 1);
    const baseline = amortizationScenario({
      balance: principal,
      annualRate,
      payment: scheduledPayment,
      maxMonths
    });
    const accelerated = amortizationScenario({
      balance: principal,
      annualRate,
      payment: scheduledPayment + extraMonthly,
      maxMonths
    });

    return {
      principal,
      scheduledPayment,
      scheduledMonths,
      baseline,
      accelerated,
      interestSaved: Math.max(0, baseline.totalInterest - accelerated.totalInterest),
      monthsSaved: Math.max(0, baseline.months - accelerated.months),
      annualSchedule: annualizePayments(accelerated.payments)
    };
  }

  function mortgagePayoff(input) {
    const balance = number(input.balance, "Mortgage balance", { min: 0 });
    const annualRate = number(input.annualRate, "Interest rate", { min: 0 });
    const yearsRemaining = number(input.yearsRemaining, "Years remaining", { min: 1 });
    const basePayment = number(input.basePayment, "Current monthly payment", { min: 0.01 });
    const extraMonthly = number(input.extraMonthly == null ? 0 : input.extraMonthly, "Extra monthly payment", { min: 0 });
    const lumpSum = number(input.lumpSum == null ? 0 : input.lumpSum, "One-time payment", { min: 0 });
    const maxMonths = Math.ceil(yearsRemaining * 24);
    const baseline = amortizationScenario({
      balance,
      annualRate,
      payment: basePayment,
      maxMonths
    });
    const accelerated = amortizationScenario({
      balance,
      annualRate,
      payment: basePayment + extraMonthly,
      lumpSum,
      maxMonths
    });

    return {
      baseline,
      accelerated,
      interestSaved: baseline.paidOff && accelerated.paidOff
        ? Math.max(0, baseline.totalInterest - accelerated.totalInterest)
        : null,
      monthsSaved: baseline.paidOff && accelerated.paidOff
        ? Math.max(0, baseline.months - accelerated.months)
        : null
    };
  }

  function compoundInterest(input) {
    const initial = number(input.initial, "Initial investment", { min: 0 });
    const monthlyContribution = number(input.monthlyContribution, "Monthly contribution", { min: 0 });
    const annualRate = number(input.annualRate, "Annual return", { min: 0 });
    const years = number(input.years, "Years", { min: 1, integer: true });
    const frequency = number(input.frequency, "Compound frequency", { min: 1, integer: true });
    if (![1, 4, 12].includes(frequency)) throw new RangeError("Compound frequency must be annual, quarterly, or monthly");

    const periodRate = annualRate / 100 / frequency;
    const contributionPerPeriod = monthlyContribution * 12 / frequency;
    const totalPeriods = years * frequency;
    const yearly = [];
    let balance = initial;
    let totalContributions = initial;

    for (let period = 1; period <= totalPeriods; period++) {
      balance *= 1 + periodRate;
      balance += contributionPerPeriod;
      totalContributions += contributionPerPeriod;
      if (period % frequency === 0) {
        yearly.push({
          year: period / frequency,
          balance,
          contributions: totalContributions,
          earnings: balance - totalContributions
        });
      }
    }

    const totalEarnings = balance - totalContributions;
    return {
      finalBalance: balance,
      totalContributions,
      totalEarnings,
      earningsPercent: balance === 0 ? 0 : totalEarnings / balance * 100,
      multiplier: totalContributions === 0 ? 0 : balance / totalContributions,
      yearly
    };
  }

  function loanPayment(input) {
    const amount = number(input.amount, "Loan amount", { min: 0 });
    const annualRate = number(input.annualRate, "Interest rate", { min: 0 });
    const termYears = number(input.termYears, "Loan term", { min: 1 });
    const monthlyPayment = monthlyMortgagePayment(amount, annualRate, termYears);
    const months = Math.round(termYears * 12);
    const totalCost = monthlyPayment * months;
    return {
      amount,
      monthlyPayment,
      totalInterest: totalCost - amount,
      totalCost,
      months
    };
  }

  function creditCardPayoff(input) {
    const balance = number(input.balance, "Credit card balance", { min: 0 });
    const annualRate = number(input.annualRate, "APR", { min: 0 });
    const monthlyPayment = number(input.monthlyPayment, "Monthly payment", { min: 0.01 });
    const maxMonths = number(input.maxMonths == null ? 1200 : input.maxMonths, "Maximum months", { min: 1, integer: true });
    const scenario = amortizationScenario({
      balance,
      annualRate,
      payment: monthlyPayment,
      maxMonths
    });
    return {
      paidOff: scenario.paidOff,
      reason: scenario.reason,
      months: scenario.months,
      remainingBalance: scenario.remainingBalance,
      totalInterest: scenario.totalInterest,
      totalCost: scenario.totalPaid
    };
  }

  function savingsGoal(input) {
    const target = number(input.target, "Savings target", { min: 0 });
    const current = number(input.current, "Current savings", { min: 0 });
    const monthlyContribution = number(input.monthlyContribution, "Monthly contribution", { min: 0 });
    const annualRate = number(input.annualRate, "Annual interest rate", { min: 0 });
    const maxMonths = number(input.maxMonths == null ? 1200 : input.maxMonths, "Maximum months", { min: 1, integer: true });
    const monthlyRate = annualRate / 100 / 12;
    let balance = current;
    let months = 0;

    while (balance < target && months < maxMonths) {
      balance += monthlyContribution;
      balance *= 1 + monthlyRate;
      months += 1;
      if (monthlyContribution === 0 && monthlyRate === 0) break;
    }

    const reached = balance >= target;
    return {
      reached,
      months,
      balance,
      totalContributions: current + monthlyContribution * months,
      remaining: Math.max(0, target - balance),
      reason: reached ? "" : "The goal was not reached within " + maxMonths + " months."
    };
  }

  function roi(input) {
    const invested = number(input.invested, "Amount invested", { min: 0.01 });
    const returned = number(input.returned, "Amount returned", { min: 0 });
    const gain = returned - invested;
    return {
      invested,
      returned,
      gain,
      percent: gain / invested * 100
    };
  }

  function salaryToHourly(input) {
    const salary = number(input.salary, "Annual salary", { min: 0.01 });
    const hoursPerWeek = number(input.hoursPerWeek, "Hours per week", { min: 0.01 });
    const weeksPerYear = number(input.weeksPerYear, "Weeks per year", { min: 0.01, max: 52 });
    const hourly = salary / (hoursPerWeek * weeksPerYear);
    return {
      hourly,
      daily: hourly * 8,
      weekly: hourly * hoursPerWeek,
      monthly: salary / 12
    };
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

  function homeAffordability(input) {
    const annualIncome = number(input.annualIncome, "Annual income", { min: 0.01 });
    const monthlyDebt = number(input.monthlyDebt, "Monthly debt", { min: 0 });
    const downPayment = number(input.downPayment, "Down payment", { min: 0 });
    const annualRate = number(input.annualRate, "Mortgage rate", { min: 0 });
    const termYears = number(input.termYears, "Loan term", { min: 1 });
    const propertyTaxRate = number(input.propertyTaxRate, "Property tax rate", { min: 0 });
    const monthlyInsurance = number(input.monthlyInsurance, "Home insurance", { min: 0 });
    const monthlyHoa = number(input.monthlyHoa, "HOA fees", { min: 0 });
    const pmiRate = number(input.pmiRate, "PMI rate", { min: 0 });
    const backDtiRate = number(input.backDtiRate, "Maximum total DTI", { min: 0, max: 100 }) / 100;
    const monthlyIncome = annualIncome / 12;
    const housingBudget = Math.max(0, Math.min(monthlyIncome * 0.28, monthlyIncome * backDtiRate - monthlyDebt));

    function monthlyCost(price) {
      const loan = Math.max(price - downPayment, 0);
      const principalAndInterest = monthlyMortgagePayment(loan, annualRate, termYears);
      const propertyTax = price * propertyTaxRate / 100 / 12;
      const downPercent = price > 0 ? downPayment / price : 1;
      const pmi = downPercent < 0.20 ? loan * pmiRate / 100 / 12 : 0;
      return {
        total: principalAndInterest + propertyTax + monthlyInsurance + monthlyHoa + pmi,
        principalAndInterest,
        propertyTax,
        insurance: monthlyInsurance,
        hoa: monthlyHoa,
        pmi,
        loan
      };
    }

    let low = 0;
    let high = Math.max(downPayment + housingBudget * 360, 100000);
    for (let index = 0; index < 70; index++) {
      const mid = (low + high) / 2;
      if (monthlyCost(mid).total <= housingBudget) low = mid;
      else high = mid;
    }
    const costs = monthlyCost(low);
    return {
      maxPrice: low,
      housingBudget,
      costs,
      totalDti: monthlyIncome > 0 ? (costs.total + monthlyDebt) / monthlyIncome * 100 : 0
    };
  }

  function chooseDebtTarget(debts, strategy) {
    return debts
      .filter(function(debt) { return debt.balance > 0.01; })
      .sort(function(a, b) {
        if (strategy === "snowball") {
          if (a.balance !== b.balance) return a.balance - b.balance;
          if (a.apr !== b.apr) return b.apr - a.apr;
        } else {
          if (a.apr !== b.apr) return b.apr - a.apr;
          if (a.balance !== b.balance) return a.balance - b.balance;
        }
        return a.id - b.id;
      })[0] || null;
  }

  function simulateDebtStrategy(seedDebts, monthlyBudget, strategy) {
    const debts = seedDebts.map(function(debt, index) {
      return {
        id: index + 1,
        name: String(debt.name || "Debt " + (index + 1)),
        balance: number(debt.balance, "Debt balance", { min: 0 }),
        apr: number(debt.apr, "Debt APR", { min: 0 }),
        minimum: number(debt.minimum, "Minimum payment", { min: 0 }),
        paidOffMonth: null
      };
    }).filter(function(debt) { return debt.balance > 0; });
    if (!debts.length) throw new RangeError("Add at least one debt with a positive balance");

    monthlyBudget = number(monthlyBudget, "Monthly debt budget", { min: 0.01 });
    const totalPrincipal = debts.reduce(function(total, debt) { return total + debt.balance; }, 0);
    const totalMinimums = debts.reduce(function(total, debt) { return total + debt.minimum; }, 0);
    const maxMonths = 1200;
    let month = 0;
    let totalInterest = 0;

    while (month < maxMonths && debts.some(function(debt) { return debt.balance > 0.01; })) {
      month += 1;
      debts.forEach(function(debt) {
        if (debt.balance > 0.01) {
          const interest = debt.balance * debt.apr / 100 / 12;
          debt.balance += interest;
          totalInterest += interest;
        }
      });

      let remaining = monthlyBudget;
      const active = debts.filter(function(debt) { return debt.balance > 0.01; });
      const requiredMinimums = active.reduce(function(total, debt) {
        return total + Math.min(debt.minimum, debt.balance);
      }, 0);
      if (remaining + 0.001 < requiredMinimums) {
        return {
          valid: false,
          reason: "Monthly budget is below the current minimum payments.",
          totalMinimums
        };
      }

      active.forEach(function(debt) {
        const due = Math.min(debt.minimum, debt.balance);
        debt.balance -= due;
        remaining -= due;
        if (debt.balance <= 0.01 && debt.paidOffMonth === null) {
          debt.balance = 0;
          debt.paidOffMonth = month;
        }
      });

      while (remaining > 0.01) {
        const target = chooseDebtTarget(debts, strategy);
        if (!target) break;
        const extra = Math.min(remaining, target.balance);
        target.balance -= extra;
        remaining -= extra;
        if (target.balance <= 0.01 && target.paidOffMonth === null) {
          target.balance = 0;
          target.paidOffMonth = month;
        }
      }
    }

    if (debts.some(function(debt) { return debt.balance > 0.01; })) {
      return {
        valid: false,
        reason: "The debts do not amortize within 100 years with the current inputs.",
        totalMinimums
      };
    }

    return {
      valid: true,
      months: month,
      totalInterest,
      totalPaid: totalPrincipal + totalInterest,
      totalMinimums,
      payoffOrder: debts
        .slice()
        .sort(function(a, b) { return a.paidOffMonth - b.paidOffMonth; })
        .map(function(debt) { return { name: debt.name, month: debt.paidOffMonth }; })
    };
  }

  function debtPayoff(input) {
    const avalanche = simulateDebtStrategy(input.debts, input.monthlyBudget, "avalanche");
    const snowball = simulateDebtStrategy(input.debts, input.monthlyBudget, "snowball");
    return { avalanche, snowball };
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

  function netWorth(input) {
    const totalAssets = sum(input.assets || []);
    const totalLiabilities = sum(input.liabilities || []);
    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      debtRatio: totalAssets > 0 ? totalLiabilities / totalAssets * 100 : 0
    };
  }

  function budgetSummary(input) {
    const income = sum(input.income || []);
    const expenses = sum(input.expenses || []);
    const needs = sum(input.needs || []);
    const wants = sum(input.wants || []);
    const explicitSavings = sum(input.savings || []);
    const remaining = income - expenses;
    const plannedSavings = explicitSavings + Math.max(remaining, 0);
    return {
      income,
      expenses,
      remaining,
      needs,
      wants,
      plannedSavings,
      savingsRate: income > 0 ? plannedSavings / income * 100 : 0,
      rentRatio: income > 0 ? number(input.rent || 0, "Rent", { min: 0 }) / income * 100 : 100,
      expenseRatio: income > 0 ? expenses / income * 100 : 100
    };
  }

  function monthlyLoanPayment(principal, annualRate, months) {
    principal = number(principal, "Loan principal", { min: 0 });
    annualRate = number(annualRate, "Interest rate", { min: 0 });
    months = number(months, "Loan term", { min: 1, integer: true });
    if (principal === 0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return principal * monthlyRate * factor / (factor - 1);
  }

  function loanPrincipalFromPayment(payment, annualRate, months) {
    payment = number(payment, "Monthly payment", { min: 0 });
    annualRate = number(annualRate, "Interest rate", { min: 0 });
    months = number(months, "Loan term", { min: 1, integer: true });
    if (payment === 0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return payment * months;
    return payment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
  }

  function futureValueOfMonthlyPayments(payment, annualRate, months) {
    payment = number(payment, "Contribution", { min: 0 });
    annualRate = number(annualRate, "Annual return", { min: -99 });
    months = number(months, "Projection months", { min: 0, integer: true });
    if (payment === 0 || months === 0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return payment * months;
    return payment * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  }

  function futureValueOfAnnualPayments(payment, annualRate, years) {
    payment = number(payment, "Annual contribution", { min: 0 });
    annualRate = number(annualRate, "Annual return", { min: -99 });
    years = number(years, "Projection years", { min: 0, integer: true });
    if (payment === 0 || years === 0) return 0;
    const rate = annualRate / 100;
    if (rate === 0) return payment * years;
    return payment * (Math.pow(1 + rate, years) - 1) / rate;
  }

  function calculateBnplPlan(input) {
    const purchaseAmount = number(input.purchaseAmount, "Purchase amount", { min: 0.01 });
    const installments = number(input.installments, "Number of installments", { min: 1, max: 36, integer: true });
    const upfrontPayment = number(input.upfrontPayment == null ? 0 : input.upfrontPayment, "Upfront payment", {
      min: 0,
      max: purchaseAmount
    });
    const feePerInstallment = number(input.feePerInstallment == null ? 0 : input.feePerInstallment, "Fee per installment", { min: 0 });
    const intervalDays = number(input.intervalDays == null ? 14 : input.intervalDays, "Days between payments", {
      min: 1,
      max: 365,
      integer: true
    });
    const amountFinanced = purchaseAmount - upfrontPayment;
    const principalPerInstallment = amountFinanced / installments;
    const installmentPayment = principalPerInstallment + feePerInstallment;
    const totalFees = feePerInstallment * installments;
    const totalRepayment = purchaseAmount + totalFees;
    const rawDate = String(input.firstPaymentDate || "").trim();
    let firstDate = null;

    if (rawDate) {
      const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) throw new TypeError("First payment date must use YYYY-MM-DD");
      firstDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (
        firstDate.getUTCFullYear() !== Number(match[1]) ||
        firstDate.getUTCMonth() !== Number(match[2]) - 1 ||
        firstDate.getUTCDate() !== Number(match[3])
      ) {
        throw new RangeError("First payment date is not a valid calendar date");
      }
    }

    const schedule = Array.from({ length: installments }, function(_, index) {
      let dueDate = null;
      if (firstDate) {
        const date = new Date(firstDate.getTime());
        date.setUTCDate(date.getUTCDate() + index * intervalDays);
        dueDate = date.toISOString().slice(0, 10);
      }
      return {
        installment: index + 1,
        dueDate,
        principal: principalPerInstallment,
        fee: feePerInstallment,
        payment: installmentPayment
      };
    });

    return {
      purchaseAmount,
      amountFinanced,
      upfrontPayment,
      principalPerInstallment,
      installmentPayment,
      totalFees,
      totalRepayment,
      installments,
      intervalDays,
      schedule
    };
  }

  function calculate401kMatch(input) {
    const annualSalary = number(input.annualSalary, "Annual salary", { min: 0.01 });
    const employeeContributionPercent = number(input.employeeContributionPercent, "Employee contribution rate", { min: 0, max: 100 });
    const matchPercent = number(input.matchPercent, "Employer match rate", { min: 0, max: 1000 });
    const matchLimitPercent = number(input.matchLimitPercent, "Match limit", { min: 0, max: 100 });
    const annualReturn = number(input.annualReturn, "Annual return", { min: -99, max: 100 });
    const years = number(input.years, "Projection years", { min: 1, max: 80, integer: true });
    const employeeLimit = 24500;
    const totalPlanLimit = 72000;
    const compensationLimit = 360000;
    const eligibleCompensation = Math.min(annualSalary, compensationLimit);
    const applicableTotalLimit = Math.min(totalPlanLimit, annualSalary);
    const requestedEmployeeContribution = annualSalary * employeeContributionPercent / 100;
    const employeeContribution = Math.min(requestedEmployeeContribution, employeeLimit);
    const matchableEmployeeContribution = Math.min(
      employeeContribution,
      eligibleCompensation * matchLimitPercent / 100
    );
    const rawEmployerMatch = matchableEmployeeContribution * matchPercent / 100;
    const employerMatch = Math.min(rawEmployerMatch, Math.max(0, applicableTotalLimit - employeeContribution));
    const contributionNeededForFullMatch = Math.min(
      eligibleCompensation * matchLimitPercent / 100,
      employeeLimit
    );
    const rawFullMatch = contributionNeededForFullMatch * matchPercent / 100;
    const fullEmployerMatch = Math.min(rawFullMatch, Math.max(0, applicableTotalLimit - contributionNeededForFullMatch));
    const unclaimedMatch = Math.max(0, fullEmployerMatch - employerMatch);
    const totalAnnualContribution = employeeContribution + employerMatch;
    const projectedMatchValue = futureValueOfAnnualPayments(employerMatch, annualReturn, years);

    return {
      annualSalary,
      requestedEmployeeContribution,
      employeeContribution,
      employerMatch,
      fullEmployerMatch,
      unclaimedMatch,
      totalAnnualContribution,
      contributionNeededForFullMatch,
      projectedMatchValue,
      projectedEmployeeValue: futureValueOfAnnualPayments(employeeContribution, annualReturn, years),
      projectedTotalValue: futureValueOfAnnualPayments(totalAnnualContribution, annualReturn, years),
      employeeLimit,
      totalPlanLimit,
      compensationLimit,
      eligibleCompensation,
      applicableTotalLimit,
      employeeLimitExceeded: requestedEmployeeContribution > employeeLimit,
      totalLimitExceeded: requestedEmployeeContribution + rawEmployerMatch > applicableTotalLimit
    };
  }

  function calculateCreditUtilization(input) {
    if (!Array.isArray(input.cards) || input.cards.length === 0) {
      throw new RangeError("Add at least one credit card");
    }
    const targetUtilization = number(
      input.targetUtilization == null ? 10 : input.targetUtilization,
      "Target utilization",
      { min: 0, max: 100 }
    );
    const cards = input.cards.map(function(card, index) {
      const limit = number(card.limit, "Card " + (index + 1) + " credit limit", { min: 0.01 });
      const balance = number(card.balance, "Card " + (index + 1) + " balance", { min: 0 });
      return {
        name: String(card.name || "Card " + (index + 1)),
        balance,
        limit,
        utilization: balance / limit * 100,
        availableCredit: limit - balance,
        paydownToTarget: Math.max(0, balance - limit * targetUtilization / 100)
      };
    });
    const totalBalance = cards.reduce(function(total, card) { return total + card.balance; }, 0);
    const totalLimit = cards.reduce(function(total, card) { return total + card.limit; }, 0);
    const overallUtilization = totalBalance / totalLimit * 100;
    const paydownToTarget = Math.max(0, totalBalance - totalLimit * targetUtilization / 100);
    const paydownTo30 = Math.max(0, totalBalance - totalLimit * 0.30);
    const paydownTo10 = Math.max(0, totalBalance - totalLimit * 0.10);
    const priorityOrder = cards
      .slice()
      .sort(function(a, b) {
        if (a.utilization !== b.utilization) return b.utilization - a.utilization;
        return b.balance - a.balance;
      })
      .map(function(card, index) {
        return {
          rank: index + 1,
          name: card.name,
          balance: card.balance,
          limit: card.limit,
          utilization: card.utilization,
          paydownToTarget: card.paydownToTarget
        };
      });

    return {
      cards,
      totalBalance,
      totalLimit,
      availableCredit: totalLimit - totalBalance,
      overallUtilization,
      targetUtilization,
      paydownToTarget,
      paydownTo30,
      paydownTo10,
      paydownTo30Percent: paydownTo30,
      paydownTo10Percent: paydownTo10,
      priorityOrder
    };
  }

  function calculateMortgageRefinance(input) {
    const currentBalance = number(input.currentBalance, "Current mortgage balance", { min: 0.01 });
    const currentRate = number(input.currentRate, "Current mortgage rate", { min: 0, max: 100 });
    const currentRemainingYears = number(input.currentRemainingYears, "Remaining term", { min: 1, max: 50 });
    const newRate = number(input.newRate, "New mortgage rate", { min: 0, max: 100 });
    const newTermYears = number(input.newTermYears, "New loan term", { min: 1, max: 50 });
    const closingCosts = number(input.closingCosts == null ? 0 : input.closingCosts, "Closing costs", { min: 0 });
    const points = number(input.points == null ? 0 : input.points, "Points", { min: 0, max: 20 });
    const monthlySavingsInvestmentReturn = number(
      input.monthlySavingsInvestmentReturn == null ? 0 : input.monthlySavingsInvestmentReturn,
      "Investment return",
      { min: -99, max: 100 }
    );
    const currentMonths = Math.round(currentRemainingYears * 12);
    const newMonths = Math.round(newTermYears * 12);
    const currentMonthlyPayment = monthlyLoanPayment(currentBalance, currentRate, currentMonths);
    const newMonthlyPayment = monthlyLoanPayment(currentBalance, newRate, newMonths);
    const monthlySavings = currentMonthlyPayment - newMonthlyPayment;
    const pointsCost = currentBalance * points / 100;
    const totalUpfrontCosts = closingCosts + pointsCost;
    const cashBreakEvenMonths = monthlySavings > 0 ? totalUpfrontCosts / monthlySavings : null;
    const currentRemainingTotalCost = currentMonthlyPayment * currentMonths;
    const newTotalCost = newMonthlyPayment * newMonths + totalUpfrontCosts;
    const totalCostSavings = currentRemainingTotalCost - newTotalCost;
    const positiveMonthlySavings = Math.max(0, monthlySavings);

    return {
      currentMonthlyPayment,
      newMonthlyPayment,
      monthlySavings,
      pointsCost,
      totalUpfrontCosts,
      cashBreakEvenMonths,
      currentRemainingTotalCost,
      newTotalCost,
      currentRemainingInterest: currentRemainingTotalCost - currentBalance,
      newLoanInterest: newMonthlyPayment * newMonths - currentBalance,
      totalCostSavings,
      termResetMonths: newMonths - currentMonths,
      investedMonthlySavingsValue: futureValueOfMonthlyPayments(
        positiveMonthlySavings,
        monthlySavingsInvestmentReturn,
        Math.min(currentMonths, newMonths)
      )
    };
  }

  function calculateCarAffordability(input) {
    const monthlyTakeHome = number(input.monthlyTakeHome, "Monthly take-home pay", { min: 0.01 });
    const targetBudgetPercent = number(input.targetBudgetPercent, "Vehicle budget rate", { min: 0, max: 100 });
    const downPayment = number(input.downPayment == null ? 0 : input.downPayment, "Down payment", { min: 0 });
    const tradeIn = number(input.tradeIn == null ? 0 : input.tradeIn, "Trade-in value", { min: 0 });
    const apr = number(input.apr, "Auto loan APR", { min: 0, max: 100 });
    const termMonths = number(input.termMonths, "Loan term", { min: 1, max: 120, integer: true });
    const salesTaxPercent = number(input.salesTaxPercent == null ? 0 : input.salesTaxPercent, "Sales tax", { min: 0, max: 100 });
    const fees = number(input.fees == null ? 0 : input.fees, "Dealer and registration fees", { min: 0 });
    const monthlyInsurance = number(input.monthlyInsurance == null ? 0 : input.monthlyInsurance, "Monthly insurance", { min: 0 });
    const monthlyFuel = number(input.monthlyFuel == null ? 0 : input.monthlyFuel, "Monthly fuel or charging", { min: 0 });
    const monthlyMaintenance = number(input.monthlyMaintenance == null ? 0 : input.monthlyMaintenance, "Monthly maintenance", { min: 0 });
    const monthlyBudget = monthlyTakeHome * targetBudgetPercent / 100;
    const operatingCosts = monthlyInsurance + monthlyFuel + monthlyMaintenance;
    const availableLoanPayment = Math.max(0, monthlyBudget - operatingCosts);
    const affordable = operatingCosts <= monthlyBudget;
    const maxLoanAmount = affordable
      ? loanPrincipalFromPayment(availableLoanPayment, apr, termMonths)
      : 0;
    const buyingPowerBeforeTax = affordable
      ? Math.max(0, maxLoanAmount + downPayment + tradeIn - fees)
      : 0;
    const maxVehiclePrice = affordable
      ? buyingPowerBeforeTax / (1 + salesTaxPercent / 100)
      : 0;
    const salesTaxAmount = maxVehiclePrice * salesTaxPercent / 100;
    const outTheDoorPrice = affordable ? maxVehiclePrice + salesTaxAmount + fees : 0;
    const actualLoanAmount = affordable ? Math.max(0, outTheDoorPrice - downPayment - tradeIn) : 0;
    const loanMonthlyPayment = monthlyLoanPayment(actualLoanAmount, apr, termMonths);
    const totalMonthlyCost = loanMonthlyPayment + operatingCosts;

    return {
      monthlyBudget,
      affordable,
      maxVehiclePrice,
      maxLoanAmount: actualLoanAmount,
      loanMonthlyPayment,
      totalMonthlyCost,
      upfrontCash: downPayment,
      tradeIn,
      budgetShare: totalMonthlyCost / monthlyTakeHome * 100,
      availableLoanPayment,
      monthlyOperatingCosts: operatingCosts,
      operatingCostOverage: Math.max(0, operatingCosts - monthlyBudget),
      salesTaxAmount,
      outTheDoorPrice,
      totalLoanInterest: loanMonthlyPayment * termMonths - actualLoanAmount
    };
  }

  function calculateCarLoanInterestDeduction(input) {
    const annualInterestPaid = number(input.annualInterestPaid, "Annual interest paid", { min: 0 });
    const filingStatus = String(input.filingStatus || "single").toLowerCase();
    const magI = number(input.magI, "Modified adjusted gross income", { min: 0 });
    const marginalTaxRate = number(input.marginalTaxRate, "Marginal tax rate", { min: 0, max: 100 });
    const qualifyingVehicle = input.qualifyingVehicle === true ||
      input.qualifyingVehicle === 1 ||
      /^(?:true|1|yes|on)$/i.test(String(input.qualifyingVehicle || ""));
    const joint = /^(?:joint|married|married-filing-jointly|mfj)$/.test(filingStatus);
    const phaseoutThreshold = joint ? 200000 : 100000;
    const eligible = qualifyingVehicle;
    const interestCapBeforePhaseout = eligible ? Math.min(annualInterestPaid, 10000) : 0;
    const excessIncome = Math.max(0, magI - phaseoutThreshold);
    const phaseoutSteps = excessIncome > 0 ? Math.ceil(excessIncome / 1000) : 0;
    const rawPhaseoutReduction = phaseoutSteps * 200;
    const phaseoutReduction = Math.min(interestCapBeforePhaseout, rawPhaseoutReduction);
    const allowableDeduction = Math.max(0, interestCapBeforePhaseout - phaseoutReduction);
    const estimatedTaxSavings = allowableDeduction * marginalTaxRate / 100;

    return {
      eligible,
      phaseoutThreshold,
      interestCapBeforePhaseout,
      excessIncome,
      phaseoutSteps,
      phaseoutReduction,
      allowableDeduction,
      estimatedTaxSavings
    };
  }

  function investmentScenario(initialInvestment, monthlyContribution, annualReturn, feePercent, years) {
    const monthlyRate = (annualReturn - feePercent) / 100 / 12;
    let balance = initialInvestment;
    const yearly = [];
    for (let month = 1; month <= years * 12; month++) {
      balance *= 1 + monthlyRate;
      balance += monthlyContribution;
      if (month % 12 === 0) yearly.push({ year: month / 12, balance });
    }
    return { endingBalance: balance, yearly };
  }

  function calculateInvestmentFees(input) {
    const initialInvestment = number(input.initialInvestment, "Initial investment", { min: 0 });
    const monthlyContribution = number(input.monthlyContribution, "Monthly contribution", { min: 0 });
    const annualReturn = number(input.annualReturn, "Gross annual return", { min: -99, max: 100 });
    const lowFeePercent = number(input.lowFeePercent, "Lower fee", { min: 0, max: 100 });
    const highFeePercent = number(input.highFeePercent, "Higher fee", { min: 0, max: 100 });
    const years = number(input.years, "Projection years", { min: 1, max: 100, integer: true });
    if (lowFeePercent > highFeePercent) {
      throw new RangeError("Lower fee must not exceed higher fee");
    }
    const low = investmentScenario(initialInvestment, monthlyContribution, annualReturn, lowFeePercent, years);
    const high = investmentScenario(initialInvestment, monthlyContribution, annualReturn, highFeePercent, years);
    const difference = low.endingBalance - high.endingBalance;
    const annualRows = low.yearly.map(function(row, index) {
      return {
        year: row.year,
        lowFeeBalance: row.balance,
        highFeeBalance: high.yearly[index].balance,
        difference: row.balance - high.yearly[index].balance
      };
    });

    return {
      lowFeeEndingBalance: low.endingBalance,
      highFeeEndingBalance: high.endingBalance,
      difference,
      differencePercent: low.endingBalance === 0 ? 0 : difference / low.endingBalance * 100,
      totalContributions: initialInvestment + monthlyContribution * years * 12,
      annualRows
    };
  }

  function calculateMortgagePoints(input) {
    const loanAmount = number(input.loanAmount, "Loan amount", { min: 0.01 });
    const rateWithoutPoints = number(input.rateWithoutPoints, "Rate without points", { min: 0, max: 100 });
    const rateWithPoints = number(input.rateWithPoints, "Rate with points", { min: 0, max: 100 });
    const pointsPurchased = number(input.pointsPurchased, "Points purchased", { min: 0, max: 20 });
    const otherUpfrontCosts = number(input.otherUpfrontCosts == null ? 0 : input.otherUpfrontCosts, "Other upfront costs", { min: 0 });
    const termYears = number(input.termYears, "Loan term", { min: 1, max: 50 });
    const months = Math.round(termYears * 12);
    const pointCost = loanAmount * pointsPurchased / 100;
    const totalUpfrontCost = pointCost + otherUpfrontCosts;
    const monthlyPaymentWithoutPoints = monthlyLoanPayment(loanAmount, rateWithoutPoints, months);
    const monthlyPaymentWithPoints = monthlyLoanPayment(loanAmount, rateWithPoints, months);
    const monthlySavings = monthlyPaymentWithoutPoints - monthlyPaymentWithPoints;
    const breakEvenMonths = monthlySavings > 0 ? totalUpfrontCost / monthlySavings : null;
    const netSavingsByYears = {};
    [3, 5, 7, 10].forEach(function(year) {
      netSavingsByYears[year] = monthlySavings * Math.min(months, year * 12) - totalUpfrontCost;
    });

    return {
      pointCost,
      totalUpfrontCost,
      monthlyPaymentWithoutPoints,
      monthlyPaymentWithPoints,
      monthlySavings,
      breakEvenMonths,
      netSavingsByYears,
      lifetimeNetSavings: monthlySavings * months - totalUpfrontCost
    };
  }

  function calculateEmergencyFund(input) {
    const essentialMonthlyExpenses = number(input.essentialMonthlyExpenses, "Essential monthly expenses", { min: 0.01 });
    const incomeStability = String(input.incomeStability || "steady").toLowerCase();
    const dependents = number(input.dependents == null ? 0 : input.dependents, "Dependents", { min: 0, max: 20, integer: true });
    const insuranceDeductible = number(input.insuranceDeductible == null ? 0 : input.insuranceDeductible, "Largest insurance deductible", { min: 0 });
    const jobSearchMonths = number(input.jobSearchMonths == null ? 0 : input.jobSearchMonths, "Expected job-search months", { min: 0, max: 18 });
    const existingSavings = number(input.existingSavings == null ? 0 : input.existingSavings, "Existing emergency savings", { min: 0 });
    const rules = {
      steady: { minimum: 3, recommended: 4, maximum: 6, label: "Steady income" },
      variable: { minimum: 6, recommended: 8, maximum: 9, label: "Variable income" },
      seasonal: { minimum: 9, recommended: 10, maximum: 12, label: "Seasonal or highly irregular income" }
    };
    const rule = rules[incomeStability];
    if (!rule) throw new RangeError("Income stability must be steady, variable, or seasonal");
    const dependentAdjustment = Math.min(2, dependents * 0.5);
    const minimumMonths = Math.min(18, rule.minimum + Math.min(1, dependentAdjustment));
    const recommendedMonths = Math.min(
      18,
      Math.max(rule.recommended + dependentAdjustment, jobSearchMonths)
    );
    const maximumMonths = Math.min(
      18,
      Math.max(rule.maximum + dependentAdjustment, recommendedMonths)
    );
    const minimumTarget = essentialMonthlyExpenses * minimumMonths + insuranceDeductible;
    const recommendedTarget = essentialMonthlyExpenses * recommendedMonths + insuranceDeductible;
    const maximumTarget = essentialMonthlyExpenses * maximumMonths + insuranceDeductible;
    const savingsGap = Math.max(0, recommendedTarget - existingSavings);
    const ruleSummary = rule.label + " starts with a " + rule.minimum + "-" + rule.maximum +
      " month range; household dependents add up to 2 months, the job-search estimate can raise the recommendation, and the deductible is added separately.";

    return {
      recommendedMonths,
      minimumMonths,
      maximumMonths,
      minimumTarget,
      recommendedTarget,
      maximumTarget,
      existingSavings,
      savingsGap,
      ruleSummary
    };
  }

  function socialSecurityBenefitAtClaim(fraBenefit, fullRetirementAge, claimAge) {
    const monthsFromFra = Math.round((claimAge - fullRetirementAge) * 12);
    if (monthsFromFra === 0) return fraBenefit;
    if (monthsFromFra > 0) {
      return fraBenefit * (1 + monthsFromFra * (0.08 / 12));
    }
    const monthsEarly = Math.abs(monthsFromFra);
    const first36 = Math.min(36, monthsEarly);
    const additional = Math.max(0, monthsEarly - 36);
    const reduction = first36 * (5 / 9 / 100) + additional * (5 / 12 / 100);
    return fraBenefit * (1 - reduction);
  }

  function cumulativeSocialSecurity(baseMonthlyBenefit, claimAge, targetAge, colaPercent, colaBaseAge) {
    const months = Math.max(0, Math.round((targetAge - claimAge) * 12));
    let total = 0;
    for (let month = 0; month < months; month++) {
      const ageAtPayment = claimAge + month / 12;
      const yearsSinceBase = Math.max(0, Math.floor(ageAtPayment - colaBaseAge + 0.000001));
      total += baseMonthlyBenefit * Math.pow(1 + colaPercent / 100, yearsSinceBase);
    }
    return total;
  }

  function socialSecurityBreakEvenAge(earlier, later, colaPercent, colaBaseAge) {
    for (let month = 0; month <= Math.round((120 - later.claimAge) * 12); month++) {
      const age = later.claimAge + month / 12;
      const earlierTotal = cumulativeSocialSecurity(earlier.benefit, earlier.claimAge, age, colaPercent, colaBaseAge);
      const laterTotal = cumulativeSocialSecurity(later.benefit, later.claimAge, age, colaPercent, colaBaseAge);
      if (laterTotal >= earlierTotal && laterTotal > 0) return age;
    }
    return null;
  }

  function calculateSocialSecurityBreakEven(input) {
    const monthlyBenefitAtFRA = number(input.monthlyBenefitAtFRA, "Monthly benefit at full retirement age", { min: 0.01 });
    const fullRetirementAge = number(input.fullRetirementAge, "Full retirement age", { min: 66, max: 67 });
    const earlyAge = number(input.earlyAge == null ? 62 : input.earlyAge, "Early claiming age", { min: 62, max: fullRetirementAge });
    const delayedAge = number(input.delayedAge == null ? 70 : input.delayedAge, "Delayed claiming age", { min: fullRetirementAge, max: 70 });
    const colaPercent = number(input.colaPercent == null ? 0 : input.colaPercent, "COLA assumption", { min: 0, max: 20 });
    const earlyMonthlyBenefit = socialSecurityBenefitAtClaim(monthlyBenefitAtFRA, fullRetirementAge, earlyAge);
    const delayedMonthlyBenefit = socialSecurityBenefitAtClaim(monthlyBenefitAtFRA, fullRetirementAge, delayedAge);
    const early = { claimAge: earlyAge, benefit: earlyMonthlyBenefit };
    const fra = { claimAge: fullRetirementAge, benefit: monthlyBenefitAtFRA };
    const delayed = { claimAge: delayedAge, benefit: delayedMonthlyBenefit };
    const colaBaseAge = 62;
    const comparisonRows = [75, 80, 85, 90].map(function(age) {
      return {
        age,
        earlyTotal: cumulativeSocialSecurity(earlyMonthlyBenefit, earlyAge, age, colaPercent, colaBaseAge),
        fraTotal: cumulativeSocialSecurity(monthlyBenefitAtFRA, fullRetirementAge, age, colaPercent, colaBaseAge),
        delayedTotal: cumulativeSocialSecurity(delayedMonthlyBenefit, delayedAge, age, colaPercent, colaBaseAge)
      };
    });

    return {
      earlyMonthlyBenefit,
      fraMonthlyBenefit: monthlyBenefitAtFRA,
      delayedMonthlyBenefit,
      breakEvenEarlyVsFRA: socialSecurityBreakEvenAge(early, fra, colaPercent, colaBaseAge),
      breakEvenFRAVsDelayed: socialSecurityBreakEvenAge(fra, delayed, colaPercent, colaBaseAge),
      breakEvenEarlyVsDelayed: socialSecurityBreakEvenAge(early, delayed, colaPercent, colaBaseAge),
      comparisonRows,
      earlyReductionPercent: (1 - earlyMonthlyBenefit / monthlyBenefitAtFRA) * 100,
      delayedCreditPercent: (delayedMonthlyBenefit / monthlyBenefitAtFRA - 1) * 100
    };
  }

  return {
    amortizationScenario,
    budgetSummary,
    calculate401kMatch,
    calculateBnplPlan,
    calculateCarAffordability,
    calculateCarLoanInterestDeduction,
    calculateCreditUtilization,
    calculateEmergencyFund,
    calculateInvestmentFees,
    calculateMortgagePoints,
    calculateMortgageRefinance,
    calculateSocialSecurityBreakEven,
    compoundInterest,
    creditCardPayoff,
    debtPayoff,
    homeAffordability,
    inflationImpact,
    loanPayment,
    monthlyMortgagePayment,
    mortgagePayoff,
    mortgagePlan,
    netWorth,
    rentVsBuy,
    retirementProjection,
    roi,
    salaryToHourly,
    savingsGoal
  };
});
