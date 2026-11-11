/**
 * Category picker of the Andamento page: an authorized partner assigns a category to a bank movement.
 * The choice goes to the utile_correzioni table (RLS: only users in utile_accesso; "chi" and "quando" are set
 * by the database). The agent applies it on its morning run, before its own rules.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

export type Correzione = {
  chiave: string;
  voce: string;
  una_tantum: boolean;
  nota: string | null;
  chi: string;
  quando: string;
  annullata: boolean;
};

export const useCorrezioni = () =>
  useQuery({
    queryKey: ["andamento", "correzioni"],
    queryFn: async () => {
      const sb = getSupabaseClient();
      const [c, s] = await Promise.all([
        sb.from("utile_correzioni").select("*"),
        sb.from("sales").select("user_id, first_name, last_name"),
      ]);
      if (c.error) throw c.error;
      const nomi = new Map(
        (
          (s.data ?? []) as {
            user_id: string;
            first_name: string;
            last_name: string;
          }[]
        ).map((x) => [
          x.user_id,
          `${x.first_name ?? ""} ${x.last_name ?? ""}`.trim(),
        ]),
      );
      const attive = new Map(
        ((c.data ?? []) as Correzione[])
          .filter((x) => !x.annullata)
          .map((x) => [x.chiave, x]),
      );
      return { attive, nomi };
    },
  });

const useSalva = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      chiave: string;
      voce?: string;
      una_tantum?: boolean;
      nota?: string | null;
      annullata: boolean;
    }) => {
      const sb = getSupabaseClient();
      const { error } = r.annullata
        ? await sb
            .from("utile_correzioni")
            .update({ annullata: true })
            .eq("chiave", r.chiave)
        : await sb
            .from("utile_correzioni")
            .upsert({ ...r, annullata: false }, { onConflict: "chiave" });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["andamento", "correzioni"] }),
  });
};

const dataOra = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const Tendina = ({
  chiave,
  voci,
  applicate,
  proposta,
}: {
  chiave: string;
  voci: string[];
  applicate: string[];
  proposta?: string;
}) => {
  const { data } = useCorrezioni();
  const salva = useSalva();
  const [voce, setVoce] = useState(proposta ?? "");
  const [unaTantum, setUnaTantum] = useState(false);
  const [nota, setNota] = useState("");
  const c = data?.attive.get(chiave);

  if (c)
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>
          Assegnata a <strong>{c.voce}</strong>
          {c.una_tantum ? " (una tantum)" : ""} da{" "}
          {data?.nomi.get(c.chi) || "un socio"} il {dataOra(c.quando)}
          {c.nota ? `: ${c.nota}` : ""}.{" "}
          <span className="text-muted-foreground">
            {applicate.includes(chiave)
              ? "Già nei numeri."
              : "In attesa del prossimo aggiornamento (ogni mattina)."}
          </span>
        </span>
        <button
          type="button"
          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          disabled={salva.isPending}
          onClick={() => salva.mutate({ chiave, annullata: true })}
        >
          Annulla
        </button>
      </div>
    );

  return (
    <form
      className="mt-1 flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!voce) return;
        salva.mutate({
          chiave,
          voce,
          una_tantum: unaTantum,
          nota: nota.trim() || null,
          annullata: false,
        });
      }}
    >
      <select
        aria-label="Voce"
        className="max-w-full rounded border bg-background px-2 py-1"
        value={voce}
        onChange={(e) => setVoce(e.target.value)}
      >
        <option value="">Scegli la voce...</option>
        {voci.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={unaTantum}
          onChange={(e) => setUnaTantum(e.target.checked)}
        />
        una tantum
      </label>
      <input
        aria-label="Nota"
        className="min-w-0 flex-1 rounded border bg-background px-2 py-1"
        placeholder="nota (facoltativa)"
        maxLength={300}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />
      <button
        type="submit"
        className="rounded bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
        disabled={!voce || salva.isPending}
      >
        Salva
      </button>
      {salva.isError && (
        <span className="text-red-700">
          Non salvato: {String((salva.error as Error).message)}
        </span>
      )}
    </form>
  );
};
