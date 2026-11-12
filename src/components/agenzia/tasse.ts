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
