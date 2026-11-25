/**
 * Month by month bars of a Cruscotto tile (proposal of 25/11/2026): this year next to last year, same months, so a drop
 * reads as one bad month or as the whole year. Hover a month to read both figures. Plain SVG, no chart library: at most
 * twelve pairs of thin bars. Not on the phone (one column, label and number only).
 */
import { useState } from "react";

import { euroIntero as euro, meseSolo } from "./formato";

export interface PuntoMese {
  mese: string;
  ac: number;
  ap: number;
  parziale?: boolean;
}

const LARGO = 240;
const ALTO = 44;
const COLORE_AP = "#c3ccd9";
const COLORE_AC = "var(--pa-blu)";
const COLORE_AC_SPENTO = "#8fa6c8";

export const BarreMesi = ({
  punti,
  anno,
  etichetta,
  evidenzia,
}: {
  punti: PuntoMese[];
  anno: number;
  etichetta: string;
  /** month shown by the tile in "Mese": the other months of this year in a lighter blue */
  evidenzia?: string;
}) => {
  const [sopra, setSopra] = useState<number | null>(null);
  if (punti.length < 2) return null;
  const n = punti.length;
  const gruppo = LARGO / n;
  const barra = Math.max(1.5, (gruppo - 3) / 2);
  const valori = punti.flatMap((p) => [p.ac, p.ap]);
  const max = Math.max(0, ...valori);
  const min = Math.min(0, ...valori);
  const campo = max - min || 1;
  const y = (v: number) => ALTO - ((v - min) / campo) * ALTO;
  const y0 = y(0);
  const rett = (v: number, x: number, colore: string) => (
    <rect
      x={x}
      y={Math.min(y(v), y0)}
      width={barra}
      height={Math.max(Math.abs(y(v) - y0), 1)}
      rx={1.5}
      fill={colore}
    />
  );
  const p = sopra == null ? null : punti[sopra];
  return (
    <div
      className="relative mt-2 hidden sm:block"
      onMouseLeave={() => setSopra(null)}
    >
      <svg
        viewBox={`0 0 ${LARGO} ${ALTO}`}
        preserveAspectRatio="none"
        className="block h-11 w-full overflow-visible"
        role="img"
        aria-label={`${etichetta}: ${anno} contro ${anno - 1}, mese per mese`}
      >
        {punti.map((q, i) => {
          const x = i * gruppo + 1;
          const acceso = !evidenzia || evidenzia === q.mese;
          return (
            <g key={q.mese}>
              {rett(q.ap, x, COLORE_AP)}
              {rett(q.ac, x + barra + 1, acceso ? COLORE_AC : COLORE_AC_SPENTO)}
              <rect
                data-testid="mese-barre"
                x={i * gruppo}
                y={0}
                width={gruppo}
                height={ALTO}
                fill={sopra === i ? "rgba(31,56,100,0.07)" : "transparent"}
                onMouseEnter={() => setSopra(i)}
              />
            </g>
          );
        })}
        {min < 0 && (
          <line
            x1={0}
            x2={LARGO}
            y1={y0}
            y2={y0}
            stroke="#9aa8bd"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {p && sopra != null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs leading-snug text-background shadow tabular-nums"
          style={{
            left: `${((sopra + 0.5) / n) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold">
            {meseSolo(p.mese)}
            {p.parziale ? " (fino a ieri)" : ""}
          </div>
          <div>
            {anno}: {euro(p.ac)}
          </div>
          <div>
            {anno - 1}: {euro(p.ap)}
          </div>
        </div>
      )}
    </div>
  );
};

/** Legend shared by the tiles of a band. */
export const LegendaBarre = ({ anno }: { anno: number }) => (
  <span className="hidden items-center gap-3 text-xs text-muted-foreground sm:inline-flex">
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: COLORE_AC }}
      />
      {anno}
    </span>
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: COLORE_AP }}
      />
      {anno - 1}
    </span>
    <span>barrette mese per mese, passa sopra per le cifre</span>
  </span>
);
