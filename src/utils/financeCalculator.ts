/** Flat-rate auto finance math — shared by car detail UI and chat (v5.4.6.3) */

export const STANDARD_FINANCE_TERMS_MONTHS = [48, 60, 72, 84] as const;

export type FinanceTermMonths = (typeof STANDARD_FINANCE_TERMS_MONTHS)[number];

export interface FinanceCalcInput {
  carPrice: number;
  downPaymentBaht?: number;
  downPaymentPercent?: number;
  annualFlatRatePercent: number;
  termMonths: number;
}

export interface FinanceCalcResult {
  carPrice: number;
  downPaymentBaht: number;
  loanAmount: number;
  annualFlatRatePercent: number;
  termMonths: number;
  totalInterest: number;
  totalRepayment: number;
  monthlyInstallment: number;
}

export function formatBaht(amount: number): string {
  return `฿${Math.round(amount).toLocaleString("th-TH")}`;
}

export function resolveDownPayment(
  carPrice: number,
  options: { downPaymentBaht?: number; downPaymentPercent?: number }
): { downPaymentBaht: number; loanAmount: number } {
  if (carPrice <= 0) {
    return { downPaymentBaht: 0, loanAmount: 0 };
  }
  let downPaymentBaht = 0;
  if (options.downPaymentBaht != null && options.downPaymentBaht >= 0) {
    downPaymentBaht = Math.round(options.downPaymentBaht);
  } else if (options.downPaymentPercent != null && options.downPaymentPercent >= 0) {
    downPaymentBaht = Math.round(carPrice * (options.downPaymentPercent / 100));
  }
  downPaymentBaht = Math.min(downPaymentBaht, carPrice);
  const loanAmount = Math.max(0, carPrice - downPaymentBaht);
  return { downPaymentBaht, loanAmount };
}

/** Thai auto lending flat rate: total interest = principal × rate% × years */
export function calculateFlatRateFinance(input: FinanceCalcInput): FinanceCalcResult {
  const { downPaymentBaht, loanAmount } = resolveDownPayment(input.carPrice, {
    downPaymentBaht: input.downPaymentBaht,
    downPaymentPercent: input.downPaymentPercent,
  });
  const years = input.termMonths / 12;
  const totalInterest = Math.round(
    loanAmount * (input.annualFlatRatePercent / 100) * years
  );
  const totalRepayment = loanAmount + totalInterest;
  const monthlyInstallment = Math.round(totalRepayment / input.termMonths);

  return {
    carPrice: input.carPrice,
    downPaymentBaht,
    loanAmount,
    annualFlatRatePercent: input.annualFlatRatePercent,
    termMonths: input.termMonths,
    totalInterest,
    totalRepayment,
    monthlyInstallment,
  };
}

export function compareFlatRateTerms(
  base: Omit<FinanceCalcInput, "termMonths">,
  termMonthsList: number[]
): FinanceCalcResult[] {
  return termMonthsList.map((termMonths) =>
    calculateFlatRateFinance({ ...base, termMonths })
  );
}

/** Reverse estimate max car price from target monthly installment (flat rate). */
export function estimateCarPriceFromMaxMonthly(params: {
  maxMonthlyBaht: number;
  termMonths: number;
  annualFlatRatePercent: number;
  downPaymentPercent?: number;
  downPaymentBaht?: number;
}): number | null {
  const { maxMonthlyBaht, termMonths, annualFlatRatePercent } = params;
  if (maxMonthlyBaht <= 0 || termMonths <= 0 || annualFlatRatePercent < 0) {
    return null;
  }
  const years = termMonths / 12;
  const factor = 1 + (annualFlatRatePercent / 100) * years;
  const loanAmount = Math.round((maxMonthlyBaht * termMonths) / factor);
  if (loanAmount <= 0) return null;

  if (params.downPaymentBaht != null && params.downPaymentBaht >= 0) {
    return loanAmount + Math.round(params.downPaymentBaht);
  }
  const pct = params.downPaymentPercent ?? 0;
  if (pct >= 100) return null;
  if (pct > 0) {
    return Math.round(loanAmount / (1 - pct / 100));
  }
  return loanAmount;
}
