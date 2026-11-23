/**
 * Every number explains itself (Lorenzo 22/11/2026, "like the Paradox games, Hearts of Iron"): hovering a number with the
 * mouse opens a small panel with the exact calculation and the source; a click opens the full list of the rows behind it.
 * On the phone a tap opens the panel and the list opens from a button inside it. Keyboard: Enter opens the panel.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { euro } from "./formato";

/** One line of the calculation: "+ RE 17.908,58". The line with segno "=" is the result. */
export interface RigaCalcolo {
  voce: string;
  valore: number | string;
  segno?: "+" | "-" | "=" | "x" | ":";
}

export type Cella = string | number | null;

/** Full list of the rows behind a number (numbers are shown in euro with cents). */
export interface Elenco {
  titolo: string;
  colonne: string[];
  righe: Cella[][];
  totale?: Cella[];
  nota?: string;
}

export interface Spiegazione {
  titolo: string;
  cosa: ReactNode;
  calcolo?: RigaCalcolo[];
  fonte: string;
  elenco?: Elenco;
}

/** Inline, not Tailwind classes: the rule must hold everywhere (also in the tests, which load no stylesheet). */
const ALTEZZA_TENDINA: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  maxHeight: "var(--radix-popover-content-available-height)",
};
const PARTE_CHE_SCORRE: React.CSSProperties = {
  minHeight: 0,
  overflowY: "auto",
};

const APRI_DOPO_MS = 120;
const CHIUDI_DOPO_MS = 200;

const cella = (c: Cella): string =>
  c == null ? "" : typeof c === "number" ? euro(c) : c;

const Calcolo = ({ righe }: { righe: RigaCalcolo[] }) => (
  <div className="flex flex-col text-sm tabular-nums">
    {righe.map((r, i) => (
      <div
        key={`${r.voce}-${i}`}
        className={cn(
          "flex justify-between gap-3 py-0.5",
          r.segno === "=" &&
            "mt-1 border-t border-pa-blu/40 pt-1 font-semibold",
        )}
      >
        <span className="min-w-0">
          {r.segno && r.segno !== "=" && i > 0 && (
            <span className="inline-block w-4 text-muted-foreground">
              {r.segno === "x" ? "×" : r.segno}
            </span>
          )}
          {r.segno === "=" && <span className="inline-block w-4">=</span>}
          {r.voce}
        </span>
        <span className="whitespace-nowrap">{cella(r.valore)}</span>
      </div>
    ))}
  </div>
);

/** In the lists the amounts go without the euro sign (said once above the table): they fit a phone screen. */
const cellaElenco = (c: Cella): string =>
  typeof c === "number" ? euro(c).replace(/\s€$/, "") : cella(c);

const CELLA = "py-1.5 pr-2 sm:pr-3";

export const ElencoCompleto = ({ elenco }: { elenco: Elenco }) => (
  <div className="overflow-x-auto">
    <p className="mb-1 text-xs text-muted-foreground">Importi in euro.</p>
    <table className="w-full text-xs sm:text-sm tabular-nums">
      <thead className="text-left text-muted-foreground">
        <tr>
          {elenco.colonne.map((c, i) => (
            <th
              key={c}
              className={cn(
                "py-1 pr-2 sm:pr-3 font-normal align-bottom",
                i > 0 && "text-right",
              )}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {elenco.righe.map((r, i) => (
          <tr
            key={i}
            className={cn(
              "border-t align-top",
              // a row whose label starts with "=" is a subtotal (e.g. "= 2026")
              typeof r[0] === "string" &&
                r[0].startsWith("=") &&
                "bg-muted/60 font-semibold",
            )}
          >
            {r.map((c, j) => (
              <td
                key={j}
                className={cn(CELLA, j > 0 && "text-right whitespace-nowrap")}
              >
                {cellaElenco(c)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {elenco.totale && (
        <tfoot>
          <tr className="border-t-2 border-foreground font-semibold">
            {elenco.totale.map((c, j) => (
              <td
                key={j}
                className={cn(CELLA, j > 0 && "text-right whitespace-nowrap")}
              >
                {cellaElenco(c)}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
    {elenco.nota && (
      <p className="mt-2 text-xs text-muted-foreground">{elenco.nota}</p>
    )}
  </div>
);

export interface SpiegatoProps {
  spiega: Spiegazione;
  children: ReactNode;
  className?: string;
}

/** A number with its explanation: dotted underline, panel on hover or tap, full list on click. */
export const Spiegato = ({ spiega, children, className }: SpiegatoProps) => {
  const [aperta, setAperta] = useState(false);
  const [elenco, setElenco] = useState(false);
  const [daMouse, setDaMouse] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipo = useRef("");
  const ferma = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => ferma, []);
  const dopo = (ms: number, fai: () => void) => {
    ferma();
    timer.current = setTimeout(fai, ms);
  };
  const entra = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    dopo(APRI_DOPO_MS, () => {
      setDaMouse(true);
      setAperta(true);
    });
  };
  const esce = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    dopo(CHIUDI_DOPO_MS, () => setAperta(false));
  };
  const apriElenco = () => {
    ferma();
    setAperta(false);
    setElenco(true);
  };
  const n = spiega.elenco?.righe.length ?? 0;

  return (
    // the panel and the list are portals but their React events bubble up here: stop them, so a number inside a
    // clickable tile (main page) opens its explanation without also opening the tile's page
    <span
      className="contents"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Popover open={aperta} onOpenChange={setAperta}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${spiega.titolo}: come si calcola`}
            className={cn(
              "cursor-help rounded-sm text-left decoration-pa-blu/50 decoration-dotted underline-offset-4 underline hover:decoration-solid focus-visible:outline-2 focus-visible:outline-pa-blu",
              className,
            )}
            onPointerDown={(e) => {
              tipo.current = e.pointerType;
            }}
            onPointerEnter={entra}
            onPointerLeave={esce}
            onClick={(e) => {
              // Radix skips its own toggle when the event is prevented: a mouse click opens the list, the hover the panel
              const conMouse = e.detail > 0 && tipo.current === "mouse";
              if (!conMouse) {
                setDaMouse(false);
                return;
              }
              e.preventDefault();
              if (spiega.elenco) apriElenco();
              else setAperta(true);
            }}
          >
            {children}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          // never taller than the room left on screen: title and list button stay, the middle scrolls (review R010)
          className="w-80 max-w-[calc(100vw-2rem)] border-pa-blu/30 p-0"
          style={ALTEZZA_TENDINA}
          onOpenAutoFocus={(e) => {
            if (daMouse) e.preventDefault();
          }}
          onPointerEnter={(e) => e.pointerType === "mouse" && ferma()}
          onPointerLeave={esce}
        >
          <div className="shrink-0 bg-pa-blu px-3 py-2 text-sm font-semibold text-white">
            {spiega.titolo}
          </div>
          <div
            className="flex flex-col gap-2 px-3 py-2.5"
            style={PARTE_CHE_SCORRE}
          >
            <div className="text-sm">{spiega.cosa}</div>
            {spiega.calcolo && spiega.calcolo.length > 0 && (
              <Calcolo righe={spiega.calcolo} />
            )}
            <div className="text-xs text-muted-foreground">
              Fonte: {spiega.fonte}
            </div>
          </div>
          {spiega.elenco && (
            <div className="flex shrink-0 flex-col gap-1 border-t px-3 py-2">
              <>
                <button
                  type="button"
                  className="self-start rounded-md border border-pa-blu/40 px-3 py-1.5 text-sm font-medium text-pa-blu hover:bg-pa-blu/5"
                  onClick={apriElenco}
                >
                  Elenco completo ({n} {n === 1 ? "riga" : "righe"})
                </button>
                {daMouse && (
                  <div className="text-xs text-muted-foreground">
                    oppure clic sul numero
                  </div>
                )}
              </>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {spiega.elenco && (
        <Sheet open={elenco} onOpenChange={setElenco}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>{spiega.elenco.titolo}</SheetTitle>
              <SheetDescription>
                {spiega.titolo}. Fonte: {spiega.fonte}
              </SheetDescription>
            </SheetHeader>
            <div className="px-3 sm:px-4 pb-6">
              <ElencoCompleto elenco={spiega.elenco} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </span>
  );
};
