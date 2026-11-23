import { describe, expect, it } from "vitest";

import type { RigaCalcolo } from "./Spiega";
import { spiegaCella } from "./TasseAnno";

// Invented figures shaped like the real ones: the three parts add up to one cent more than the rounded total.
const conti = {
  ricavi: 300,
  deducibili: 100,
  quota_socio: 100,
  inps_socio: 24.13,
  irpef_socio: 20.47,
  addizionali_socio: 2.48,
  tasse_socio: 47.075,
};
const f = {
  dal: "2030-01",
  al: "2030-10",
  da_gennaio: conti,
  proiezione: conti,
  per_mese: { "2030-01": { ritenuta: 10 }, "2030-02": { ritenuta: 12 } },
  ritenute_passi: {
    mesi_con_ritenuta: 2,
    compagnia_da_gennaio: 22,
    compagnia_anno: 132,
    arag: 3,
    mesi_arag: 2,
    arag_anno: 18,
    totale: 150.01,
  },
} as never;
const t = {
  utile_fiscale: 200,
  fabio: 47.07,
  claudio: 47.08,
  irap: 7.8,
  totale: 101.95,
  ritenute: 150.01,
  inps_pagati: 0,
  resta: 0,
};
const b = {
  anno: "2030",
  nota_inps: "",
  nota_stima: "",
  inps_versati: [],
} as never;

/** Signed sum of the rows above the "=" line. */
const somma = (righe: RigaCalcolo[]): number =>
  Math.round(
    righe
      .filter((r) => r.segno !== "=")
      .reduce((s, r) => s + (r.segno === "-" ? -1 : 1) * Number(r.valore), 0) *
      100,
  ) / 100;

describe("Tasse: the rows of a panel give its result", () => {
  it.each(["fabio", "claudio"] as const)(
    "the taxes of %s add up to the number shown (review R016a/R048)",
    (socio) => {
      const s = spiegaCella(socio, "fino_a_oggi", t, f, b, "da gennaio");
      const righe = s.calcolo ?? [];
      expect(righe.at(-1)?.valore).toBe(t[socio]);
      expect(somma(righe)).toBe(t[socio]);
      // half of the taxable profit is the base, not an addend
      expect(righe.some((r) => /utile fiscale/i.test(r.voce))).toBe(false);
    },
  );

  it("the list behind the December withholdings totals the December number (review R016b/R056)", () => {
    const s = spiegaCella("ritenute", "dicembre", t, f, b, "a dicembre");
    expect(s.elenco?.totale?.at(-1)).toBe(t.ritenute);
    expect(somma(s.calcolo ?? [])).toBe(t.ritenute);
  });

  it("the withholdings so far say the months that have one", () => {
    const s = spiegaCella("ritenute", "fino_a_oggi", t, f, b, "da gennaio");
    expect(s.calcolo?.[0].voce).toContain("2 mesi");
    expect(s.elenco?.totale?.at(-1)).toBe(25);
  });
});
