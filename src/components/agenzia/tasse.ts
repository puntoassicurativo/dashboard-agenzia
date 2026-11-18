/**
 * Tax split of the SNC on a given taxable profit. Same formula and rates as the agent
 * (agenti/cruscotto_agenzia/fiscale.py `tasse`, constants in utile.py): keep the two in sync when
 * the rates change. Everything is an estimate; the real figure comes from the accountant.
 */
export const IRAP_RATE = 0.039;
export const INPS_RATE = 0.2448;
export const LOCAL_SURTAX_RATE = 0.025;
// [upper limit, rate] of the IRPEF brackets (2026 budget law)
export const IRPEF_BRACKETS: [number, number][] = [
  [28000, 0.23],
  [50000, 0.33],
  [Infinity, 0.43],
];
export const MONTHS_PER_YEAR = 12;

export interface PartnerTaxes {
  share: number;
  inps: number;
  irpef: number;
  surtax: number;
  total: number;
}

export interface TaxSplit {
  irap: number;
  partners: [PartnerTaxes, PartnerTaxes];
  total: number;
  withheld: number;
  stillToPay: number;
  perMonth: number;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

export function irpef(base: number): number {
  let total = 0;
  let previous = 0;
  for (const [limit, rate] of IRPEF_BRACKETS) {
    if (base > previous) total += (Math.min(base, limit) - previous) * rate;
    previous = limit;
  }
  return total;
}

function partnerTaxes(share: number): PartnerTaxes {
  const inps = Math.max(share, 0) * INPS_RATE;
  const base = Math.max(share - inps, 0);
  const tax = irpef(base);
  const surtax = base * LOCAL_SURTAX_RATE;
  return {
    share: round2(share),
    inps: round2(inps),
    irpef: round2(tax),
    surtax: round2(surtax),
    total: round2(inps + tax + surtax),
  };
}

/** firstPartnerPercent = share of the first partner (Fabio), 0-100; the second gets the rest. */
export function splitTaxes(
  taxableProfit: number,
  firstPartnerPercent: number,
  withheld: number,
): TaxSplit {
  const first = taxableProfit * (firstPartnerPercent / 100);
  const partners: [PartnerTaxes, PartnerTaxes] = [
    partnerTaxes(first),
    partnerTaxes(taxableProfit - first),
  ];
  const irap = round2(Math.max(taxableProfit, 0) * IRAP_RATE);
  const total = round2(irap + partners[0].total + partners[1].total);
  const stillToPay = round2(total - withheld);
  return {
    irap,
    partners,
    total,
    withheld: round2(withheld),
    stillToPay,
    perMonth: round2(stillToPay / MONTHS_PER_YEAR),
  };
}

/** Parses an amount typed the Italian way ("170.000", "170000", "1.234,56", "€ 170 000"). */
export function parseAmount(text: string): number | null {
  const cleaned = text
    .replace(/[€\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/**
 * Flat-rate regime ("forfettario") of someone the SNC pays with an invoice (Fabio, 18/11/2026: Silvia, then
 * Lorenzo). Fabio's rule: taxable base = coefficient (78%, to be checked) of the invoice, substitute tax 5% and INPS
 * about 25%, both on that base. The studio is asked whether the contributions should come off the base first.
 */
export const FLAT_COEFFICIENT = 78;
export const FLAT_TAX_RATE = 5;
export const FLAT_INPS_RATE = 25;

export interface FlatRateTaxes {
  base: number;
  tax: number;
  inps: number;
  total: number;
}

export function flatRateTaxes(
  invoice: number,
  coefficientPercent: number = FLAT_COEFFICIENT,
  taxPercent: number = FLAT_TAX_RATE,
  inpsPercent: number = FLAT_INPS_RATE,
): FlatRateTaxes {
  const base = Math.max(invoice, 0) * (coefficientPercent / 100);
  const tax = base * (taxPercent / 100);
  const inps = base * (inpsPercent / 100);
  return {
    base: round2(base),
    tax: round2(tax),
    inps: round2(inps),
    total: round2(tax + inps),
  };
}

/** A piece of the free simulation: a cost that lowers the profit, or an invoice to a flat-rate person (taxed too). */
export interface SimulationPiece {
  label: string;
  amount: number;
  flatRate: boolean;
}

export interface FreeSimulation {
  startingProfit: number;
  piecesTotal: number;
  profit: number;
  snc: TaxSplit;
  recipients: { label: string; taxes: FlatRateTaxes }[];
  recipientsTotal: number;
  /** SNC taxes plus the taxes of the people the SNC pays */
  grandTotal: number;
  /** grand total without any piece minus grand total with them: what the pieces save overall */
  saving: number;
}

export function simulate(
  startingProfit: number,
  pieces: SimulationPiece[],
  firstPartnerPercent: number,
  withheld: number,
  flat: { coefficient: number; tax: number; inps: number },
): FreeSimulation {
  const piecesTotal = pieces.reduce((s, p) => s + Math.max(p.amount, 0), 0);
  const profit = startingProfit - piecesTotal;
  const snc = splitTaxes(profit, firstPartnerPercent, withheld);
  const recipients = pieces
    .filter((p) => p.flatRate && p.amount > 0)
    .map((p) => ({
      label: p.label,
      taxes: flatRateTaxes(p.amount, flat.coefficient, flat.tax, flat.inps),
    }));
  const recipientsTotal = round2(
    recipients.reduce((s, r) => s + r.taxes.total, 0),
  );
  const grandTotal = round2(snc.total + recipientsTotal);
  const without = splitTaxes(startingProfit, firstPartnerPercent, withheld);
  return {
    startingProfit: round2(startingProfit),
    piecesTotal: round2(piecesTotal),
    profit: round2(profit),
    snc,
    recipients,
    recipientsTotal,
    grandTotal,
    saving: round2(without.total - grandTotal),
  };
}
