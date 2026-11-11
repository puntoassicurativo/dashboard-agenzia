/**
 * Accountant summary of the Andamento page: for the selected month, company competences by code (month and year to
 * date), deductions, withholding taxes and hand-written values, downloaded as a CSV built in the browser from the data
 * already in Supabase (andamento_blocchi type "commercialista", agent pna.py). No external service.
 */
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

export type RigaCodice = {
  codice: string;
  descrizione: string;
  tipo: string;
  mese: number;
  progressivo: number;
};
export type Riepilogo = {
  codici: RigaCodice[];
  ricavi_mese: number;
  ricavi_progressivo: number;
  trattenute_mese: number;
  trattenute_progressivo: number;
  ritenuta_mese: number | null;
  ritenuta_fonte: string | null;
  ritenuta_progressivo: number;
  manuali: { voce: string; fino_a: string; importo: number; fonte: string }[];
  fonte: string;
  aggiornato: string;
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
const nomeMese = (m: string) =>
  `${MESI[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`;
const numero = (v: number) =>
  v.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
const euro = (v: number) =>
  v.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions);
const cella = (t: string) => `"${t.replace(/"/g, '""')}"`;

/** CSV with ";" separator and decimal commas, so it opens directly in Excel set to Italian. */
export const csvRiepilogo = (mese: string, r: Riepilogo): string => {
  const righe: string[][] = [
    [`Riepilogo per il commercialista, ${nomeMese(mese)}`],
    [`Fonte: ${r.fonte}. Aggiornato il ${r.aggiornato.slice(0, 10)}.`],
    [],
    ["Codice", "Descrizione", "Tipo", "Mese", "Da gennaio"],
    ...r.codici.map((c) => [
      c.codice,
      c.descrizione,
      c.tipo,
      numero(c.mese),
      numero(c.progressivo),
    ]),
    [],
    [
      "",
      "Totale competenze (RICAVI)",
      "",
      numero(r.ricavi_mese),
      numero(r.ricavi_progressivo),
    ],
    [
      "",
      "Trattenute della compagnia (ALTRI)",
      "",
      numero(r.trattenute_mese),
      numero(r.trattenute_progressivo),
    ],
    [
      "",
      "Ritenuta d'acconto trattenuta dalla compagnia",
      r.ritenuta_fonte ?? "",
      r.ritenuta_mese == null ? "non ancora" : numero(r.ritenuta_mese),
      numero(r.ritenuta_progressivo),
    ],
    ...r.manuali.map((m) => [
      "",
      `${m.voce} (${m.fonte})`,
      "scritto a mano",
      "",
      numero(m.importo),
    ]),
  ];
  return righe.map((x) => x.map(cella).join(";")).join("\r\n");
};

export const RiepilogoBlocco = ({
  mese,
  r,
}: {
  mese: string;
  r: Riepilogo;
}) => {
  const scarica = () => {
    const blob = new Blob(["﻿" + csvRiepilogo(mese, r)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riepilogo_commercialista_${mese}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-lg border bg-card p-4 text-sm flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        Riepilogo per il commercialista
      </h2>
      <p className="text-muted-foreground">
        Competenze della compagnia di {nomeMese(mese)} e da gennaio, codice per
        codice, con trattenute e ritenute. È il "totale competenze" che si manda
        a Mauro.
      </p>
      <ul className="tabular-nums">
        <li className="flex justify-between gap-3 border-t py-1">
          <span>Totale competenze da gennaio</span>
          <span>{euro(r.ricavi_progressivo)}</span>
        </li>
        <li className="flex justify-between gap-3 border-t py-1">
          <span>Trattenute della compagnia da gennaio</span>
          <span>{euro(r.trattenute_progressivo)}</span>
        </li>
        <li className="flex justify-between gap-3 border-t py-1">
          <span>Ritenute d'acconto da gennaio</span>
          <span>{euro(r.ritenuta_progressivo)}</span>
        </li>
      </ul>
      <button
        type="button"
        onClick={scarica}
        className="self-start rounded border px-3 py-1.5 font-medium hover:bg-muted"
      >
        Scarica il riepilogo (file per Excel)
      </button>
    </div>
  );
};

export const Commercialista = ({ mese }: { mese: string }) => {
  const q = useQuery({
    queryKey: ["andamento", "commercialista"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "commercialista");
      if (error) throw error;
      return Object.fromEntries(
        ((data ?? []) as { mese: string; valori: Riepilogo }[]).map((x) => [
          x.mese,
          x.valori,
        ]),
      ) as Record<string, Riepilogo>;
    },
  });
  const r = q.data?.[mese];
  if (!q.data) return null;
  if (!r)
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Riepilogo per il commercialista: BusinessObjects non ha ancora
        pubblicato il prospetto competenze di {nomeMese(mese)}.
      </div>
    );
  return <RiepilogoBlocco mese={mese} r={r} />;
};
