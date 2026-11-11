import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { EstrattiLetti } from "./Estratti";
import { PnaBlocco, type PnaInfo, type PnaMese } from "./Pna";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

const mese = (over: Partial<PnaMese> = {}): PnaMese => ({
  fonte: "bo",
  ricavi: { "1001": 300, "1002": 50 },
  una_tantum: { "1002": 50 },
  costi: { "2001": -20 },
  da_classificare: {},
  pna_ricavi: 350,
  trattenute: -20,
  ritenuta: 40,
  ritenuta_fonte: "stima",
  ...over,
});
const info: PnaInfo = {
  descrizioni: { "1001": "CONTRIBUTO DI PROVA", "2001": "FONDO DI PROVA" },
  anno: {
    anno: "2030",
    al: "2030-02",
    ricavi: 700,
    una_tantum: 50,
    trattenute: -40,
    ritenuta: 80,
  },
  manuali: [],
  nota: "Nota di prova sul conto.",
};

describe("PnaBlocco", () => {
  it("shows revenue, deductions and the withholding tax kept apart from costs", async () => {
    const screen = await render(
      <PnaBlocco mese="2030-02" dati={{ mesi: { "2030-02": mese() }, info }} />,
    );
    await expect
      .element(
        screen.getByText(
          /Partite non assicurative e ritenuta di febbraio 2030/,
        ),
      )
      .toBeVisible();
    await expect.element(screen.getByText("350,00 €")).toBeVisible();
    await expect
      .element(screen.getByText(/di cui una tantum 50,00/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/imposte già versate, non è un'uscita/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/Stima: base del Prospetto Ritenute/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/Fonte: BusinessObjects/))
      .toBeVisible();
  });

  it("says when the month comes from the decade file because BO has not published it", async () => {
    const screen = await render(
      <PnaBlocco
        mese="2030-02"
        dati={{
          mesi: {
            "2030-02": mese({
              fonte: "decade",
              fonte_data: "2030-02-28",
              ritenuta_fonte: "decade",
            }),
          },
          info,
        }}
      />,
    );
    await expect
      .element(screen.getByText(/file della decade del 28\/02\/2030/))
      .toBeVisible();
    await expect.element(screen.getByText(/codice 5601/)).toBeVisible();
  });

  it("warns about codes the agent cannot classify and keeps them out of the totals", async () => {
    const screen = await render(
      <PnaBlocco
        mese="2030-02"
        dati={{
          mesi: { "2030-02": mese({ da_classificare: { "9999": 5 } }) },
          info,
        }}
      />,
    );
    await expect
      .element(
        screen.getByText(
          /Codici nuovi che l'agente non sa ancora dove mettere/,
        ),
      )
      .toBeVisible();
    await expect.element(screen.getByText("codice 9999")).toBeVisible();
  });

  it("explains a month without data", async () => {
    const screen = await render(
      <PnaBlocco mese="2030-03" dati={{ mesi: {}, info }} />,
    );
    await expect
      .element(
        screen.getByText(
          /non ha ancora pubblicato le partite non assicurative/,
        ),
      )
      .toBeVisible();
  });
});

describe("EstrattiLetti", () => {
  it("marks old statements and the ones never received", async () => {
    const screen = await render(
      <EstrattiLetti
        info={{
          soglia_giorni: 35,
          conti: [
            {
              conto: "a",
              nome: "Conto A di prova",
              ultimo: "2030-03-01",
              giorni: 2,
              stato: "ok",
            },
            {
              conto: "b",
              nome: "Conto B di prova",
              ultimo: "2030-01-01",
              giorni: 61,
              stato: "vecchio",
            },
            {
              conto: "c",
              nome: "Conto C di prova",
              ultimo: null,
              giorni: null,
              stato: "manca",
            },
          ],
        }}
      />,
    );
    await expect.element(screen.getByText(/\(61 giorni fa\)/)).toBeVisible();
    await expect.element(screen.getByText("non ancora arrivato")).toBeVisible();
    await expect
      .element(screen.getByText(/ultimo movimento 01\/03\/2030/))
      .toBeVisible();
  });
});
