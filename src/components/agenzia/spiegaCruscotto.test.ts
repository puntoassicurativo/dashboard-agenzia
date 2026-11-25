import { describe, expect, it } from "vitest";

import type { MeseRiepilogo } from "./MeseCruscotto";
import type { Cella, Spiegazione } from "./Spiega";
import {
  elencoMesiFiscale,
  elencoPassi,
  type FiscaleCruscotto,
  type Incassi,
  type PassiProiezione,
  spiegaAvanzo,
  elencoMovimentiAvanzo,
  filtraMovimenti,
  mesiMovimenti,
  NESSUN_FILTRO,
  spiegaDeltaYtd,
  spiegaDeltaMeseAnnoPrima,
  spiegaIncassi,
  spiegaIncassiMeseTot,
  spiegaIncassiRamo,
  spiegaMix,
  spiegaProvv,
  spiegaProvvYtd,
  spiegaUtileFiscale,
} from "./spiegaCruscotto";
import {
  spiegaVitaMese,
  spiegaVitaMeseAnnoPrima,
  type VitaMese,
} from "./spiegaVita";

// Invented data: real agency figures never go into the repository.
const delta = (np: number, ann: number, npP: number, annP: number) => ({
  np,
  ann,
  delta: Math.round((np + ann) * 100) / 100,
  np_pezzi: npP,
  ann_pezzi: annP,
  delta_pezzi: npP - annP,
});
const mese = (m: string, provv: number, d: number): MeseRiepilogo => ({
  mese: m,
  fino_al: `${m}-28`,
  parziale: false,
  provv,
  provv_ap: 100,
  differenza: provv - 100,
  cresc: null,
  incassi_auto: 0,
  incassi_re: 0,
  incassi_auto_ap: 0,
  incassi_re_ap: 0,
  delta_auto: delta(d, -10, 3, 1),
  delta_auto_ap: delta(0, 0, 0, 0),
  delta_re: delta(0, 0, 0, 0),
  delta_re_ap: delta(0, 0, 0, 0),
  provv_linee: {
    re: { provv: provv - 70, titoli: 4 },
    auto: { provv: 60, titoli: 9 },
    vita: { provv: 10, titoli: 2 },
  },
  provv_linee_ap: { auto: { provv: 100, titoli: 8 } },
});

const somma = (s: Spiegazione) =>
  (s.calcolo ?? [])
    .filter((r) => r.segno === "+")
    .reduce((t, r) => t + (r.valore as number), 0);
const risultato = (s: Spiegazione) =>
  (s.calcolo ?? []).find((r) => r.segno === "=")?.valore;
const colonna = (righe: Cella[][], i: number) =>
  righe.reduce((t, r) => t + ((r[i] as number) ?? 0), 0);

describe("explanations of the main page", () => {
  it("commissions of the month: the lines add up to the number, auto first", () => {
    const s = spiegaProvv(mese("2030-02", 250.5, 40));
    expect(s.calcolo?.[0].voce).toMatch(/^Auto \(9 titoli\)/);
    expect(somma(s)).toBeCloseTo(250.5, 2);
    expect(risultato(s)).toBe(250.5);
    expect(s.elenco?.totale?.[2]).toBe(250.5);
    expect(colonna(s.elenco?.righe ?? [], 2)).toBeCloseTo(250.5, 2);
  });

  it("commissions of an old row without lines: only the total, no list", () => {
    const m = { ...mese("2030-02", 80, 0), provv_linee: undefined };
    const s = spiegaProvv(m);
    expect(s.calcolo).toEqual([{ voce: "Totale", valore: 80, segno: "=" }]);
    expect(s.elenco).toBeUndefined();
  });

  it("incassi from January: closed months plus the titles give the tile", () => {
    const inc: Incassi = {
      auto: 1530,
      re: 490,
      totale: 2020,
      auto_ap: 900,
      re_ap: 300,
      totale_ap: 1200,
      cresc_auto: 70,
      cresc_re: 63.33,
      cresc_totale: 68.33,
      parti: {
        chiusi: {
          dal: "2030-01-01",
          al: "2030-01-31",
          na302_auto: 1100,
          na302_re: 420,
          ic: 50,
          auto: 1050,
          re: 470,
        },
        chiusi_ap: null,
        dopo: { dal: "2030-02-01", al: "2030-02-10", auto: 480, re: 20, ic: 0 },
        dopo_ap: {
          dal: "2029-01-01",
          al: "2029-02-10",
          auto: 900,
          re: 300,
          ic: 0,
        },
      },
    };
    const s = spiegaIncassi(inc, 2030, "2030-02-10");
    expect(somma(s)).toBeCloseTo(2020, 2);
    const righe = s.elenco?.righe ?? [];
    const totale2030 = righe.find((r) => r[0] === "= 2030");
    expect(totale2030).toEqual(["= 2030", 1530, 490, 2020]);
    // company report + driver accidents move + titles = the "= 2030" row, column by column
    const parti2030 = righe.slice(0, righe.indexOf(totale2030!));
    expect(colonna(parti2030, 1)).toBeCloseTo(1530, 2);
    expect(colonna(parti2030, 2)).toBeCloseTo(490, 2);
    expect(righe.at(-1)).toEqual(["= 2029, stesso periodo", 900, 300, 1200]);
    // each line opens its own calculation, ending on the line's number (review R016d)
    for (const ramo of ["auto", "re"] as const) {
      const r = spiegaIncassiRamo(inc, ramo, 2030, "2030-02-10").calcolo ?? [];
      expect(r.at(-1)?.valore).toBe(inc[ramo]);
      const parti = r.filter((x) => x.segno !== "=");
      expect(parti.reduce((t, x) => t + Number(x.valore), 0)).toBe(inc[ramo]);
    }
  });

  it("delta from January: the months add up and a one-cent rounding is said", () => {
    const conDelta = (m: MeseRiepilogo, d: number): MeseRiepilogo => ({
      ...m,
      delta_auto: { ...m.delta_auto, np: d + 10, ann: -10, delta: d },
    });
    const mesi = [
      conDelta(mese("2030-01", 100, 0), 15.01),
      conDelta(mese("2030-02", 100, 0), 15),
    ];
    const ytd = delta(50, -20, 6, 2);
    const s = spiegaDeltaYtd(
      "Delta auto",
      { mese: ytd, mese_ap: ytd, ytd, ytd_ap: ytd },
      mesi,
      "delta_auto",
      "2030-02-28",
    );
    expect(risultato(s)).toBe(30);
    expect(s.elenco?.righe).toHaveLength(2);
    expect(s.elenco?.totale?.[3]).toBeCloseTo(30.01, 2);
    expect(s.elenco?.nota).toMatch(/arrotondamenti/);
  });

  it("protection of a month: sub-groups and products add up to the tile", () => {
    const tot = { annui: 0, unici: 0, pens: 0, aggiuntivi: 0, vita: 0 };
    const v: VitaMese = {
      fino_al: "2030-01-31",
      parziale: false,
      ac: { ...tot, prot: 450, totale: 450 },
      ap: { ...tot, prot: 80, totale: 80 },
      diff: { vita: 0, prot: 370 },
      np: null,
      prodotti: {
        ac: [
          {
            blocco: "prot",
            codice: "112C",
            sottogruppo: "Long Term Care",
            premio: 150,
          },
          {
            blocco: "prot",
            codice: "107V",
            sottogruppo: "Temporanee Caso Morte",
            premio: 200,
          },
          {
            blocco: "prot",
            codice: "105A",
            sottogruppo: "Temporanee Caso Morte",
            premio: 100,
          },
          { blocco: "pens", codice: "333R", sottogruppo: "PIP", premio: 999 },
        ],
        ap: [
          {
            blocco: "prot",
            codice: "107V",
            sottogruppo: "Temporanee Caso Morte",
            premio: 80,
          },
        ],
      },
    };
    const s = spiegaVitaMese("2030-01", v, "prot");
    expect(s.titolo).toBe("Protezione gennaio 2030");
    expect(s.calcolo?.slice(0, 3)).toEqual([
      { voce: "Temporanee Caso Morte", valore: 300, segno: "+" },
      { voce: "Long Term Care", valore: 150, segno: "+" },
      { voce: "Protezione", valore: 450, segno: "=" },
    ]);
    expect(s.elenco?.righe).toHaveLength(3);
    expect(s.elenco?.totale).toEqual(["Totale", 450, 80]);
    expect(s.elenco?.nota).toBe("Totale dei prodotti = numero del riquadro.");
    // the figure of the year before opens the year before, not the current year (review R016e)
    const ap = spiegaVitaMeseAnnoPrima("2030-01", v, "prot");
    expect(ap.titolo).toBe("Protezione gennaio 2029");
    expect(ap.calcolo?.find((r) => r.segno === "=")?.valore).toBe(80);
    expect(ap.elenco?.totale).toEqual(["Totale", 80, 450]);
  });

  it("surplus: balance before + entries - exits = today's balance, and a sheet typo is said", () => {
    const av = {
      valore: -50,
      data: "2030-02-09",
      prec_valore: 100,
      prec_data: "2030-01-09",
    };
    const mv = {
      dal_saldo: 100,
      dal: "2030-01-09",
      al: "2030-02-09",
      entrate: 30,
      uscite: 180,
      al_saldo: -50,
      differenza: 0,
      quadra: true,
      movimenti: [
        {
          data: "2030-01-20",
          descrizione: "a",
          entrata: 30,
          uscita: 0,
          saldo: 130,
        },
        {
          data: "2030-02-09",
          descrizione: "b",
          entrata: 0,
          uscita: 180,
          saldo: -50,
        },
      ],
    };
    const s = spiegaAvanzo(av, [], mv);
    const c = s.calcolo ?? [];
    expect(
      (c[0].valore as number) +
        (c[1].valore as number) -
        (c[2].valore as number),
    ).toBe(c[3].valore);
    expect(s.elenco?.righe).toHaveLength(3);
    const storto = spiegaAvanzo(av, [], {
      ...mv,
      quadra: false,
      differenza: -10,
    });
    expect(storto.elenco?.nota).toMatch(/refuso/);
  });

  it("premium account movements: filters by month, entries or exits and text, totals of the rows shown", () => {
    const mv = {
      dal_saldo: 1000,
      dal: "2029-12-31",
      al: "2030-03-01",
      entrate: 500,
      uscite: 300,
      al_saldo: 1200,
      differenza: 0,
      quadra: true,
      movimenti: [
        {
          data: "2030-01-05",
          tipo: "entrata" as const,
          descrizione: "provvigioni",
          entrata: 500,
          uscita: 0,
          saldo: 1500,
        },
        {
          data: "2030-01-05",
          tipo: "uscita" as const,
          descrizione: "subagente GE.MA",
          entrata: 0,
          uscita: 200,
          saldo: 1300,
        },
        {
          data: "2030-03-01",
          tipo: "uscita" as const,
          descrizione: "broker PIB",
          entrata: 0,
          uscita: 100,
          saldo: 1200,
        },
      ],
    };
    expect(mesiMovimenti(mv)).toEqual(["2030-01", "2030-03"]);
    expect(
      filtraMovimenti(mv, { ...NESSUN_FILTRO, mese: "2030-01" }),
    ).toHaveLength(2);
    expect(
      filtraMovimenti(mv, { ...NESSUN_FILTRO, tipo: "uscita" }).map(
        (x) => x.descrizione,
      ),
    ).toEqual(["subagente GE.MA", "broker PIB"]);
    expect(
      filtraMovimenti(mv, { ...NESSUN_FILTRO, testo: "gE.ma" }),
    ).toHaveLength(1);
    // without a filter: the starting balance, every row, today's balance
    const tutto = elencoMovimentiAvanzo(mv);
    expect(tutto.righe).toHaveLength(4);
    expect(tutto.totale).toEqual(["Totale del periodo", 500, 300, 1200]);
    // with a filter: the total is the sum of the rows shown
    const uscite = elencoMovimentiAvanzo(mv, {
      ...NESSUN_FILTRO,
      tipo: "uscita",
    });
    expect(uscite.righe).toHaveLength(2);
    expect(uscite.totale?.slice(1, 3)).toEqual([0, 300]);
  });

  it("a sheet typo shows the difference in euro", () => {
    const e = elencoMovimentiAvanzo({
      dal_saldo: 0,
      dal: "2029-12-31",
      al: "2030-01-02",
      entrate: 0,
      uscite: 0,
      al_saldo: 10,
      differenza: -10,
      quadra: false,
      movimenti: [],
    });
    expect(e.nota).toMatch(/differenza -10,00/);
  });

  it("projection steps: each column ends on the projected figure", () => {
    const p: PassiProiezione = {
      mesi: 10,
      ricavi: {
        da_gennaio: 1200,
        arag: 60,
        una_tantum: 150,
        di_cui_incentivi_marzo: 50,
        ricorrenti: 990,
        al_mese: 99,
        per_12: 1188,
        arag_anno: 120,
        totale: 1458,
      },
      deducibili: {
        da_gennaio: 700,
        mutui_pagati: 30,
        una_tantum: 40,
        ricorrenti: 630,
        al_mese: 63,
        per_12: 756,
        mutui_resto_anno: 9,
        totale: 835,
      },
    };
    const righe = elencoPassi(p, "2030-01", "2030-10").righe;
    const valore = (testo: string, col: number) =>
      righe.find((r) => String(r[0]).startsWith(testo))?.[col] as number;
    const ricavi = ["per 12", "più voci una tantum", "più ARAG"].reduce(
      (s, t) => s + (valore(t, 1) ?? 0),
      0,
    );
    expect(ricavi).toBe(valore("= previsto", 1));
    const deducibili = ["per 12", "più voci una tantum", "più mutui"].reduce(
      (s, t) => s + (valore(t, 2) ?? 0),
      0,
    );
    expect(deducibili).toBe(valore("= previsto", 2));
  });

  it("the list behind the projected taxable profit ends on that number, not on January-to-date (review R016c)", () => {
    const f = fiscaleDiProva();
    const s = spiegaUtileFiscale(f);
    expect(s.elenco?.totale?.at(-1)).toBe(f.proiezione.utile_fiscale);
  });

  it("the month-by-month list keeps ARAG out of the profit column (review R051)", () => {
    const e = elencoMesiFiscale(fiscaleDiProva());
    // profit column = the months only (same as Utile e costi); ARAG only in the taxable profit column
    expect(e.totale?.[2]).toBe(30);
    expect(e.totale?.[3]).toBe(41);
    const riga = e.righe.find((r) =>
      String(r[0]).startsWith("Provvigioni ARAG"),
    );
    expect(riga?.[2]).toBeNull();
  });
});

function fiscaleDiProva(): FiscaleCruscotto {
  return {
    dal: "2030-01",
    al: "2030-02",
    mesi_usati: 2,
    soglia: 100,
    da_gennaio: { ricavi: 100, deducibili: 59, utile_fiscale: 41 },
    proiezione: { ricavi: 600, deducibili: 354, utile_fiscale: 246 },
    per_mese: {
      "2030-01": { utile: 10, provvigioni: 50, utile_fiscale: 15 },
      "2030-02": { utile: 20, provvigioni: 50, utile_fiscale: 25 },
    },
    proiezione_passi: {
      mesi: 2,
      ricavi: {
        da_gennaio: 100,
        arag: 1,
        una_tantum: 0,
        di_cui_incentivi_marzo: 0,
        ricorrenti: 99,
        al_mese: 49.5,
        per_12: 594,
        arag_anno: 6,
        totale: 600,
      },
      deducibili: {
        da_gennaio: 59,
        mutui_pagati: 0,
        una_tantum: 0,
        ricorrenti: 59,
        al_mese: 29.5,
        per_12: 354,
        mutui_resto_anno: 0,
        totale: 354,
      },
    },
  };
}

describe("explanations of the reorganised Cruscotto (25/11/2026)", () => {
  it("commissions from January: the months add up to the number and to the difference", () => {
    const mesi = [mese("2030-01", 150, 50), mese("2030-02", 80.55, 20)];
    const s = spiegaProvvYtd(mesi);
    expect(s.titolo).toBe("Provvigioni da gennaio a fine febbraio");
    expect(s.calcolo?.[0].valore).toBe(230.55);
    expect(s.calcolo?.[1].valore).toBe(200);
    expect(risultato(s)).toBe(30.55);
    expect(colonna(s.elenco!.righe, 1)).toBeCloseTo(230.55, 2);
    expect(colonna(s.elenco!.righe, 3)).toBeCloseTo(30.55, 2);
    expect(s.elenco!.totale).toEqual(["Da gennaio", 230.55, 200, 30.55]);
  });

  it("collected in the month: auto plus RE, then last year and the difference", () => {
    const m = {
      ...mese("2030-02", 100, 10),
      incassi_auto: 300,
      incassi_re: 120.5,
      incassi_auto_ap: 250,
      incassi_re_ap: 100,
    };
    const s = spiegaIncassiMeseTot(m);
    expect(risultato(s)).toBe(420.5);
    expect(s.calcolo?.[3].valore).toBe(350);
    expect(s.calcolo?.[4].valore).toBe(70.5);
  });

  it("delta of the same month last year carries the difference", () => {
    const m = mese("2030-02", 100, 50);
    const s = spiegaDeltaMeseAnnoPrima("Delta auto", m, "delta_auto");
    expect(risultato(s)).toBe(0);
    expect(s.calcolo?.[3].valore).toBe(40);
  });

  it("mix of the portfolio: shares add up to 100 and the list matches the parts", () => {
    const s = spiegaMix(
      "da gennaio",
      { auto: 600, re: 300, vita: 100 },
      { auto: 500, re: 400, vita: 100 },
      2030,
      "NA013",
    );
    expect(risultato(s)).toBe(1000);
    expect(s.calcolo?.[0].voce).toBe("Auto (60,0%)");
    expect(colonna(s.elenco!.righe, 1)).toBe(1000);
    expect(colonna(s.elenco!.righe, 3)).toBe(1000);
    expect(s.elenco!.righe[0][4]).toBe("50,0%");
  });
});
