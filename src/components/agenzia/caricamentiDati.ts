/**
 * Data of the "Carica file" page (simplification plan of 21/11/2026, P4, 23/11/2026). Files go into the PRIVATE Storage
 * bucket "caricamenti" (migration 20261123120000_caricamenti.sql: only users in utile_accesso can upload, list or remove a
 * pending file). The morning run (agenti\cruscotto_agenzia\caricamenti.py) brings them into the input folders and moves
 * them from "da_scaricare/" to "scaricati/". The object name carries everything the run needs, in one flat folder:
 * <tipo>__<sotto>__<AAAAMMGGhhmmss>__<file name>. Keep it in step with caricamenti.analizza().
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

export const BUCKET = "caricamenti";
export const DA = "da_scaricare";
export const FATTI = "scaricati";

export type TipoFile = "decade" | "banca" | "fatture" | "documenti";

export const TIPI_FILE: Record<TipoFile, { nome: string; cartella: string }> = {
  decade: {
    nome: "File della decade (Newage)",
    cartella: "input\\decade\\<data di chiusura>",
  },
  banca: { nome: "Estratto conto banca", cartella: "input\\banca" },
  fatture: {
    nome: "Fatture (cassetto fiscale o altro)",
    cartella: "input\\fatture\\<mese>",
  },
  documenti: {
    nome: "Altri documenti (broker, cedolini, studio)",
    cartella: "input\\documenti\\<mese>",
  },
};

const SOTTO: Record<TipoFile, RegExp> = {
  decade: /^\d{4}-\d{2}-\d{2}$/,
  banca: /^(asti|desio)$/,
  fatture: /^\d{4}-\d{2}$/,
  documenti: /^\d{4}-\d{2}$/,
};

export const MAX_BYTE = 50 * 1024 * 1024;

export interface Caricamento {
  nome: string;
  tipo: TipoFile;
  sotto: string;
  file: string;
  quando: string;
  scaricato: boolean;
  byte: number | null;
}

/** File name the run accepts: letters, digits, dot, dash, underscore, space, brackets; accents dropped. */
export const nomePulito = (nome: string): string => {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._ ()-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(-150)
    .replace(/^[^A-Za-z0-9]+/, "");
  return base || "file";
};

const ora = (d: Date): string =>
  [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ]
    .map((x, i) => String(x).padStart(i ? 2 : 4, "0"))
    .join("");

export const nomeOggetto = (
  tipo: TipoFile,
  sotto: string,
  file: string,
  quando: Date,
): string => {
  if (!SOTTO[tipo].test(sotto))
    throw new Error(`Cartella non valida per ${TIPI_FILE[tipo].nome}`);
  return `${tipo}__${sotto}__${ora(quando)}__${nomePulito(file)}`;
};

export const leggiNome = (
  nome: string,
  scaricato: boolean,
  byte: number | null = null,
): Caricamento | null => {
  const parti = nome.split("__");
  if (parti.length < 4) return null;
  const [tipo, sotto, quando, ...resto] = parti;
  if (!(tipo in SOTTO) || !SOTTO[tipo as TipoFile].test(sotto)) return null;
  return {
    nome,
    tipo: tipo as TipoFile,
    sotto,
    file: resto.join("__"),
    quando: `${quando.slice(0, 4)}-${quando.slice(4, 6)}-${quando.slice(6, 8)}T${quando.slice(8, 10)}:${quando.slice(10, 12)}`,
    scaricato,
    byte,
  };
};

const elenca = async (cartella: string, scaricato: boolean) => {
  const { data, error } = await getSupabaseClient()
    .storage.from(BUCKET)
    .list(cartella, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw error;
  return (data ?? [])
    .filter((x) => x.id)
    .map((x) =>
      leggiNome(
        x.name,
        scaricato,
        (x.metadata as { size?: number } | null)?.size ?? null,
      ),
    )
    .filter((x): x is Caricamento => x != null);
};

/** Pending and already-taken uploads (partners only: RLS gives the others an empty list). */
export const useCaricamenti = (abilitato = true) =>
  useQuery({
    queryKey: ["caricamenti"],
    enabled: abilitato,
    queryFn: async (): Promise<Caricamento[]> => {
      const [da, fatti] = await Promise.all([
        elenca(DA, false),
        elenca(FATTI, true),
      ]);
      return [...da, ...fatti];
    },
    staleTime: 60 * 1000,
  });

export const useCarica = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tipo,
      sotto,
      file,
    }: {
      tipo: TipoFile;
      sotto: string;
      file: File;
    }) => {
      if (file.size > MAX_BYTE)
        throw new Error(`${file.name}: oltre 50 MB, troppo grande`);
      const nome = nomeOggetto(tipo, sotto, file.name, new Date());
      const { error } = await getSupabaseClient()
        .storage.from(BUCKET)
        .upload(`${DA}/${nome}`, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (error) throw new Error(`${file.name}: ${error.message}`);
      return nome;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["caricamenti"] }),
  });
};

export const useTogli = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await getSupabaseClient()
        .storage.from(BUCKET)
        .remove([`${DA}/${nome}`]);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["caricamenti"] }),
  });
};
