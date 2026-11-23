/**
 * Final menu of the simplification plan of 21/11/2026 (P4, 23/11/2026): partners see Cruscotto, Fatture, Utile e costi, Tasse,
 * Carica file; everyone sees Da fare. The old addresses (saved links, phone home icons) open the new pages; the old pages stay
 * in the code until the new ones are tried.
 */
import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { useAccessoUtile } from "./Andamento";
import { Cruscotto } from "./CruscottoSemplice";

const Carico = () => <div className="p-4 text-muted-foreground">Carico...</div>;

/** Home: the Cruscotto for the partners, Da fare for everyone else. */
export const Inizio = () => {
  const accesso = useAccessoUtile();
  if (accesso.isPending) return <Carico />;
  return accesso.data ? <Cruscotto /> : <Navigate to="/da-fare" replace />;
};

/** A partners' page: the others go to Da fare (the data is protected by RLS anyway). */
export const PerSoci = ({ children }: { children: ReactNode }) => {
  const accesso = useAccessoUtile();
  if (accesso.isPending) return <Carico />;
  return accesso.data ? <>{children}</> : <Navigate to="/da-fare" replace />;
};

/** Where each old tab of Contabilita' went. */
export const DA_CONTABILITA: Record<string, string> = {
  andamento: "/utile-costi",
  personale: "/utile-costi/personale",
  ritenute: "/utile-costi/ritenute",
  mutui: "/utile-costi/mutui",
  studio: "/tasse/studio",
  "simula-tasse": "/tasse/simula-tasse",
  "tutte-le-fatture": "/fatture",
  fatture: "/fatture",
};

/** Where each old tab of Amministrazione went (soci = partners' page, tutti = everyone else). */
export const DA_AMMINISTRAZIONE: Record<
  string,
  { soci: string; tutti: string }
> = {
  scadenze: {
    soci: "/da-fare?lista=scadenze",
    tutti: "/da-fare?lista=scadenze",
  },
  sezioni: { soci: "/da-fare", tutti: "/da-fare" },
  decadi: { soci: "/da-fare?lista=decadi", tutti: "/da-fare?lista=decadi" },
  "fatture-subagenti": {
    soci: "/fatture?tipo=subagenti",
    tutti: "/da-fare?lista=decadi",
  },
  broker: { soci: "/utile-costi/broker", tutti: "/da-fare" },
  condizioni: {
    soci: "/da-fare?lista=condizioni",
    tutti: "/da-fare?lista=condizioni",
  },
};

export const VecchiaContabilita = () => {
  const { voce = "" } = useParams();
  return <Navigate to={DA_CONTABILITA[voce] ?? "/utile-costi"} replace />;
};

export const VecchiaAmministrazione = () => {
  const { voce = "" } = useParams();
  const accesso = useAccessoUtile();
  if (accesso.isPending) return <Carico />;
  const dove = DA_AMMINISTRAZIONE[voce];
  return (
    <Navigate
      to={dove ? (accesso.data ? dove.soci : dove.tutti) : "/da-fare"}
      replace
    />
  );
};

export const VecchiaSezione = () => {
  const { lettera = "" } = useParams();
  return (
    <Navigate
      to={lettera ? `/da-fare?lista=${lettera.toUpperCase()}` : "/da-fare"}
      replace
    />
  );
};
