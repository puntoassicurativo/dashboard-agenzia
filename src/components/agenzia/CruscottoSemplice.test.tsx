import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { CruscottoDettaglio } from "./CruscottoDettaglio";
import { Cruscotto } from "./CruscottoSemplice";

// Invented data: real agency figures never go into the repository.
const delta = (np: number, ann: number, npP: number, annP: number) => ({
  np,
  ann,
  delta: np + ann,
  np_pezzi: npP,
  ann_pezzi: annP,
  delta_pezzi: npP - annP,
});
const d = delta(100, -40, 3, 1);
const linea = { mese: d, mese_ap: d, ytd: d, ytd_ap: d };
const mese = {
  mese: "2030-02",
  fino_al: "2030-02-10",
  parziale: true,
  provv: 500,
  provv_ap: 400,
  differenza: 100,
  cresc: 25,
  incassi_auto: 0,
  incassi_re: 0,
  incassi_auto_ap: 0,
  incassi_re_ap: 0,
  delta_auto: d,
  delta_auto_ap: d,
  delta_re: d,
  delta_re_ap: d,
  provv_linee: {
    auto: { provv: 300, titoli: 5 },
    re: { provv: 200, titoli: 2 },
  },
  provv_linee_ap: { auto: { provv: 400, titoli: 6 } },
};
const RIGA = {
  data_dati: "2030-02-10",
  aggiornato_il: "2030-02-11T06:40:00Z",
  avvisi: null,
  mensile: [],
  valori: {
    provvigioni: {
      mese: "2030-02",
      valore: 500,
      ap: 400,
      cresc: 25,
      ultimo_mese_chiuso: null,
    },
    avanzo: {
      valore: -50,
      data: "2030-02-09",
      descrizione: "",
      prec_valore: 100,
      prec_data: "2030-01-09",
    },
    incassi: {
      auto: 1000,
      re: 500,
      totale: 1500,
      auto_ap: 900,
      re_ap: 500,
      totale_ap: 1400,
      cresc_auto: 11.11,
      cresc_re: 0,
      cresc_totale: 7.14,
    },
    delta_auto: linea,
    delta_re: linea,
    mesi: [mese],
  },
};
const AVANZO = {
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
      descrizione: "rimessa di prova",
      entrata: 30,
      uscita: 0,
      saldo: 130,
    },
    {
      data: "2030-02-09",
      descrizione: "bonifico di prova",
      entrata: 0,
      uscita: 180,
      saldo: -50,
    },
  ],
};

vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: (tabella: string) => ({
      select: () => {
        const risposta = (data: unknown[]) => {
          const p = Promise.resolve({ data, error: null });
          return Object.assign(p, {
            order: () => Object.assign(p, { limit: () => p }),
            limit: () => p,
          });
        };
        if (tabella === "cruscotto")
          return {
            order: () => ({
              limit: () => Promise.resolve({ data: [RIGA], error: null }),
            }),
          };
        if (tabella === "utile_accesso")
          return { limit: () => Promise.resolve({ data: [], error: null }) };
        return {
          eq: (_c: string, tipo: string) =>
            risposta(
              tipo === "avanzo" ? [{ mese: "info", valori: AVANZO }] : [],
            ),
        };
      },
    }),
  }),
}));

const Indietro = () => {
  const vai = useNavigate();
  return (
    <button type="button" onClick={() => vai(-1)}>
      indietro di prova
    </button>
  );
};

const app = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Cruscotto />} />
          <Route
            path="/cruscotto/:voce"
            element={
              <>
                <Indietro />
                <CruscottoDettaglio />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Cruscotto semplice", () => {
  it("shows one number per tile and a tile opens its detail page", async () => {
    const screen = await app();
    await expect
      .element(screen.getByText("Provvigioni di febbraio fino al 10"))
      .toBeVisible();
    await screen.getByText("Saldo del conto premi").click();
    await expect
      .element(screen.getByRole("link", { name: "‹ Cruscotto" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("heading", {
          name: "Saldo del conto premi",
          level: 1,
        }),
      )
      .toBeVisible();
    // the movements behind the surplus are written out on the detail page
    await expect.element(screen.getByText(/rimessa di prova/)).toBeVisible();
    await expect
      .element(
        screen.getByText(
          "Saldo di partenza + entrate - uscite = saldo di oggi.",
        ),
      )
      .toBeVisible();
  });

  it("a click on the number opens its list and stays on the main page", async () => {
    const screen = await app();
    await screen
      .getByRole("button", {
        name: /^Provvigioni dal 1 al 10 febbraio 2030: come si calcola/,
      })
      .click();
    await expect
      .element(screen.getByRole("heading", { name: /ramo per ramo/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "‹ Cruscotto" }))
      .not.toBeInTheDocument();
  });

  it("one Back after Dettagli returns to the Cruscotto (review R041)", async () => {
    const screen = await app();
    await screen
      .getByRole("link", { name: "Saldo del conto premi: apri il dettaglio" })
      .click();
    await screen.getByText("indietro di prova").click();
    await expect
      .element(screen.getByText("Provvigioni di febbraio fino al 10"))
      .toBeVisible();
  });
});
