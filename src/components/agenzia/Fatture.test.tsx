import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Fatture } from "./Fatture";
import { perMese, unisciFatture } from "./fattureUnite";

// Invented data: real agency figures and names of people never go into the repository.
const SUB = {
  "2030-02|LAIGUEGLIA": {
    atteso: {
      imponibile: 1000,
      completo: true,
      decadi: [{ decade: "2030-02-10", totale: 1000 }],
    },
    fattura: {
      numero: "7",
      data: "2030-03-04",
      imponibile: 1000,
      ritenuta: 115,
      netto: 885,
    },
    bonifico: { data: "2030-03-06", importo: 885, conto: "222" },
    bonifico_diverso: null,
    differenze: { imponibile: 0 },
  },
  "2030-02|PROVA": {
    atteso: null,
    fattura: {
      numero: "2",
      data: "2030-03-01",
      imponibile: 300,
      ritenuta: 34.5,
      netto: 265.5,
    },
    bonifico: null,
    bonifico_diverso: null,
  },
  "2030-03|CAMPOROSSO": {
    atteso: {
      imponibile: 640,
      completo: true,
      decadi: [{ decade: "2030-03-10", totale: 640 }],
    },
    fattura: null,
    bonifico: null,
    bonifico_diverso: null,
  },
};
const BROKER = {
  "2030-02": {
    righe: [
      {
        broker: "Broker Uno",
        mese: "2030-02",
        provvigioni: 200,
        ritenuta: 9.2,
        netto: 190.8,
        tipo: "estratto",
        arrivato: "2030-02-20",
        mese_saldi: "2030-03",
        uscita_saldi: 190.8,
      },
    ],
  },
};
const BOLLETTE = [
  {
    data: "2030-02-11",
    fornitore: "Luce ufficio",
    importo: 90,
    pagata_il: null,
    stato: "da abbinare",
  },
];

const righe: Record<string, { mese: string; valori: unknown }[]> = {
  sub_fatture: Object.entries(SUB).map(([mese, valori]) => ({ mese, valori })),
  broker_saldi: Object.entries(BROKER).map(([mese, valori]) => ({
    mese,
    valori,
  })),
  bollette: [{ mese: "info", valori: { bollette: BOLLETTE } }],
  fatture: [],
  tombale: [],
};

vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: (tabella: string) => ({
      select: () => {
        if (tabella === "utile_accesso")
          return {
            limit: () =>
              Promise.resolve({ data: [{ user_id: "u1" }], error: null }),
          };
        return {
          eq: (_c: string, tipo: string) => {
            const risposta = Promise.resolve({
              data: righe[tipo] ?? [],
              error: null,
            });
            return Object.assign(risposta, { order: () => risposta });
          },
        };
      },
    }),
  }),
}));

const pagina = (indirizzo = "/fatture") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[indirizzo]}>
        <Fatture />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Fatture", () => {
  it("merges every source into one list split by month, newest month first", () => {
    const tutte = unisciFatture({
      sub: SUB,
      broker: BROKER,
      cassetto: {},
      bollette: BOLLETTE,
    });
    expect(tutte).toHaveLength(5);
    const mesi = perMese(tutte);
    expect(mesi.map((m) => m.mese)).toEqual(["2030-03", "2030-02"]);
    // the month total is the sum of its rows and the explanation says so line by line
    const marzo = mesi[0];
    expect(marzo.totale).toBe(1000 + 300 + 640);
    const calcolo = marzo.spiega.calcolo ?? [];
    expect(calcolo.at(-1)).toEqual({
      voce: "Totale del mese",
      valore: 1940,
      segno: "=",
    });
    expect(
      calcolo
        .filter((r) => r.segno === "+")
        .reduce((s, r) => s + (r.valore as number), 0),
    ).toBe(1940);
    expect(tutte.find((r) => r.fornitore === "Camporosso")?.stato).toBe(
      "da arrivare",
    );
    expect(tutte.find((r) => r.fornitore === "Prova")?.tipo).toBe(
      "collaboratori",
    );
  });

  it("opens on the full list and explains an invoice amount", async () => {
    const screen = await pagina();
    await expect
      .element(screen.getByRole("heading", { name: "Fatture" }))
      .toBeVisible();
    await expect.element(screen.getByText(/5 in tutto/)).toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: "marzo 2030" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: "febbraio 2030" }))
      .toBeVisible();
    // a tap on the amount (programmatic click = not a mouse click) opens the calculation
    const importo = screen
      .getByRole("button", {
        name: "Laigueglia, fattura di febbraio 2030: come si calcola",
      })
      .element() as HTMLButtonElement;
    importo.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
    );
    importo.click();
    await expect.element(screen.getByText("Netto da pagare")).toBeVisible();
    await expect
      .element(screen.getByText(/Bonifico del 06\/03\/2030 dal conto 222/))
      .toBeVisible();
  });

  it("filters by type and payment from the address, so a saved link reopens the same view", async () => {
    const screen = await pagina("/fatture?tipo=subagenti&stato=da%20arrivare");
    await expect.element(screen.getByText("1 di 5")).toBeVisible();
    await expect.element(screen.getByText("Camporosso")).toBeVisible();
    await expect
      .element(screen.getByText("Broker Uno"))
      .not.toBeInTheDocument();
  });

  it("searches a supplier across the months and gives its total", async () => {
    const screen = await pagina("/fatture?cerca=laigu");
    await expect.element(screen.getByText("1 di 5")).toBeVisible();
    await expect
      .element(screen.getByText(/1 fattura con "laigu", totale/))
      .toBeVisible();
    await expect
      .element(screen.getByText("Prova", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("lists the tax drawer once: copies already shown are hidden, a missing payment without the XML is to check", () => {
    const base = {
      numero: "1",
      ritenuta: null,
      imponibile: 100,
      iva: 22,
      totale: 122,
      netto: null,
    };
    const tutte = unisciFatture({
      sub: {},
      broker: {},
      cassetto: {
        "2030-04": {
          fatture: [
            {
              ...base,
              fornitore: "Copia Gia Vista",
              data: "2030-04-01",
              categoria: "broker",
              anche_in: "broker_saldi",
            },
            {
              ...base,
              fornitore: "Broker Inventato",
              data: "2030-04-02",
              categoria: "broker",
              dettaglio: "elenco",
              esito: "da verificare",
            },
            {
              ...base,
              fornitore: "Fornitore Con Iban",
              data: "2030-04-03",
              categoria: "fornitore",
              dettaglio: "xml",
              iban: "IT00X0000000000000000000001",
              modalita: "MP05",
              netto: 122,
              esito: "non ancora pagata",
            },
            {
              ...base,
              fornitore: "Professionista Inventato",
              data: "2030-04-04",
              categoria: "fornitore",
              dettaglio: "elenco",
              ritenuta: 20,
              netto: 102,
              netto_da_bonifico: true,
              esito: "pagata",
              pagamento: { conto: "257", data: "2030-04-20" },
            },
          ],
        },
      },
      bollette: [],
    });
    expect(tutte.map((r) => r.fornitore)).not.toContain("Copia Gia Vista");
    const per = Object.fromEntries(tutte.map((r) => [r.fornitore, r]));
    expect([
      per["Broker Inventato"].tipo,
      per["Broker Inventato"].stato,
    ]).toEqual(["broker", "da verificare"]);
    expect(per["Fornitore Con Iban"].stato).toBe("da pagare");
    expect(per["Professionista Inventato"].stato).toBe("pagata");
    expect(per["Professionista Inventato"].spiega.calcolo).toContainEqual({
      voce: "Ritenuta (ricavata dal bonifico)",
      valore: 20,
      segno: "-",
    });
  });

  it("a sub-agent invoice that arrived without its net amount is to check, not still to arrive", () => {
    const tutte = unisciFatture({
      sub: {
        "2030-03|CAMPOROSSO": {
          atteso: {
            imponibile: 640,
            completo: true,
            decadi: [{ decade: "2030-03-10", totale: 640 }],
          },
          fattura: {
            numero: "11",
            data: "2030-04-09",
            imponibile: 630,
            ritenuta: null,
            netto: null,
            metodo: "cassetto elenco",
          },
          bonifico: null,
          bonifico_diverso: null,
        },
      },
      broker: {},
      cassetto: {},
      bollette: [],
    });
    expect([tutte[0].stato, tutte[0].importo, tutte[0].mese]).toEqual([
      "da verificare",
      630,
      "2030-04",
    ]);
  });

  it("a bill without its direct debit yet is waiting, not unpaid", () => {
    const tutte = unisciFatture({
      sub: {},
      broker: {},
      cassetto: {},
      bollette: BOLLETTE,
    });
    expect(tutte[0].stato).toBe("da arrivare");
    expect(tutte[0].pagata).toBe("addebito non ancora arrivato");
  });
});
