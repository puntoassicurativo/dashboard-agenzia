import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

/**
 * Data access for the Contabilita' pages (andamento_blocchi, readable only by partners through RLS) and the
 * Amministrazione pages (sezione_righe, readable by everyone, "fatto" and note editable).
 */

export interface Blocchi<M, I> {
  mesi: Record<string, M>;
  info: I | null;
}

export const useBlocchi = <M, I>(tipo: string) =>
  useQuery({
    queryKey: ["andamento", tipo],
    queryFn: async (): Promise<Blocchi<M, I>> => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", tipo)
        .order("mese");
      if (error) throw error;
      const righe = (data ?? []) as { mese: string; valori: unknown }[];
      return {
        mesi: Object.fromEntries(
          righe
            .filter((r) => /^\d{4}-\d{2}$/.test(r.mese))
            .map((r) => [r.mese, r.valori as M]),
        ),
        info: (righe.find((r) => r.mese === "info")?.valori ??
          null) as I | null,
      };
    },
  });

export interface RigaLato<D> {
  sezione: string;
  chiave: string;
  gruppo: string | null;
  ordine: number | null;
  dati: D;
  attiva: boolean;
  fatto: boolean;
  nota: string | null;
  modificato_da: string | null;
  modificato_il: string | null;
}

export const useRighe = <D,>(sezione: string) =>
  useQuery({
    queryKey: ["sezione_righe", sezione],
    queryFn: async () => {
      const sb = getSupabaseClient();
      const [righe, info] = await Promise.all([
        sb
          .from("sezione_righe")
          .select("*")
          .eq("sezione", sezione)
          .eq("attiva", true)
          .order("ordine"),
        sb
          .from("sezione_info")
          .select("aggiornato_il, riepilogo")
          .eq("sezione", sezione)
          .maybeSingle(),
      ]);
      if (righe.error) throw righe.error;
      if (info.error) throw info.error;
      return {
        righe: (righe.data ?? []) as RigaLato<D>[],
        info: info.data as {
          aggiornato_il: string;
          riepilogo: Record<string, unknown> & { nota?: string };
        } | null,
      };
    },
  });

/** "Fatto" checkbox and note of an Amministrazione row, saved for everyone. */
export const FattoNota = ({ r }: { r: RigaLato<unknown> }) => {
  const qc = useQueryClient();
  const [nota, setNota] = useState(r.nota ?? "");
  const salva = useMutation({
    mutationFn: async (campi: { fatto?: boolean; nota?: string }) => {
      const { error } = await getSupabaseClient()
        .from("sezione_righe")
        .update(campi)
        .eq("sezione", r.sezione)
        .eq("chiave", r.chiave);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["sezione_righe", r.sezione] }),
  });
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm shrink-0 cursor-pointer">
          <input
            type="checkbox"
            className="size-5"
            checked={r.fatto}
            onChange={(e) => salva.mutate({ fatto: e.target.checked })}
          />
          Fatto
        </label>
        <input
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          placeholder="Nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => nota !== (r.nota ?? "") && salva.mutate({ nota })}
        />
      </div>
      {r.modificato_da && (
        <div className="text-xs text-muted-foreground">
          Ultima modifica {r.modificato_da}
        </div>
      )}
      {salva.isError && (
        <div className="text-xs text-red-700">
          Non salvato: {String((salva.error as Error | null)?.message)}
        </div>
      )}
    </div>
  );
};

/** Ready-to-paste text with a copy button (nothing is ever sent from the dashboard). */
export const TestoCopia = ({ testo }: { testo: string }) => {
  const [copiato, setCopiato] = useState(false);
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm">
      <pre className="whitespace-pre-wrap font-sans">{testo}</pre>
      <button
        type="button"
        className="mt-2 rounded-md border bg-background px-3 py-1 text-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(testo);
          setCopiato(true);
          setTimeout(() => setCopiato(false), 2000);
        }}
      >
        {copiato ? "Copiato" : "Copia"}
      </button>
    </div>
  );
};

export const SceltaMese = ({
  mesi,
  valore,
  onChange,
  nome,
}: {
  mesi: string[];
  valore: string;
  onChange: (m: string) => void;
  nome: (m: string) => string;
}) => (
  <label className="text-sm flex items-center gap-2">
    Mese
    <select
      className="rounded border bg-background px-2 py-1"
      value={valore}
      onChange={(e) => onChange(e.target.value)}
    >
      {[...mesi].reverse().map((m) => (
        <option key={m} value={m}>
          {nome(m)}
        </option>
      ))}
    </select>
  </label>
);
