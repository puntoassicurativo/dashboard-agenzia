import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { MeseVirtuoso, type SaldiMese } from "./MeseVirtuoso";

// Invented data: real agency figures never go into the repository.
const base: SaldiMese = {
  provvigioni: 1000,
  bo_provvigioni: 990,
  diff_bo: 10,
  girato_asti: 600,
  girato_desio: 200,
  broker: 100,
  broker_dettaglio: { "ab broker": 70, uiafin: 30 },
  una_tantum: 0,
  altre_uscite: 0,
  tot_uscite: 900,
  avanzo: 160,
  avanzo_da_gennaio: -50,
  saldo_conto_premi: 1234.56,
  altre_entrate: [
    {
      riga: 9,
      data: "2030-03-20",
      importo: 25,
      descrizione: "entrata di prova",
    },
  ],
  uscite_altro: [],
  parziale: false,
  al: null,
  controlli_bo: [
    {
      data: "2030-03-10",
      righe: [5],
      saldi_c: 110,
      saldi_h_i: 100,
      bo: 100,
      diff_c: 10,
      tipo: "refuso_c",
    },
  ],
  avanzo_solo_saldi: 100,
  avanzo_provvisorio: false,
  mv_provv: { valore: 990, fonte: "bo", saldi: 1000, diff: 10 },
  mv_girato: {
    valore: 780,
    fonte: "banca",
    saldi: 800,
    saldi_asti: 600,
    saldi_desio: 200,
    asti: 580,
    asti_lordo: 600,
    ritorni: 20,
    desio: 200,
    diff: 20,
  },
  mv_pna: {
    valore: 50,
    rimesse: [{ data: "2030-03-08", importo: 50 }],
    riferita_a: "2030-02",
    decade: 50,
    diff_decade: 0,
  },
  banca: {
    saldi_asti: 600,
    banca_222_257: 600,
    saldi_desio: 200,
    banca_222_desio: 150,
    banca_desio_interni: 50,
    parziale: false,
    solo_saldi: [],
    solo_banca: [],
    scritto_su_altro_conto: [],
    dal_222_ai_soci: [],
  },
};
const negativo: SaldiMese = {
  ...base,
  una_tantum: 300,
  tot_uscite: 1200,
  avanzo: -200,
  uscite_altro: [
    {
      riga: 12,
      data: "2030-02-28",
      importo: 300,
      descrizione: "uscita una tantum",
      sottotipo: "una_tantum",
    },
  ],
  avanzo_solo_saldi: undefined,
  avanzo_provvisorio: undefined,
  mv_provv: undefined,
  mv_girato: undefined,
  mv_pna: undefined,
  controlli_bo: [],
  altre_entrate: [],
};
const provvisorio: SaldiMese = {
  ...base,
  avanzo: 110,
  avanzo_provvisorio: true,
  mv_pna: {
    valore: null,
    rimesse: [],
    riferita_a: "2030-03",
    motivo:
      "rimessa non ancora arrivata, estratto Banco Desio fino al 2030-04-05",
  },
};

const righe = [
  { mese: "2030-02", valori: negativo, aggiornato_il: "2030-04-02T06:30:00Z" },
  { mese: "2030-03", valori: base, aggiornato_il: "2030-04-02T06:30:00Z" },
  {
    mese: "2030-04",
    valori: provvisorio,
    aggiornato_il: "2030-04-02T06:30:00Z",
  },
  {
    mese: "info",
    valori: { ultimo_giorno: "2030-04-01", bo_aggiornato: "2030-04-02" },
    aggiornato_il: "2030-04-02T06:30:00Z",
  },
];

vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: righe, error: null }),
        }),
      }),
    }),
  }),
}));

const mostra = (mese: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MeseVirtuoso mese={mese} />
    </QueryClientProvider>,
  );

describe("MeseVirtuoso", () => {
  it("shows a month with a positive surplus and its figures", async () => {
    const screen = await mostra("2030-03");
    await expect
      .element(
        screen.getByRole("heading", { name: "Il mese è stato virtuoso?" }),
      )
      .toBeVisible();
    await expect.element(screen.getByText("Sì", { exact: true })).toBeVisible();
    await expect
      .element(
        screen.getByText(
          /A marzo le provvigioni sono state 990 euro e le partite non assicurative 50/,
        ),
      )
      .toBeVisible();
    await expect.element(screen.getByText(/AB broker 70,00\s€/)).toBeVisible();
    await expect
      .element(
        screen.getByText("Saldo del conto premi a fine mese (foglio Saldi)"),
      )
      .toBeVisible();
    await expect.element(screen.getByText(/non sono un ricavo/)).toBeVisible();
  });

  it("uses BO for commissions and shows the gap with the Saldi sheet", async () => {
    const screen = await mostra("2030-03");
    await expect
      .element(
        screen.getByText(/Foglio Saldi: 1\.000,00\s€, differenza 10,00\s€/),
      )
      .toBeVisible();
  });

  it("uses the bank for transfers, net of the returns to the premium account", async () => {
    const screen = await mostra("2030-03");
    await expect
      .element(
        screen.getByText(
          /Asti 580,00\s€, Desio 200,00\s€ \(Asti 600,00\s€ meno 20,00\s€ tornati al conto premi\)\. Foglio Saldi: 800,00\s€, differenza 20,00\s€/,
        ),
      )
      .toBeVisible();
  });

  it("shows the non-insurance remittance and the surplus that includes it", async () => {
    const screen = await mostra("2030-03");
    await expect
      .element(
        screen.getByText(
          /rimessa del 08\/03\/2030, riferita a febbraio\. Uguale al saldo della decade/,
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByText(/Col solo foglio Saldi: 100,00\s€/))
      .toBeVisible();
  });

  it("marks the surplus as provisional when the remittance is not in yet", async () => {
    const screen = await mostra("2030-04");
    await expect
      .element(
        screen.getByText(/Provvisorio: mancano le partite non assicurative/),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByText(/non ancora disponibile: rimessa non ancora arrivata/),
      )
      .toBeVisible();
  });

  it("shows a negative month in red, with the one-off outflow without details", async () => {
    const screen = await mostra("2030-02");
    await expect.element(screen.getByText("No", { exact: true })).toBeVisible();
    await expect
      .element(screen.getByText(/di cui 300 di uscita una tantum/))
      .toBeVisible();
    await expect.element(screen.getByText(/uscita una tantum$/)).toBeVisible();
    expect(screen.container.textContent?.toLowerCase()).not.toMatch(
      /gruzzolet/,
    );
  });

  it("falls back to the Saldi sheet and says so when the sources are missing", async () => {
    const screen = await mostra("2030-02");
    await expect
      .element(screen.getByText("dal foglio Saldi, BO non ancora disponibile"))
      .toBeVisible();
    await expect
      .element(
        screen.getByText(
          /Dal foglio Saldi: estratto conto non ancora caricato/,
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByText("estratto Banco Desio non letto"))
      .toBeVisible();
  });

  it("opens the checks and explains the typo", async () => {
    const screen = await mostra("2030-03");
    await screen.getByText("Controlli sul foglio Saldi").click();
    await expect
      .element(
        screen.getByText(/probabile refuso nella colonna delle provvigioni/),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByText(/Verso Desio: foglio 200,00\s€,\s+banca\s+200,00\s€/),
      )
      .toBeVisible();
  });

  it("says when the month has no data", async () => {
    const screen = await mostra("2029-01");
    await expect
      .element(screen.getByText(/non ci sono ancora i dati del foglio Saldi/))
      .toBeVisible();
  });
});
