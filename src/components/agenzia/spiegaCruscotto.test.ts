import { describe, expect, it } from "vitest";

import type { MeseRiepilogo } from "./MeseCruscotto";
import type { Cella, Spiegazione } from "./Spiega";
import {
  type Incassi,
  spiegaDeltaYtd,
  spiegaIncassi,
  spiegaProvv,
} from "./spiegaCruscotto";
import { spiegaVitaMese, type VitaMese } from "./spiegaVita";

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
  });
});
