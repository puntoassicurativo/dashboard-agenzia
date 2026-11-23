/**
 * Who is a partner (review R014/R027/R064, 23/11/2026): the user has a row in utile_accesso. A failed read is an ERROR,
 * never "not a partner": a network drop must not take the partners' menu away or send Fabio to Da fare.
 * One guard for every partners' page; the data is protected by RLS anyway.
 */
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { ErroreCaricamento } from "./ErroreCaricamento";

export const useAccessoUtile = () =>
  useQuery({
    queryKey: ["utile", "accesso"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("utile_accesso")
        .select("user_id")
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    staleTime: 10 * 60 * 1000,
  });

export const Carico = () => (
  <div className="p-4 text-muted-foreground">Carico...</div>
);

/** A partners' page: the others go to Da fare; a failed read shows the error with "Ricarica". */
export const PerSoci = ({ children }: { children: ReactNode }) => {
  const accesso = useAccessoUtile();
  if (accesso.isPending) return <Carico />;
  if (accesso.isError)
    return <ErroreCaricamento cosa="i permessi" errore={accesso.error} />;
  return accesso.data ? <>{children}</> : <Navigate to="/da-fare" replace />;
};
