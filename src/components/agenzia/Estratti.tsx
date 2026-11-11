/**
 * "Statements read" box of the Andamento page: for each bank account and for the decade file, the date of the
 * last movement the agent has read. Yellow when older than the threshold, grey when the file has never arrived.
 * Data: andamento_blocchi type "estratti", row "info" (agent, estratti.py).
 */
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

export type ContoLetto = {
  conto: string;
  nome: string;
  ultimo: string | null;
  giorni: number | null;
  stato: "ok" | "vecchio" | "manca";
};
export type InfoEstratti = { conti: ContoLetto[]; soglia_giorni: number };

const dataIt = (iso: string) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT");

const COLORE: Record<ContoLetto["stato"], string> = {
  ok: "",
  vecchio:
    "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
  manca: "bg-muted text-muted-foreground",
};

export const EstrattiLetti = ({ info }: { info: InfoEstratti }) => (
  <div className="rounded-lg border bg-card p-4 text-sm">
    <h2 className="text-base font-semibold">Estratti letti</h2>
    <p className="text-muted-foreground">
      Data dell'ultimo movimento che l'agente ha letto. In giallo quelli più
      vecchi di {info.soglia_giorni} giorni: vanno scaricati di nuovo.
    </p>
    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {info.conti.map((c) => (
        <li
          key={c.conto}
          className={`rounded border px-3 py-2 ${COLORE[c.stato]}`}
        >
          <div className="font-medium">{c.nome}</div>
          <div className="tabular-nums">
            {c.ultimo
              ? `${c.conto === "decade" ? "ultima decade" : "ultimo movimento"} ${dataIt(c.ultimo)}`
              : "non ancora arrivato"}
            {c.stato === "vecchio" && ` (${c.giorni} giorni fa)`}
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export const Estratti = () => {
  const q = useQuery({
    queryKey: ["andamento", "estratti"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("valori")
        .eq("tipo", "estratti")
        .eq("mese", "info")
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.valori ?? null) as InfoEstratti | null;
    },
  });
  if (!q.data) return null;
  return <EstrattiLetti info={q.data} />;
};
