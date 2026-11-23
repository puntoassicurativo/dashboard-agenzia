import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { PerSoci } from "./accesso";

// The answer of utile_accesso changes per test.
let risposta: { data: unknown[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};

vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({ limit: () => Promise.resolve(risposta) }),
    }),
  }),
}));

const monta = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/fatture"]}>
        <Routes>
          <Route
            path="/fatture"
            element={
              <PerSoci>
                <div>pagina dei soci</div>
              </PerSoci>
            }
          />
          <Route path="/da-fare" element={<div>pagina da fare</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("PerSoci", () => {
  it("shows a loading error instead of sending a partner to Da fare when the read fails", async () => {
    risposta = { data: null, error: { message: "Failed to fetch" } };
    const screen = await monta();
    await expect.element(screen.getByText(/Errore nel caricare/)).toBeVisible();
    expect(screen.container.textContent).not.toContain("pagina da fare");
  });

  it("opens the page for a partner", async () => {
    risposta = { data: [{ user_id: "x" }], error: null };
    const screen = await monta();
    await expect.element(screen.getByText("pagina dei soci")).toBeVisible();
  });

  it("sends a non partner to Da fare", async () => {
    risposta = { data: [], error: null };
    const screen = await monta();
    await expect.element(screen.getByText("pagina da fare")).toBeVisible();
  });
});
