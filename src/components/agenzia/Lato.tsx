import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { cn } from "@/lib/utils";

export interface VoceLato {
  chiave: string;
  titolo: string;
  elemento: ReactNode;
}

/**
 * One "side" of the dashboard (Contabilita' or Amministrazione, decision D1 of the 13/11/2026 plan): a row of tabs,
 * one per page, with the page below. The active tab is in the URL (#/contabilita/fatture) so a saved link reopens it.
 */
export const Lato = ({ base, voci }: { base: string; voci: VoceLato[] }) => {
  const { voce } = useParams();
  const attiva = voci.find((v) => v.chiave === voce) ?? voci[0];
  return (
    <div className="flex flex-col gap-2">
      <nav
        aria-label="Pagine"
        className="max-w-6xl mx-auto w-full px-4 pt-2 md:px-0 overflow-x-auto"
      >
        <div className="flex gap-1 border-b min-w-max">
          {voci.map((v) => (
            <Link
              key={v.chiave}
              to={`${base}/${v.chiave}`}
              className={cn(
                "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px no-underline",
                v.chiave === attiva.chiave
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {v.titolo}
            </Link>
          ))}
        </div>
      </nav>
      {attiva.elemento}
    </div>
  );
};

/** Common frame for the new pages: same width and phone padding as Andamento. */
export const Pagina = ({
  titolo,
  sotto,
  children,
}: {
  titolo: string;
  sotto?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full px-4 pb-28 md:px-0 md:pb-8">
    <div>
      <h1 className="text-xl font-semibold">{titolo}</h1>
      {sotto && <p className="text-sm text-muted-foreground mt-1">{sotto}</p>}
    </div>
    {children}
  </div>
);
