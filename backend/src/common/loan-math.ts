/** Финансовая математика графика платежей (аннуитет), общая для скоринга и займов. */

export function monthlyRate(annualRatePercent: number): number {
  return annualRatePercent / 100 / 12;
}

/** Ежемесячный аннуитетный платёж по сумме, ставке (% годовых) и сроку (мес). */
export function annuityPayment(principal: number, annualRatePercent: number, termMonths: number): number {
  const r = monthlyRate(annualRatePercent);
  if (r === 0) {
    return principal / termMonths;
  }
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

/** Максимальная сумма основного долга, которую можно погасить платежом paymentCapacity. */
export function maxPrincipalForPayment(
  paymentCapacity: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  if (paymentCapacity <= 0) {
    return 0;
  }
  const r = monthlyRate(annualRatePercent);
  if (r === 0) {
    return paymentCapacity * termMonths;
  }
  const factor = Math.pow(1 + r, termMonths);
  return (paymentCapacity * (factor - 1)) / (r * factor);
}

export interface AnnuityScheduleRow {
  installmentNo: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
}

/** Полная стоимость кредита (ПСК), % годовых — упрощённо: суммарная переплата к телу за срок, приведённая к годовым. */
export function fullCostOfCreditPercent(
  principal: number,
  totalPayable: number,
  termMonths: number,
): number {
  if (principal <= 0 || termMonths <= 0) {
    return 0;
  }
  const overpaymentRatio = (totalPayable - principal) / principal;
  return Math.round(overpaymentRatio * (12 / termMonths) * 10000) / 100;
}

export function buildAnnuitySchedule(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
  startDate: Date,
): AnnuityScheduleRow[] {
  const r = monthlyRate(annualRatePercent);
  const payment = round2(annuityPayment(principal, annualRatePercent, termMonths));
  const rows: AnnuityScheduleRow[] = [];
  let balance = principal;

  for (let i = 1; i <= termMonths; i++) {
    const interestDue = round2(balance * r);
    let principalDue = round2(payment - interestDue);
    let totalDue = round2(principalDue + interestDue);

    if (i === termMonths) {
      // Компенсируем накопленную погрешность округления в последнем платеже.
      principalDue = round2(balance);
      totalDue = round2(principalDue + interestDue);
    }

    balance = round2(balance - principalDue);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    rows.push({ installmentNo: i, dueDate, principalDue, interestDue, totalDue });
  }

  return rows;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
