/**
 * "Where the money goes" part of the Andamento page: money flows of the selected month and from January, grouped by
 * the node they leave (commissions, non-insurance items, other income, each bank account). Shown as horizontal bars,
 * readable on a phone too. Data: andamento_blocchi type "flussi" (agent, flussi.py), where every node is checked to
 * balance to the cent.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

export type Flusso = { da: string; a: string; importo: number };
export type BloccoFlussi = {
  flussi: Flusso[];
  controllo: { sinistra: number; resta: number; chiude: boolean };
};

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
const euro = (v: number) =>
  v.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions);

const ORIGINI = [
  "Provvigioni maturate",
  "Partite non assicurative",
  "Altre entrate",
  "Conto gestionale 257",
  "Banco Desio",
  "Conto premi",
];

export const useBlocchiFlussi = () =>
  useQuery({
    queryKey: ["andamento", "flussi"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "flussi");
      if (error) throw error;
      return Object.fromEntries(
        ((data ?? []) as { mese: string; valori: BloccoFlussi }[]).map((r) => [
          r.mese,
          r.valori,
        ]),
      ) as Record<string, BloccoFlussi>;
    },
  });

export const FlussiBlocco = ({
  b,
  titolo,
}: {
  b: BloccoFlussi;
  titolo: string;
}) => {
  const massimo = Math.max(...b.flussi.map((f) => f.importo), 1);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {titolo}: entrano {euro(b.controllo.sinistra)}, restano{" "}
        {euro(b.controllo.resta)} (è l'utile dell'agenzia). I prelievi dei soci
        e le rate dei mutui si pagano da quello che resta.
      </p>
      {ORIGINI.filter((o) => b.flussi.some((f) => f.da === o)).map((o) => (
        <div key={o}>
          <div className="text-sm font-medium">
            {o}{" "}
            <span className="text-muted-foreground font-normal">
              (
              {euro(
                b.flussi
                  .filter((f) => f.da === o)
                  .reduce((s, f) => s + f.importo, 0),
              )}
              )
            </span>
          </div>
          <ul className="mt-1 flex flex-col gap-1">
            {b.flussi
              .filter((f) => f.da === o)
              .sort((x, y) => y.importo - x.importo)
              .map((f) => (
                <li key={f.a} className="text-sm">
                  <div className="flex justify-between gap-3 tabular-nums">
                    <span className="min-w-0">va a {f.a}</span>
                    <span className="whitespace-nowrap">{euro(f.importo)}</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div
                      className={`h-2 rounded ${f.a.startsWith("Resta") ? "bg-green-700 dark:bg-green-500" : "bg-primary/60"}`}
                      style={{ width: `${(f.importo / massimo) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const Flussi = ({ mese }: { mese: string }) => {
  const q = useBlocchiFlussi();
  const [vista, setVista] = useState<"mese" | "anno">("mese");
  if (!q.data) return null;
  const anno = mese.slice(0, 4);
  const b = vista === "mese" ? q.data[mese] : q.data[anno];
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Dove vanno i soldi</h2>
        <div className="flex gap-1 text-sm">
          {(["mese", "anno"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={`rounded border px-2 py-1 ${vista === v ? "bg-primary text-primary-foreground" : ""}`}
            >
              {v === "mese"
                ? MESI[parseInt(mese.slice(5, 7), 10) - 1]
                : `da gennaio ${anno}`}
            </button>
          ))}
        </div>
      </div>
      {b ? (
        <FlussiBlocco
          b={b}
          titolo={
            vista === "mese"
              ? `A ${MESI[parseInt(mese.slice(5, 7), 10) - 1]}`
              : `Da gennaio ${anno}`
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Nessun dato per questo periodo.
        </p>
      )}
    </div>
  );
};
