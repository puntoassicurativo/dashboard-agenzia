import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Fatture } from "./Fatture";
import {
  type FatturaCassetto,
  perMese,
  spiegaStato,
  unisciFatture,
} from "./fattureUnite";

// Invented data: real agency figures and names of people never go into the repository.
const SUB = {
  // its invoice is in the drawer: the drawer's row is the one shown, the mail only gives net amount and transfer
  "2030-02|LAIGUEGLIA": {
    atteso: {
      imponibile: 1000,
      completo: true,
      decadi: [{ decade: "2030-02-10", totale: 1000 }],
    },
    fattura: {
      numero: "7/2030",
      data: "2030-03-04",
      imponibile: 1000,
      ritenuta: 115,
      netto: 885,
    },
    bonifico: { data: "2030-03-06", importo: 885, conto: "222" },
    bonifico_diverso: null,
    nel_cassetto: true,
  },
  // expected from the decades, not in the drawer yet: "In arrivo"
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
const riga = (x: Record<string, unknown>) => ({
  broker: "Broker Uno",
  mese: "2030-02",
  provvigioni: 200,
  ritenuta: 9.2,
  netto: 190.8,
  tipo: "estratto",
  arrivato: "2030-02-20",
  mese_saldi: "2030-03",
  uscita_saldi: 190.8,
  ...x,
});
const BROKER = {
  "2030-02": {
    righe: [
      riga({ nel_cassetto: true }),
      riga({ broker: "Broker Senza Fattura", senza_fattura: true }),
      riga({ broker: "Broker Uno", mese: "2030-03", arrivato: "2030-03-25" }),
    ],
  },
};
const BOLLETTE = [
  {
    data: "2030-02-11",
    fornitore: "Luce ufficio",
    importo: 90,
    pagata_il: "2030-03-01",
    stato: "pagata",
    nel_cassetto: true,
  },
];
const base = {
  ritenuta: null,
  imponibile: 100,
  iva: 22,
  totale: 122,
  netto: null,
  dettaglio: "elenco" as const,
};
const CASSETTO: Record<string, { fatture: FatturaCassetto[] }> = {
  "2030-03": {
    fatture: [
      {
        ...base,
        fornitore: "Ge.ma Inventata",
        numero: "7",
        data: "2030-03-04",
        categoria: "subagente",
        imponibile: 1002,
        iva: 0,
        totale: 1002,
        netto: 885,
        ritenuta: 117,
        netto_da: "mail",
        stato: "pagata",
        pagato_con: "bonifico",
        fonte: { tipo: "sub_fatture" },
        pagamento: { conto: "222", data: "2030-03-06", importo: 885 },
      },
      {
        ...base,
        fornitore: "Telepass Inventato",
        numero: "T1",
        data: "2030-03-01",
        totale: 4.76,
        carta: true,
        stato: "pagata",
        pagato_con: "carta",
        pagamento: { conto: "257", data: "2030-04-15", importo: 400 },
      },
    ],
  },
  "2030-02": {
    fatture: [
      {
        ...base,
        fornitore: "Broker Uno Spa",
        numero: "B1",
        data: "2030-02-20",
        categoria: "broker",
        imponibile: 200,
        iva: 0,
        totale: 200,
        netto: 190.8,
        ritenuta: 9.2,
        netto_da: "estratto del broker",
        stato: "pagata",
        pagato_con: "saldi",
        pagamento: { conto: "Saldi", data: "2030-03", importo: 190.8 },
      },
      {
        ...base,
        fornitore: "Luce Inventata Spa",
        numero: "E1",
        data: "2030-02-10",
        totale: 90,
        stato: "pagata",
        pagato_con: "addebito",
        pagamento: { conto: "257", data: "2030-03-01", importo: 90 },
      },
      {
        ...base,
        fornitore: "Cancelleria Inventata",
        numero: "C1",
        data: "2030-02-05",
        stato: "da verificare",
      },
    ],
  },
};
const FISSE = [
  {
    mese: "2030-03",
    data: "2030-03-01",
    fornitore: "Affitto Inventato",
    dettaglio: "affitto dei locali",
    importo: 688,
    stato: "pagata" as const,
    pagamento: { conto: "257", data: "2030-03-02", importo: 688 },
  },
];

const righe: Record<string, { mese: string; valori: unknown }[]> = {
  sub_fatture: Object.entries(SUB).map(([mese, valori]) => ({ mese, valori })),
  broker_saldi: Object.entries(BROKER).map(([mese, valori]) => ({
    mese,
    valori,
  })),
  bollette: [{ mese: "info", valori: { bollette: BOLLETTE } }],
  fatture: Object.entries(CASSETTO).map(([mese, valori]) => ({ mese, valori })),
  fatture_fisse: [{ mese: "info", valori: { righe: FISSE } }],
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

const fonti = () => ({
  sub: SUB,
  broker: BROKER,
  cassetto: CASSETTO,
  bollette: BOLLETTE,
  fisse: FISSE,
});

describe("Fatture", () => {
  it("lists the tax drawer only: mail, statements and bills already in the drawer are not repeated", () => {
    const { elenco, inArrivo } = unisciFatture(fonti());
    // 5 drawer invoices + the rent + the broker that never sends an invoice
    expect(elenco.map((r) => r.fornitore).sort()).toEqual([
      "Affitto Inventato",
      "Broker Senza Fattura",
      "Broker Uno Spa",
      "Cancelleria Inventata",
      "Ge.ma Inventata",
      "Luce Inventata Spa",
      "Telepass Inventato",
    ]);
    // the sub-agent expected from the decades and the statement without its invoice yet
    expect(inArrivo.map((r) => [r.fornitore, r.stato])).toEqual([
      ["Camporosso", "da arrivare"],
      ["Broker Uno", "pagata"],
    ]);
    // the drawer's amount (stamp inside), net and transfer from the mail
    const sub = elenco.find((r) => r.fornitore === "Ge.ma Inventata");
    expect([sub?.importo, sub?.ritenuta, sub?.stato, sub?.tipo]).toEqual([
      1002,
      117,
      "pagata",
      "subagenti",
    ]);
  });

  it("each month total is the sum of its rows, said line by line", () => {
    const mesi = perMese(unisciFatture(fonti()).elenco);
    expect(mesi.map((m) => m.mese)).toEqual(["2030-03", "2030-02"]);
    const marzo = mesi[0];
    expect(marzo.totale).toBe(1002 + 4.76 + 688);
    const calcolo = marzo.spiega.calcolo ?? [];
    expect(calcolo.at(-1)?.valore).toBe(marzo.totale);
    expect(
      Math.round(
        calcolo
          .filter((r) => r.segno === "+")
          .reduce((s, r) => s + (r.valore as number), 0) * 100,
      ) / 100,
    ).toBe(marzo.totale);
  });

  it("the count of a status is the total of its list", () => {
    const elenco = unisciFatture(fonti()).elenco;
    const s = spiegaStato(elenco, "da verificare");
    expect(s.calcolo?.[0]).toEqual({
      voce: "1 fatture",
      valore: 122,
      segno: "=",
    });
    expect(s.elenco?.totale).toEqual(["Totale", 122]);
  });

  it("a card invoice says it is paid with the Nexi debit of the month after", () => {
    const carta = unisciFatture(fonti()).elenco.find(
      (r) => r.fornitore === "Telepass Inventato",
    );
    expect(carta?.pagata).toBe("carta 15/04/2030");
    expect(carta?.spiega.cosa).toMatch(
      /totale della carta, non questa fattura/,
    );
    expect(carta?.spiega.calcolo).toContainEqual({
      voce: "Addebito delle carte Nexi del 15/04/2030 (totale della carta)",
      valore: 400,
    });
  });

  it("opens on the list with In arrivo apart and explains an invoice amount", async () => {
    const screen = await pagina();
    await expect
      .element(screen.getByRole("heading", { name: "Fatture" }))
      .toBeVisible();
    await expect.element(screen.getByText(/7 in tutto/)).toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: "In arrivo" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: "marzo 2030" }))
      .toBeVisible();
    const importo = screen
      .getByRole("button", {
        name: "Ge.ma Inventata, n. 7: come si calcola",
      })
      .element() as HTMLButtonElement;
    importo.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
    );
    importo.click();
    await expect.element(screen.getByText("Netto da pagare")).toBeVisible();
    await expect
      .element(screen.getByText(/Pagata il 06\/03\/2030 dal conto 222/))
      .toBeVisible();
  });

  it("filters by type, status and month from the address, so a saved link reopens the same view", async () => {
    const screen = await pagina("/fatture?tipo=fornitori&stato=pagata");
    await expect.element(screen.getByText("3 di 7")).toBeVisible();
    await expect
      .element(screen.getByText("Cancelleria Inventata"))
      .not.toBeInTheDocument();
    await screen
      .getByRole("combobox", { name: "Mese" })
      .selectOptions("2030-02");
    await expect.element(screen.getByText("1 di 7")).toBeVisible();
    await expect.element(screen.getByText("Luce Inventata Spa")).toBeVisible();
  });

  it("searches a supplier across the months and gives its total", async () => {
    const screen = await pagina("/fatture?cerca=telepass");
    await expect.element(screen.getByText("1 di 7")).toBeVisible();
    await expect
      .element(screen.getByText(/1 fattura con "telepass", totale/))
      .toBeVisible();
  });

  it("rows written before 24/11/2026 (no status from the backend) keep the old rule", () => {
    const { elenco } = unisciFatture({
      sub: {},
      broker: {},
      bollette: [],
      cassetto: {
        "2030-04": {
          fatture: [
            {
              ...base,
              fornitore: "Fornitore Con Iban",
              numero: "1",
              data: "2030-04-03",
              categoria: "fornitore",
              dettaglio: "xml",
              modalita: "MP05",
              netto: 122,
              esito: "non ancora pagata",
            },
            {
              ...base,
              fornitore: "Professionista Inventato",
              numero: "2",
              data: "2030-04-04",
              categoria: "fornitore",
              ritenuta: 20,
              netto: 102,
              netto_da_bonifico: true,
              esito: "pagata",
              pagamento: { conto: "257", data: "2030-04-20" },
            },
            {
              ...base,
              fornitore: "Broker Inventato",
              numero: "3",
              data: "2030-04-02",
              categoria: "broker",
              esito: "da verificare",
            },
          ],
        },
      },
    });
    const per = Object.fromEntries(elenco.map((r) => [r.fornitore, r]));
    expect(per["Fornitore Con Iban"].stato).toBe("da pagare");
    expect(per["Broker Inventato"].stato).toBe("da verificare");
    expect(per["Professionista Inventato"].stato).toBe("pagata");
    expect(per["Professionista Inventato"].spiega.calcolo).toContainEqual({
      voce: "Ritenuta (ricavata dal bonifico)",
      valore: 20,
      segno: "-",
    });
  });
});
