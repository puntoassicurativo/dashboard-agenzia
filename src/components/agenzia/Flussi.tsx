/**
 * "Where the money goes" part of the Andamento page: money flows of the selected month and from January, grouped by
 * the node they leave (commissions, non-insurance items, other income, each bank account). From 700 px a Sankey chart,
 * below 700 px horizontal bars with the same numbers. Data: andamento_blocchi type "flussi" (agent, flussi.py), where
 * every node is checked to balance to the cent.
 */
import { ResponsiveSankey } from "@nivo/sankey";
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

export type NodoSankey = { id: string; netto: number; tipo: string };
export type DatiSankey = {
  nodes: NodoSankey[];
  links: { source: string; target: string; value: number }[];
};

const presoDal = (resta: string) =>
  resta
    .replace(/^Resta sul /, "Preso dal saldo del ")
    .replace(/^Resta su /, "Preso dal saldo di ");

/**
 * A Sankey cannot draw negative flows. A negative flow means an account paid out more than it received in the period,
 * so the difference came from its balance: the flow is reversed and the "what is left" leaf becomes a "taken from the
 * balance" source. Every node still balances, the amounts do not change. Node "netto" = what the node brings in
 * (sources) or receives (the others), shown as its label instead of the chart's own max(in, out).
 */
export const perSankey = (flussi: Flusso[]): DatiSankey => {
  const links = flussi
    .filter((f) => Math.abs(f.importo) > 0.004)
    .map((f) =>
      f.importo >= 0
        ? { source: f.da, target: f.a, value: f.importo }
        : {
            source: f.a.startsWith("Resta") ? presoDal(f.a) : f.a,
            target: f.da,
            value: -f.importo,
          },
    );
  const ids = Array.from(new Set(links.flatMap((l) => [l.source, l.target])));
  const nodes = ids.map((id) => {
    const entra = links
      .filter((l) => l.target === id)
      .reduce((t, l) => t + l.value, 0);
    const esce = links
      .filter((l) => l.source === id)
      .reduce((t, l) => t + l.value, 0);
    const tipo = id.startsWith("Resta")
      ? "resta"
      : id.startsWith("Preso dal saldo")
        ? "saldo"
        : ORIGINI.slice(0, 3).includes(id)
          ? "entrata"
          : ORIGINI.includes(id)
            ? "conto"
            : "spesa";
    return {
      id,
      tipo,
      netto: tipo === "entrata" ? esce - entra : entra > 0 ? entra : esce,
    };
  });
  return { nodes, links };
};

const COLORE: Record<string, string> = {
  entrata: "#3b6ea8",
  conto: "#6b7a8f",
  spesa: "#b5793a",
  resta: "#2e7d4f",
  saldo: "#b23b3b",
};

export const SankeyFlussi = ({ b }: { b: BloccoFlussi }) => {
  const dati = perSankey(b.flussi);
  const netto = Object.fromEntries(dati.nodes.map((n) => [n.id, n.netto]));
  // nivo animates label colours, so a CSS variable cannot be used here: plain colours for light and dark theme
  const testo = document.documentElement.classList.contains("dark")
    ? "#e6e8eb"
    : "#1f2328";
  return (
    <div style={{ height: 460 }} data-testid="sankey-flussi">
      <ResponsiveSankey
        data={dati}
        margin={{ top: 8, right: 230, bottom: 8, left: 240 }}
        align="justify"
        sort="input"
        colors={(n) => COLORE[(n as unknown as NodoSankey).tipo] ?? "#6b7a8f"}
        nodeOpacity={1}
        nodeThickness={14}
        nodeSpacing={14}
        nodeBorderWidth={0}
        linkOpacity={0.35}
        linkHoverOpacity={0.6}
        linkContract={1}
        enableLinkGradient={false}
        labelPosition="outside"
        labelPadding={8}
        label={(n) => `${n.id} ${euro(netto[n.id] ?? n.value)}`}
        animate={false}
        labelTextColor={testo}
        theme={{
          text: { fill: testo, fontSize: 11 },
        }}
        nodeTooltip={({ node }) => (
          <div className="rounded border bg-popover px-2 py-1 text-sm text-popover-foreground shadow">
            {node.id}: <strong>{euro(netto[node.id] ?? node.value)}</strong>
          </div>
        )}
        linkTooltip={({ link }) => (
          <div className="rounded border bg-popover px-2 py-1 text-sm text-popover-foreground shadow">
            {link.source.id} verso {link.target.id}:{" "}
            <strong>{euro(link.value)}</strong>
          </div>
        )}
        role="img"
        ariaLabel="Dove vanno i soldi, grafico dei flussi"
      />
    </div>
  );
};

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
        <>
          <div className="hidden min-[700px]:block">
            <p className="text-sm text-muted-foreground mb-2">
              Da sinistra a destra: da dove arrivano i soldi, su quale conto
              passano, dove finiscono. In verde quello che resta, in rosso
              quello che un conto ha preso dal suo saldo perché ha pagato più di
              quanto gli è entrato.
            </p>
            <SankeyFlussi b={b} />
          </div>
          <div className="min-[700px]:hidden">
            <FlussiBlocco
              b={b}
              titolo={
                vista === "mese"
                  ? `A ${MESI[parseInt(mese.slice(5, 7), 10) - 1]}`
                  : `Da gennaio ${anno}`
              }
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nessun dato per questo periodo.
        </p>
      )}
    </div>
  );
};
