import { Link, matchPath, useLocation } from "react-router";

import { cn } from "@/lib/utils";
import { useAccessoUtile } from "./Andamento";

interface VoceMenu {
  titolo: string;
  to: string;
  attiva: (path: string) => boolean;
  soloSoci?: boolean;
}

const GRUPPI: { titolo: string; voci: VoceMenu[] }[] = [
  {
    titolo: "Agenzia",
    voci: [
      { titolo: "Cruscotto", to: "/", attiva: (p) => p === "/" },
      {
        titolo: "Contabilità",
        to: "/contabilita",
        soloSoci: true,
        attiva: (p) =>
          !!matchPath("/contabilita/*", p) || !!matchPath("/andamento", p),
      },
      {
        titolo: "Amministrazione",
        to: "/amministrazione",
        attiva: (p) =>
          (!!matchPath("/amministrazione/*", p) || p === "/amministrazione") &&
          !matchPath("/amministrazione/sezioni", p) &&
          !matchPath("/amministrazione/scadenze", p),
      },
    ],
  },
  {
    titolo: "Liste",
    voci: [
      {
        titolo: "Sezioni A-L",
        to: "/amministrazione/sezioni",
        attiva: (p) =>
          !!matchPath("/amministrazione/sezioni", p) ||
          !!matchPath("/sezioni/*", p),
      },
      {
        titolo: "Scadenze",
        to: "/amministrazione/scadenze",
        attiva: (p) => !!matchPath("/amministrazione/scadenze", p),
      },
    ],
  },
];

/** Dark blue side menu of style 2 (desktop only; the phone has the bar at the bottom). */
export const MenuLato = () => {
  const { pathname } = useLocation();
  const { data: vedeUtile } = useAccessoUtile();
  return (
    <aside
      aria-label="Menu"
      className="hidden md:block w-56 shrink-0 bg-pa-blu text-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
    >
      <nav className="flex flex-col gap-6 px-3 py-6">
        {GRUPPI.map((g) => (
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
        ))}
      </nav>
    </aside>
  );
};
