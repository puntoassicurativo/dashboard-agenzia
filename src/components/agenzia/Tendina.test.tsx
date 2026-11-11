import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Tendina } from "./Tendina";

// In-memory stand-in for the utile_correzioni table and the sales names (invented data).
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  upserts: [] as Record<string, unknown>[],
}));

vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => ({
      select: () =>
        Promise.resolve({
          data:
            table === "sales"
              ? [{ user_id: "u1", first_name: "Socio", last_name: "Prova" }]
              : db.rows,
          error: null,
        }),
      upsert: (row: Record<string, unknown>) => {
        db.upserts.push(row);
        db.rows = [
          ...db.rows.filter((r) => r.chiave !== row.chiave),
          { ...row, chi: "u1", quando: "2030-05-02T08:00:00Z" },
        ];
        return Promise.resolve({ error: null });
      },
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, value: string) => {
          db.rows = db.rows.map((r) =>
            r.chiave === value ? { ...r, ...patch } : r,
          );
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

const mostra = (applicate: string[] = []) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Tendina
        chiave="257|prova|1"
        voci={["Utenze e telefonia", "Prelievo dei soci"]}
        applicate={applicate}
      />
    </QueryClientProvider>,
  );

describe("Tendina", () => {
  beforeEach(() => {
    db.rows = [];
    db.upserts = [];
  });

  it("saves the chosen category and shows who assigned it, pending the next update", async () => {
    const screen = await mostra();
    await screen.getByLabelText("Voce").selectOptions("Utenze e telefonia");
    await screen.getByLabelText("una tantum").click();
    await screen.getByRole("button", { name: "Salva" }).click();
    await expect
      .element(screen.getByText(/Assegnata a/))
      .toHaveTextContent(/Utenze e telefonia \(una tantum\) da Socio Prova/);
    await expect
      .element(screen.getByText(/In attesa del prossimo aggiornamento/))
      .toBeVisible();
    expect(db.upserts[0]).toMatchObject({
      chiave: "257|prova|1",
      voce: "Utenze e telefonia",
      una_tantum: true,
      annullata: false,
    });
    // the browser never signs the row: chi and quando are set by the database
    expect(db.upserts[0]).not.toHaveProperty("chi");
  });

  it("says when the correction is already applied and lets the user cancel it", async () => {
    db.rows = [
      {
        chiave: "257|prova|1",
        voce: "Prelievo dei soci",
        una_tantum: false,
        nota: null,
        chi: "u1",
        quando: "2030-05-02T08:00:00Z",
        annullata: false,
      },
    ];
    const screen = await mostra(["257|prova|1"]);
    await expect.element(screen.getByText(/Già nei numeri/)).toBeVisible();
    await screen.getByRole("button", { name: "Annulla" }).click();
    await expect.element(screen.getByLabelText("Voce")).toBeVisible();
  });

  it("does not save without a category", async () => {
    const screen = await mostra();
    await expect
      .element(screen.getByRole("button", { name: "Salva" }))
      .toBeDisabled();
  });
});
