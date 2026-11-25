import { Link, matchPath, useLocation } from "react-router";

import { cn } from "@/lib/utils";
import { useAccessoUtile } from "./accesso";

export type GruppoMenu = "Agenzia" | "Conti" | "Lavoro";

export interface VoceMenu {
  titolo: string;
  to: string;
  attiva: (path: string) => boolean;
  soloSoci?: boolean;
  gruppo: GruppoMenu;
}

const sotto = (base: string) => (p: string) =>
  p === base || !!matchPath(`${base}/*`, p);

/**
 * Final menu (simplification plan of 21/11/2026, P4, 23/11/2026). The phone bar has the same entries.
 * 25/11/2026 (Cruscotto proposal, step 5): groups say what is inside (Agenzia, Conti, Lavoro), not who sees them;
 * who sees what is unchanged (soloSoci).
 */
export const VOCI_MENU: VoceMenu[] = [
  // Lorenzo 22/11/2026 (night): the dashboard opens on the Cruscotto, first entry; Fatture right after, on its own
  {
    titolo: "Cruscotto",
    to: "/",
    soloSoci: true,
    gruppo: "Agenzia",
    attiva: (p) => p === "/" || !!matchPath("/cruscotto/*", p),
  },
  {
    titolo: "Fatture",
    to: "/fatture",
    soloSoci: true,
    gruppo: "Conti",
    attiva: sotto("/fatture"),
  },
  {
    titolo: "Utile e costi",
    to: "/utile-costi",
    soloSoci: true,
    gruppo: "Conti",
    attiva: sotto("/utile-costi"),
  },
  {
    titolo: "Tasse",
    to: "/tasse",
    soloSoci: true,
    gruppo: "Conti",
    attiva: sotto("/tasse"),
  },
  {
    titolo: "Da fare",
    to: "/da-fare",
    gruppo: "Lavoro",
    attiva: sotto("/da-fare"),
  },
  {
    titolo: "Carica file",
    to: "/carica-file",
    soloSoci: true,
    gruppo: "Lavoro",
    attiva: sotto("/carica-file"),
  },
];

const GRUPPI: { titolo: GruppoMenu; voci: VoceMenu[] }[] = (
  ["Agenzia", "Conti", "Lavoro"] as const
).map((g) => ({ titolo: g, voci: VOCI_MENU.filter((v) => v.gruppo === g) }));

/** Dark blue side menu of style 2 (desktop only; the phone has the bar at the bottom). */
export const MenuLato = () => {
  const { pathname } = useLocation();
  const accesso = useAccessoUtile();
  // a failed read keeps the partners' entries: the pages show the error themselves (review R014)
  const vedeUtile = accesso.data === true || accesso.isError;
  return (
    <aside
      aria-label="Menu"
      className="hidden md:block w-56 shrink-0 bg-pa-blu text-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
    >
      <nav className="flex flex-col gap-6 px-3 py-6">
        {GRUPPI.filter((g) => g.voci.some((v) => !v.soloSoci || vedeUtile)).map(
          (g) => (
            <div key={g.titolo} className="flex flex-col gap-1">
              <div className="px-3 pb-1 text-xs uppercase tracking-wider text-white/60">
                {g.titolo}
              </div>
              {g.voci
                .filter((v) => !v.soloSoci || vedeUtile)
                .map((v) => (
                  <Link
                    key={v.to}
                    to={v.to}
                    className={cn(
                      "rounded-lg px-3 py-2 text-[15px] no-underline text-white/85 hover:bg-white/10 hover:text-white",
                      v.attiva(pathname) &&
                        "bg-white/15 font-semibold text-white",
                    )}
                  >
                    {v.titolo}
                  </Link>
                ))}
            </div>
          ),
        )}
      </nav>
    </aside>
  );
};
